const HANDOFF_STATUS_VALUES = Object.freeze(new Set(["pending", "in-progress", "ready", "handed-off", "failed"]));

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

function validateReviewRecordForPrep(reviewRecord) {
  if (!isPlainObject(reviewRecord)) {
    return { valid: false, error: "reviewRecord must be an object" };
  }
  if (reviewRecord.status !== "approved") {
    return { valid: false, error: "reviewRecord status must be 'approved' to enter publish-prep" };
  }
  if (reviewRecord.decision !== "approve") {
    return { valid: false, error: "reviewRecord decision must be 'approve' to enter publish-prep" };
  }
  return { valid: true };
}

/**
 * Create a PublishPrep handoff object from an approved ReviewRecord.
 *
 * Only ReviewRecords with status="approved" and decision="approve" may enter this handoff.
 * This object is the middle layer between review/approval and registry-entry.
 * It does NOT represent publish completion — only readiness to hand off.
 *
 * @param {object} reviewRecord - A validated ReviewRecord object.
 * @param {object} [readinessInputs={}] - External readiness signals (static validation, preflight).
 * @param {object} [provenanceInputs={}] - Additional provenance inputs beyond the review record.
 * @returns {object} A PublishPrep handoff object.
 */
export function createPublishPrep(reviewRecord, readinessInputs = {}, provenanceInputs = {}) {
  const gateCheck = validateReviewRecordForPrep(reviewRecord);
  if (!gateCheck.valid) {
    throw new Error(`Cannot create PublishPrep: ${gateCheck.error}`);
  }

  const now = new Date().toISOString();

  // Readiness: aggregate from availability signals rather than re-running checks
  const staticValidationPassed = Boolean(readinessInputs.staticValidationPassed ?? true);
  const preflightPassed = Boolean(readinessInputs.preflightPassed ?? true);
  const reviewGatePassed = true; // gated by constructor

  const readinessBlockers = [];
  if (!staticValidationPassed) readinessBlockers.push("static_validation_not_passed");
  if (!preflightPassed) readinessBlockers.push("preflight_not_passed");

  const overallReadiness = readinessBlockers.length > 0 ? "failed" : "ready";

  // Provenance: trace evidence chain from review record + external inputs
  const provenance = {
    evidenceRefs: [
      ...(Array.isArray(reviewRecord.evidenceRefs) ? reviewRecord.evidenceRefs : []),
      ...(Array.isArray(provenanceInputs.evidenceRefs) ? provenanceInputs.evidenceRefs : []),
    ],
    sourceLinks: [
      ...(Array.isArray(reviewRecord.sourceLinks) ? reviewRecord.sourceLinks : []),
      ...(Array.isArray(provenanceInputs.sourceLinks) ? provenanceInputs.sourceLinks : []),
    ],
    reviewRecordCreatedAt: reviewRecord.createdAt ?? null,
    preparedAt: now,
  };

  return {
    kind: "publish-prep",
    reviewRecordRef: {
      fixtureId: reviewRecord.fixtureId,
      reviewStatus: reviewRecord.status,
      reviewDecision: reviewRecord.decision,
      reviewUpdatedAt: reviewRecord.updatedAt,
    },
    readiness: {
      staticValidationPassed,
      preflightPassed,
      reviewGatePassed,
      overall: overallReadiness,
      blockingReasons: readinessBlockers,
    },
    provenance,
    handoffMeta: {
      status: "pending",
      blockingReasons: [],
      preparedAt: now,
      updatedAt: now,
    },
  };
}

export function validatePublishPrep(record) {
  const errors = [];

  if (!isPlainObject(record)) {
    pushError(errors, "$", "publish-prep must be an object");
    return { valid: false, errors };
  }

  if (record.kind !== "publish-prep") pushError(errors, "kind", "must be publish-prep");

  // reviewRecordRef
  if (!isPlainObject(record.reviewRecordRef)) {
    pushError(errors, "reviewRecordRef", "is required and must be an object");
  } else {
    if (!hasText(record.reviewRecordRef.fixtureId)) pushError(errors, "reviewRecordRef.fixtureId", "is required");
    if (!hasText(record.reviewRecordRef.reviewStatus)) pushError(errors, "reviewRecordRef.reviewStatus", "is required");
    if (!hasText(record.reviewRecordRef.reviewDecision)) pushError(errors, "reviewRecordRef.reviewDecision", "is required");
  }

  // readiness
  if (!isPlainObject(record.readiness)) {
    pushError(errors, "readiness", "is required and must be an object");
  } else {
    if (typeof record.readiness.staticValidationPassed !== "boolean") {
      pushError(errors, "readiness.staticValidationPassed", "must be a boolean");
    }
    if (typeof record.readiness.preflightPassed !== "boolean") {
      pushError(errors, "readiness.preflightPassed", "must be a boolean");
    }
    if (typeof record.readiness.reviewGatePassed !== "boolean") {
      pushError(errors, "readiness.reviewGatePassed", "must be a boolean");
    }
    if (!HANDOFF_STATUS_VALUES.has(record.readiness.overall)) {
      pushError(errors, "readiness.overall", "must be a valid handoff status");
    }
    if (!Array.isArray(record.readiness.blockingReasons)) {
      pushError(errors, "readiness.blockingReasons", "must be an array");
    }
  }

  // provenance
  if (!isPlainObject(record.provenance)) {
    pushError(errors, "provenance", "is required and must be an object");
  } else {
    if (!isStringArray(record.provenance.evidenceRefs)) {
      pushError(errors, "provenance.evidenceRefs", "must be an array of strings");
    }
    if (!isStringArray(record.provenance.sourceLinks)) {
      pushError(errors, "provenance.sourceLinks", "must be an array of strings");
    }
    if (!isIsoString(record.provenance.preparedAt)) {
      pushError(errors, "provenance.preparedAt", "must be an ISO string");
    }
  }

  // handoffMeta
  if (!isPlainObject(record.handoffMeta)) {
    pushError(errors, "handoffMeta", "is required and must be an object");
  } else {
    if (!HANDOFF_STATUS_VALUES.has(record.handoffMeta.status)) {
      pushError(errors, "handoffMeta.status", "must be a valid handoff status");
    }
    if (!Array.isArray(record.handoffMeta.blockingReasons)) {
      pushError(errors, "handoffMeta.blockingReasons", "must be an array");
    }
    if (!isIsoString(record.handoffMeta.preparedAt)) {
      pushError(errors, "handoffMeta.preparedAt", "must be an ISO string");
    }
    if (!isIsoString(record.handoffMeta.updatedAt)) {
      pushError(errors, "handoffMeta.updatedAt", "must be an ISO string");
    }
  }

  return { valid: errors.length === 0, errors };
}

export {
  HANDOFF_STATUS_VALUES,
};

export default {
  HANDOFF_STATUS_VALUES,
  createPublishPrep,
  validatePublishPrep,
};
