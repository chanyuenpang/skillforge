import path from 'node:path';
import { RELATIONAL_INDEX_PATH } from './relational-index.sqlite.mjs';
import { loadIndexSnapshot, recallSkillBundle } from './relational-recall.mjs';
import { callJsonModel } from './llm-json.mjs';
import { extractTaskRecord } from './task-extraction.mjs';

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeString(value) {
  return hasText(value) ? String(value).trim().toLowerCase() : '';
}

function uniq(items = []) {
  return [...new Set(items.filter((item) => hasText(item)).map((item) => String(item).trim()))];
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function tokenize(text = '') {
  return uniq(String(text)
    .toLowerCase()
    .split(/[\s,;.!?，。；：:/\\()[\]{}"'`_-]+/)
    .filter((token) => token.length >= 2));
}

function collectContextSignals(context = {}, taskRecord = null) {
  const signals = uniq([
    ...toArray(context.tags),
    ...toArray(context.tools),
    ...toArray(context.capabilities),
    ...toArray(taskRecord?.taskTypes),
    ...toArray(taskRecord?.workflowStages),
    ...toArray(taskRecord?.artifactTargets),
    ...toArray(taskRecord?.toolHints),
    ...toArray(taskRecord?.agentArchetypes),
    ...toArray(taskRecord?.constraints),
    ...toArray(taskRecord?.reportExpectations),
    ...toArray(taskRecord?.openTags),
    ...tokenize(context.intent || ''),
    ...tokenize(context.description || context.text || ''),
    ...tokenize(taskRecord?.summary || ''),
  ]);

  return {
    taskRecord,
    tags: uniq(toArray(context.tags)),
    tools: uniq(toArray(context.tools)),
    intent: hasText(context.intent) ? context.intent.trim() : '',
    description: hasText(context.description || context.text) ? String(context.description || context.text).trim() : '',
    signals,
  };
}

function buildCandidateScore(entry, contextSignals) {
  const corpus = uniq([
    entry.name,
    entry.description,
    ...(entry.tags || []),
    ...(entry.triggerHints || []),
    ...(entry.applicableScenes || []),
    ...(entry.requiredTools || []),
    ...(entry.toolSignals || []),
  ]).flatMap((item) => tokenize(item));

  const overlap = contextSignals.signals.filter((signal) => corpus.includes(signal));
  const toolOverlap = contextSignals.tools.filter((tool) => (entry.requiredTools || []).map(normalizeString).includes(normalizeString(tool)));

  return {
    score: overlap.length + (toolOverlap.length * 2),
    overlap: uniq(overlap),
    toolOverlap: uniq(toolOverlap),
  };
}

function applyToolGate(entry, contextSignals) {
  return { allowed: true, missing: [] };
}

function topCandidates(entries, contextSignals, explicitSkills = [], maxCandidates = 8) {
  const explicit = explicitSkills.map(normalizeString).filter(Boolean);
  const scored = [];
  const rejected = [];

  for (const entry of entries) {
    const id = normalizeString(entry.id);
    if (explicit.length > 0 && !explicit.includes(id) && !explicit.includes(normalizeString(entry.name))) {
      rejected.push({ id: entry.id, reason: 'not_in_explicit_skill_set' });
      continue;
    }

    const gate = applyToolGate(entry, contextSignals);
    if (!gate.allowed) {
      rejected.push({ id: entry.id, reason: `missing_required_tools:${gate.missing.join(',')}` });
      continue;
    }

    const score = buildCandidateScore(entry, contextSignals);
    scored.push({
      ...entry,
      heuristicScore: score.score,
      heuristicOverlap: score.overlap,
      toolOverlap: score.toolOverlap,
    });
  }

  scored.sort((a, b) => b.heuristicScore - a.heuristicScore || String(a.id).localeCompare(String(b.id)));
  const shortlisted = scored.slice(0, Math.max(1, maxCandidates));
  return { shortlisted, rejected };
}

function buildRoutingPrompt(contextSignals, candidates) {
  return `You are selecting the most relevant skills for a task.

Return JSON only with:
- selectedIds: string[]
- rejected: { id: string, reason: string }[]
- rationale: string[]

Critical output rules:
- selectedIds must copy candidate ids exactly from the list below
- if the candidate set is non-empty and at least one candidate is plausibly useful, select at least one skill
- prefer the best available workflow or execution skill rather than returning an empty set
- only return an empty selectedIds array if every candidate is clearly irrelevant to the task
- prefer a small useful bundle over a single skill when the roles are complementary
- when available, aim for:
  - one primary execution skill
  - optionally one tooling or project-scoped support skill
  - optionally one verification skill
- avoid selecting multiple skills with the same role unless they are clearly complementary

Task context:
${JSON.stringify({
  intent: contextSignals.intent,
  description: contextSignals.description,
  tags: contextSignals.tags,
  tools: contextSignals.tools,
}, null, 2)}

Candidates:
${JSON.stringify(candidates.map((candidate) => ({
  id: candidate.id,
  name: candidate.name,
  kind: candidate.kind,
  skillRole: candidate.skillRole || 'reference',
  skillCategory: candidate.skillCategory || 'general',
  description: candidate.description,
  applicableScenes: candidate.applicableScenes,
  triggerHints: candidate.triggerHints,
  requiredTools: candidate.requiredTools,
  entrypointHints: candidate.entrypointHints,
  workflowSkeletonSummary: candidate.workflowSkeletonSummary,
  heuristicScore: candidate.heuristicScore,
})), null, 2)}

Rules:
- prefer the smallest useful set
- select 1 to 4 skills
- exact candidate id matching is mandatory in selectedIds
- generic implementation, workflow-shaping, planning, or execution tasks should still choose the closest useful workflow skill
- preserve skills that provide dominant workflow shape or critical constraints
- if a primary execution skill exists for the task, strongly prefer including it
- if a candidate is not selected, provide a short reason`;
}

function summarizeCandidateForDebug(candidate) {
  return {
    id: candidate.id,
    name: candidate.name,
    kind: candidate.kind,
    skillRole: candidate.skillRole || 'reference',
    skillCategory: candidate.skillCategory || 'general',
    description: candidate.description,
    requiredTools: candidate.requiredTools || [],
    applicableScenes: candidate.applicableScenes || [],
    triggerHints: candidate.triggerHints || [],
    entrypointHints: candidate.entrypointHints || [],
    workflowSkeletonSummary: candidate.workflowSkeletonSummary || '',
    heuristicScore: candidate.heuristicScore,
    recallExplain: candidate.recallExplain || null,
    heuristicOverlap: candidate.heuristicOverlap || [],
    toolOverlap: candidate.toolOverlap || [],
    sourceRef: candidate.sourceRef || null,
  };
}

function buildCandidateLookup(candidates = []) {
  const lookup = new Map();
  for (const candidate of candidates) {
    const aliases = uniq([
      candidate.id,
      normalizeString(candidate.id),
      candidate.name,
      normalizeString(candidate.name),
      String(candidate.id || '').split(':').pop(),
      normalizeString(String(candidate.id || '').split(':').pop()),
    ]);
    for (const alias of aliases) {
      if (!hasText(alias) || lookup.has(alias)) continue;
      lookup.set(alias, candidate);
    }
  }
  return lookup;
}

function normalizeLmSelection(data, candidates) {
  const candidateLookup = buildCandidateLookup(candidates);
  const matched = [];
  const unmatched = [];
  const seen = new Set();

  for (const value of toArray(data?.selectedIds)) {
    const raw = String(value).trim();
    const candidate = candidateLookup.get(raw) || candidateLookup.get(normalizeString(raw));
    if (!candidate) {
      unmatched.push(raw);
      continue;
    }
    if (seen.has(candidate.id)) continue;
    seen.add(candidate.id);
    matched.push(candidate);
  }

  const rejected = toArray(data?.rejected)
    .filter((item) => item && typeof item === 'object' && hasText(item.id))
    .map((item) => ({ id: String(item.id).trim(), reason: hasText(item.reason) ? item.reason.trim() : 'not_selected' }));
  const rationale = uniq(toArray(data?.rationale));
  return {
    selected: matched,
    rejected,
    rationale,
    rawSelectedIds: toArray(data?.selectedIds).map((id) => String(id).trim()),
    unmatchedSelectedIds: unmatched,
  };
}

export async function debugResolveSkills({
  context = {},
  explicitSkills = [],
  sourceId = 'relational-index',
  maxCandidates = 8,
  dbPath = RELATIONAL_INDEX_PATH,
} = {}) {
  const taskExtraction = await extractTaskRecord({ context });
  const contextSignals = collectContextSignals(context, taskExtraction.record);
  const snapshot = loadIndexSnapshot({ dbPath });
  const lexicalBaseline = topCandidates(snapshot.entries, contextSignals, explicitSkills, maxCandidates);
  const { shortlisted, rejected, anchors } = recallSkillBundle({
    snapshot,
    taskRecord: taskExtraction.record,
    context,
    explicitSkills,
    maxCandidates,
  });
  const routingPrompt = buildRoutingPrompt(contextSignals, shortlisted);

  return {
    sourceId,
    indexVersion: snapshot.meta.indexVersion,
    scanId: snapshot.meta.scanId,
    dbPath: snapshot.dbPath,
    taskExtraction,
    contextSignals,
    recallAnchors: anchors,
    lexicalBaseline: lexicalBaseline.shortlisted.map(summarizeCandidateForDebug),
    totalIndexedSkills: snapshot.entries.length,
    shortlisted: shortlisted.map(summarizeCandidateForDebug),
    rejected,
    routingPrompt,
  };
}

export async function resolveSkills({
  context = {},
  explicitSkills = [],
  sourceId = 'relational-index',
  maxCandidates = 8,
  dbPath = RELATIONAL_INDEX_PATH,
} = {}) {
  const taskExtraction = await extractTaskRecord({ context });
  const contextSignals = collectContextSignals(context, taskExtraction.record);
  const snapshot = loadIndexSnapshot({ dbPath });
  const lexicalBaseline = topCandidates(snapshot.entries, contextSignals, explicitSkills, maxCandidates);
  const { shortlisted, rejected, anchors } = recallSkillBundle({
    snapshot,
    taskRecord: taskExtraction.record,
    context,
    explicitSkills,
    maxCandidates,
  });
  if (shortlisted.length === 0) {
    return {
      kind: 'skill-routing-result',
      version: '1.0.0',
      sourceId,
      scanId: snapshot.meta.scanId,
      candidates: [],
      selected: [],
      rejected,
      routingRationale: ['no candidate survived hard filtering'],
      toolGateSummary: {
        availableTools: contextSignals.tools,
        rejectedCount: rejected.length,
      },
      inputContext: {
        ...contextSignals,
        explicitSkills,
      },
      metadata: {
        taskExtraction,
        recallAnchors: anchors,
        lexicalBaseline: lexicalBaseline.shortlisted.map(summarizeCandidateForDebug),
        llmCalled: false,
        model: null,
        candidateCount: 0,
        indexVersion: snapshot.meta.indexVersion,
        scanId: snapshot.meta.scanId,
        dbPath: snapshot.dbPath,
        routingPromptPreview: '',
        rawModelSelection: null,
        unmatchedSelectedIds: [],
      },
      resolvedSkills: [],
      conflictSummary: {
        totalCandidates: 0,
        totalResolved: 0,
        conflictsDetected: false,
      },
    };
  }

  const lmResult = await callJsonModel({
    stage: 'skill_routing',
    systemPrompt: 'You perform semantic skill routing over a bounded candidate set. Return JSON only and copy selectedIds exactly from the candidate list.',
    userPrompt: buildRoutingPrompt(contextSignals, shortlisted),
    maxTokens: 1800,
  });

  const normalized = normalizeLmSelection(lmResult.data, shortlisted);
  const selected = normalized.selected;
  const selectedIdSet = new Set(selected.map((item) => item.id));

  const finalRejected = uniq([
    ...rejected.map((item) => JSON.stringify(item)),
    ...shortlisted
      .filter((item) => !selectedIdSet.has(item.id))
      .map((item) => JSON.stringify({
        id: item.id,
        reason: normalized.rejected.find((rejectedItem) => rejectedItem.id === item.id)?.reason || 'not_selected_after_routing',
      })),
  ]).map((item) => JSON.parse(item));

  return {
    kind: 'skill-routing-result',
    version: '1.0.0',
    sourceId,
    scanId: snapshot.meta.scanId,
    candidates: shortlisted,
    selected,
    rejected: finalRejected,
    routingRationale: normalized.rationale.length > 0 ? normalized.rationale : ['selected by semantic routing'],
    toolGateSummary: {
      availableTools: contextSignals.tools,
      rejectedCount: rejected.length,
    },
    inputContext: {
      ...contextSignals,
      explicitSkills,
    },
      metadata: {
      taskExtraction,
      recallAnchors: anchors,
      lexicalBaseline: lexicalBaseline.shortlisted.map(summarizeCandidateForDebug),
      llmCalled: lmResult.meta.llmCalled,
      model: lmResult.meta.model,
      candidateCount: shortlisted.length,
      indexVersion: snapshot.meta.indexVersion,
      scanId: snapshot.meta.scanId,
      dbPath: snapshot.dbPath,
      routingPromptPreview: buildRoutingPrompt(contextSignals, shortlisted).slice(0, 4000),
      rawModelSelection: lmResult.data,
      unmatchedSelectedIds: normalized.unmatchedSelectedIds,
    },
    resolvedSkills: selected,
    conflictSummary: {
      totalCandidates: shortlisted.length,
      totalResolved: selected.length,
      conflictsDetected: false,
    },
  };
}

export default resolveSkills;
