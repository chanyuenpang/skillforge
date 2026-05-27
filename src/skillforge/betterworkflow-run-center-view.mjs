/**
 * betterworkflow-run-center-view.mjs
 *
 * Minimal Run Center view converter for betterWorkflow execution records.
 *
 * Takes a betterWorkflow execution record (as produced by
 * buildBetterWorkflowExecutionRecord) and transforms it into a
 * Run Center compatible summary structure.
 *
 * This is deliberately minimal:
 *   - no web UI integration
 *   - no server-side ingestion
 *   - just a pure data transformation layer
 *
 * Intent: so when Run Center ingestion is wired up later, the view
 * contract is already defined and we avoid retrofitting.
 */

// ── helpers ───────────────────────────────────────────────────────────

function buildTitle(record) {
  if (record?.inputSummary?.goalSummary) {
    return `betterWorkflow · ${record.inputSummary.goalSummary}`;
  }
  if (record?.inputSummary?.deliverable) {
    return `betterWorkflow · ${record.inputSummary.deliverable}`;
  }
  return record?.workflowRef ?? "betterWorkflow execution";
}

function buildSummary(record) {
  const parts = [];
  if (record?.inputSummary?.project) {
    parts.push(`Project: ${record.inputSummary.project}`);
  }
  if (record?.inputSummary?.background) {
    parts.push(record.inputSummary.background);
  }
  const counts = extractCounts(record);
  parts.push(
    `${counts.milestones} milestone(s), ${counts.tasks} task(s), ${counts.phases} phase(s)`
  );
  if (typeof record?.durationMs === "number" && record.durationMs > 0) {
    parts.push(`Duration: ${record.durationMs}ms`);
  }
  return parts.join(" | ");
}

function extractCounts(record) {
  return {
    milestones: record?.milestoneCount ?? 0,
    tasks: record?.taskCount ?? 0,
    phases: record?.phaseCount ?? 0,
    dependencies: record?.dependencyCount ?? 0,
    atomicTasks: record?.atomicTaskCount ?? 0,
  };
}

function inferObservabilityStatus(record) {
  const status = String(record?.status ?? "").toLowerCase();
  if (["failed", "error"].includes(status)) return "error";
  if (["running", "pending"].includes(status)) return "degraded";
  return "ok";
}

function inferAlertLevel(obsStatus) {
  if (obsStatus === "error") return "error";
  if (obsStatus === "degraded") return "warn";
  return "info";
}

function extractInputSummary(record) {
  const src = record?.inputSummary;
  if (!src) return null;
  return {
    goalSummary: src.goalSummary ?? null,
    deliverable: src.deliverable ?? null,
    project: src.project ?? null,
    background: src.background ?? null,
    timebox: src.timebox ?? null,
    hardRuleCount: src.hardRuleCount ?? 0,
    hardRules: Array.isArray(src.hardRules) ? src.hardRules : null,
    maxMilestones: src.maxMilestones ?? null,
    maxAtomicTasksPerMilestone: src.maxAtomicTasksPerMilestone ?? null,
    depth: src.depth ?? null,
  };
}

// ── main converter ─────────────────────────────────────────────────────

/**
 * Build a Run Center compatible view from a betterWorkflow execution record.
 *
 * @param {object} record - A record produced by buildBetterWorkflowExecutionRecord()
 * @returns {object} Run Center view shape
 *
 * Output contract:
 *   - kind          — always "betterworkflow.run"
 *   - source        — source from the record
 *   - id            — execution id
 *   - createdAt     — ISO timestamp
 *   - status        — "completed" | "failed"
 *   - title         — human-readable title for UI display
 *   - summary       — one-line summary with key facts
 *   - inputSummary  — structured input summary
 *   - counts        — { milestones, tasks, phases, dependencies, atomicTasks }
 *   - planRef       — linked plan reference (may be null)
 *   - taskRef       — linked task reference (may be null)
 *   - traceRefs     — trace context refs (may be null)
 *   - workflowRef   — canonical workflow reference label
 *   - artifactRef   — path to persisted artifact (may be null)
 *   - durationMs    — pipeline wall-clock duration (may be null)
 */
export function buildBetterWorkflowRunCenterView(record) {
  if (!record || typeof record !== "object") {
    throw new Error("buildBetterWorkflowRunCenterView requires a non-null record object");
  }

  const counts = extractCounts(record);

  return {
    kind: "betterworkflow.run",
    source: record.source ?? "betterworkflow-pipeline",
    id: record.id ?? record.executionId ?? null,
    createdAt: record.createdAt ?? record.timestamp ?? null,
    status: record.status ?? "unknown",

    title: buildTitle(record),
    summary: buildSummary(record),

    inputSummary: extractInputSummary(record),

    counts,

    planRef: record.planRef ?? null,
    taskRef: record.taskRef ?? null,
    traceRefs: record.traceRefs ?? null,

    workflowRef: record.workflowRef ?? null,
    artifactRef: record.artifactPath ?? null,

    durationMs: record.durationMs ?? null,

    observability: {
      status: inferObservabilityStatus(record),
      duration_ms: Number.isFinite(Number(record.durationMs)) ? Number(record.durationMs) : 0,
      trace_refs: Array.isArray(record.traceRefs)
        ? record.traceRefs.filter((x) => typeof x === "string" && x.trim())
        : [],
      alert_level: inferAlertLevel(inferObservabilityStatus(record)),
    },
  };
}

/**
 * Alias for easier discovery.
 */
export const toRunCenterView = buildBetterWorkflowRunCenterView;

export default buildBetterWorkflowRunCenterView;
