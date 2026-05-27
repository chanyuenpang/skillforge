/**
 * plan-log-store.mjs — Persistent JSON Lines store for SkillForge plan records
 *
 * Each time a plan is created (via skillforge-plan or equivalent), a
 * single plan log entry is appended. This gives the full-chain
 * observability milestone a record of what plan was created, from what
 * input, and with what output skeleton.
 *
 * Follows the same pattern as execution-log-store.mjs:
 *   - ~/.skillforge/plan-log.jsonl
 *   - Append-only JSON Lines
 *   - loadById looks up by planId
 *   - list returns all entries ordered by timestamp (insertion order)
 */

import { existsSync, mkdirSync, appendFileSync, readFileSync } from "node:fs";
import { homedir } from "node:os";

const STORE_DIR = `${homedir()}/.skillforge`;
const STORE_PATH = `${STORE_DIR}/plan-log.jsonl`;

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

// ── Plan log entry builder ──────────────────────────────────────────────

/**
 * Build a plan log entry.
 *
 * @param {object} options
 * @param {string}  options.planId    — Unique plan identifier
 * @param {string}  options.fixtureId — Associated fixture identifier
 * @param {object|string} options.input  — Plan creation input (task description, etc.)
 * @param {object|string} options.output — Plan output (skeleton structure)
 * @returns {object} A plan log entry
 */
export function buildPlanLogEntry({ planId, fixtureId, input, output } = {}) {
  return {
    planId: planId ?? null,
    fixtureId: fixtureId ?? null,
    timestamp: new Date().toISOString(),
    input: input ?? null,
    output: output ?? null,
  };
}

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Save a plan log entry to the persistent store.
 * Appends the entry as a JSON Line.
 *
 * @param {object} entry — A plan log entry (from buildPlanLogEntry).
 * @returns {{ ok: boolean, planId: string, path: string }}
 */
export function save(entry) {
  ensureStoreDir();
  appendFileSync(STORE_PATH, JSON.stringify(entry) + "\n", "utf8");
  return { ok: true, planId: entry.planId, path: STORE_PATH };
}

/**
 * Load plan log entries by planId.
 *
 * @param {string} id — The planId to look up.
 * @returns {object[]} Array of matching plan log entries.
 */
export function loadById(id) {
  return readAllLines().filter((entry) => entry.planId === id);
}

/**
 * List all plan log entries, ordered by timestamp (insertion order).
 *
 * @returns {object[]} Array of plan log entry objects.
 */
export function list() {
  return readAllLines();
}

/**
 * List the most recent N plan log entries.
 *
 * @param {number} n — Number of recent entries to return (default 5).
 * @returns {object[]} Array of plan log entry objects, newest first.
 */
export function recent(n = 5) {
  const all = readAllLines();
  return all.slice(-n).reverse();
}

/**
 * Return the total count of plan log entries.
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
  buildPlanLogEntry,
};
