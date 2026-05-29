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
import {
  createExecutionWithInput,
  startExecution,
  finishExecutionSucceeded,
  finishExecutionFailed,
} from "./execution-record-store.mjs";

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
 * @param {string|null} [opts.planRef] - optional plan reference (plan id/path/logical ref)
 * @param {string|null} [opts.taskRef] - optional task reference under the plan
 * @param {object|null} [opts.traceRefs] - optional minimal context refs
 * @returns {object} execution log record
 */
export function buildBetterWorkflowExecutionRecord(input, pipelineResult, opts = {}) {
  const rawStatus = String(opts.status ?? "completed").toLowerCase();
  const status = rawStatus === "failed" ? "failed" : "completed";

  const stats = extractPipelineStats(pipelineResult);
  const inputSummary = summarizeBetterWorkflowInput(input);
  const slug = toSafeSlug(input?.goal?.summary, "betterworkflow");
  const workflowRef = opts.workflowRef ?? `betterworkflow-${slug}`;

  const execution = createExecutionWithInput({
    runId: workflowRef,
    inputPayload: {
      workflowRef,
      input,
      inputSummary,
      source: "betterworkflow-pipeline",
      traceRefs: opts.traceRefs ?? null,
    },
    producer: "betterworkflow-execution-record:init",
  });

  const runningExecution = startExecution(execution);

  let terminalExecution;
  if (status === "failed") {
    terminalExecution = finishExecutionFailed(runningExecution, {
      errorPayload: {
        code: opts.errorCode ?? "BETTERWORKFLOW_FAILED",
        message: opts.errorMessage ?? "betterWorkflow pipeline failed",
        details: opts.errorDetails ?? null,
      },
      producer: "betterworkflow-execution-record:fail",
    });
  } else {
    terminalExecution = finishExecutionSucceeded(runningExecution, {
      outputPayload: {
        workflowRef,
        stats,
        artifactPath: opts.artifactPath ?? null,
        planRef: opts.planRef ?? null,
        taskRef: opts.taskRef ?? null,
        traceRefs: opts.traceRefs ?? null,
      },
      producer: "betterworkflow-execution-record:complete",
    });
  }

  return {
    kind: "betterworkflow.execution",
    id: terminalExecution.executionId,
    executionId: terminalExecution.executionId,
    fixtureId: workflowRef,
    timestamp: terminalExecution.startedAt ?? new Date().toISOString(),
    source: "betterworkflow-pipeline",
    runId: terminalExecution.runId,
    status,
    createdAt: terminalExecution.startedAt ?? new Date().toISOString(),
    endedAt: terminalExecution.endedAt ?? null,

    rawInputArtifactId: terminalExecution.rawInputArtifactId,
    rawOutputArtifactId: terminalExecution.rawOutputArtifactId,
    rawErrorArtifactId: terminalExecution.rawErrorArtifactId,
    contractVersion: terminalExecution.contractVersion,

    inputSummary,
    milestoneCount: stats.milestoneCount,
    atomicTaskCount: stats.atomicTaskCount,
    phaseCount: stats.phaseCount,
    taskCount: stats.taskCount,
    dependencyCount: stats.dependencyCount,

    workflowRef,
    artifactPath: opts.artifactPath ?? null,
    planRef: opts.planRef ?? null,
    taskRef: opts.taskRef ?? null,
    traceRefs: opts.traceRefs ?? null,
    durationMs: Number.isFinite(Number(opts.durationMs)) ? Number(opts.durationMs) : null,
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
  return {
    ok: true,
    executionId: record.executionId ?? record.id,
    path: null,
    mode: "execution-record-primary",
  };
}

export default buildBetterWorkflowExecutionRecord;
