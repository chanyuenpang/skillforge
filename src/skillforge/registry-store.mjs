import { validateRegistryEntry } from './registry-entry.mjs';
import { existsSync, mkdirSync, appendFileSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';

const STORE_DIR = `${homedir()}/.skillforge`;
const STORE_PATH = `${STORE_DIR}/registry-store.jsonl`;

function ensureStoreDir() {
  if (!existsSync(STORE_DIR)) mkdirSync(STORE_DIR, { recursive: true });
}

function readAllLines() {
  if (!existsSync(STORE_PATH)) return [];
  const raw = readFileSync(STORE_PATH, 'utf8').trim();
  if (!raw) return [];
  return raw.split('\n').filter(Boolean).map((line) => {
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
    const msgs = check.errors.map((error) => `${error.field}: ${error.message}`).join('; ');
    throw new Error(`RegistryEntry validation failed: ${msgs}`);
  }

  ensureStoreDir();
  appendFileSync(STORE_PATH, `${JSON.stringify(entry)}\n`, 'utf8');
  return {
    ok: true,
    registryId: entry.registryId,
    path: STORE_PATH,
  };
}

export function loadById(registryId) {
  const entries = readAllLines();
  let found = null;
  for (const entry of entries) {
    if (entry.registryId === registryId) found = entry;
  }
  return found;
}

export function list() {
  const latest = new Map();
  for (const entry of readAllLines()) {
    latest.set(entry.registryId, entry);
  }
  return [...latest.values()];
}

export function searchByTags(queryTagIds = []) {
  const tags = Array.isArray(queryTagIds) ? queryTagIds.filter(Boolean) : [];
  if (tags.length === 0) return [];

  return list()
    .map((entry) => {
      const entryTags = entry?.routingProfile?.tags || [];
      const matches = tags.filter((tagId) => entryTags.includes(tagId));
      return {
        entry,
        matches,
        score: matches.length,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || String(a.entry?.registryId || '').localeCompare(String(b.entry?.registryId || '')));
}

export function searchByRequiredTools(queryTools = []) {
  const tools = Array.isArray(queryTools) ? queryTools.filter(Boolean) : [];
  if (tools.length === 0) return [];

  return list()
    .map((entry) => {
      const requiredTools = entry?.routingProfile?.requiredTools || [];
      const matches = tools.filter((tool) => requiredTools.includes(tool));
      return {
        entry,
        matches,
        score: matches.length,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || String(a.entry?.registryId || '').localeCompare(String(b.entry?.registryId || '')));
}

export default {
  save,
  loadById,
  list,
  searchByTags,
  searchByRequiredTools,
};
