import { buildExecutionLogEntry } from "./execution-log-store.mjs";

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
  };
}

export const toExecutionLogEvent = buildSkillBundleExecutionRecord;

export async function saveSkillBundleExecutionRecord(record) {
  const { save } = await import("./execution-log-store.mjs");
  return save(record);
}

export default buildSkillBundleExecutionRecord;
