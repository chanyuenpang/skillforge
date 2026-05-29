import { validateRegistryEntry } from "./registry-entry.mjs";
import { existsSync, mkdirSync, appendFileSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname } from "node:path";

const STORE_DIR = `${homedir()}/.skillforge`;
const STORE_PATH = `${STORE_DIR}/registry-store.jsonl`;

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

export function save(entry) {
  const check = validateRegistryEntry(entry);
  if (!check.valid) {
    const msgs = check.errors.map((e) => `${e.field}: ${e.message}`).join("; ");
    throw new Error(`RegistryEntry validation failed: ${msgs}`);
  }

  ensureStoreDir();
  appendFileSync(STORE_PATH, JSON.stringify(entry) + "\n", "utf8");

  return {
    ok: true,
    fixtureId: entry.fixtureId,
    path: STORE_PATH,
  };
}

export function hasSourceHash(sourceHash) {
  if (!sourceHash) return false;
  const entries = readAllLines();
  return entries.some((entry) => entry?.source_hash === sourceHash);
}

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

export function list() {
  const entries = readAllLines();
  const seen = new Map();
  for (const entry of entries) {
    seen.set(entry.fixtureId, entry);
  }
  return [...seen.values()];
}

export function searchByTags(queryTagIds = []) {
  const tags = Array.isArray(queryTagIds) ? queryTagIds.filter(Boolean) : [];
  if (tags.length === 0) return [];

  const latest = list();
  const scored = latest
    .map((entry) => {
      const entryTagIds = Array.isArray(entry?.tags)
        ? entry.tags.map((t) => t?.id).filter(Boolean)
        : [];
      const matches = tags.filter((tagId) => entryTagIds.includes(tagId));
      return {
        entry,
        matches,
        score: matches.length,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || String(a.entry?.fixtureId || '').localeCompare(String(b.entry?.fixtureId || '')));

  return scored;
}

export function restoreById(id) {
  const entries = readAllLines();
  const history = entries.filter((entry) => entry.fixtureId === id);
  if (!history.length) {
    return { ok: false, restored: null, previous: null, reason: "not-found" };
  }

  const latest = history.at(-1);
  const previous = history.at(-2) || latest;
  const targetVersion = history.length >= 2 ? (history.at(-2)?.version ?? null) : (latest.version ?? null);
  const targetStatus = previous.registryMeta?.status || previous.status || "registered";
  const restored = {
    ...previous,
    registryMeta: {
      ...(previous.registryMeta || {}),
      status: targetStatus,
      updatedAt: new Date().toISOString(),
      restoredFromVersion: latest.version || null,
    },
    recoveryMeta: {
      kind: "registry-restore",
      restoredAt: new Date().toISOString(),
      restoredFromVersion: latest.version || null,
      restoredToVersion: targetVersion,
    },
  };

  ensureStoreDir();
  appendFileSync(STORE_PATH, JSON.stringify(restored) + "\n", "utf8");

  return {
    ok: true,
    restored,
    previous: latest,
    recoveredFrom: previous,
    path: STORE_PATH,
  };
}

export default {
  save,
  hasSourceHash,
  loadById,
  list,
  restoreById,
  searchByTags,
};
