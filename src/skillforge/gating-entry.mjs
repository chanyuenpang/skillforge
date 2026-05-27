import { computeGatingDecision } from "./gating-store.mjs";

function getLifecycleBlock(payload = {}) {
  const lifecycle = payload?.lifecycle;
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

function toStringOrEmpty(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeSharedInput(raw) {
  const fixtureId = toStringOrEmpty(raw?.fixtureId);
  return { fixtureId };
}

function validateSharedInput(input) {
  if (!input.fixtureId) {
    return { ok: false, error: "fixtureId is required" };
  }
  return { ok: true };
}

export function issueGateDecisionFromManualEntry(payload = {}) {
  const normalized = normalizeSharedInput(payload);
  const check = validateSharedInput(normalized);

  if (!check.ok) {
    return {
      ok: false,
      accepted: false,
      channel: "manual",
      code: "INVALID_INPUT",
      message: check.error,
      errors: [{ field: "fixtureId", message: check.error }],
    };
  }

  const lifecycleBlock = getLifecycleBlock(payload);
  if (lifecycleBlock) {
    return {
      ok: false,
      accepted: false,
      channel: "manual",
      code: lifecycleBlock.code,
      message: lifecycleBlock.message,
      fixtureId: normalized.fixtureId,
    };
  }

  const result = computeGatingDecision(normalized.fixtureId);
  return {
    ok: true,
    accepted: true,
    channel: "manual",
    decision: result.decision,
    reason: result.reason,
    duplicate: result.duplicate,
    eventId: result.eventId,
    fixtureId: result.fixtureId,
  };
}

export function issueGateDecisionFromApiEntry(payload = {}) {
  const normalized = normalizeSharedInput(payload);
  const check = validateSharedInput(normalized);

  if (!check.ok) {
    return {
      ok: false,
      accepted: false,
      channel: "api",
      code: "INVALID_INPUT",
      message: check.error,
      errors: [{ field: "fixtureId", message: check.error }],
    };
  }

  const lifecycleBlock = getLifecycleBlock(payload);
  if (lifecycleBlock) {
    return {
      ok: false,
      accepted: false,
      channel: "api",
      code: lifecycleBlock.code,
      message: lifecycleBlock.message,
      fixtureId: normalized.fixtureId,
    };
  }

  const result = computeGatingDecision(normalized.fixtureId);
  return {
    ok: true,
    accepted: true,
    channel: "api",
    decision: result.decision,
    reason: result.reason,
    duplicate: result.duplicate,
    eventId: result.eventId,
    fixtureId: result.fixtureId,
  };
}

export default {
  issueGateDecisionFromManualEntry,
  issueGateDecisionFromApiEntry,
};
