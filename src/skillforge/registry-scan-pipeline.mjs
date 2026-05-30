import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { callJsonModel } from './llm-json.mjs';
import { createRegistryEntry } from './registry-entry.mjs';
import { save as saveRegistryEntry } from './registry-store.mjs';

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function uniq(items = []) {
  return [...new Set(items.filter((item) => hasText(item)).map((item) => String(item).trim()))];
}

function nowIso() {
  return new Date().toISOString();
}

async function walkSkillFiles(sourceDir) {
  const skillFiles = [];

  async function walk(dir) {
    let entries = [];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const skillPath = path.join(full, 'SKILL.md');
        try {
          const stat = await fs.stat(skillPath);
          if (stat.isFile()) {
            skillFiles.push(skillPath);
            continue;
          }
        } catch {
          // ignore
        }
        await walk(full);
      }
    }
  }

  await walk(sourceDir);
  return skillFiles;
}

function extractFrontmatter(text = '') {
  const normalized = String(text).replace(/^\uFEFF/u, '').replace(/\r\n?/g, '\n');
  if (!normalized.startsWith('---\n')) return {};
  const closeIdx = normalized.indexOf('\n---\n', 4);
  if (closeIdx === -1) return {};

  const frontmatter = normalized.slice(4, closeIdx);
  const lines = frontmatter.split('\n');
  const result = {};
  for (const line of lines) {
    const sep = line.indexOf(':');
    if (sep <= 0) continue;
    const key = line.slice(0, sep).trim();
    let value = line.slice(sep + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

function firstMatchingLine(text = '', patterns = []) {
  const lines = String(text).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    if (patterns.some((pattern) => pattern.test(line))) return line;
  }
  return '';
}

function collectToolSignals(rawText = '') {
  const matches = String(rawText).match(/(?:python3?\s+-m\s+[a-zA-Z0-9_.-]+|[a-zA-Z0-9_.-]+\.py|browseros-cli|browseros_cli|git|gh|playwright|mcp)/g) || [];
  return uniq(matches);
}

function normalizeRequiredTools(toolSignals = []) {
  const tools = new Set();
  for (const signal of toolSignals) {
    const lower = signal.toLowerCase();
    if (lower.includes('browseros')) tools.add('browseros-cli');
    else if (lower === 'git') tools.add('git');
    else if (lower === 'gh') tools.add('gh');
    else if (lower.includes('playwright')) tools.add('playwright');
    else if (lower.includes('mcp')) tools.add('mcp');
    else if (lower.endsWith('.py')) tools.add('python-script');
  }
  return [...tools];
}

function inferSkillRole({ kind, name = '', description = '', rawText = '' }) {
  const corpus = `${name}\n${description}\n${rawText}`.toLowerCase();
  if (/review|verify|validation|debug|test|evidence|诊断|验证|reviewer/.test(corpus)) return 'verification';
  if (/browseros|playwright|gitnexus|mcp|tool|cli|compile\.py|编译/.test(corpus)) return 'tooling';
  if (kind === 'subagent' || /coding|implementation|executor|workflow|开发|代码修改|执行/.test(corpus)) return 'primary';
  if (/tiny-world|mission-control|project|项目/.test(corpus)) return 'project-scoped';
  return 'reference';
}

function inferSkillCategory({ name = '', description = '', rawText = '' }) {
  const corpus = `${name}\n${description}\n${rawText}`.toLowerCase();
  if (/review|verify|validation|debug|test|evidence|诊断|验证/.test(corpus)) return 'review';
  if (/browseros|playwright|gitnexus|mcp|tool|cli|compile\.py|编译/.test(corpus)) return 'tooling';
  if (/coding|implementation|executor|workflow|开发|代码修改|执行/.test(corpus)) return 'execution';
  if (/tiny-world|mission-control|project|项目/.test(corpus)) return 'project';
  return 'reference';
}

function heuristicSkillIr({ skillId, filePath, frontmatter, rawText }) {
  const kind = frontmatter?.['metadata']?.includes?.('subagent')
    ? 'subagent'
    : /type:\s*subagent/i.test(rawText)
      ? 'subagent'
      : 'skill';
  const description = hasText(frontmatter.description)
    ? frontmatter.description
    : firstMatchingLine(rawText, [/^#\s+/, /适用场景/i, /Usage/i]).replace(/^#\s+/, '');
  const toolSignals = collectToolSignals(rawText);
  const requiredTools = normalizeRequiredTools(toolSignals);
  const skillRole = inferSkillRole({ kind, name: frontmatter.name || path.basename(path.dirname(filePath)), description, rawText });
  const skillCategory = inferSkillCategory({ name: frontmatter.name || path.basename(path.dirname(filePath)), description, rawText });
  const reportLine = firstMatchingLine(rawText, [/输出格式/i, /Output/i, /report/i]);
  const stopLine = firstMatchingLine(rawText, [/失败处理/i, /stop/i, /fail-fast/i, /不要/i, /must not/i]);
  const sceneLine = firstMatchingLine(rawText, [/适用场景/i, /Usage/i, /场景/i]);
  const workflowLine = firstMatchingLine(rawText, [/工作流程/i, /执行流程/i, /workflow/i, /步骤/i]);

  return {
    id: skillId,
    name: frontmatter.name || path.basename(path.dirname(filePath)),
    kind,
    skillRole,
    skillCategory,
    version: frontmatter.version || null,
    description: hasText(description) ? description : `Skill entry from ${path.basename(path.dirname(filePath))}`,
    sourceRef: { path: path.relative(process.cwd(), filePath) },
    applicableScenes: uniq(sceneLine ? [sceneLine] : []),
    triggerHints: uniq([
      frontmatter.name,
      ...String(description || '').split(/[,\s/]+/),
    ]),
    requiredTools,
    toolSignals,
    entrypointHints: toolSignals.slice(0, 5),
    toolFamilies: uniq(requiredTools),
    reportHints: uniq(reportLine ? [reportLine] : []),
    stopRuleHints: uniq(stopLine ? [stopLine] : []),
    constraintHints: uniq(stopLine ? [stopLine] : []),
    workflowSkeletonSummary: hasText(workflowLine) ? workflowLine : '',
    tags: uniq([
      kind,
      ...requiredTools,
      ...String(description || '').toLowerCase().split(/[,\s/]+/).filter((item) => item.length > 2).slice(0, 8),
    ]),
  };
}

function buildSkillExtractionPrompt({ skillId, rawText, heuristic }) {
  return `You are extracting a routing-oriented intermediate representation from a real-world skill file.

Return JSON only.

Skill id: ${skillId}

Heuristic baseline:
${JSON.stringify(heuristic, null, 2)}

Raw SKILL.md:
---
${rawText.slice(0, 24000)}
---

Return a JSON object with:
- id
- name
- kind ("skill" or "subagent")
- skillRole
- skillCategory
- version
- description
- applicableScenes (string[])
- triggerHints (string[])
- requiredTools (string[])
- toolSignals (string[])
- entrypointHints (string[])
- toolFamilies (string[])
- reportHints (string[])
- stopRuleHints (string[])
- constraintHints (string[])
- workflowSkeletonSummary (string)
- tags (string[])

Rules:
- prefer concise normalized strings
- infer structure from messy text when needed
- preserve only routing-relevant information
- do not invent tools not supported by the source
- skillRole should usually be one of: primary, tooling, verification, project-scoped, reference
- skillCategory should usually be one of: execution, tooling, review, project, reference
- if uncertain, keep fields short or empty rather than hallucinating`;
}

function normalizeExtractedEntry(entry, heuristic, filePath) {
  const obj = entry && typeof entry === 'object' ? entry : {};
  return {
    id: hasText(obj.id) ? String(obj.id).trim() : heuristic.id,
    name: hasText(obj.name) ? String(obj.name).trim() : heuristic.name,
    kind: obj.kind === 'subagent' ? 'subagent' : 'skill',
    skillRole: hasText(obj.skillRole) ? String(obj.skillRole).trim() : heuristic.skillRole,
    skillCategory: hasText(obj.skillCategory) ? String(obj.skillCategory).trim() : heuristic.skillCategory,
    version: hasText(obj.version) ? String(obj.version).trim() : heuristic.version,
    description: hasText(obj.description) ? String(obj.description).trim() : heuristic.description,
    sourceRef: { path: path.relative(process.cwd(), filePath) },
    applicableScenes: uniq(Array.isArray(obj.applicableScenes) ? obj.applicableScenes : heuristic.applicableScenes),
    triggerHints: uniq(Array.isArray(obj.triggerHints) ? obj.triggerHints : heuristic.triggerHints),
    requiredTools: uniq(Array.isArray(obj.requiredTools) ? obj.requiredTools : heuristic.requiredTools),
    toolSignals: uniq(Array.isArray(obj.toolSignals) ? obj.toolSignals : heuristic.toolSignals),
    entrypointHints: uniq(Array.isArray(obj.entrypointHints) ? obj.entrypointHints : heuristic.entrypointHints),
    toolFamilies: uniq(Array.isArray(obj.toolFamilies) ? obj.toolFamilies : heuristic.toolFamilies),
    reportHints: uniq(Array.isArray(obj.reportHints) ? obj.reportHints : heuristic.reportHints),
    stopRuleHints: uniq(Array.isArray(obj.stopRuleHints) ? obj.stopRuleHints : heuristic.stopRuleHints),
    constraintHints: uniq(Array.isArray(obj.constraintHints) ? obj.constraintHints : heuristic.constraintHints),
    workflowSkeletonSummary: hasText(obj.workflowSkeletonSummary) ? String(obj.workflowSkeletonSummary).trim() : heuristic.workflowSkeletonSummary,
    tags: uniq(Array.isArray(obj.tags) ? obj.tags : heuristic.tags),
  };
}

function validateSkillIr(entry) {
  const errors = [];
  if (!hasText(entry?.id)) errors.push({ code: 'INVALID_ID', message: 'id is required' });
  if (!hasText(entry?.name)) errors.push({ code: 'INVALID_NAME', message: 'name is required' });
  if (!hasText(entry?.description)) errors.push({ code: 'INVALID_DESCRIPTION', message: 'description is required' });
  if (!hasText(entry?.skillRole)) errors.push({ code: 'INVALID_SKILL_ROLE', message: 'skillRole is required' });
  if (!hasText(entry?.skillCategory)) errors.push({ code: 'INVALID_SKILL_CATEGORY', message: 'skillCategory is required' });
  if (!hasText(entry?.sourceRef?.path)) errors.push({ code: 'INVALID_SOURCE_REF', message: 'sourceRef.path is required' });
  if (!['skill', 'subagent'].includes(entry?.kind)) errors.push({ code: 'INVALID_KIND', message: 'kind must be skill|subagent' });
  return errors;
}

async function extractSkillIr({ sourceId, filePath }) {
  const rawText = await fs.readFile(filePath, 'utf8');
  const frontmatter = extractFrontmatter(rawText);
  const skillId = `${sourceId}:${path.relative(path.resolve('skills'), path.dirname(filePath)).replace(/\\/g, '/') || path.basename(path.dirname(filePath))}`;
  const heuristic = heuristicSkillIr({ skillId, filePath, frontmatter, rawText });

  const llmResult = await callJsonModel({
    stage: 'skill_ir_extraction',
    systemPrompt: 'You extract routing-oriented intermediate representations from real-world skill documents. Return JSON only.',
    userPrompt: buildSkillExtractionPrompt({ skillId, rawText, heuristic }),
    maxTokens: 2500,
  });

  const normalized = normalizeExtractedEntry(llmResult.data, heuristic, filePath);
  const errors = validateSkillIr(normalized);

  return {
    sourceId,
    skillId: normalized.id,
    entryPath: path.relative(process.cwd(), filePath),
    status: errors.length > 0 ? 'error' : 'ok',
    fields: normalized,
    registryEntry: errors.length === 0
      ? createRegistryEntry(normalized, {
          sourceId,
          scanId: null,
        })
      : null,
    errors,
    extractionMeta: llmResult.meta,
  };
}

function buildSummary(records) {
  return {
    total: records.length,
    ok: records.filter((record) => record.status === 'ok').length,
    error: records.filter((record) => record.status === 'error').length,
    skipped: 0,
  };
}

export async function runRegistryScanPipeline({ sourceDir, sourceId }) {
  if (!hasText(sourceDir) || !hasText(sourceId)) {
    throw new Error('runRegistryScanPipeline requires sourceDir and sourceId');
  }

  const scanId = `scan_${randomUUID()}`;
  const startedAt = nowIso();
  const skillFiles = await walkSkillFiles(sourceDir);
  const records = [];

  for (const filePath of skillFiles) {
    records.push(await extractSkillIr({ sourceId, filePath }));
  }

  for (const record of records) {
    if (record.status !== 'ok' || !record.registryEntry) continue;
    const entryWithScan = createRegistryEntry(record.fields, {
      sourceId,
      scanId,
    });
    saveRegistryEntry(entryWithScan);
    record.registryEntry = entryWithScan;
  }

  const result = {
    scanId,
    sourceId,
    sourceDir: path.resolve(sourceDir),
    startedAt,
    finishedAt: nowIso(),
    summary: buildSummary(records),
    records,
  };

  const artifactDir = path.resolve('.skillforge/registry/scans');
  await fs.mkdir(artifactDir, { recursive: true });
  const artifactPath = path.join(artifactDir, `${scanId}.json`);
  await fs.writeFile(artifactPath, JSON.stringify(result, null, 2), 'utf8');

  return { ...result, artifactPath };
}

export default runRegistryScanPipeline;
