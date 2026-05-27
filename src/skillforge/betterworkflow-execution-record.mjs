/**
 * betterworkflow-execution-record.mjs
 *
 * Bridges betterWorkflow pipeline results into execution-log compatible records.
 *
 * Produces a record that:
 *   - passes execution-log-store validation (can be persisted in execution-log.jsonl)
 *   - carries betterWorkflow-specific trace fields (kind, inputSummary, workflowRef, stats)
 *
 * Intentionally minimal: no UI ingestion, no full Run Center — just the record shape
 * that can later be consumed by any log viewer / Run Center.
 */
import { buildExecutionLogEntry, validateExecutionLogEntry } from "./execution-log-store.mjs";

// ── helpers ───────────────────────────────────────────────────────────

function toSafeSlug(value, fallback = "betterworkflow") {
  const s = String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "").slice(0, 48);
  return s || fallback;
}

function summarizeBetterWorkflowInput(input) {
  if (!input) return null;
  const hardRules = Array.isArray(input?.constraints?.hardRules) ? input.constraints.hardRules : [];
  return {
    goalSummary: input?.goal?.summary ?? null,
    deliverable: input?.goal?.deliverable ?? null,
    project: input?.context?.project ?? null,
    background: input?.context?.background ?? null,
    timebox: input?.constraints?.timebox ?? null,
    hardRuleCount: hardRules.length,
    hardRules: hardRules.length > 0 ? hardRules : null,
    maxMilestones: input?.parameters?.maxMilestones ?? null,
    maxAtomicTasksPerMilestone: input?.parameters?.maxAtomicTasksPerMilestone ?? null,
    depth: input?.parameters?.depth ?? null,
  };
}

function extractPipelineStats(pipelineResult) {
  const { summary } = pipelineResult ?? {};
  return {
    milestoneCount: summary?.milestoneCount ?? 0,
    atomicTaskCount: summary?.atomicTaskCount ?? 0,
    phaseCount: summary?.phaseCount ?? 0,
    taskCount: summary?.taskCount ?? 0,
    dependencyCount: summary?.dependencyCount ?? 0,
  };
}

// ── main builder ──────────────────────────────────────────────────────

/**
 * Build a betterWorkflow execution record that is compatible with
 * the existing execution-log-store shape plus betterWorkflow-specific trace
 * fields.
 *
 * @param {object} input       - original betterWorkflow input (goal/context/constraints/parameters)
 * @param {object} pipelineResult - result from runBetterWorkflowPipeline(input)
 * @param {object} [opts]
 * @param {string} [opts.artifactPath] - path to a persisted artifact (optional)
 * @param {string} [opts.workflowRef]  - human reference label (optional, defaults to input summary slug)
 * @param {number} [opts.durationMs]   - pipeline wall-clock duration in ms (optional)
 * @param {string} [opts.status]       - "completed" | "failed" (default "completed")
 * @returns {object} execution log record
 */
export function buildBetterWorkflowExecutionRecord(input, pipelineResult, opts = {}) {
  const status = opts.status ?? "completed";

  const stats = extractPipelineStats(pipelineResult);
  const inputSummary = summarizeBetterWorkflowInput(input);
  const slug = toSafeSlug(input?.goal?.summary, "betterworkflow");
  const workflowRef = opts.workflowRef ?? `betterworkflow-${slug}`;

  // Build the base execution-log record so it passes validation.
  const record = buildExecutionLogEntry({
    fixtureId: workflowRef,
    status,
    source: "betterworkflow-pipeline",
    input: null,
    output: null,
    durationMs: opts.durationMs ?? null,
  });

  // Attach betterWorkflow-specific trace fields on top of the base record.
  return {
    ...record,

    // ── betterWorkflow trace envelope ──────────────────────────────
    kind: "betterworkflow.execution",
    // source / id / createdAt are already on record; expose id as an alias
    id: record.executionId,
    createdAt: record.timestamp,

    // ── input summary ──────────────────────────────────────────────
    inputSummary,

    // ── pipeline stats ─────────────────────────────────────────────
    milestoneCount: stats.milestoneCount,
    atomicTaskCount: stats.atomicTaskCount,
    phaseCount: stats.phaseCount,
    taskCount: stats.taskCount,
    dependencyCount: stats.dependencyCount,

    // ── refs ───────────────────────────────────────────────────────
    workflowRef,
    artifactPath: opts.artifactPath ?? null,
    planRef: null, // reserved for future plan/runtime link
  };
}

/**
 * Alias for easier discovery.
 */
export const toExecutionLogEvent = buildBetterWorkflowExecutionRecord;

/**
 * Validate and persist a betterWorkflow record through the execution-log-store.
 *
 * @param {object} record - record produced by buildBetterWorkflowExecutionRecord
 * @returns {{ ok: boolean, executionId: string, path: string }}
 * @throws if validation fails
 */
export async function saveBetterWorkflowExecutionRecord(record) {
  // Strip extra fields that execution-log-store doesn't know about;
  // save() does its own shape-check, so we pass the record as-is — the
  // store only validates its own required fields.
  const { save } = await import("./execution-log-store.mjs");
  return save(record);
}

export default buildBetterWorkflowExecutionRecord;
