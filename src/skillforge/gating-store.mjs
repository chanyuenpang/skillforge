import { existsSync, mkdirSync, appendFileSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { loadEventsByFixtureId } from "./risk-store.mjs";
import { getReviewState } from "./review-store.mjs";
import { getApprovalState } from "./approval-store.mjs";

const STORE_DIR = `${homedir()}/.skillforge`;
const EVENT_PATH = `${STORE_DIR}/gating-events.jsonl`;

function ensureStoreDir() {
  if (!existsSync(STORE_DIR)) {
    mkdirSync(STORE_DIR, { recursive: true });
  }
}

function readAllLines(path) {
  if (!existsSync(path)) return [];
  const raw = readFileSync(path, "utf8").trim();
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

function isGateDecisionEvent(entry) {
  return entry?.kind === "gating-event" && entry?.type === "GateDecisionIssued";
}

function loadAllGateEvents() {
  return readAllLines(EVENT_PATH).filter(isGateDecisionEvent);
}

export function loadGatingEvents(fixtureId) {
  return loadAllGateEvents().filter((entry) => entry.fixtureId === fixtureId);
}

export function getGatingState(fixtureId) {
  const events = loadGatingEvents(fixtureId);
  if (events.length === 0) return null;

  const last = events[events.length - 1];
  return {
    fixtureId,
    decision: last.decision,
    reason: last.reason,
    fingerprint: last.fingerprint,
    inputs: last.inputs,
    lastEventType: last.type,
    lastEventId: last.eventId,
    eventCount: events.length,
  };
}

function buildInputSnapshot(fixtureId) {
  const riskEvents = loadEventsByFixtureId(fixtureId);
  const reviewState = getReviewState(fixtureId);
  const approvalState = getApprovalState(fixtureId);

  const hasRisk = riskEvents.length > 0;
  const latestRiskEventId = hasRisk ? riskEvents[riskEvents.length - 1].eventId : null;

  return {
    fixtureId,
    hasRisk,
    latestRiskEventId,
    review: reviewState
      ? {
          status: reviewState.status,
          decision: reviewState.decision,
          lastEventId: reviewState.lastEventId,
        }
      : null,
    approval: approvalState
      ? {
          status: approvalState.status,
          decision: approvalState.decision,
          lastEventId: approvalState.lastEventId,
        }
      : null,
  };
}

function decideBySnapshot(snapshot) {
  if (!snapshot.hasRisk) {
    return { decision: "allow", reason: "no-risk-observed" };
  }

  if (snapshot.approval?.decision === "grant" || snapshot.approval?.status === "granted") {
    return { decision: "allow", reason: "approval-granted" };
  }

  if (snapshot.approval?.decision === "deny" || snapshot.approval?.status === "denied") {
    return { decision: "block", reason: "approval-denied" };
  }

  return { decision: "block", reason: "approval-not-satisfied" };
}

function makeFingerprint(snapshot, decision, reason) {
  return JSON.stringify({
    fixtureId: snapshot.fixtureId,
    latestRiskEventId: snapshot.latestRiskEventId,
    reviewLastEventId: snapshot.review?.lastEventId ?? null,
    approvalLastEventId: snapshot.approval?.lastEventId ?? null,
    decision,
    reason,
  });
}

function findByFingerprint(fixtureId, fingerprint) {
  const events = loadGatingEvents(fixtureId);
  for (let i = events.length - 1; i >= 0; i -= 1) {
    if (events[i].fingerprint === fingerprint) return events[i];
  }
  return null;
}

function appendGatingEvent(event) {
  ensureStoreDir();
  appendFileSync(EVENT_PATH, JSON.stringify(event) + "\n", "utf8");
  return {
    ok: true,
    eventId: event.eventId,
    fixtureId: event.fixtureId,
    type: event.type,
    path: EVENT_PATH,
  };
}

export function computeGatingDecision(fixtureId) {
  const inputs = buildInputSnapshot(fixtureId);
  const { decision, reason } = decideBySnapshot(inputs);
  const fingerprint = makeFingerprint(inputs, decision, reason);

  const existing = findByFingerprint(fixtureId, fingerprint);
  if (existing) {
    return {
      ok: true,
      duplicate: true,
      eventId: existing.eventId,
      fixtureId,
      decision: existing.decision,
      reason: existing.reason,
      path: EVENT_PATH,
    };
  }

  const now = new Date().toISOString();
  const event = {
    kind: "gating-event",
    type: "GateDecisionIssued",
    eventId: `${fixtureId}:gate-${now}`,
    fixtureId,
    decision,
    reason,
    inputs,
    fingerprint,
    decidedAt: now,
  };

  const appended = appendGatingEvent(event);
  return {
    ...appended,
    duplicate: false,
    decision,
    reason,
  };
}

export default {
  computeGatingDecision,
  getGatingState,
  loadGatingEvents,
};
