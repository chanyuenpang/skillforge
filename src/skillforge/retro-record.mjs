const RETRO_STATUS_VALUES = Object.freeze(new Set(["draft", "finalized"]));
const RETRO_DECISION_VALUES = Object.freeze(
  new Set(["backfill_allowed", "backfill_deferred", "evidence_required"]),
);

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

export function createRetroRecord(fixtureId, options = {}) {
  const now = new Date().toISOString();

  return {
    kind: "retro-record",
    fixtureId,
    status: "draft",
    decision: null,
    evidenceAnchors: [],
    coverageScope: "",
    nonCoverageScope: "",
    summary: hasText(options.summary) ? options.summary : "",
    metadata: isPlainObject(options.metadata) ? { ...options.metadata } : {},
    createdAt: now,
    updatedAt: now,
  };
}

export function validateRetroRecord(record) {
  const errors = [];

  if (!isPlainObject(record)) {
    pushError(errors, "$", "retro-record must be an object");
    return { valid: false, errors };
  }

  if (record.kind !== "retro-record") pushError(errors, "kind", "must be retro-record");
  if (!hasText(record.fixtureId)) pushError(errors, "fixtureId", "is required");
  if (!RETRO_STATUS_VALUES.has(record.status)) pushError(errors, "status", "must be a valid retro status");

  if (record.decision !== null && !RETRO_DECISION_VALUES.has(record.decision)) {
    pushError(errors, "decision", "must be null or a valid retro decision");
  }

  if (!isStringArray(record.evidenceAnchors)) {
    pushError(errors, "evidenceAnchors", "must be an array of non-empty strings");
  }

  if (!hasText(record.coverageScope) && record.status === "finalized") {
    pushError(errors, "coverageScope", "is required when status is finalized");
  }

  if (!hasText(record.nonCoverageScope) && record.status === "finalized") {
    pushError(errors, "nonCoverageScope", "is required when status is finalized");
  }

  if (!isIsoString(record.createdAt)) pushError(errors, "createdAt", "must be an ISO string");
  if (!isIsoString(record.updatedAt)) pushError(errors, "updatedAt", "must be an ISO string");

  return { valid: errors.length === 0, errors };
}

export {
  RETRO_STATUS_VALUES,
  RETRO_DECISION_VALUES,
};

export default {
  RETRO_STATUS_VALUES,
  RETRO_DECISION_VALUES,
  createRetroRecord,
  validateRetroRecord,
};
