import { validatePublishPrep } from "./publish-prep.mjs";
import { existsSync, mkdirSync, appendFileSync, readFileSync } from "node:fs";
import { homedir } from "node:os";

const STORE_DIR = `${homedir()}/.skillforge`;
const STORE_PATH = `${STORE_DIR}/prep-store.jsonl`;

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
 * Save a publish-prep to the persistent store.
 * The entry is validated before storage and appended as a JSON Line.
 *
 * @param {object} prep - A valid publish-prep object.
 * @returns {{ ok: boolean, fixtureId: string, path: string }}
 * @throws {Error} If publish-prep validation fails.
 */
export function save(prep) {
  const check = validatePublishPrep(prep);

  // PublishPrep uses fixtureId from its reviewRecordRef
  const fixtureId = prep.reviewRecordRef?.fixtureId ?? prep.fixtureId ?? "unknown";

  if (!check.valid) {
    const msgs = check.errors.map((e) => `${e.field}: ${e.message}`).join("; ");
    throw new Error(`PublishPrep validation failed: ${msgs}`);
  }

  ensureStoreDir();
  appendFileSync(STORE_PATH, JSON.stringify(prep) + "\n", "utf8");

  return {
    ok: true,
    fixtureId,
    path: STORE_PATH,
  };
}

/**
 * Load the latest saved publish-prep for a given fixtureId.
 *
 * Scans all persisted lines and returns the last entry whose
 * reviewRecordRef.fixtureId matches the given id.
 *
 * @param {string} id - The fixtureId to look up.
 * @returns {object|null} The matching publish-prep, or null if not found.
 */
export function loadById(id) {
  const entries = readAllLines();
  let found = null;
  for (const entry of entries) {
    const eid = entry.reviewRecordRef?.fixtureId ?? entry.fixtureId;
    if (eid === id) {
      found = entry;
    }
  }
  return found;
}

/**
 * List all unique publish-preps in the store.
 *
 * When multiple entries share the same fixtureId,
 * only the latest one (last written) is returned.
 *
 * @returns {object[]} Array of publish-prep objects.
 */
export function list() {
  const entries = readAllLines();
  const seen = new Map();
  for (const entry of entries) {
    const id = entry.reviewRecordRef?.fixtureId ?? entry.fixtureId ?? "unknown";
    seen.set(id, entry);
  }
  return [...seen.values()];
}

export default {
  save,
  loadById,
  list,
};
