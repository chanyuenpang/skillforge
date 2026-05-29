const REGISTRY_STATUS_VALUES = Object.freeze(new Set(["registered", "pending-publish", "failed"]));
// NOTE: "published" is intentionally excluded — this phase does not implement full publish.

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

function isTagArray(value) {
  return Array.isArray(value) && value.every((item) => isPlainObject(item) && hasText(item.id));
}

function pushError(errors, field, message) {
  errors.push({ field, message });
}

function validatePublishPrepForRegistry(publishPrep) {
  if (!isPlainObject(publishPrep)) {
    return { valid: false, error: "publishPrep must be an object" };
  }
  if (publishPrep.kind !== "publish-prep") {
    return { valid: false, error: "publishPrep kind must be 'publish-prep'" };
  }
  return { valid: true };
}

/**
 * Create a RegistryEntry metadata handoff object from a PublishPrep.
 *
 * This is the terminal object in the review → publish-prep → registry-entry chain.
 * It only registers metadata — it does NOT implement full publish, distribution,
 * install, or any registry platform behavior.
 *
 * "published" status is intentionally excluded from REGISTRY_STATUS_VALUES.
 *
 * @param {object} publishPrep - A validated PublishPrep object.
 * @param {object} [registryInputs={}] - Additional registry metadata inputs.
 * @returns {object} A RegistryEntry metadata handoff object.
 */
export function createRegistryEntry(publishPrep, registryInputs = {}) {
  const gateCheck = validatePublishPrepForRegistry(publishPrep);
  if (!gateCheck.valid) {
    throw new Error(`Cannot create RegistryEntry: ${gateCheck.error}`);
  }

  const now = new Date().toISOString();
  const semanticAsset = registryInputs.semanticAsset && isPlainObject(registryInputs.semanticAsset)
    ? registryInputs.semanticAsset
    : null;

  // Build reviewDecision back-reference from PublishPrep
  const reviewDecision = {
    decision: publishPrep.reviewRecordRef?.reviewDecision ?? null,
    reviewRef: publishPrep.reviewRecordRef?.fixtureId ?? null,
    reviewedAt: publishPrep.reviewRecordRef?.reviewUpdatedAt ?? null,
    evidenceRefs: Array.isArray(publishPrep.provenance?.evidenceRefs)
      ? publishPrep.provenance.evidenceRefs
      : [],
    sourceLinks: Array.isArray(publishPrep.provenance?.sourceLinks)
      ? publishPrep.provenance.sourceLinks
      : [],
  };

  // Provenance chain: flatten and deduplicate
  const rawChain = [
    publishPrep.reviewRecordRef?.fixtureId,
    ...(Array.isArray(publishPrep.provenance?.evidenceRefs)
      ? publishPrep.provenance.evidenceRefs
      : []),
  ].filter(Boolean);
  const chain = [...new Set(rawChain)];

  // PublishPrepRef linkage
  const publishPrepRef = publishPrep.reviewRecordRef?.fixtureId ?? null;

  const initialStatus = registryInputs.initialStatus ?? "registered";
  const status = REGISTRY_STATUS_VALUES.has(initialStatus) ? initialStatus : "registered";

  return {
    kind: "registry-entry",
    registryId: registryInputs.registryId ?? null,
    version: registryInputs.version ?? null,
    fixtureId: publishPrep.reviewRecordRef?.fixtureId ?? null,
    source: registryInputs.source ?? { type: "skillforge-fixture", location: null },
    source_hash: hasText(registryInputs.source_hash) ? registryInputs.source_hash : null,
    semanticAsset,
    tags: isTagArray(registryInputs.tags) ? registryInputs.tags : [],
    reviewDecision,
    publishPrepRef,
    provenance: {
      chain,
      preparedAt: publishPrep.provenance?.preparedAt ?? null,
      registeredAt: now,
    },
    registryMeta: {
      status,
      registeredAt: now,
      updatedAt: now,
      notes: Array.isArray(registryInputs.notes) ? registryInputs.notes : [],
    },
  };
}

export function validateRegistryEntry(record) {
  const errors = [];

  if (!isPlainObject(record)) {
    pushError(errors, "$", "registry-entry must be an object");
    return { valid: false, errors };
  }

  if (record.kind !== "registry-entry") pushError(errors, "kind", "must be registry-entry");

  // fixtureId
  if (!hasText(record.fixtureId)) pushError(errors, "fixtureId", "is required");

  // source
  if (!isPlainObject(record.source)) {
    pushError(errors, "source", "is required and must be an object");
  } else {
    if (!hasText(record.source.type)) pushError(errors, "source.type", "is required");
  }

  // tags
  if (record.tags !== undefined && !isTagArray(record.tags)) {
    pushError(errors, "tags", "must be an array of { id, ... } objects");
  }

  // reviewDecision back-reference
  if (!isPlainObject(record.reviewDecision)) {
    pushError(errors, "reviewDecision", "is required and must be an object");
  } else {
    if (!hasText(record.reviewDecision.decision)) pushError(errors, "reviewDecision.decision", "is required");
    if (!hasText(record.reviewDecision.reviewRef)) pushError(errors, "reviewDecision.reviewRef", "is required");
    if (!isStringArray(record.reviewDecision.evidenceRefs)) {
      pushError(errors, "reviewDecision.evidenceRefs", "must be an array of strings");
    }
  }

  // publishPrepRef linkage
  if (!hasText(record.publishPrepRef)) pushError(errors, "publishPrepRef", "is required");

  // provenance
  if (!isPlainObject(record.provenance)) {
    pushError(errors, "provenance", "is required and must be an object");
  } else {
    if (!isStringArray(record.provenance.chain)) {
      pushError(errors, "provenance.chain", "must be an array of strings");
    }
  }

  // registryMeta
  if (!isPlainObject(record.registryMeta)) {
    pushError(errors, "registryMeta", "is required and must be an object");
  } else {
    if (!REGISTRY_STATUS_VALUES.has(record.registryMeta.status)) {
      pushError(errors, "registryMeta.status", "must be one of registered|pending-publish|failed — 'published' is not implemented");
    }
    if (!isIsoString(record.registryMeta.registeredAt)) {
      pushError(errors, "registryMeta.registeredAt", "must be an ISO string");
    }
  }

  // Explicitly reject any published status
  if (record.registryMeta?.status === "published") {
    pushError(errors, "registryMeta.status", "'published' is not implemented in this phase");
  }

  return { valid: errors.length === 0, errors };
}

export {
  REGISTRY_STATUS_VALUES,
};

export default {
  REGISTRY_STATUS_VALUES,
  createRegistryEntry,
  validateRegistryEntry,
};
