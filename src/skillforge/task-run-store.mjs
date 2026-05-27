/**
 * task-run-store.mjs — Unified task runner store for the end-to-end loop (M4)
 *
 * Provides:
 *  - Idempotent task creation (same fixtureId + idempotencyKey → no duplicate)
 *  - Status state machine: pending → running → completed | failed
 *  - Retry: failed → running → completed | failed
 *  - Structured lifecycle records: init/start/output/fail/retry
 *  - Query by taskRunId, fixtureId, parentPlanId
 *
 * Persistence: ~/.skillforge/task-run-store.jsonl (append-only JSON Lines)
 *
 * Pattern follows risk-store.mjs (idempotency) + execution-log-store.mjs (JSONL append)
 */

import { existsSync, mkdirSync, appendFileSync, readFileSync } from "node:fs";
import { homedir } from "node:os";

const STORE_DIR = `${homedir()}/.skillforge`;
const STORE_PATH = `${STORE_DIR}/task-run-store.jsonl`;

export const TASK_RUN_STORE_VERSION = "task-run-store-v1";

// ── Status constants ───────────────────────────────────────────────────────
export const TASK_RUN_STATUS = Object.freeze({
  PENDING: "pending",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
});

export const TASK_RUN_STATUS_VALUES = [
  TASK_RUN_STATUS.PENDING,
  TASK_RUN_STATUS.RUNNING,
  TASK_RUN_STATUS.COMPLETED,
  TASK_RUN_STATUS.FAILED,
];

// ── Event type constants ───────────────────────────────────────────────────────
export const TASK_RUN_EVENT = Object.freeze({
  INIT: "task-run-init",
  STARTED: "task-run-started",
  OUTPUT: "task-run-output",
  FAILED: "task-run-failed",
  RETRY: "task-run-retry",
  COMPLETED: "task-run-completed",
});

// ── State transition map (valid transitions) ───────────────────────────────
const VALID_TRANSITIONS = {
  [TASK_RUN_STATUS.PENDING]: [TASK_RUN_STATUS.RUNNING],
  [TASK_RUN_STATUS.RUNNING]: [TASK_RUN_STATUS.COMPLETED, TASK_RUN_STATUS.FAILED],
  [TASK_RUN_STATUS.FAILED]: [TASK_RUN_STATUS.RUNNING], // retry
  [TASK_RUN_STATUS.COMPLETED]: [], // terminal
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function ensureStoreDir() {
  if (!existsSync(STORE_DIR)) {
    mkdirSync(STORE_DIR, { recursive: true });
  }
}

function readAllLines() {
  if (!existsSync(STORE_PATH)) return [];
  const raw = readFileSync(STORE_PATH, "utf8").trim();
  if (!raw) return [];
  return raw
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function randomId(prefix = "tr") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowISO() {
  return new Date().toISOString();
}

// ── Idempotency lookup ─────────────────────────────────────────────────────

/**
 * Find an existing task run by its idempotencyKey.
 * Scans from newest to oldest for efficiency.
 */
function findByIdempotencyKey(key) {
  if (!key) return null;
  const entries = readAllLines();
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    if (e.event === TASK_RUN_EVENT.INIT && e.idempotencyKey === key) {
      return e;
    }
  }
  return null;
}

// ── State derivation ────────────────────────────────────────────────────────

/**
 * Derive the current state for a taskRunId from all events.
 */
function deriveState(taskRunId) {
  const all = readAllLines().filter((e) => e.taskRunId === taskRunId);
  if (all.length === 0) return null;

  // Find the latest status-bearing event
  let state = TASK_RUN_STATUS.PENDING;
  for (const e of all) {
    switch (e.event) {
      case TASK_RUN_EVENT.INIT:
        state = TASK_RUN_STATUS.PENDING;
        break;
      case TASK_RUN_EVENT.STARTED:
        state = TASK_RUN_STATUS.RUNNING;
        break;
      case TASK_RUN_EVENT.OUTPUT:
        // output doesn't change status — it's a record within running/completed
        break;
      case TASK_RUN_EVENT.FAILED:
        state = TASK_RUN_STATUS.FAILED;
        break;
      case TASK_RUN_EVENT.RETRY:
        state = TASK_RUN_STATUS.RUNNING;
        break;
      case TASK_RUN_EVENT.COMPLETED:
        state = TASK_RUN_STATUS.COMPLETED;
        break;
    }
  }
  return state;
}

/**
 * Collect the last event of each type for a taskRunId.
 */
function collectLineage(taskRunId) {
  const all = readAllLines().filter((e) => e.taskRunId === taskRunId);
  const byType = {};
  for (const e of all) {
    byType[e.event] = e;
  }
  return {
    events: all,
    currentStatus: deriveState(taskRunId),
    init: byType[TASK_RUN_EVENT.INIT] || null,
    started: byType[TASK_RUN_EVENT.STARTED] || null,
    outputs: all.filter((e) => e.event === TASK_RUN_EVENT.OUTPUT),
    failed: byType[TASK_RUN_EVENT.FAILED] || null,
    completed: byType[TASK_RUN_EVENT.COMPLETED] || null,
    retries: all.filter((e) => e.event === TASK_RUN_EVENT.RETRY),
    retryCount: all.filter((e) => e.event === TASK_RUN_EVENT.RETRY).length,
  };
}

// ── Validation ──────────────────────────────────────────────────────────────

function validateInitInput(input) {
  const errors = [];
  if (!input || typeof input !== "object") {
    return { valid: false, errors: [{ field: "input", message: "Input must be an object" }] };
  }
  if (typeof input.fixtureId !== "string" || input.fixtureId.trim().length === 0) {
    errors.push({ field: "fixtureId", message: "fixtureId is required (non-empty string)" });
  }
  if (typeof input.idempotencyKey !== "string" || input.idempotencyKey.trim().length === 0) {
    errors.push({ field: "idempotencyKey", message: "idempotencyKey is required (non-empty string)" });
  }
  return { valid: errors.length === 0, errors };
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * initiateTaskRun(input) — Create a new task run (idempotent).
 *
 * @param {object} input
 * @param {string} input.fixtureId      — Skill/fixture identifier
 * @param {string} input.idempotencyKey — Client-generated idempotency key
 * @param {string} [input.parentPlanId] — Optional parent plan reference
 * @param {object} [input.params]       — Arbitrary run parameters
 * @param {object} [input.metadata]     — Arbitrary metadata
 * @returns {object} { ok, taskRunId, duplicate, event, path }
 */
export function initiateTaskRun(input) {
  const check = validateInitInput(input);
  if (!check.valid) {
    const msgs = check.errors.map((e) => `${e.field}: ${e.message}`).join("; ");
    throw new Error(`TaskRun init validation failed: ${msgs}`);
  }

  // Idempotency: if already exists, return existing
  const existing = findByIdempotencyKey(input.idempotencyKey);
  if (existing) {
    const state = deriveState(existing.taskRunId);
    return {
      ok: true,
      duplicate: true,
      taskRunId: existing.taskRunId,
      idempotencyKey: existing.idempotencyKey,
      fixtureId: existing.fixtureId,
      currentStatus: state,
      path: STORE_PATH,
    };
  }

  const taskRunId = randomId("tr");
  const now = nowISO();

  const event = {
    event: TASK_RUN_EVENT.INIT,
    storeVersion: TASK_RUN_STORE_VERSION,
    taskRunId,
    fixtureId: input.fixtureId.trim(),
    idempotencyKey: input.idempotencyKey.trim(),
    parentPlanId: input.parentPlanId?.trim() || null,
    params: input.params ?? null,
    metadata: input.metadata ?? null,
    recordedAt: now,
  };

  ensureStoreDir();
  appendFileSync(STORE_PATH, JSON.stringify(event) + "\n", "utf8");

  return {
    ok: true,
    duplicate: false,
    taskRunId,
    idempotencyKey: event.idempotencyKey,
    fixtureId: event.fixtureId,
    currentStatus: TASK_RUN_STATUS.PENDING,
    path: STORE_PATH,
  };
}

/**
 * startTaskRun(taskRunId) — Transition from pending to running.
 *
 * @param {string} taskRunId
 * @returns {object}
 */
export function startTaskRun(taskRunId) {
  const state = deriveState(taskRunId);
  if (state === null) {
    throw new Error(`TaskRun not found: ${taskRunId}`);
  }
  if (state !== TASK_RUN_STATUS.PENDING && state !== TASK_RUN_STATUS.FAILED) {
    throw new Error(
      `Cannot start task run "${taskRunId}": current status is "${state}" (expected "pending" or "failed")`,
    );
  }

  ensureStoreDir();

  // If recovering from failed, emit a RETRY event first
  if (state === TASK_RUN_STATUS.FAILED) {
    const retryEvent = {
      event: TASK_RUN_EVENT.RETRY,
      storeVersion: TASK_RUN_STORE_VERSION,
      taskRunId,
      previousStatus: TASK_RUN_STATUS.FAILED,
      recordedAt: nowISO(),
    };
    appendFileSync(STORE_PATH, JSON.stringify(retryEvent) + "\n", "utf8");
  }

  const event = {
    event: TASK_RUN_EVENT.STARTED,
    storeVersion: TASK_RUN_STORE_VERSION,
    taskRunId,
    recordedAt: nowISO(),
  };

  appendFileSync(STORE_PATH, JSON.stringify(event) + "\n", "utf8");

  return {
    ok: true,
    taskRunId,
    previousStatus: state,
    currentStatus: TASK_RUN_STATUS.RUNNING,
    path: STORE_PATH,
  };
}

/**
 * recordOutput(taskRunId, output) — Record an output artifact.
 *
 * Can be called multiple times per run (streaming outputs).
 *
 * @param {string} taskRunId
 * @param {object} output
 * @param {string} [output.content]  — Text/string output
 * @param {object} [output.payload]  — Structured output payload
 * @param {string} [output.kind]     — Output kind tag (e.g. "result", "log", "artifact")
 * @returns {object}
 */
export function recordOutput(taskRunId, output = {}) {
  const state = deriveState(taskRunId);
  if (state === null) {
    throw new Error(`TaskRun not found: ${taskRunId}`);
  }

  const event = {
    event: TASK_RUN_EVENT.OUTPUT,
    storeVersion: TASK_RUN_STORE_VERSION,
    taskRunId,
    output: {
      kind: output.kind ?? "result",
      content: output.content ?? null,
      payload: output.payload ?? null,
    },
    recordedAt: nowISO(),
  };

  ensureStoreDir();
  appendFileSync(STORE_PATH, JSON.stringify(event) + "\n", "utf8");

  return {
    ok: true,
    taskRunId,
    path: STORE_PATH,
  };
}

/**
 * failTaskRun(taskRunId, error) — Transition to failed.
 *
 * @param {string} taskRunId
 * @param {object} error
 * @param {string} error.code    — Machine-readable error code
 * @param {string} error.message — Human-readable error message
 * @param {object} [error.details] — Optional structured details
 * @returns {object}
 */
export function failTaskRun(taskRunId, error = {}) {
  const state = deriveState(taskRunId);
  if (state === null) {
    throw new Error(`TaskRun not found: ${taskRunId}`);
  }
  if (state !== TASK_RUN_STATUS.RUNNING) {
    throw new Error(
      `Cannot fail task run "${taskRunId}": current status is "${state}" (expected "running")`,
    );
  }

  const event = {
    event: TASK_RUN_EVENT.FAILED,
    storeVersion: TASK_RUN_STORE_VERSION,
    taskRunId,
    error: {
      code: error.code ?? "UNKNOWN",
      message: error.message ?? "Task run failed",
      details: error.details ?? null,
    },
    recordedAt: nowISO(),
  };

  ensureStoreDir();
  appendFileSync(STORE_PATH, JSON.stringify(event) + "\n", "utf8");

  return {
    ok: true,
    taskRunId,
    previousStatus: state,
    currentStatus: TASK_RUN_STATUS.FAILED,
    errorCode: error.code ?? "UNKNOWN",
    path: STORE_PATH,
  };
}

/**
 * completeTaskRun(taskRunId, summary) — Transition to completed (terminal).
 *
 * @param {string} taskRunId
 * @param {object} [summary]
 * @param {number} [summary.durationMs] — Run duration in milliseconds
 * @param {string} [summary.message]    — Completion message
 * @returns {object}
 */
export function completeTaskRun(taskRunId, summary = {}) {
  const state = deriveState(taskRunId);
  if (state === null) {
    throw new Error(`TaskRun not found: ${taskRunId}`);
  }
  if (state !== TASK_RUN_STATUS.RUNNING) {
    throw new Error(
      `Cannot complete task run "${taskRunId}": current status is "${state}" (expected "running")`,
    );
  }

  const all = readAllLines().filter((e) => e.taskRunId === taskRunId);
  const initEvent = all.find((e) => e.event === TASK_RUN_EVENT.INIT);
  const startEvent = all.find((e) => e.event === TASK_RUN_EVENT.STARTED);
  const startAt = startEvent?.recordedAt ?? initEvent?.recordedAt;
  const endAt = nowISO();
  const durationMs = summary.durationMs ??
    (startAt ? new Date(endAt).getTime() - new Date(startAt).getTime() : 0);

  // Append a synthetic output event with the completion summary
  const completionOutput = {
    event: TASK_RUN_EVENT.OUTPUT,
    storeVersion: TASK_RUN_STORE_VERSION,
    taskRunId,
    output: {
      kind: "completion",
      content: summary.message ?? "Task completed successfully",
      payload: {
        durationMs,
        startedAt: startAt ?? null,
        completedAt: endAt,
        isTerminal: true,
      },
    },
    recordedAt: endAt,
  };

  // Also emit a dedicated COMPLETED event for state derivation
  const completedEvent = {
    event: TASK_RUN_EVENT.COMPLETED,
    storeVersion: TASK_RUN_STORE_VERSION,
    taskRunId,
    durationMs,
    message: summary.message ?? null,
    recordedAt: endAt,
  };

  ensureStoreDir();
  appendFileSync(STORE_PATH, JSON.stringify(completionOutput) + "\n", "utf8");
  appendFileSync(STORE_PATH, JSON.stringify(completedEvent) + "\n", "utf8");

  return {
    ok: true,
    taskRunId,
    previousStatus: state,
    currentStatus: TASK_RUN_STATUS.COMPLETED,
    durationMs,
    path: STORE_PATH,
  };
}

// ── Query API ───────────────────────────────────────────────────────────────

/**
 * getLineage(taskRunId) — Get the full event lineage for a task run.
 *
 * @param {string} taskRunId
 * @returns {object|null} Full lineage object, or null if not found.
 */
export function getLineage(taskRunId) {
  const lineage = collectLineage(taskRunId);
  if (lineage.events.length === 0) return null;
  return lineage;
}

/**
 * listRuns(filters) — List task runs with pagination.
 *
 * @param {object} [filters]
 * @param {string} [filters.fixtureId]   — Filter by fixtureId
 * @param {string} [filters.parentPlanId] — Filter by parentPlanId
 * @param {string} [filters.status]      — Filter by current status
 * @param {number} [filters.limit=20]    — Max items per page
 * @param {number} [filters.offset=0]    — Pagination offset
 * @returns {object} { items, total, offset, limit }
 */
export function listRuns(filters = {}) {
  const entries = readAllLines();
  const initMap = new Map();

  // Collect init events (one per run)
  for (const e of entries) {
    if (e.event === TASK_RUN_EVENT.INIT) {
      initMap.set(e.taskRunId, e);
    }
  }

  // Derive state for each run
  let runs = [...initMap.values()].map((init) => {
    const state = deriveState(init.taskRunId);
    const lineage = collectLineage(init.taskRunId);
    const startEvent = lineage.started;
    const failEvent = lineage.failed;
    const outputEvents = lineage.outputs;

    return {
      taskRunId: init.taskRunId,
      fixtureId: init.fixtureId,
      idempotencyKey: init.idempotencyKey,
      parentPlanId: init.parentPlanId,
      status: state,
      initAt: init.recordedAt,
      startedAt: startEvent?.recordedAt ?? null,
      failedAt: failEvent?.recordedAt ?? null,
      completedAt: outputEvents.find((o) => o.output?.payload?.isTerminal)?.recordedAt ?? null,
      retryCount: lineage.retryCount,
      outputCount: outputEvents.length,
      lastError: failEvent?.error ?? null,
    };
  });

  // Apply filters
  if (filters.fixtureId) {
    runs = runs.filter((r) => r.fixtureId === filters.fixtureId);
  }
  if (filters.parentPlanId) {
    runs = runs.filter((r) => r.parentPlanId === filters.parentPlanId);
  }
  if (filters.status) {
    runs = runs.filter((r) => r.status === filters.status);
  }

  // Sort by initAt descending (newest first)
  runs.sort((a, b) => (b.initAt > a.initAt ? 1 : -1));

  const limit = Math.min(Math.max(Number(filters.limit) || 20, 1), 100);
  const offset = Math.max(Number(filters.offset) || 0, 0);
  const total = runs.length;
  const items = runs.slice(offset, offset + limit);

  return { items, total, offset, limit };
}

/**
 * countRuns() — Total number of task runs.
 */
export function countRuns() {
  const entries = readAllLines();
  const ids = new Set();
  for (const e of entries) {
    if (e.event === TASK_RUN_EVENT.INIT) {
      ids.add(e.taskRunId);
    }
  }
  return ids.size;
}

export default {
  initiateTaskRun,
  startTaskRun,
  recordOutput,
  failTaskRun,
  completeTaskRun,
  getLineage,
  listRuns,
  countRuns,
  TASK_RUN_STATUS,
  TASK_RUN_STATUS_VALUES,
  TASK_RUN_EVENT,
  TASK_RUN_STORE_VERSION,
  STORE_PATH,
};
