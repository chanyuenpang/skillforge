import { existsSync, mkdirSync, appendFileSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { buildRawArtifact, saveRawArtifact, loadRawArtifactById } from "./raw-artifact-store.mjs";

const STORE_DIR = `${homedir()}/.skillforge`;
const STORE_PATH = `${STORE_DIR}/execution-record-store.jsonl`;

export const EXECUTION_RECORD_CONTRACT_VERSION = "execution-record-v1";
export const EXECUTION_STATUS = Object.freeze({
  PENDING: "pending",
  RUNNING: "running",
  SUCCEEDED: "succeeded",
  FAILED: "failed",
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

function nowISO() {
  return new Date().toISOString();
}

function randomId(prefix = "ex") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
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

export function buildExecutionRecord({ executionId = randomId("ex"), runId, status = EXECUTION_STATUS.PENDING } = {}) {
  if (typeof runId !== "string" || runId.trim().length === 0) {
    throw new Error("runId is required");
  }
  return {
    executionId,
    runId,
    status,
    startedAt: null,
    endedAt: null,
    rawInputArtifactId: null,
    rawOutputArtifactId: null,
    rawErrorArtifactId: null,
    contractVersion: EXECUTION_RECORD_CONTRACT_VERSION,
  };
}

function persist(record) {
  ensureStoreDir();
  appendFileSync(STORE_PATH, JSON.stringify(record) + "\n", "utf8");
  return { ok: true, executionId: record.executionId, path: STORE_PATH };
}

export function createExecutionWithInput({ runId, inputPayload, inputContentType = "application/json", producer = "skillforge" } = {}) {
  const record = buildExecutionRecord({ runId });
  const inputArtifact = buildRawArtifact({
    executionId: record.executionId,
    kind: "input",
    contentType: inputContentType,
    storageType: "inline",
    payload: inputPayload,
    producer,
  });
  saveRawArtifact(inputArtifact);
  record.rawInputArtifactId = inputArtifact.artifactId;
  persist(record);
  return record;
}

export function startExecution(record) {
  if (!record || typeof record !== "object") throw new Error("record is required");
  assertArtifactResolvable(record.rawInputArtifactId, "rawInputArtifactId");
  if (record.status !== EXECUTION_STATUS.PENDING && record.status !== EXECUTION_STATUS.FAILED) {
    throw new Error(`Cannot enter running from status=${record.status}`);
  }
  const next = { ...record, status: EXECUTION_STATUS.RUNNING, startedAt: record.startedAt ?? nowISO() };
  persist(next);
  return next;
}

export function finishExecutionSucceeded(record, { outputPayload, outputContentType = "application/json", producer = "skillforge" } = {}) {
  if (record.status !== EXECUTION_STATUS.RUNNING) {
    throw new Error(`Cannot mark succeeded from status=${record.status}`);
  }
  const outputArtifact = buildRawArtifact({
    executionId: record.executionId,
    kind: "output",
    contentType: outputContentType,
    storageType: "inline",
    payload: outputPayload,
    producer,
  });
  saveRawArtifact(outputArtifact);

  const next = {
    ...record,
    status: EXECUTION_STATUS.SUCCEEDED,
    rawOutputArtifactId: outputArtifact.artifactId,
    endedAt: nowISO(),
  };

  assertArtifactResolvable(next.rawOutputArtifactId, "rawOutputArtifactId");
  persist(next);
  return next;
}

export function finishExecutionFailed(record, { errorPayload, errorContentType = "application/json", producer = "skillforge" } = {}) {
  if (record.status !== EXECUTION_STATUS.RUNNING) {
    throw new Error(`Cannot mark failed from status=${record.status}`);
  }
  const errorArtifact = buildRawArtifact({
    executionId: record.executionId,
    kind: "error",
    contentType: errorContentType,
    storageType: "inline",
    payload: errorPayload,
    producer,
  });
  saveRawArtifact(errorArtifact);

  const next = {
    ...record,
    status: EXECUTION_STATUS.FAILED,
    rawErrorArtifactId: errorArtifact.artifactId,
    endedAt: nowISO(),
  };

  assertArtifactResolvable(next.rawErrorArtifactId, "rawErrorArtifactId");
  persist(next);
  return next;
}

export function validateTerminalGate(record) {
  if (record.status === EXECUTION_STATUS.SUCCEEDED) {
    assertArtifactResolvable(record.rawOutputArtifactId, "rawOutputArtifactId");
  }
  if (record.status === EXECUTION_STATUS.FAILED) {
    assertArtifactResolvable(record.rawErrorArtifactId, "rawErrorArtifactId");
  }
  return true;
}

export function loadLatestExecution(executionId) {
  const entries = readAllLines();
  let found = null;
  for (const e of entries) {
    if (e.executionId === executionId) found = e;
  }
  return found;
}

export default {
  buildExecutionRecord,
  createExecutionWithInput,
  startExecution,
  finishExecutionSucceeded,
  finishExecutionFailed,
  validateTerminalGate,
  loadLatestExecution,
};