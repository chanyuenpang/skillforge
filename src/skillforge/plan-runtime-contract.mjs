/**
 * plan-runtime-contract.mjs — Plan Runtime input/output contracts
 *
 * Defines the data types consumed and produced by the plan runtime engine.
 * Purely structural — no logic, no I/O, no platform/model coupling.
 *
 * Outputs:
 *  - PlanRuntimeInput  (PlanDTO + completed set)
 *  - PlanRuntimeOutput (task states + ready/blocked + recommendations)
 */

// ── Runtime Status Constants ─────────────────────────────────────────────────

export const RUNTIME_STATUS_VALUES = Object.freeze([
  'pending',
  'ready',
  'in_progress',
  'done',
  'blocked',
  'failed',
]);

// ── Block Reason Constants ───────────────────────────────────────────────────

export const BLOCK_REASON_VALUES = Object.freeze([
  'predecessor_not_done',
  'predecessor_failed',
  'missing_dependency',
  'circular_dependency',
  'self_dependency',
  'blocked_by_phase',
]);

// ── Input Contract ───────────────────────────────────────────────────────────

/**
 * PlanRuntimeInput
 *
 * @property {object}  planDTO          — Validated PlanDTO from plan-dto-mapper
 * @property {string[]} completedTaskIds — Set of task ids already marked done
 * @property {string[]} [failedTaskIds]  — Set of task ids marked failed (optional)
 * @property {string}  [activeTaskId]    — Currently in_progress task (optional, at most one)
 */
export function createRuntimeInput(planDTO, completedTaskIds = [], failedTaskIds = [], activeTaskId = null) {
  return Object.freeze({
    planDTO: Object.freeze(planDTO),
    completedTaskIds: Object.freeze([...new Set(completedTaskIds)]),
    failedTaskIds: Object.freeze([...new Set(failedTaskIds)]),
    activeTaskId: activeTaskId ?? null,
  });
}

// ── Output Contract ──────────────────────────────────────────────────────────

/**
 * TaskRuntimeState
 *
 * Per-task runtime evaluation result.
 *
 * @property {string}   taskId
 * @property {string}   status       — one of RUNTIME_STATUS_VALUES
 * @property {string[]} blockingBy   — taskIds that are blocking this task
 * @property {string[]} blockReasons — why blocked (from BLOCK_REASON_VALUES)
 * @property {string}   recommendation — human-readable suggestion
 */
export function createTaskRuntimeState(taskId, status, blockingBy = [], blockReasons = [], recommendation = '') {
  return Object.freeze({
    taskId,
    status,
    blockingBy: Object.freeze([...blockingBy]),
    blockReasons: Object.freeze([...blockReasons]),
    recommendation,
  });
}

/**
 * PlanRuntimeOutput
 *
 * Aggregate output of a full plan runtime evaluation.
 *
 * @property {TaskRuntimeState[]} taskStates      — per-task evaluated state
 * @property {string[]}           readyTaskIds    — tasks ready to proceed
 * @property {string[]}           blockedTaskIds  — tasks currently blocked
 * @property {string[]}           doneTaskIds     — tasks completed
 * @property {string[]}           failedTaskIds   — tasks that failed
 * @property {string}             summary         — one-line status summary
 * @property {object}             metadata        — evaluation metadata (invariant checks, cycle info)
 */
export function createRuntimeOutput(taskStates, summary = '', metadata = {}) {
  const ready = taskStates.filter((t) => t.status === 'ready').map((t) => t.taskId);
  const blocked = taskStates.filter((t) => t.status === 'blocked').map((t) => t.taskId);
  const done = taskStates.filter((t) => t.status === 'done').map((t) => t.taskId);
  const failed = taskStates.filter((t) => t.status === 'failed').map((t) => t.taskId);

  return Object.freeze({
    taskStates: Object.freeze([...taskStates]),
    readyTaskIds: Object.freeze(ready),
    blockedTaskIds: Object.freeze(blocked),
    doneTaskIds: Object.freeze(done),
    failedTaskIds: Object.freeze(failed),
    summary: summary || buildDefaultSummary(taskStates),
    metadata: Object.freeze({ ...metadata }),
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildDefaultSummary(taskStates) {
  const counts = { pending: 0, ready: 0, in_progress: 0, done: 0, blocked: 0, failed: 0 };
  for (const t of taskStates) {
    if (counts[t.status] !== undefined) counts[t.status]++;
  }
  const total = taskStates.length;
  const parts = [];
  if (counts.ready > 0) parts.push(`${counts.ready} ready`);
  if (counts.blocked > 0) parts.push(`${counts.blocked} blocked`);
  if (counts.failed > 0) parts.push(`${counts.failed} failed`);
  if (counts.in_progress > 0) parts.push(`${counts.in_progress} in progress`);
  parts.push(`${counts.done}/${total} done`);
  return parts.join(', ');
}
