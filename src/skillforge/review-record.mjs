const REVIEW_STATUS_VALUES = Object.freeze(new Set(["idle", "ready", "blocked", "approved", "rejected"]));
const REVIEW_DECISION_VALUES = Object.freeze(new Set(["approve", "reject", "hold"]));
const BLOCKING_REASON_VALUES = Object.freeze(new Set([
  "missing_generate_evidence",
  "missing_review_evidence",
  "missing_source_links",
  "invalid_source_links",
  "policy_violation",
  "schema_mismatch",
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

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => hasText(item));
}

function pushError(errors, field, message) {
  errors.push({ field, message });
}

export function createReviewRecord(fixtureId, evidenceRefs = [], sourceLinks = []) {
  const now = new Date().toISOString();

  return {
    kind: "review-record",
    fixtureId,
    status: "idle",
    decision: null,
    blockingReasons: [],
    evidenceRefs: Array.isArray(evidenceRefs) ? [...evidenceRefs] : [],
    sourceLinks: Array.isArray(sourceLinks) ? [...sourceLinks] : [],
    createdAt: now,
    updatedAt: now,
  };
}

export function validateReviewRecord(record) {
  const errors = [];

  if (!isPlainObject(record)) {
    pushError(errors, "$", "review-record must be an object");
    return { valid: false, errors };
  }

  if (record.kind !== "review-record") pushError(errors, "kind", "must be review-record");
  if (!hasText(record.fixtureId)) pushError(errors, "fixtureId", "is required");
  if (!REVIEW_STATUS_VALUES.has(record.status)) pushError(errors, "status", "must be a valid review status");

  if (record.decision !== null && !REVIEW_DECISION_VALUES.has(record.decision)) {
    pushError(errors, "decision", "must be null or a valid review decision");
  }

  if (!Array.isArray(record.blockingReasons)) {
    pushError(errors, "blockingReasons", "must be an array");
  } else {
    for (const reason of record.blockingReasons) {
      if (!BLOCKING_REASON_VALUES.has(reason)) {
        pushError(errors, "blockingReasons", "contains invalid value");
        break;
      }
    }
  }

  if (!isStringArray(record.evidenceRefs)) pushError(errors, "evidenceRefs", "must be an array of strings");
  if (!isStringArray(record.sourceLinks)) pushError(errors, "sourceLinks", "must be an array of strings");
  if (!isIsoString(record.createdAt)) pushError(errors, "createdAt", "must be an ISO string");
  if (!isIsoString(record.updatedAt)) pushError(errors, "updatedAt", "must be an ISO string");

  if (record.status !== "blocked" && Array.isArray(record.blockingReasons) && record.blockingReasons.length > 0) {
    pushError(errors, "blockingReasons", "must be empty unless status is blocked");
  }

  if ((record.status === "approved" || record.status === "rejected") && record.decision === null) {
    pushError(errors, "decision", "must be non-null when status is approved or rejected");
  }

  if (record.status !== "approved" && record.status !== "rejected" && record.decision !== null) {
    pushError(errors, "decision", "must be null unless status is approved or rejected");
  }

  return { valid: errors.length === 0, errors };
}

export {
  REVIEW_STATUS_VALUES,
  REVIEW_DECISION_VALUES,
  BLOCKING_REASON_VALUES,
};

export default {
  REVIEW_STATUS_VALUES,
  REVIEW_DECISION_VALUES,
  BLOCKING_REASON_VALUES,
  createReviewRecord,
  validateReviewRecord,
};
