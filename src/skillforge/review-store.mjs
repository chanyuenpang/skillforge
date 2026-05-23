import { validateReviewRecord } from "./review-record.mjs";
import { existsSync, mkdirSync, appendFileSync, readFileSync } from "node:fs";
import { homedir } from "node:os";

const STORE_DIR = `${homedir()}/.skillforge`;
const STORE_PATH = `${STORE_DIR}/review-store.jsonl`;

function ensureStoreDir() {
  if (!existsSync(STORE_DIR)) {
    mkdirSync(STORE_DIR, { recursive: true });
  }
}

function readAllLines() {
  if (!existsSync(STORE_PATH)) return [];
  const raw = readFileSync(STORE_PATH, "utf8").trim();
  if (!raw) return [];
  return raw.split("\n").filter(Boolean).map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  }).filter(Boolean);
}

/**
 * Save a review-record to the persistent store.
 * The entry is validated before storage and appended as a JSON Line.
 *
 * @param {object} record - A valid review-record object.
 * @returns {{ ok: boolean, fixtureId: string, path: string }}
 * @throws {Error} If review-record validation fails.
 */
export function save(record) {
  const check = validateReviewRecord(record);
  if (!check.valid) {
    const msgs = check.errors.map((e) => `${e.field}: ${e.message}`).join("; ");
    throw new Error(`ReviewRecord validation failed: ${msgs}`);
  }

  ensureStoreDir();
  appendFileSync(STORE_PATH, JSON.stringify(record) + "\n", "utf8");

  return {
    ok: true,
    fixtureId: record.fixtureId,
    path: STORE_PATH,
  };
}

/**
 * Load the latest saved review-record for a given fixtureId.
 *
 * Scans all persisted lines and returns the last entry whose
 * fixtureId matches the given id.
 *
 * @param {string} id - The fixtureId to look up.
 * @returns {object|null} The matching review-record, or null if not found.
 */
export function loadById(id) {
  const entries = readAllLines();
  let found = null;
  for (const entry of entries) {
    if (entry.fixtureId === id) {
      found = entry;
    }
  }
  return found;
}

/**
 * List all unique review-records in the store.
 *
 * When multiple entries share the same fixtureId,
 * only the latest one (last written) is returned.
 *
 * @returns {object[]} Array of review-record objects.
 */
export function list() {
  const entries = readAllLines();
  const seen = new Map();
  for (const entry of entries) {
    seen.set(entry.fixtureId, entry);
  }
  return [...seen.values()];
}

export default {
  save,
  loadById,
  list,
};
