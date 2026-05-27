const RISK_SEVERITY_VALUES = Object.freeze(new Set(["low", "medium", "high", "critical"]));

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

export function createRiskRecord(input = {}) {
  const now = new Date().toISOString();

  return {
    kind: "risk-record",
    idempotencyKey: input.idempotencyKey,
    fixtureId: input.fixtureId,
    riskType: input.riskType,
    severity: input.severity,
    summary: input.summary,
    observedAt: input.observedAt ?? now,
    evidenceRefs: Array.isArray(input.evidenceRefs) ? [...input.evidenceRefs] : [],
    sourceLinks: Array.isArray(input.sourceLinks) ? [...input.sourceLinks] : [],
    metadata: isPlainObject(input.metadata) ? { ...input.metadata } : {},
    createdAt: now,
  };
}

export function validateRiskRecord(record) {
  const errors = [];

  if (!isPlainObject(record)) {
    pushError(errors, "$", "risk-record must be an object");
    return { valid: false, errors };
  }

  if (record.kind !== "risk-record") pushError(errors, "kind", "must be risk-record");
  if (!hasText(record.idempotencyKey)) pushError(errors, "idempotencyKey", "is required");
  if (!hasText(record.fixtureId)) pushError(errors, "fixtureId", "is required");
  if (!hasText(record.riskType)) pushError(errors, "riskType", "is required");
  if (!RISK_SEVERITY_VALUES.has(record.severity)) pushError(errors, "severity", "must be a valid risk severity");
  if (!hasText(record.summary)) pushError(errors, "summary", "is required");
  if (!isIsoString(record.observedAt)) pushError(errors, "observedAt", "must be an ISO string");
  if (!isStringArray(record.evidenceRefs)) pushError(errors, "evidenceRefs", "must be an array of strings");
  if (!isStringArray(record.sourceLinks)) pushError(errors, "sourceLinks", "must be an array of strings");
  if (!isPlainObject(record.metadata)) pushError(errors, "metadata", "must be an object");
  if (!isIsoString(record.createdAt)) pushError(errors, "createdAt", "must be an ISO string");

  return { valid: errors.length === 0, errors };
}

export { RISK_SEVERITY_VALUES };

export default {
  RISK_SEVERITY_VALUES,
  createRiskRecord,
  validateRiskRecord,
};
