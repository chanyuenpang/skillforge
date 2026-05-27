import { existsSync, mkdirSync, appendFileSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { createRiskRecord, validateRiskRecord } from "./risk-record.mjs";

const STORE_DIR = `${homedir()}/.skillforge`;
const STORE_PATH = `${STORE_DIR}/risk-store.jsonl`;

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

function isMainFactEvent(entry) {
  return entry?.kind === "risk-event" && entry?.type === "RiskFactObserved";
}

function findByIdempotencyKey(idempotencyKey) {
  const entries = readAllLines();
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    if (isMainFactEvent(entry) && entry.idempotencyKey === idempotencyKey) {
      return entry;
    }
  }
  return null;
}

export function appendRiskFactObserved(input) {
  const record = createRiskRecord(input);
  const check = validateRiskRecord(record);

  if (!check.valid) {
    const msgs = check.errors.map((e) => `${e.field}: ${e.message}`).join("; ");
    throw new Error(`RiskRecord validation failed: ${msgs}`);
  }

  const existing = findByIdempotencyKey(record.idempotencyKey);
  if (existing) {
    return {
      ok: true,
      duplicate: true,
      eventId: existing.eventId,
      idempotencyKey: existing.idempotencyKey,
      path: STORE_PATH,
    };
  }

  const now = new Date().toISOString();
  const event = {
    kind: "risk-event",
    type: "RiskFactObserved",
    eventId: `${record.fixtureId}:${record.idempotencyKey}`,
    idempotencyKey: record.idempotencyKey,
    fixtureId: record.fixtureId,
    riskType: record.riskType,
    severity: record.severity,
    summary: record.summary,
    observedAt: record.observedAt,
    evidenceRefs: record.evidenceRefs,
    sourceLinks: record.sourceLinks,
    metadata: record.metadata,
    recordedAt: now,
    payload: record,
  };

  ensureStoreDir();
  appendFileSync(STORE_PATH, JSON.stringify(event) + "\n", "utf8");

  return {
    ok: true,
    duplicate: false,
    eventId: event.eventId,
    idempotencyKey: event.idempotencyKey,
    path: STORE_PATH,
  };
}

export function loadEventsByFixtureId(fixtureId) {
  return readAllLines().filter((entry) => isMainFactEvent(entry) && entry.fixtureId === fixtureId);
}

export default {
  appendRiskFactObserved,
  loadEventsByFixtureId,
};
