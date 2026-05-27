/**
 * retro-store.mjs — Append-only JSON Lines store for Retro records
 *
 * Stores retro records at ~/.skillforge/retro-store.jsonl.
 * Each write is an append; state is derived by replaying all entries
 * for a given fixtureId.
 *
 * Follows the same pattern as review-store.mjs / execution-log-store.mjs.
 */

import { existsSync, mkdirSync, appendFileSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { createRetroRecord, validateRetroRecord, RETRO_DECISION_VALUES } from "./retro-record.mjs";

const STORE_DIR = `${homedir()}/.skillforge`;
const STORE_PATH = `${STORE_DIR}/retro-store.jsonl`;

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

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Create a new Retro record in "draft" status and append it to the store.
 *
 * @param {string} fixtureId
 * @param {object} [options]
 * @param {string} [options.summary]     - Optional human summary
 * @param {object} [options.metadata]    - Arbitrary metadata
 * @returns {{ ok: boolean, fixtureId: string, path: string, record: object }}
 * @throws {Error} If the record is invalid.
 */
export function createRetro(fixtureId, options = {}) {
  const record = createRetroRecord(fixtureId, options);

  const check = validateRetroRecord(record);
  if (!check.valid) {
    const msgs = check.errors.map((e) => `${e.field}: ${e.message}`).join("; ");
    throw new Error(`RetroRecord validation failed: ${msgs}`);
  }

  // Guard: don't allow a second Draft if one already exists for this fixtureId
  const existing = getRetroState(fixtureId);
  if (existing !== null) {
    throw new Error(
      `Cannot create retro: a retro already exists for fixtureId "${fixtureId}" (current status: ${existing.status})`,
    );
  }

  ensureStoreDir();
  appendFileSync(STORE_PATH, JSON.stringify(record) + "\n", "utf8");

  return {
    ok: true,
    fixtureId,
    path: STORE_PATH,
    record,
  };
}

/**
 * Finalize a Retro record — move from "draft" to "finalized" with guards.
 *
 * Minimum guards enforced:
 *   1.  evidenceAnchors must be non-empty for any finalized decision.
 *   2.  coverageScope and nonCoverageScope must both be present (non-empty string).
 *   3.  decision must be one of the three-way values:
 *       "backfill_allowed" | "backfill_deferred" | "evidence_required".
 *
 * @param {string} fixtureId
 * @param {object} options
 * @param {"backfill_allowed"|"backfill_deferred"|"evidence_required"} options.decision
 * @param {string[]}   options.evidenceAnchors   - 至少一个证据锚点
 * @param {string}     options.coverageScope     - 覆盖范围说明（非空字符串，必填）
 * @param {string}     options.nonCoverageScope  - 未覆盖范围说明（非空字符串，必填）
 * @param {string}     [options.summary]         - Human-readable summary
 * @param {object}     [options.metadata]        - Arbitrary metadata
 * @returns {{ ok: boolean, fixtureId: string, path: string, record: object }}
 * @throws {Error} If guards fail or current state is not "draft".
 */
export function finalizeRetro(fixtureId, options = {}) {
  const state = getRetroState(fixtureId);
  if (state === null) {
    throw new Error(
      `Cannot finalize retro: no retro exists for fixtureId "${fixtureId}"`,
    );
  }

  if (state.record.status !== "draft") {
    throw new Error(
      `Cannot finalize retro: current status is "${state.record.status}" (expected "draft")`,
    );
  }

  // ── Guard 1: evidenceAnchors ──────────────────────────────────────
  const evidenceAnchors = Array.isArray(options.evidenceAnchors)
    ? options.evidenceAnchors.filter((s) => typeof s === "string" && s.trim().length > 0)
    : [];
  if (evidenceAnchors.length === 0) {
    throw new Error(
      `Cannot finalize retro: evidenceAnchors must contain at least one non-empty string`,
    );
  }

  // ── Guard 2: coverageScope / nonCoverageScope ─────────────────────
  const coverageScope =
    typeof options.coverageScope === "string" ? options.coverageScope.trim() : "";
  const nonCoverageScope =
    typeof options.nonCoverageScope === "string" ? options.nonCoverageScope.trim() : "";

  if (coverageScope.length === 0) {
    throw new Error(
      `Cannot finalize retro: coverageScope must be a non-empty string`,
    );
  }

  if (nonCoverageScope.length === 0) {
    throw new Error(
      `Cannot finalize retro: nonCoverageScope must be a non-empty string`,
    );
  }

  // ── Guard 3: decision must fall in the 3-way set ─────────────────
  const decision = options.decision;
  if (!RETRO_DECISION_VALUES.has(decision)) {
    throw new Error(
      `Cannot finalize retro: decision must be one of ${[...RETRO_DECISION_VALUES].join(", ")}`,
    );
  }

  // ── Build finalized record ────────────────────────────────────────
  const now = new Date().toISOString();

  const record = {
    kind: "retro-record",
    fixtureId,
    status: "finalized",
    decision,
    evidenceAnchors,
    coverageScope,
    nonCoverageScope,
    summary:
      typeof options.summary === "string" && options.summary.trim().length > 0
        ? options.summary.trim()
        : "",
    metadata:
      options.metadata && typeof options.metadata === "object" && !Array.isArray(options.metadata)
        ? { ...options.metadata }
        : {},
    createdAt: state.record.createdAt,
    updatedAt: now,
  };

  const check = validateRetroRecord(record);
  if (!check.valid) {
    const msgs = check.errors.map((e) => `${e.field}: ${e.message}`).join("; ");
    throw new Error(`RetroRecord finalize validation failed: ${msgs}`);
  }

  ensureStoreDir();
  appendFileSync(STORE_PATH, JSON.stringify(record) + "\n", "utf8");

  return {
    ok: true,
    fixtureId,
    path: STORE_PATH,
    record,
  };
}

/**
 * Get the current Retro state for a given fixtureId.
 *
 * Returns the most recent record (last appended) for this fixtureId.
 *
 * @param {string} fixtureId
 * @returns {{ status: string, record: object } | null}
 */
export function getRetroState(fixtureId) {
  const entries = readAllLines();
  let last = null;
  for (const entry of entries) {
    if (entry.fixtureId === fixtureId && entry.kind === "retro-record") {
      last = entry;
    }
  }
  return last ? { status: last.status, record: last } : null;
}

/**
 * List recent Retro records across all fixtureIds.
 *
 * When multiple entries share the same fixtureId, only the latest is returned.
 *
 * @param {number} [limit=10] - Maximum number of records to return.
 * @returns {object[]} Array of the latest retro record per fixtureId, newest first.
 */
export function listRecentRetros(limit = 10) {
  const entries = readAllLines();
  const latest = new Map();

  for (const entry of entries) {
    if (entry.kind === "retro-record") {
      latest.set(entry.fixtureId, entry);
    }
  }

  return [...latest.values()]
    .sort((a, b) => {
      const da = Date.parse(a.updatedAt ?? a.createdAt ?? 0);
      const db = Date.parse(b.updatedAt ?? b.createdAt ?? 0);
      return db - da;
    })
    .slice(0, limit);
}

/**
 * List all Retro entries for a given fixtureId, in append order.
 *
 * @param {string} fixtureId
 * @returns {object[]}
 */
export function listRetroHistory(fixtureId) {
  return readAllLines().filter(
    (entry) => entry.fixtureId === fixtureId && entry.kind === "retro-record",
  );
}

/**
 * Return the total number of Retro records in the store.
 *
 * @returns {number}
 */
export function count() {
  return readAllLines().filter((e) => e.kind === "retro-record").length;
}

export default {
  createRetro,
  finalizeRetro,
  getRetroState,
  listRecentRetros,
  listRetroHistory,
  count,
};
