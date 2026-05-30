import { existsSync, mkdirSync, appendFileSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';

const STORE_DIR = `${homedir()}/.skillforge`;
const STORE_PATH = `${STORE_DIR}/routed-run-store.jsonl`;

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

export function saveRoutedRun(record) {
  ensureStoreDir();
  appendFileSync(STORE_PATH, JSON.stringify(record) + '\n', 'utf8');
  return { ok: true, path: STORE_PATH, runId: record.runId };
}

export function buildRoutedRunRecord({
  runId,
  userRequest,
  status = 'success',
  plan = null,
  retrieval = null,
  compilation = null,
  execution = null,
  diagnosis = null,
} = {}) {
  return {
    runId: runId || `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    status,
    userRequest: userRequest || { text: '' },
    plan,
    retrieval,
    compilation,
    execution,
    diagnosis: diagnosis || { failureStage: null, notes: [] },
  };
}

export function listRoutedRuns() {
  return readAllLines();
}

export default {
  saveRoutedRun,
  buildRoutedRunRecord,
  listRoutedRuns,
};
