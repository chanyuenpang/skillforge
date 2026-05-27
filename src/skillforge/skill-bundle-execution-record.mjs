import { buildExecutionLogEntry } from "./execution-log-store.mjs";
import { buildSkillBundleFallback } from "./skill-bundle-fallback.mjs";

function toSafeSlug(value, fallback = "skill-bundle") {
  const s = String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "").slice(0, 48);
  return s || fallback;
}

function summarizeBundleInput(input) {
  if (!input) return null;
  return {
    projectGoal: input?.projectGoal ?? null,
    context: input?.context ?? null,
    candidateCount: Array.isArray(input?.candidates) ? input.candidates.length : null,
    topK: input?.topK ?? null,
  };
}

function summarizeBundleMatch(matchResult) {
  if (!matchResult || typeof matchResult !== "object") {
    return { selectedCount: 0, score: null, reason: null };
  }

  const selected = Array.isArray(matchResult?.selectedSkills)
    ? matchResult.selectedSkills
    : Array.isArray(matchResult?.selected)
      ? matchResult.selected
      : [];

  return {
    selectedCount: selected.length,
    score: typeof matchResult?.score === "number" ? matchResult.score : null,
    reason: matchResult?.reason ?? null,
  };
}

export function buildSkillBundleExecutionRecord(input, matchResult, opts = {}) {
  const status = opts.status ?? "completed";
  const slug = toSafeSlug(input?.projectGoal ?? input?.context ?? "skill-bundle", "skill-bundle");
  const bundleRef = opts.bundleRef ?? `skill-bundle-${slug}`;

  const record = buildExecutionLogEntry({
    fixtureId: bundleRef,
    status,
    source: "skill-bundle-soft-recommendation",
    input: null,
    output: null,
    durationMs: opts.durationMs ?? null,
  });

  const bundleSummary = summarizeBundleMatch(matchResult);
  const fallback = buildSkillBundleFallback(matchResult, {
    lowConfidenceThreshold: opts.lowConfidenceThreshold ?? 8,
  });

  return {
    ...record,
    kind: "skillbundle.execution",
    id: record.executionId,
    createdAt: record.timestamp,

    inputSummary: summarizeBundleInput(input),
    selectedCount: bundleSummary.selectedCount,
    score: bundleSummary.score,
    reason: bundleSummary.reason,

    bundleRef,
    selectedSkills: Array.isArray(matchResult?.selectedSkills)
      ? matchResult.selectedSkills
      : Array.isArray(matchResult?.selected)
        ? matchResult.selected
        : [],
    planRef: opts.planRef ?? null,
    taskRef: opts.taskRef ?? null,
    traceRefs: opts.traceRefs ?? null,
    artifactPath: opts.artifactPath ?? null,

    fallback,
    metadata: {
      fallback_used: fallback.fallback_used,
      fallback_mode: fallback.fallback_mode,
      alert_level: fallback.alert_level,
      confidence: fallback.confidence,
      fallback_reason: fallback.fallback_reason,
      non_blocking: fallback.non_blocking,
      recoverable: fallback.recoverable,
      score: fallback.score,
      threshold: fallback.threshold,
    },
  };
}

export const toExecutionLogEvent = buildSkillBundleExecutionRecord;

export async function saveSkillBundleExecutionRecord(record) {
  const { save } = await import("./execution-log-store.mjs");
  return save(record);
}

export default buildSkillBundleExecutionRecord;
