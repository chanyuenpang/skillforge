import { validateReviewRecord } from "./review-record.mjs";
import { createReviewEvent, validateReviewEvent } from "./review-record.mjs";
import { loadEventsByFixtureId } from "./risk-store.mjs";
import { existsSync, mkdirSync, appendFileSync, readFileSync } from "node:fs";
import { homedir } from "node:os";

const STORE_DIR = `${homedir()}/.skillforge`;
const STORE_PATH = `${STORE_DIR}/review-store.jsonl`;
const EVENT_PATH = `${STORE_DIR}/review-events.jsonl`;

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

// ── Legacy review-record snapshot API (backward compat) ──

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
  const entries = readAllLines(STORE_PATH);
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
  const entries = readAllLines(STORE_PATH);
  const seen = new Map();
  for (const entry of entries) {
    seen.set(entry.fixtureId, entry);
  }
  return [...seen.values()];
}

// ── Review event API (Slice B) ──

/**
 * Load all review events for a given fixtureId from the event store.
 *
 * @param {string} fixtureId
 * @returns {object[]} Array of review-event objects, oldest first.
 */
export function loadReviewEvents(fixtureId) {
  return readAllLines(EVENT_PATH).filter(
    (entry) => entry?.kind === "review-event" && entry.fixtureId === fixtureId
  );
}

/**
 * Replay all review events for a fixtureId to compute the current review state.
 *
 * Returns null if no review events exist for this fixtureId.
 *
 * @param {string} fixtureId
 * @returns {object|null} The computed review state, or null.
 */
export function getReviewState(fixtureId) {
  const events = loadReviewEvents(fixtureId);
  if (events.length === 0) return null;

  const last = events[events.length - 1];
  return {
    fixtureId,
    status: last.status ?? "idle",
    decision: last.decision ?? null,
    lastEventType: last.type,
    lastEventId: last.eventId,
    eventCount: events.length,
    round: (() => {
      // Walk backwards to find the most recent event that carries a round number.
      // This correctly derives the current round even when interleaved with
      // round-agnostic events (approve/reject).
      for (let i = events.length - 1; i >= 0; i--) {
        if (typeof events[i].round === "number") return events[i].round;
      }
      return 1;
    })(),
  };
}

/**
 * Append a review event to the event store.
 * Validates the event structure before writing.
 */
function appendReviewEvent(event) {
  const check = validateReviewEvent(event);
  if (!check.valid) {
    const msgs = check.errors.map((e) => `${e.field}: ${e.message}`).join("; ");
    throw new Error(`ReviewEvent validation failed: ${msgs}`);
  }

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

/**
 * Find an existing review event by idempotencyKey.
 */
function findReviewByIdempotencyKey(idempotencyKey) {
  const entries = readAllLines(EVENT_PATH);
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const entry = entries[i];
    if (entry?.kind === "review-event" && entry.idempotencyKey === idempotencyKey) {
      return entry;
    }
  }
  return null;
}

/**
 * Request a review for a risk fact that has been observed.
 *
 * Idempotent: if a review was already requested for this fixtureId
 * (or the same idempotencyKey), returns the existing event.
 *
 * State machine constraint:
 *   - The fixtureId must have at least one RiskFactObserved event in the risk store.
 *   - If a review already exists, this is a no-op.
 *
 * @param {string} fixtureId
 * @param {object} [options]
 * @param {string} [options.idempotencyKey] - Optional client-supplied key for idempotency.
 * @param {object} [options.metadata]
 * @returns {{ ok: boolean, duplicate: boolean, eventId: string, fixtureId: string, path: string }}
 * @throws {Error} If no risk fact exists for this fixtureId.
 */
export function requestReview(fixtureId, options = {}) {
  // 1. Check risk fact exists
  const riskEvents = loadEventsByFixtureId(fixtureId);
  if (riskEvents.length === 0) {
    throw new Error(
      `Cannot request review: no RiskFactObserved event found for fixtureId "${fixtureId}"`
    );
  }

  // 2. Idempotency check — same idempotencyKey
  const idemKey = options.idempotencyKey ?? `review-req:${fixtureId}`;
  const existingByIdem = findReviewByIdempotencyKey(idemKey);
  if (existingByIdem) {
    return {
      ok: true,
      duplicate: true,
      eventId: existingByIdem.eventId,
      fixtureId,
      path: EVENT_PATH,
    };
  }

  // 3. Check if any review already exists for this fixtureId
  const state = getReviewState(fixtureId);
  if (state !== null) {
    // Review already started — return existing state as duplicate
    return {
      ok: true,
      duplicate: true,
      eventId: state.lastEventId,
      fixtureId,
      path: EVENT_PATH,
    };
  }

  // 4. Create and persist the event
  const now = new Date().toISOString();
  const eventSeq = `${fixtureId}:review-${now}`;
  const event = createReviewEvent("ReviewRequested", fixtureId, {
    idempotencyKey: idemKey,
    status: "ready",
    round: 1,
    metadata: options.metadata,
  });
  event.eventId = eventSeq;
  event.riskEventRefs = riskEvents.map((e) => e.eventId);

  const appended = appendReviewEvent(event);
  return { ...appended, duplicate: false };
}

/**
 * Approve a review that is currently in progress.
 *
 * State machine constraint:
 *   - A review must exist and be in "ready" status.
 *   - Cannot approve a review that is already in a terminal state (approved/rejected).
 *
 * @param {string} fixtureId
 * @param {object} [options]
 * @param {string} [options.reason]
 * @param {string[]} [options.evidenceRefs]
 * @param {string[]} [options.sourceLinks]
 * @param {object} [options.metadata]
 * @returns {{ ok: boolean, eventId: string, fixtureId: string, path: string }}
 * @throws {Error} If no review exists, or review is not in an approvable state.
 */
export function approveReview(fixtureId, options = {}) {
  // ── S2: Idempotency check — only when caller explicitly provides idempotencyKey ──
  const idemKey = options.idempotencyKey;
  if (typeof idemKey === "string" && idemKey.length > 0) {
    const existingByIdem = findReviewByIdempotencyKey(idemKey);
    if (existingByIdem) {
      return {
        ok: true,
        duplicate: true,
        eventId: existingByIdem.eventId,
        fixtureId,
        path: EVENT_PATH,
      };
    }
  }

  const state = getReviewState(fixtureId);

  // ── S2: Version/state-snapshot conflict check ──
  if (typeof options.expectedLastEventId === "string") {
    if (state === null) {
      return {
        ok: false,
        duplicate: false,
        code: "VERSION_CONFLICT",
        message: `Cannot approve: no review exists for fixtureId "${fixtureId}"`,
        expectedLastEventId: options.expectedLastEventId,
        currentLastEventId: null,
      };
    }
    if (state.lastEventId !== options.expectedLastEventId) {
      return {
        ok: false,
        duplicate: false,
        code: "VERSION_CONFLICT",
        message: `Expected lastEventId "${options.expectedLastEventId}" but current is "${state.lastEventId}"`,
        expectedLastEventId: options.expectedLastEventId,
        currentLastEventId: state.lastEventId,
      };
    }
  }

  if (state === null) {
    throw new Error(
      `Cannot approve review: no review exists for fixtureId "${fixtureId}"`
    );
  }

  if (state.status === "approved") {
    throw new Error(
      `Cannot approve review: fixtureId "${fixtureId}" is already approved`
    );
  }

  if (state.status === "rejected") {
    throw new Error(
      `Cannot approve review: fixtureId "${fixtureId}" is already rejected`
    );
  }

  if (state.status !== "ready") {
    throw new Error(
      `Cannot approve review: fixtureId "${fixtureId}" is in status "${state.status}", expected "ready"`
    );
  }

  const now = new Date().toISOString();
  const eventSeq = `${fixtureId}:review-${now}`;
  const event = createReviewEvent("ReviewApproved", fixtureId, {
    idempotencyKey: idemKey,
    status: "approved",
    decision: "approve",
    reason: options.reason,
    evidenceRefs: options.evidenceRefs,
    sourceLinks: options.sourceLinks,
    metadata: options.metadata,
  });
  event.eventId = eventSeq;

  return { ...appendReviewEvent(event), duplicate: false };
}

/**
 * Reject a review that is currently in progress.
 *
 * State machine constraint:
 *   - A review must exist and be in "ready" status.
 *   - Cannot reject a review that is already in a terminal state (approved/rejected).
 *
 * @param {string} fixtureId
 * @param {object} [options]
 * @param {string} [options.reason]
 * @param {string[]} [options.evidenceRefs]
 * @param {string[]} [options.sourceLinks]
 * @param {object} [options.metadata]
 * @returns {{ ok: boolean, eventId: string, fixtureId: string, path: string }}
 * @throws {Error} If no review exists, or review is not in a rejectable state.
 */
export function rejectReview(fixtureId, options = {}) {
  // ── S2: Idempotency check — only when caller explicitly provides idempotencyKey ──
  const idemKey = options.idempotencyKey;
  if (typeof idemKey === "string" && idemKey.length > 0) {
    const existingByIdem = findReviewByIdempotencyKey(idemKey);
    if (existingByIdem) {
      return {
        ok: true,
        duplicate: true,
        eventId: existingByIdem.eventId,
        fixtureId,
        path: EVENT_PATH,
      };
    }
  }

  const state = getReviewState(fixtureId);

  // ── S2: Version/state-snapshot conflict check ──
  if (typeof options.expectedLastEventId === "string") {
    if (state === null) {
      return {
        ok: false,
        duplicate: false,
        code: "VERSION_CONFLICT",
        message: `Cannot reject: no review exists for fixtureId "${fixtureId}"`,
        expectedLastEventId: options.expectedLastEventId,
        currentLastEventId: null,
      };
    }
    if (state.lastEventId !== options.expectedLastEventId) {
      return {
        ok: false,
        duplicate: false,
        code: "VERSION_CONFLICT",
        message: `Expected lastEventId "${options.expectedLastEventId}" but current is "${state.lastEventId}"`,
        expectedLastEventId: options.expectedLastEventId,
        currentLastEventId: state.lastEventId,
      };
    }
  }

  if (state === null) {
    throw new Error(
      `Cannot reject review: no review exists for fixtureId "${fixtureId}"`
    );
  }

  if (state.status === "approved") {
    throw new Error(
      `Cannot reject review: fixtureId "${fixtureId}" is already approved`
    );
  }

  if (state.status === "rejected") {
    throw new Error(
      `Cannot reject review: fixtureId "${fixtureId}" is already rejected`
    );
  }

  if (state.status !== "ready") {
    throw new Error(
      `Cannot reject review: fixtureId "${fixtureId}" is in status "${state.status}", expected "ready"`
    );
  }

  const now = new Date().toISOString();
  const eventSeq = `${fixtureId}:review-${now}`;
  const event = createReviewEvent("ReviewRejected", fixtureId, {
    idempotencyKey: idemKey,
    status: "rejected",
    decision: "reject",
    reason: options.reason,
    evidenceRefs: options.evidenceRefs,
    sourceLinks: options.sourceLinks,
    metadata: options.metadata,
  });
  event.eventId = eventSeq;

  return { ...appendReviewEvent(event), duplicate: false };
}

/**
 * Resubmit a review that was previously rejected, opening a new review round.
 *
 * State machine constraint:
 *   - The review must exist and be in "rejected" status.
 *   - Cannot resubmit if review is not rejected.
 *
 * Creates a ReviewResubmitted event with status "ready" and an incremented
 * round number, allowing a fresh round of approve/reject decisions.
 *
 * @param {string} fixtureId
 * @param {object} [options]
 * @param {string} [options.idempotencyKey]
 * @param {string} [options.reason]
 * @param {object} [options.metadata]
 * @returns {{ ok: boolean, duplicate: boolean, eventId: string, fixtureId: string, path: string, round: number }}
 * @throws {Error} If no review exists, or review is not in rejected state.
 */
export function resubmitReview(fixtureId, options = {}) {
  // ── Idempotency check ──
  const idemKey = options.idempotencyKey;
  if (typeof idemKey === "string" && idemKey.length > 0) {
    const existingByIdem = findReviewByIdempotencyKey(idemKey);
    if (existingByIdem) {
      return {
        ok: true,
        duplicate: true,
        eventId: existingByIdem.eventId,
        fixtureId,
        path: EVENT_PATH,
        round: existingByIdem.round ?? 1,
      };
    }
  }

  const state = getReviewState(fixtureId);

  if (state === null) {
    throw new Error(
      `Cannot resubmit review: no review exists for fixtureId "${fixtureId}"`
    );
  }

  if (state.status !== "rejected") {
    throw new Error(
      `Cannot resubmit review: fixtureId "${fixtureId}" is in status "${state.status}", only "rejected" allows resubmission`
    );
  }

  const currentRound = state.round ?? 1;
  const nextRound = currentRound + 1;
  const now = new Date().toISOString();
  const eventSeq = `${fixtureId}:review-${now}`;

  const event = createReviewEvent("ReviewResubmitted", fixtureId, {
    idempotencyKey: idemKey,
    status: "ready",
    round: nextRound,
    previousRound: currentRound,
    reason: options.reason,
    metadata: options.metadata,
  });
  event.eventId = eventSeq;

  const appended = appendReviewEvent(event);
  return { ...appended, duplicate: false, round: nextRound };
}

export default {
  // Legacy API
  save,
  loadById,
  list,
  // Event API (Slice B)
  requestReview,
  approveReview,
  rejectReview,
  resubmitReview,
  getReviewState,
  loadReviewEvents,
};
