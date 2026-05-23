/**
 * execution-log-store.mjs — Persistent JSON Lines store for operate execution records
 *
 * Each time skillforge-operate.mjs runs successfully, a single execution log
 * entry is appended. This gives the Web UI (Phase 16) and audit trails a
 * timeline of what happened, when, and with what result.
 *
 * Follows the same pattern as review-store.mjs / prep-store.mjs / etc.
 *   - ~/.skillforge/execution-log.jsonl
 *   - Append-only JSON Lines
 *   - loadById returns the latest entry for a given fixtureId
 *   - list returns all entries ordered by timestamp (insertion order)
 */

import { existsSync, mkdirSync, appendFileSync, readFileSync } from "node:fs";
import { homedir } from "node:os";

const STORE_DIR = `${homedir()}/.skillforge`;
const STORE_PATH = `${STORE_DIR}/execution-log.jsonl`;

export const EXECUTION_LOG_VERSION = "execution-log-draft-1";

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

function randomId() {
  return `el-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── Execution log record shape ──────────────────────────────────────────

/**
 * Build a minimal validation check for an execution log entry.
 *
 * Must have:
 *   - fixtureId (string, non-empty)
 *   - timestamp (ISO string, valid)
 *   - status ("completed" | "failed")
 *   - source (string, e.g. "skillforge-operate")
 *
 * @param {object} record
 * @returns {{ valid: boolean, errors: Array<{field: string, message: string}> }}
 */
export function validateExecutionLogEntry(record) {
  const errors = [];

  if (!record || typeof record !== "object") {
    return { valid: false, errors: [{ field: "record", message: "Execution log entry must be an object" }] };
  }

  if (typeof record.fixtureId !== "string" || record.fixtureId.trim().length === 0) {
    errors.push({ field: "fixtureId", message: "fixtureId is required and must be a non-empty string" });
  }

  if (!record.timestamp || typeof record.timestamp !== "string") {
    errors.push({ field: "timestamp", message: "timestamp is required (ISO string)" });
  } else if (Number.isNaN(Date.parse(record.timestamp))) {
    errors.push({ field: "timestamp", message: "timestamp must be a valid ISO date string" });
  }

  if (!record.status || !["completed", "failed"].includes(record.status)) {
    errors.push({ field: "status", message: "status must be 'completed' or 'failed'" });
  }

  if (typeof record.source !== "string" || record.source.trim().length === 0) {
    errors.push({ field: "source", message: "source is required and must be a non-empty string" });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Build an execution log entry.
 *
 * @param {object} options
 * @param {string} options.fixtureId
 * @param {string} [options.status="completed"]
 * @param {string} [options.source="skillforge-operate"]
 * @param {object} [options.steps] - e.g. { review: true, prep: true, registry: true }
 * @param {number} [options.durationMs]
 * @param {string} [options.errorMessage]
 * @returns {object} A valid execution log entry
 */
export function buildExecutionLogEntry({
  fixtureId,
  status = "completed",
  source = "skillforge-operate",
  steps = null,
  durationMs = null,
  errorMessage = null,
} = {}) {
  return {
    executionId: randomId(),
    logVersion: EXECUTION_LOG_VERSION,
    fixtureId,
    timestamp: new Date().toISOString(),
    status,
    source,
    steps: steps
      ? {
          review: steps.review === true,
          prep: steps.prep === true,
          registry: steps.registry === true,
        }
      : null,
    durationMs,
    errorMessage: status === "failed" ? (errorMessage ?? null) : null,
  };
}

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Save an execution log entry to the persistent store.
 * The entry is validated before storage and appended as a JSON Line.
 *
 * @param {object} entry - A valid execution log entry.
 * @returns {{ ok: boolean, executionId: string, path: string }}
 * @throws {Error} If entry validation fails.
 */
export function save(entry) {
  const check = validateExecutionLogEntry(entry);
  if (!check.valid) {
    const msgs = check.errors.map((e) => `${e.field}: ${e.message}`).join("; ");
    throw new Error(`ExecutionLog entry validation failed: ${msgs}`);
  }

  ensureStoreDir();
  appendFileSync(STORE_PATH, JSON.stringify(entry) + "\n", "utf8");

  return {
    ok: true,
    executionId: entry.executionId,
    path: STORE_PATH,
  };
}

/**
 * Load all execution log entries for a given fixtureId.
 *
 * Scans all persisted lines and returns all entries whose
 * fixtureId matches, ordered by timestamp.
 *
 * @param {string} id - The fixtureId to look up.
 * @returns {object[]} Array of matching execution log entries.
 */
export function loadById(id) {
  const entries = readAllLines();
  return entries.filter((entry) => entry.fixtureId === id);
}

/**
 * List all execution log entries, ordered by insertion (timestamp).
 *
 * @returns {object[]} Array of execution log entry objects.
 */
export function list() {
  return readAllLines();
}

/**
 * List the most recent N entries.
 *
 * @param {number} n - Number of recent entries to return.
 * @returns {object[]} Array of execution log entry objects.
 */
export function recent(n = 5) {
  const all = readAllLines();
  return all.slice(-n).reverse();
}

/**
 * Return the total count of execution log entries.
 *
 * @returns {number}
 */
export function count() {
  return readAllLines().length;
}

export default {
  save,
  loadById,
  list,
  recent,
  count,
  buildExecutionLogEntry,
  validateExecutionLogEntry,
  EXECUTION_LOG_VERSION,
};
