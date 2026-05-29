import { existsSync, mkdirSync, appendFileSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { createHash } from "node:crypto";

const STORE_DIR = `${homedir()}/.skillforge`;
const STORE_PATH = `${STORE_DIR}/raw-artifact-store.jsonl`;

export const RAW_ARTIFACT_STORE_VERSION = "raw-artifact-store-v1";
export const RAW_ARTIFACT_KIND_VALUES = ["input", "output", "error"];
export const RAW_ARTIFACT_STORAGE_TYPE_VALUES = ["inline", "ref"];

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

function randomId(prefix = "ra") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function isNil(v) {
  return v === null || v === undefined;
}

function stableHash(record) {
  return createHash("sha256").update(JSON.stringify(record)).digest("hex");
}

export function validateRawArtifact(record) {
  const errors = [];
  if (!record || typeof record !== "object") {
    return { valid: false, errors: [{ field: "record", message: "RawArtifact must be an object" }] };
  }

  if (typeof record.artifactId !== "string" || record.artifactId.trim().length === 0) {
    errors.push({ field: "artifactId", message: "artifactId is required" });
  }
  if (typeof record.executionId !== "string" || record.executionId.trim().length === 0) {
    errors.push({ field: "executionId", message: "executionId is required" });
  }
  if (!RAW_ARTIFACT_KIND_VALUES.includes(record.kind)) {
    errors.push({ field: "kind", message: `kind must be one of ${RAW_ARTIFACT_KIND_VALUES.join("|")}` });
  }
  if (typeof record.contentType !== "string" || record.contentType.trim().length === 0) {
    errors.push({ field: "contentType", message: "contentType is required" });
  }
  if (!RAW_ARTIFACT_STORAGE_TYPE_VALUES.includes(record.storageType)) {
    errors.push({ field: "storageType", message: `storageType must be one of ${RAW_ARTIFACT_STORAGE_TYPE_VALUES.join("|")}` });
  }

  if (record.storageType === "inline" && isNil(record.payload)) {
    errors.push({ field: "payload", message: "payload is required when storageType=inline" });
  }
  if (record.storageType === "ref" && (typeof record.ref !== "string" || record.ref.trim().length === 0)) {
    errors.push({ field: "ref", message: "ref is required when storageType=ref" });
  }

  if (typeof record.hash !== "string" || record.hash.trim().length === 0) {
    errors.push({ field: "hash", message: "hash is required" });
  }
  if (typeof record.createdAt !== "string" || Number.isNaN(Date.parse(record.createdAt))) {
    errors.push({ field: "createdAt", message: "createdAt must be a valid ISO date string" });
  }
  if (typeof record.producer !== "string" || record.producer.trim().length === 0) {
    errors.push({ field: "producer", message: "producer is required" });
  }

  return { valid: errors.length === 0, errors };
}

export function buildRawArtifact({
  artifactId = randomId("ra"),
  executionId,
  kind,
  contentType = "application/json",
  storageType = "inline",
  payload = null,
  ref = null,
  hash = null,
  createdAt = nowISO(),
  producer = "skillforge",
} = {}) {
  const effectiveHash = hash ?? stableHash({ executionId, kind, contentType, storageType, payload, ref, producer });

  return {
    artifactId,
    executionId,
    kind,
    contentType,
    storageType,
    payload,
    ref,
    hash: effectiveHash,
    createdAt,
    producer,
  };
}

export function saveRawArtifact(record) {
  const check = validateRawArtifact(record);
  if (!check.valid) {
    const msgs = check.errors.map((e) => `${e.field}: ${e.message}`).join("; ");
    throw new Error(`RawArtifact validation failed: ${msgs}`);
  }

  ensureStoreDir();
  appendFileSync(STORE_PATH, JSON.stringify({ storeVersion: RAW_ARTIFACT_STORE_VERSION, ...record }) + "\n", "utf8");
  return { ok: true, artifactId: record.artifactId, path: STORE_PATH };
}

export function loadRawArtifactById(artifactId) {
  const entries = readAllLines();
  let found = null;
  for (const e of entries) {
    if (e.artifactId === artifactId) found = e;
  }
  return found;
}

export default {
  buildRawArtifact,
  saveRawArtifact,
  loadRawArtifactById,
  validateRawArtifact,
  RAW_ARTIFACT_STORE_VERSION,
};