/**
 * transcript-store.mjs — Persistent JSON Lines store for provider execution transcripts
 *
 * Captures real provider execution results (request/response/payload) so the
 * Web UI (Phase 16) and audit trails can consume them without re-executing.
 *
 * Follows the same pattern as review-store.mjs / prep-store.mjs / registry-store.mjs:
 *   - ~/.skillforge/transcript-store.jsonl
 *   - Append-only JSON Lines
 *   - loadById returns the latest entry for a given caseId
 *   - list returns one entry per caseId (latest wins)
 */

import { existsSync, mkdirSync, appendFileSync, readFileSync } from "node:fs";
import { homedir } from "node:os";

const STORE_DIR = `${homedir()}/.skillforge`;
const STORE_PATH = `${STORE_DIR}/transcript-store.jsonl`;

export const TRANSCRIPT_STORE_VERSION = "transcript-store-draft-1";

// ── Helpers ─────────────────────────────────────────────────────────────

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

// ── Transcript record shape ─────────────────────────────────────────────

/**
 * Build a minimal validation check for a transcript record.
 *
 * A valid transcript record must have at least:
 *   - transcriptId (string, non-empty)
 *   - provider (string)
 *   - model (string)
 *   - caseId (string)
 *   - timestamp (ISO string)
 *   - status ("completed" | "error")
 *
 * @param {object} record
 * @returns {{ valid: boolean, errors: Array<{field: string, message: string}> }}
 */
export function validateTranscriptRecord(record) {
  const errors = [];

  if (!record || typeof record !== "object") {
    return { valid: false, errors: [{ field: "record", message: "Transcript record must be an object" }] };
  }

  if (typeof record.transcriptId !== "string" || record.transcriptId.trim().length === 0) {
    errors.push({ field: "transcriptId", message: "transcriptId is required and must be a non-empty string" });
  }

  if (typeof record.provider !== "string" || record.provider.trim().length === 0) {
    errors.push({ field: "provider", message: "provider is required and must be a non-empty string" });
  }

  if (!record.caseId || typeof record.caseId !== "string") {
    errors.push({ field: "caseId", message: "caseId is required" });
  }

  if (!record.timestamp || typeof record.timestamp !== "string") {
    errors.push({ field: "timestamp", message: "timestamp is required (ISO string)" });
  } else if (Number.isNaN(Date.parse(record.timestamp))) {
    errors.push({ field: "timestamp", message: "timestamp must be a valid ISO date string" });
  }

  if (record.status && !["completed", "error"].includes(record.status)) {
    errors.push({ field: "status", message: "status must be 'completed' or 'error' if present" });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Build a transcript record from raw provider execution data.
 *
 * @param {object} options
 * @param {string} options.caseId
 * @param {string} [options.fixtureId]
 * @param {string} options.provider - e.g. "openai"
 * @param {string} options.model - e.g. "gpt-4o-mini"
 * @param {string|object} [options.input] - The input/prompt sent to the provider
 * @param {string} [options.outputContent] - The response content
 * @param {string} [options.outputRole] - The response role
 * @param {string} [options.finishReason]
 * @param {object} [options.usage] - { promptTokens, completionTokens, totalTokens }
 * @param {number} [options.executionTimeMs]
 * @param {string} [options.providerRunId]
 * @param {string} [options.status="completed"]
 * @param {object} [options.rawResponse] - Full raw response metadata
 * @returns {object} A valid transcript record
 */
export function buildTranscriptRecord({
  caseId,
  fixtureId = null,
  provider = "openai",
  model = "unknown",
  input = null,
  outputContent = "",
  outputRole = "assistant",
  finishReason = null,
  usage = null,
  executionTimeMs = 0,
  providerRunId = null,
  status = "completed",
  rawResponse = null,
} = {}) {
  const transcriptId =
    providerRunId && typeof providerRunId === "string" && providerRunId.trim().length > 0
      ? `${provider}:${providerRunId}`
      : `${provider}:${Date.now()}:${caseId}`;

  return {
    transcriptId,
    storeVersion: TRANSCRIPT_STORE_VERSION,
    provider,
    model,
    caseId,
    fixtureId,
    timestamp: new Date().toISOString(),
    executionTimeMs,
    status,
    input,
    output: {
      role: outputRole,
      content: outputContent,
      finishReason,
    },
    usage: usage
      ? {
          promptTokens: usage.promptTokens ?? 0,
          completionTokens: usage.completionTokens ?? 0,
          totalTokens: usage.totalTokens ?? 0,
        }
      : null,
    providerRunId,
    rawResponse: rawResponse
      ? {
          handle: rawResponse.handle ?? null,
          summary: rawResponse.summary ?? null,
        }
      : null,
  };
}

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Save a transcript record to the persistent store.
 * The record is validated before storage and appended as a JSON Line.
 *
 * @param {object} record - A valid transcript record.
 * @returns {{ ok: boolean, transcriptId: string, path: string }}
 * @throws {Error} If record validation fails.
 */
export function save(record) {
  const check = validateTranscriptRecord(record);
  if (!check.valid) {
    const msgs = check.errors.map((e) => `${e.field}: ${e.message}`).join("; ");
    throw new Error(`TranscriptRecord validation failed: ${msgs}`);
  }

  ensureStoreDir();
  appendFileSync(STORE_PATH, JSON.stringify(record) + "\n", "utf8");

  return {
    ok: true,
    transcriptId: record.transcriptId,
    path: STORE_PATH,
  };
}

/**
 * Load the latest saved transcript record for a given caseId.
 *
 * Scans all persisted lines and returns the last entry whose
 * caseId matches the given id.
 *
 * @param {string} id - The caseId to look up.
 * @returns {object|null} The matching transcript record, or null if not found.
 */
export function loadById(id) {
  const entries = readAllLines();
  let found = null;
  for (const entry of entries) {
    if (entry.caseId === id) {
      found = entry;
    }
  }
  return found;
}

/**
 * List all unique transcript records in the store.
 *
 * When multiple entries share the same caseId,
 * only the latest one (last written) is returned.
 *
 * @returns {object[]} Array of transcript record objects.
 */
export function list() {
  const entries = readAllLines();
  const seen = new Map();
  for (const entry of entries) {
    seen.set(entry.caseId, entry);
  }
  return [...seen.values()];
}

/**
 * Return the count of transcript records in the store.
 *
 * @returns {number}
 */
export function count() {
  return readAllLines().length;
}

/**
 * Clear all transcript records (for testing purposes only).
 */
export function clear() {
  if (existsSync(STORE_PATH)) {
    writeFileSync(STORE_PATH, "", "utf8");
  }
}

export default {
  save,
  loadById,
  list,
  count,
  clear,
  buildTranscriptRecord,
  validateTranscriptRecord,
  TRANSCRIPT_STORE_VERSION,
};
