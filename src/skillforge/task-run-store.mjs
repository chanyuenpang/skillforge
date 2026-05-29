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
import {
  buildRawArtifact,
  saveRawArtifact,
  loadRawArtifactById,
} from "./raw-artifact-store.mjs";
import {
  buildExecutionRecord,
  startExecution,
  loadLatestExecution,
} from "./execution-record-store.mjs";

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

function assertArtifactResolvable(artifactId, fieldName) {
  if (typeof artifactId !== "string" || artifactId.trim().length === 0) {
    throw new Error(`${fieldName} is required and must be non-empty`);
  }
  const artifact = loadRawArtifactById(artifactId);
  if (!artifact) {
    throw new Error(`${fieldName} cannot be resolved: ${artifactId}`);
  }
  return artifact;
}

function deriveExecutionId(taskRunId) {
  const init = readAllLines().find((e) => e.event === TASK_RUN_EVENT.INIT && e.taskRunId === taskRunId);
  return init?.executionId ?? null;
}

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

function deriveState(taskRunId) {
  const all = readAllLines().filter((e) => e.taskRunId === taskRunId);
  if (all.length === 0) return null;

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

export function initiateTaskRun(input) {
  const check = validateInitInput(input);
  if (!check.valid) {
    const msgs = check.errors.map((e) => `${e.field}: ${e.message}`).join("; ");
    throw new Error(`TaskRun init validation failed: ${msgs}`);
  }

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

  // 1) 先写 RawArtifact(input)
  const execution = buildExecutionRecord({ runId: taskRunId });
  const inputArtifact = buildRawArtifact({
    executionId: execution.executionId,
    kind: "input",
    contentType: "application/json",
    storageType: "inline",
    payload: input.params ?? null,
    producer: "task-run-store",
  });
  saveRawArtifact(inputArtifact);

  // 2) 再写 ExecutionRecord
  const executionInit = {
    ...execution,
    rawInputArtifactId: inputArtifact.artifactId,
  };
  appendFileSync(`${STORE_DIR}/execution-record-store.jsonl`, JSON.stringify(executionInit) + "\n", "utf8");

  // 3) 最后写 task-run 事件
  const event = {
    event: TASK_RUN_EVENT.INIT,
    storeVersion: TASK_RUN_STORE_VERSION,
    taskRunId,
    executionId: executionInit.executionId,
    rawInputArtifactId: executionInit.rawInputArtifactId,
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
    executionId: executionInit.executionId,
    rawInputArtifactId: executionInit.rawInputArtifactId,
    idempotencyKey: event.idempotencyKey,
    fixtureId: event.fixtureId,
    currentStatus: TASK_RUN_STATUS.PENDING,
    path: STORE_PATH,
  };
}

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

  const executionId = deriveExecutionId(taskRunId);
  if (!executionId) {
    throw new Error(`ExecutionRecord not found for task run: ${taskRunId}`);
  }
  const latestExecution = loadLatestExecution(executionId);
  if (!latestExecution) {
    throw new Error(`ExecutionRecord cannot be loaded: ${executionId}`);
  }

  // 进入 running 前：强校验 rawInputArtifactId 存在且可解析
  assertArtifactResolvable(latestExecution.rawInputArtifactId, "rawInputArtifactId");
  const runningExecution = startExecution(latestExecution);

  ensureStoreDir();

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
    executionId: runningExecution.executionId,
    rawInputArtifactId: runningExecution.rawInputArtifactId,
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

export function recordOutput(taskRunId, output = {}) {
  const state = deriveState(taskRunId);
  if (state === null) {
    throw new Error(`TaskRun not found: ${taskRunId}`);
  }

  const executionId = deriveExecutionId(taskRunId);
  if (!executionId) {
    throw new Error(`ExecutionRecord not found for task run: ${taskRunId}`);
  }

  const outputArtifact = buildRawArtifact({
    executionId,
    kind: "output",
    contentType: "application/json",
    storageType: "inline",
    payload: output.payload ?? output.content ?? null,
    producer: "task-run-store",
  });
  saveRawArtifact(outputArtifact);

  const event = {
    event: TASK_RUN_EVENT.OUTPUT,
    storeVersion: TASK_RUN_STORE_VERSION,
    taskRunId,
    executionId,
    rawOutputArtifactId: outputArtifact.artifactId,
    // 兼容展示字段（派生视图）
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

  const executionId = deriveExecutionId(taskRunId);
  if (!executionId) {
    throw new Error(`ExecutionRecord not found for task run: ${taskRunId}`);
  }
  const execution = loadLatestExecution(executionId);
  if (!execution) {
    throw new Error(`ExecutionRecord cannot be loaded: ${executionId}`);
  }

  // 终态：先写 RawArtifact(error)，再回写 ExecutionRecord
  const errorArtifact = buildRawArtifact({
    executionId,
    kind: "error",
    contentType: "application/json",
    storageType: "inline",
    payload: {
      code: error.code ?? "UNKNOWN",
      message: error.message ?? "Task run failed",
      details: error.details ?? null,
    },
    producer: "task-run-store",
  });
  saveRawArtifact(errorArtifact);

  const failedExecution = {
    ...execution,
    status: "failed",
    rawErrorArtifactId: errorArtifact.artifactId,
    endedAt: nowISO(),
  };
  assertArtifactResolvable(failedExecution.rawErrorArtifactId, "rawErrorArtifactId");
  appendFileSync(`${STORE_DIR}/execution-record-store.jsonl`, JSON.stringify(failedExecution) + "\n", "utf8");

  const event = {
    event: TASK_RUN_EVENT.FAILED,
    storeVersion: TASK_RUN_STORE_VERSION,
    taskRunId,
    executionId,
    rawErrorArtifactId: failedExecution.rawErrorArtifactId,
    // 兼容展示字段（派生视图）
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

  const executionId = deriveExecutionId(taskRunId);
  if (!executionId) {
    throw new Error(`ExecutionRecord not found for task run: ${taskRunId}`);
  }
  const execution = loadLatestExecution(executionId);
  if (!execution) {
    throw new Error(`ExecutionRecord cannot be loaded: ${executionId}`);
  }

  const existingOutputEvent = [...all]
    .reverse()
    .find((e) => e.event === TASK_RUN_EVENT.OUTPUT && typeof e.rawOutputArtifactId === "string");
  if (!existingOutputEvent?.rawOutputArtifactId) {
    throw new Error(
      `Cannot complete task run "${taskRunId}": missing output artifact (record output before completion)`,
    );
  }
  assertArtifactResolvable(existingOutputEvent.rawOutputArtifactId, "rawOutputArtifactId");

  const succeededExecution = {
    ...execution,
    status: "succeeded",
    rawOutputArtifactId: existingOutputEvent.rawOutputArtifactId,
    endedAt: endAt,
  };
  appendFileSync(`${STORE_DIR}/execution-record-store.jsonl`, JSON.stringify(succeededExecution) + "\n", "utf8");

  const completionOutput = {
    event: TASK_RUN_EVENT.OUTPUT,
    storeVersion: TASK_RUN_STORE_VERSION,
    taskRunId,
    executionId,
    rawOutputArtifactId: succeededExecution.rawOutputArtifactId,
    // 兼容展示字段（派生视图）
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

  const completedEvent = {
    event: TASK_RUN_EVENT.COMPLETED,
    storeVersion: TASK_RUN_STORE_VERSION,
    taskRunId,
    executionId,
    rawOutputArtifactId: succeededExecution.rawOutputArtifactId,
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

export function getLineage(taskRunId) {
  const lineage = collectLineage(taskRunId);
  if (lineage.events.length === 0) return null;
  return lineage;
}

export function listRuns(filters = {}) {
  const entries = readAllLines();
  const initMap = new Map();

  for (const e of entries) {
    if (e.event === TASK_RUN_EVENT.INIT) {
      initMap.set(e.taskRunId, e);
    }
  }

  let runs = [...initMap.values()].map((init) => {
    const state = deriveState(init.taskRunId);
    const lineage = collectLineage(init.taskRunId);
    const startEvent = lineage.started;
    const failEvent = lineage.failed;
    const outputEvents = lineage.outputs;

    return {
      taskRunId: init.taskRunId,
      executionId: init.executionId ?? null,
      rawInputArtifactId: init.rawInputArtifactId ?? null,
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

  if (filters.fixtureId) {
    runs = runs.filter((r) => r.fixtureId === filters.fixtureId);
  }
  if (filters.parentPlanId) {
    runs = runs.filter((r) => r.parentPlanId === filters.parentPlanId);
  }
  if (filters.status) {
    runs = runs.filter((r) => r.status === filters.status);
  }

  runs.sort((a, b) => (b.initAt > a.initAt ? 1 : -1));

  const limit = Math.min(Math.max(Number(filters.limit) || 20, 1), 100);
  const offset = Math.max(Number(filters.offset) || 0, 0);
  const total = runs.length;
  const items = runs.slice(offset, offset + limit);

  return { items, total, offset, limit };
}

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