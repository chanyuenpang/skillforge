import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { listRoutedRuns } from './routed-run-store.mjs';
import { RELATIONAL_INDEX_PATH, openRelationalIndexDb, assertReadableIndex } from './relational-index.sqlite.mjs';

const REPO_ROOT = process.cwd();
const SKILLS_ROOT = path.join(REPO_ROOT, 'skills');

function safeReadJson(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function safeReadText(filePath) {
  try {
    return readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function stripMarkdown(value = '') {
  return String(value)
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s*[-*]\s+/gm, '')
    .trim();
}

function clampText(value, maxLength = 220) {
  const text = stripMarkdown(value).replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

function normalizeEscapedText(value = '') {
  return String(value)
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"');
}

function parseJsonObject(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function extractStructuredPrompt(parsed) {
  const parts = [];
  if (parsed.title) parts.push(String(parsed.title).trim());
  if (parsed.summary) parts.push(String(parsed.summary).trim());
  if (parsed.prompt && parts.length === 0) parts.push(String(parsed.prompt).trim());
  if (parsed.task && parts.length === 0) parts.push(String(parsed.task).trim());
  if (Array.isArray(parsed.tasks) && parsed.tasks.length) {
    const count = parsed.tasks.length;
    parts.push(`Tasks: ${count}`);
  }

  const compact = parts.filter(Boolean).join('\n\n').trim();
  return {
    title: parsed.title ? String(parsed.title).trim() : '',
    summary: parsed.summary ? String(parsed.summary).trim() : '',
    taskCount: Array.isArray(parsed.tasks) ? parsed.tasks.length : 0,
    displayText: compact,
  };
}

function extractSummaryHighlight(summary = '') {
  const text = normalizeEscapedText(summary).replace(/\s+/g, ' ').trim();
  if (!text) return '';

  const markers = [
    '当前验证结论：',
    '当前状态：',
    '现阶段最新唯一阻塞已',
    '最新唯一阻塞已',
    '最终结果：',
  ];

  for (const marker of markers) {
    const index = text.indexOf(marker);
    if (index >= 0) {
      return text.slice(index).trim();
    }
  }

  const sentences = text
    .split(/(?<=[。！？])/)
    .map((item) => item.trim())
    .filter(Boolean);

  return sentences.at(-1) || text;
}

function summarizeTaskPrompt(value = '') {
  const parsed = parseJsonObject(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    const plain = normalizeEscapedText(value || '').trim();
    return {
      title: '',
      summary: '',
      taskCount: 0,
      highlight: '',
      displayText: plain,
      previewText: plain,
    };
  }

  const structured = extractStructuredPrompt(parsed);
  const highlight = extractSummaryHighlight(structured.summary);
  const previewParts = [
    structured.title,
    highlight || (structured.taskCount ? `Tasks: ${structured.taskCount}` : ''),
  ].filter(Boolean);

  return {
    ...structured,
    highlight,
    displayText: structured.displayText || normalizeEscapedText(value || '').trim(),
    previewText: previewParts.join(' · ') || structured.displayText || normalizeEscapedText(value || '').trim(),
  };
}

function parseFrontmatter(raw = '') {
  if (!raw.startsWith('---')) return { frontmatter: {}, body: raw };
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: raw };

  const frontmatter = {};
  for (const line of match[1].split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf(':');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const rawValue = trimmed.slice(idx + 1).trim();
    let value = rawValue.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
    if ((value.startsWith('{') && value.endsWith('}')) || (value.startsWith('[') && value.endsWith(']'))) {
      try {
        value = JSON.parse(value);
      } catch {
        value = rawValue;
      }
    }
    frontmatter[key] = value;
  }

  return {
    frontmatter,
    body: match[2],
  };
}

function pickSkillDescription(frontmatter, body) {
  if (frontmatter.description) return clampText(frontmatter.description, 260);
  const paragraphs = body
    .split(/\r?\n\r?\n/)
    .map((chunk) => stripMarkdown(chunk))
    .filter(Boolean)
    .filter((chunk) => !chunk.startsWith('#'));
  return clampText(paragraphs[0] || '', 260);
}

function inferFallbackTags(skillDirName, frontmatter, meta, body = '') {
  const tags = new Map();
  const register = (name, type = 'open_tag') => {
    if (!name) return;
    const normalized = String(name).trim();
    if (!normalized) return;
    tags.set(`${type}:${normalized}`, {
      id: `${type}:${normalized}`,
      name: normalized,
      type,
    });
  };

  const openclawType = meta?.openclaw?.type || frontmatter?.metadata?.openclaw?.type || frontmatter.type || '';
  register(openclawType, 'skill_role');
  register(frontmatter.name || skillDirName, 'artifact_target');

  const corpus = `${skillDirName} ${frontmatter.description || ''} ${body}`.toLowerCase();
  const patterns = [
    { needle: 'workflow', name: 'workflow', type: 'skill_category' },
    { needle: 'planning', name: 'planning', type: 'workflow' },
    { needle: 'plan', name: 'planning', type: 'workflow' },
    { needle: 'review', name: 'review', type: 'agent_archetype' },
    { needle: 'debug', name: 'debug', type: 'agent_archetype' },
    { needle: 'coding', name: 'coding', type: 'agent_archetype' },
    { needle: 'research', name: 'research', type: 'agent_archetype' },
    { needle: 'browser', name: 'browser', type: 'workflow' },
    { needle: 'playwright', name: 'playwright', type: 'tool' },
    { needle: 'browseros', name: 'browseros-cli', type: 'tool' },
    { needle: 'git', name: 'git', type: 'tool' },
    { needle: 'feishu', name: 'feishu', type: 'tool' },
    { needle: 'docx', name: 'document', type: 'artifact_target' },
    { needle: 'ppt', name: 'presentation', type: 'artifact_target' },
    { needle: 'announcement', name: 'announcement', type: 'workflow' },
    { needle: 'search', name: 'search', type: 'workflow' },
    { needle: 'executor', name: 'executor', type: 'skill_role' },
    { needle: 'subagent', name: 'subagent', type: 'skill_role' },
    { needle: 'godot', name: 'godot', type: 'workflow' },
    { needle: 'runtime', name: 'runtime', type: 'workflow' },
  ];

  for (const pattern of patterns) {
    if (corpus.includes(pattern.needle)) register(pattern.name, pattern.type);
  }

  return [...tags.values()];
}

function loadRepoSkills() {
  if (!existsSync(SKILLS_ROOT)) return [];

  return readdirSync(SKILLS_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const skillDirName = entry.name;
      const skillDir = path.join(SKILLS_ROOT, skillDirName);
      const skillPath = path.join(skillDir, 'SKILL.md');
      if (!existsSync(skillPath)) return null;

      const raw = safeReadText(skillPath);
      const { frontmatter, body } = parseFrontmatter(raw);
      const meta = safeReadJson(path.join(skillDir, '_meta.json')) || {};
      const description = pickSkillDescription(frontmatter, body);
      const title = frontmatter.name || skillDirName;
      const tags = inferFallbackTags(skillDirName, frontmatter, meta, body);

      return {
        id: `repo:${skillDirName}`,
        registryId: null,
        name: title,
        description,
        skillKind: meta?.openclaw?.type || frontmatter.type || (skillDirName.includes('workflow') ? 'workflow' : 'skill'),
        sourcePath: skillPath,
        scopeLabel: 'Repository',
        tags,
        tagCount: tags.length,
        excerpt: clampText(body, 320),
        sourceMode: 'repository',
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function listSkillsFromIndex() {
  if (!existsSync(RELATIONAL_INDEX_PATH)) return null;

  const { db } = openRelationalIndexDb();
  try {
    assertReadableIndex(db);

    const skillRows = db.prepare(`
      SELECT
        s.id,
        s.name,
        s.skill_kind,
        s.description,
        s.source_path,
        s.scope_type,
        s.project_scope,
        s.payload_json
      FROM skills s
      ORDER BY s.name COLLATE NOCASE
    `).all();

    const tagRows = db.prepare(`
      SELECT
        st.skill_id,
        st.weight,
        t.id,
        t.name,
        t.tag_type
      FROM skill_tags st
      JOIN tags t ON t.id = st.tag_id
      ORDER BY t.name COLLATE NOCASE
    `).all();

    const tagsBySkill = new Map();
    for (const row of tagRows) {
      if (!tagsBySkill.has(row.skill_id)) tagsBySkill.set(row.skill_id, []);
      tagsBySkill.get(row.skill_id).push({
        id: row.id,
        name: row.name,
        type: row.tag_type,
        weight: row.weight,
      });
    }

    return skillRows.map((row) => {
      let payload = {};
      try {
        payload = JSON.parse(row.payload_json);
      } catch {
        payload = {};
      }

      const tags = (tagsBySkill.get(row.id) || []).sort((a, b) => {
        return (b.weight || 0) - (a.weight || 0) || a.name.localeCompare(b.name);
      });

      return {
        id: row.id,
        registryId: row.id,
        name: row.name,
        description: clampText(row.description, 260),
        skillKind: row.skill_kind,
        sourcePath: row.source_path,
        scopeLabel: row.project_scope ? row.project_scope : 'Global',
        tags,
        tagCount: tags.length,
        excerpt: clampText(payload?.routingProfile?.workflowSkeletonSummary || payload?.description || row.description, 320),
        sourceMode: 'index',
      };
    });
  } catch {
    return null;
  } finally {
    db.close();
  }
}

function tryLoadIndexMeta() {
  if (!existsSync(RELATIONAL_INDEX_PATH)) return null;
  const { db } = openRelationalIndexDb();
  try {
    return assertReadableIndex(db);
  } catch {
    return null;
  } finally {
    db.close();
  }
}

function normalizeMatchedSkill(item) {
  if (!item) return null;
  if (typeof item === 'string') {
    return { id: item, name: item };
  }
  if (typeof item === 'object') {
    return {
      id: item.id || item.registryId || item.name || '',
      name: item.name || item.id || item.registryId || '',
      kind: item.kind || item.skillKind || null,
    };
  }
  return null;
}

function extractMatchedSkills(run) {
  const buckets = [
    run?.retrieval?.selected,
    run?.compilation?.routing?.selected,
    run?.compilation?.selectedSkills,
    run?.execution?.matchedSkills,
  ];

  const map = new Map();
  for (const bucket of buckets) {
    if (!Array.isArray(bucket)) continue;
    for (const item of bucket) {
      const normalized = normalizeMatchedSkill(item);
      if (!normalized?.id && !normalized?.name) continue;
      const key = normalized.id || normalized.name;
      map.set(key, normalized);
    }
  }
  return [...map.values()];
}

function extractOutput(run) {
  const compiledPackage = run?.compilation?.compiledPackage;
  const candidates = [
    run?.compilation?.output?.executorPrompt,
    run?.compilation?.executorPrompt,
    run?.compilation?.compiledPackage?.executorPrompt,
    run?.compilation?.compiledPackage?.prompt,
    run?.plan?.betterPlanReview?.reviewText,
    run?.plan?.reviewText,
    run?.execution?.outputText,
    run?.execution?.report,
  ];

  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) {
      return { text: value.trim(), kind: 'natural' };
    }
  }

  if (compiledPackage && typeof compiledPackage === 'object') {
    const fragments = [];
    if (hasMeaningfulText(compiledPackage.executorPrompt)) {
      return { text: String(compiledPackage.executorPrompt).trim(), kind: 'natural' };
    }
    if (hasMeaningfulText(compiledPackage.executorPromptPreview)) {
      return { text: String(compiledPackage.executorPromptPreview).trim(), kind: 'legacy_structured' };
    }
    if (compiledPackage.objective) fragments.push(`Objective: ${compiledPackage.objective}`);
    if (compiledPackage.steps) fragments.push(`Steps: ${compiledPackage.steps}`);
    if (Array.isArray(compiledPackage.reportSections) && compiledPackage.reportSections.length) {
      fragments.push(`Deliverables: ${compiledPackage.reportSections.join(', ')}`);
    }
    if (fragments.length) {
      return { text: fragments.join('\n'), kind: 'legacy_structured' };
    }
  }

  return { text: '', kind: 'none' };
}

function hasMeaningfulText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function detectRunKind(run) {
  if (run?.plan?.reviewText || run?.runId?.startsWith('pl')) return 'Plan Review';
  if (run?.compilation || run?.runId?.startsWith('bp') || run?.runId?.startsWith('bpr')) return 'Prompt Routing';
  return 'Run';
}

function buildRunSummary(run) {
  const output = extractOutput(run);
  const matchedSkills = extractMatchedSkills(run);
  const failureStage = run?.diagnosis?.failureStage || null;
  const inputText = run?.userRequest?.text || '';
  const promptSummary = summarizeTaskPrompt(inputText);
  const inputDisplayText = promptSummary.displayText;

  return {
    runId: run.runId,
    timestamp: run.timestamp,
    status: run.status || (failureStage ? 'failed' : 'success'),
    kind: detectRunKind(run),
    inputText,
    inputTitle: promptSummary.title,
    inputHighlight: promptSummary.highlight,
    inputDisplayText,
    inputPreview: clampText(promptSummary.previewText || inputDisplayText, 220),
    matchedSkills,
    matchedSkillCount: matchedSkills.length,
    outputText: normalizeEscapedText(output.text),
    outputKind: output.kind,
    outputPreview: clampText(normalizeEscapedText(output.text), 220),
    failureStage,
    notes: run?.diagnosis?.notes || [],
    raw: run,
  };
}

function normalizeForSignature(value = '') {
  return String(value).replace(/\s+/g, ' ').trim().toLowerCase();
}

function collapseRuns(runs = []) {
  const seen = new Map();
  const collapsed = [];

  for (const run of runs) {
    const signature = [
      run.kind,
      run.status,
      run.failureStage || 'none',
      run.outputKind,
      normalizeForSignature(run.inputText),
      run.matchedSkills.map((skill) => skill.id || skill.name).sort().join('|'),
    ].join('::');

    if (seen.has(signature)) {
      seen.get(signature).duplicateCount += 1;
      continue;
    }

    const record = {
      ...run,
      duplicateCount: 1,
    };
    seen.set(signature, record);
    collapsed.push(record);
  }

  return collapsed;
}

function sortRunsNewestFirst(runs = []) {
  return runs
    .slice()
    .sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')));
}

function sortRunsForShowcase(runs = []) {
  return runs
    .slice()
    .sort((a, b) => {
      const score = (run) => {
        let value = 0;
        if (run.status === 'success') value += 30;
        if (run.matchedSkillCount > 0) value += 10;
        if (run.outputKind === 'natural') value += 10;
        else if (run.outputText) value += 4;
        if (run.failureStage) value -= 4;
        return value;
      };
      const diff = score(b) - score(a);
      if (diff !== 0) return diff;
      return String(b.timestamp || '').localeCompare(String(a.timestamp || ''));
    });
}

export function listAdminRuns({ limit = 120 } = {}) {
  const runs = listRoutedRuns()
    .slice()
    .reverse()
    .map(buildRunSummary)
    .filter((run) => run.inputText || run.outputText || run.matchedSkillCount > 0 || run.failureStage);

  return sortRunsNewestFirst(collapseRuns(runs)).slice(0, limit);
}

export function listAdminSkills() {
  const indexed = listSkillsFromIndex();
  if (indexed && indexed.length > 0) {
    return {
      sourceMode: 'index',
      sourceLabel: 'Live index',
      meta: tryLoadIndexMeta(),
      skills: indexed,
    };
  }

  return {
    sourceMode: 'repository',
    sourceLabel: 'Repository scan',
    meta: null,
    skills: loadRepoSkills(),
  };
}

function aggregateTopTags(skills = [], limit = 12) {
  const counts = new Map();
  for (const skill of skills) {
    for (const tag of skill.tags || []) {
      const key = `${tag.type}:${tag.name}`;
      const current = counts.get(key) || {
        id: tag.id || key,
        name: tag.name,
        type: tag.type,
        count: 0,
      };
      current.count += 1;
      counts.set(key, current);
    }
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);
}

export function getAdminOverview() {
  const skillsState = listAdminSkills();
  const runs = listAdminRuns();
  const skills = skillsState.skills;
  const topTags = aggregateTopTags(skills);
  const uniqueTagCount = new Set(
    skills.flatMap((skill) => (skill.tags || []).map((tag) => `${tag.type}:${tag.name}`)),
  ).size;
  const successfulRuns = runs.filter((run) => run.status === 'success').length;

  return {
    sourceMode: skillsState.sourceMode,
    sourceLabel: skillsState.sourceLabel,
    indexMeta: skillsState.meta,
    counts: {
      skills: skills.length,
      tags: uniqueTagCount,
      runs: runs.length,
      successfulRuns,
    },
    topTags,
    recentRuns: sortRunsForShowcase(runs).slice(0, 8),
    featuredSkills: skills.slice(0, 6),
  };
}

export function getSkillDetails(skillId) {
  const skillsState = listAdminSkills();
  return skillsState.skills.find((skill) => skill.id === skillId) || null;
}

export function getRunDetails(runId) {
  return listAdminRuns({ limit: 300 }).find((run) => run.runId === runId) || null;
}

export default {
  getAdminOverview,
  listAdminSkills,
  listAdminRuns,
  getSkillDetails,
  getRunDetails,
};
