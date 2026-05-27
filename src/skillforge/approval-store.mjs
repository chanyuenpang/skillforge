import { existsSync, mkdirSync, appendFileSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { createApprovalEvent, validateApprovalEvent } from "./approval-record.mjs";
import { getReviewState, loadReviewEvents } from "./review-store.mjs";

const STORE_DIR = `${homedir()}/.skillforge`;
const EVENT_PATH = `${STORE_DIR}/approval-events.jsonl`;

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

function appendApprovalEvent(event) {
  const check = validateApprovalEvent(event);
  if (!check.valid) {
    const msgs = check.errors.map((e) => `${e.field}: ${e.message}`).join("; ");
    throw new Error(`ApprovalEvent validation failed: ${msgs}`);
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

function findApprovalByIdempotencyKey(idempotencyKey) {
  const entries = readAllLines(EVENT_PATH);
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const entry = entries[i];
    if (entry?.kind === "approval-event" && entry.idempotencyKey === idempotencyKey) {
      return entry;
    }
  }
  return null;
}

export function loadApprovalEvents(fixtureId) {
  return readAllLines(EVENT_PATH).filter(
    (entry) => entry?.kind === "approval-event" && entry.fixtureId === fixtureId
  );
}

export function getApprovalState(fixtureId) {
  const events = loadApprovalEvents(fixtureId);
  if (events.length === 0) return null;

  const last = events[events.length - 1];
  return {
    fixtureId,
    status: last.status ?? "pending",
    decision: last.decision ?? null,
    reviewEventRef: last.reviewEventRef,
    lastEventType: last.type,
    lastEventId: last.eventId,
    eventCount: events.length,
  };
}

export function evaluateRunApprovalGate(fixtureId) {
  const state = getApprovalState(fixtureId);
  const normalized = String(state?.status ?? "pending").trim().toLowerCase();

  if (normalized === "granted" || normalized === "approved") {
    return {
      ok: true,
      allowed: true,
      fixtureId,
      status: normalized,
      code: null,
      message: null,
      lastEventId: state?.lastEventId ?? null,
    };
  }

  const blockCodeByStatus = {
    pending: "APPROVAL_PENDING",
    denied: "APPROVAL_REJECTED",
    rejected: "APPROVAL_REJECTED",
    needsmoreinfo: "APPROVAL_NEEDS_MORE_INFO",
    needs_more_info: "APPROVAL_NEEDS_MORE_INFO",
  };

  return {
    ok: false,
    allowed: false,
    fixtureId,
    status: normalized,
    code: blockCodeByStatus[normalized] ?? "APPROVAL_NOT_APPROVED",
    message: `Run blocked: approval status is "${normalized}" (must be "granted").`,
    lastEventId: state?.lastEventId ?? null,
  };
}

function getCompletedReviewTerminalEventId(fixtureId) {
  const reviewState = getReviewState(fixtureId);
  if (reviewState === null) {
    throw new Error(
      `Cannot request approval: no review exists for fixtureId "${fixtureId}"`
    );
  }

  if (reviewState.status !== "approved" && reviewState.status !== "rejected") {
    throw new Error(
      `Cannot request approval: review for fixtureId "${fixtureId}" is not completed`
    );
  }

  const reviewEvents = loadReviewEvents(fixtureId);
  const lastReviewEvent = reviewEvents[reviewEvents.length - 1];
  if (!lastReviewEvent?.eventId) {
    throw new Error(
      `Cannot request approval: missing terminal review event id for fixtureId "${fixtureId}"`
    );
  }

  return lastReviewEvent.eventId;
}

export function requestApproval(fixtureId, options = {}) {
  const reviewEventRef = getCompletedReviewTerminalEventId(fixtureId);

  const idemKey = options.idempotencyKey ?? `approval-req:${fixtureId}`;
  const existingByIdem = findApprovalByIdempotencyKey(idemKey);
  if (existingByIdem) {
    return {
      ok: true,
      duplicate: true,
      eventId: existingByIdem.eventId,
      fixtureId,
      path: EVENT_PATH,
    };
  }

  const state = getApprovalState(fixtureId);
  if (state !== null) {
    return {
      ok: true,
      duplicate: true,
      eventId: state.lastEventId,
      fixtureId,
      path: EVENT_PATH,
    };
  }

  const now = new Date().toISOString();
  const event = createApprovalEvent("ApprovalRequested", fixtureId, {
    idempotencyKey: idemKey,
    status: "pending",
    reviewEventRef,
    metadata: options.metadata,
  });
  event.eventId = `${fixtureId}:approval-${now}`;

  const appended = appendApprovalEvent(event);
  return { ...appended, duplicate: false };
}

function getLifecycleBlock(metadata = {}) {
  const lifecycle = metadata?.lifecycle;
  if (!lifecycle || typeof lifecycle !== "object") return null;

  if (lifecycle.expired === true) {
    return {
      code: "LIFECYCLE_EXPIRED",
      message: "Lifecycle expired: operation is rejected",
    };
  }

  if (lifecycle.revoked === true) {
    return {
      code: "LIFECYCLE_REVOKED",
      message: "Lifecycle revoked: operation is rejected",
    };
  }

  return null;
}

export function grantApproval(fixtureId, options = {}) {
  const lifecycleBlock = getLifecycleBlock(options.metadata);
  if (lifecycleBlock) {
    return {
      ok: false,
      accepted: false,
      duplicate: false,
      code: lifecycleBlock.code,
      message: lifecycleBlock.message,
      fixtureId,
    };
  }

  // ── S2: Idempotency check — only when caller explicitly provides idempotencyKey ──
  const idemKey = options.idempotencyKey;
  if (typeof idemKey === "string" && idemKey.length > 0) {
    const existingByIdem = findApprovalByIdempotencyKey(idemKey);
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

  const state = getApprovalState(fixtureId);

  // ── S2: Version/state-snapshot conflict check ──
  if (typeof options.expectedLastEventId === "string") {
    if (state === null) {
      return {
        ok: false,
        duplicate: false,
        code: "VERSION_CONFLICT",
        message: `Cannot grant: no approval exists for fixtureId "${fixtureId}"`,
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
      `Cannot grant approval: no approval exists for fixtureId "${fixtureId}"`
    );
  }

  if (state.status === "granted") {
    throw new Error(
      `Cannot grant approval: fixtureId "${fixtureId}" is already granted`
    );
  }

  if (state.status === "denied") {
    throw new Error(
      `Cannot grant approval: fixtureId "${fixtureId}" is already denied`
    );
  }

  if (state.status !== "pending") {
    throw new Error(
      `Cannot grant approval: fixtureId "${fixtureId}" is in status "${state.status}", expected "pending"`
    );
  }

  const event = createApprovalEvent("ApprovalGranted", fixtureId, {
    idempotencyKey: idemKey,
    status: "granted",
    decision: "grant",
    reviewEventRef: state.reviewEventRef,
    reason: options.reason,
    metadata: options.metadata,
  });
  event.eventId = `${fixtureId}:approval-${new Date().toISOString()}`;

  return { ...appendApprovalEvent(event), duplicate: false };
}

export function denyApproval(fixtureId, options = {}) {
  const lifecycleBlock = getLifecycleBlock(options.metadata);
  if (lifecycleBlock) {
    return {
      ok: false,
      accepted: false,
      duplicate: false,
      code: lifecycleBlock.code,
      message: lifecycleBlock.message,
      fixtureId,
    };
  }

  // ── S2: Idempotency check — only when caller explicitly provides idempotencyKey ──
  const idemKey = options.idempotencyKey;
  if (typeof idemKey === "string" && idemKey.length > 0) {
    const existingByIdem = findApprovalByIdempotencyKey(idemKey);
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

  const state = getApprovalState(fixtureId);

  // ── S2: Version/state-snapshot conflict check ──
  if (typeof options.expectedLastEventId === "string") {
    if (state === null) {
      return {
        ok: false,
        duplicate: false,
        code: "VERSION_CONFLICT",
        message: `Cannot deny: no approval exists for fixtureId "${fixtureId}"`,
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
      `Cannot deny approval: no approval exists for fixtureId "${fixtureId}"`
    );
  }

  if (state.status === "granted") {
    throw new Error(
      `Cannot deny approval: fixtureId "${fixtureId}" is already granted`
    );
  }

  if (state.status === "denied") {
    throw new Error(
      `Cannot deny approval: fixtureId "${fixtureId}" is already denied`
    );
  }

  if (state.status !== "pending") {
    throw new Error(
      `Cannot deny approval: fixtureId "${fixtureId}" is in status "${state.status}", expected "pending"`
    );
  }

  const event = createApprovalEvent("ApprovalDenied", fixtureId, {
    idempotencyKey: idemKey,
    status: "denied",
    decision: "deny",
    reviewEventRef: state.reviewEventRef,
    reason: options.reason,
    metadata: options.metadata,
  });
  event.eventId = `${fixtureId}:approval-${new Date().toISOString()}`;

  return { ...appendApprovalEvent(event), duplicate: false };
}

export default {
  requestApproval,
  grantApproval,
  denyApproval,
  getApprovalState,
  evaluateRunApprovalGate,
  loadApprovalEvents,
};
