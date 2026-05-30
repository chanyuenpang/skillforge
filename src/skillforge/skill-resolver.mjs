import path from 'node:path';
import { runRegistryScanPipeline } from './registry-scan-pipeline.mjs';
import { callJsonModel } from './llm-json.mjs';

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

function collectContextSignals(context = {}) {
  const signals = uniq([
    ...toArray(context.tags),
    ...toArray(context.tools),
    ...toArray(context.capabilities),
    ...tokenize(context.intent || ''),
    ...tokenize(context.description || context.text || ''),
  ]);

  return {
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
  description: candidate.description,
  applicableScenes: candidate.applicableScenes,
  requiredTools: candidate.requiredTools,
  entrypointHints: candidate.entrypointHints,
  workflowSkeletonSummary: candidate.workflowSkeletonSummary,
  heuristicScore: candidate.heuristicScore,
})), null, 2)}

Rules:
- prefer the smallest useful set
- select up to 4 skills
- preserve skills that provide dominant workflow shape or critical constraints
- if a candidate is not selected, provide a short reason`;
}

function summarizeCandidateForDebug(candidate) {
  return {
    id: candidate.id,
    name: candidate.name,
    kind: candidate.kind,
    description: candidate.description,
    requiredTools: candidate.requiredTools || [],
    applicableScenes: candidate.applicableScenes || [],
    triggerHints: candidate.triggerHints || [],
    entrypointHints: candidate.entrypointHints || [],
    workflowSkeletonSummary: candidate.workflowSkeletonSummary || '',
    heuristicScore: candidate.heuristicScore,
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
  sourceDir = path.resolve('skills'),
  sourceId = 'local-skills',
  maxCandidates = 8,
} = {}) {
  const contextSignals = collectContextSignals(context);
  const scan = await runRegistryScanPipeline({ sourceDir, sourceId });
  const entries = scan.records.filter((record) => record.status === 'ok' && record.fields).map((record) => record.fields);
  const { shortlisted, rejected } = topCandidates(entries, contextSignals, explicitSkills, maxCandidates);
  const routingPrompt = buildRoutingPrompt(contextSignals, shortlisted);

  return {
    sourceId,
    scanId: scan.scanId,
    scanArtifactPath: scan.artifactPath,
    contextSignals,
    totalIndexedSkills: entries.length,
    shortlisted: shortlisted.map(summarizeCandidateForDebug),
    rejected,
    routingPrompt,
  };
}

export async function resolveSkills({
  context = {},
  explicitSkills = [],
  sourceDir = path.resolve('skills'),
  sourceId = 'local-skills',
  maxCandidates = 8,
} = {}) {
  const contextSignals = collectContextSignals(context);
  const scan = await runRegistryScanPipeline({ sourceDir, sourceId });
  const entries = scan.records.filter((record) => record.status === 'ok' && record.fields).map((record) => record.fields);

  const { shortlisted, rejected } = topCandidates(entries, contextSignals, explicitSkills, maxCandidates);
  if (shortlisted.length === 0) {
    return {
      kind: 'skill-routing-result',
      version: '1.0.0',
      sourceId,
      scanId: scan.scanId,
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
        llmCalled: false,
        model: null,
        candidateCount: 0,
        scanArtifactPath: scan.artifactPath,
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
    systemPrompt: 'You perform semantic skill routing over a bounded candidate set. Return JSON only.',
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
    scanId: scan.scanId,
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
      llmCalled: lmResult.meta.llmCalled,
      model: lmResult.meta.model,
      candidateCount: shortlisted.length,
      scanArtifactPath: scan.artifactPath,
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
