const APPROVAL_STATUS_VALUES = Object.freeze(new Set(["pending", "granted", "denied"]));
const APPROVAL_DECISION_VALUES = Object.freeze(new Set(["grant", "deny"]));
const APPROVAL_EVENT_TYPES = Object.freeze(new Set([
  "ApprovalRequested",
  "ApprovalGranted",
  "ApprovalDenied",
]));

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasText(value) {
  return typeof value === "string" && value.trim() !== "";
}

function isIsoString(value) {
  return hasText(value) && !Number.isNaN(Date.parse(value));
}

function pushError(errors, field, message) {
  errors.push({ field, message });
}

export function createApprovalEvent(type, fixtureId, options = {}) {
  const now = new Date().toISOString();
  const event = {
    kind: "approval-event",
    type,
    fixtureId,
    recordedAt: now,
    metadata: isPlainObject(options.metadata) ? { ...options.metadata } : {},
  };

  if (options.idempotencyKey) event.idempotencyKey = options.idempotencyKey;
  if (options.status) event.status = options.status;
  if (options.decision) event.decision = options.decision;
  if (options.reviewEventRef) event.reviewEventRef = options.reviewEventRef;
  if (options.reason) event.reason = options.reason;

  return event;
}

export function validateApprovalEvent(event) {
  const errors = [];

  if (!isPlainObject(event)) {
    pushError(errors, "$", "approval-event must be an object");
    return { valid: false, errors };
  }

  if (event.kind !== "approval-event") pushError(errors, "kind", "must be approval-event");
  if (!APPROVAL_EVENT_TYPES.has(event.type)) {
    pushError(errors, "type", "must be a valid approval event type");
  }
  if (!hasText(event.fixtureId)) pushError(errors, "fixtureId", "is required");
  if (!isIsoString(event.recordedAt)) pushError(errors, "recordedAt", "must be an ISO string");
  if (!isPlainObject(event.metadata)) pushError(errors, "metadata", "must be an object");
  if (!hasText(event.reviewEventRef)) {
    pushError(errors, "reviewEventRef", "is required and must reference a review event");
  }

  if (event.type === "ApprovalGranted" || event.type === "ApprovalDenied") {
    if (!APPROVAL_STATUS_VALUES.has(event.status)) {
      pushError(errors, "status", "must be a valid approval status");
    }
    if (!APPROVAL_DECISION_VALUES.has(event.decision)) {
      pushError(errors, "decision", "must be a valid approval decision");
    }
  }

  return { valid: errors.length === 0, errors };
}

export {
  APPROVAL_STATUS_VALUES,
  APPROVAL_DECISION_VALUES,
  APPROVAL_EVENT_TYPES,
};

export default {
  APPROVAL_STATUS_VALUES,
  APPROVAL_DECISION_VALUES,
  APPROVAL_EVENT_TYPES,
  createApprovalEvent,
  validateApprovalEvent,
};
