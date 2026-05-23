import path from "node:path";

export const RUNTIME_REPLAY_REPORT_VERSION = "0.1.0-draft";
export const RUNTIME_REPLAY_PROTOCOL_VERSION = "runtime-replay-protocol-draft-1";
export const RUNTIME_REPLAY_KIND = "runtime-replay-report";

const FAILING_CASE_STATUSES = new Set(["error"]);
const BLOCKED_CASE_STATUSES = new Set(["blocked"]);
const DRAFT_NON_EXECUTED_CASE_STATUSES = new Set(["blocked", "dry-run", "not-executed"]);
const ALLOWED_DRAFT_CASE_STATUSES = new Set(["blocked", "error", "dry-run", "not-executed", "synthetic-passed"]);
const PROVIDER_BACKED_RESERVED_FAILURE_STATUSES = new Set(["blocked", "error"]);
const SAME_SOURCE_EXECUTION_IDENTITY_FIELDS = Object.freeze([
  "executionId",
  "providerRunId",
  "providerStatus",
]);
const INTERNAL_PROVIDER_STUB_STATUS_TO_PUBLIC_STATUS = Object.freeze({
  "stub-blocked": "blocked",
  "stub-error": "error",
  "stub-reserved": "error",
});
const WARNING_CHECK_STATUSES = new Set(["warn"]);
const ERROR_CHECK_STATUSES = new Set(["error", "fail"]);
const DEFAULT_PENDING_CAPABILITIES = [
  "runtime-runner",
  "sandbox-contract",
  "sandbox-implementation",
  "transcript-engine",
  "provider-integration",
  "scoring-engine",
];
const DEFAULT_METADATA_NOTE =
  "runtime draft artifact only: no real provider execution, no transcript evidence, no raw-response payload evidence, no scoring result, no runtime pass evidence; synthetic mock paths remain explicitly non-real";

function deriveExecutionProvenance({ providerExecution = null, transcriptAvailability = null, mode = null } = {}) {
  const providerBackedSelected = providerExecution?.providerBacked === true;
  const providerCallObserved = providerExecution?.providerCall === true;
  const synthetic = providerExecution?.synthetic === true || providerExecution?.syntheticMarker != null || mode === "dry-run" || mode === "synthetic";
  const executionSource = providerExecution?.executionSource
    ?? (synthetic ? "provider-synthetic" : providerBackedSelected ? "provider-reserved" : "provider-less");
  const evidenceLevel = synthetic
    ? "synthetic-mock"
    : providerBackedSelected
      ? "reserved-unimplemented"
      : "provider-less-draft";

  return {
    executionSource,
    synthetic,
    providerBackedSelected,
    providerCallObserved,
    evidenceLevel,
    lineage: "adapter->runner->observed->report",
    transcriptAvailability: transcriptAvailability?.availability ?? transcriptAvailability?.available ?? null,
    provenanceSummary: deriveHumanReadableProvenanceSummary({ executionSource, evidenceLevel }),
  };
}

function deriveHumanReadableProvenanceSummary({ executionSource, evidenceLevel } = {}) {
  switch (executionSource) {
    case "provider-less":
      return "provider-less draft path；未触发 provider 执行，仅为保留/占位链路";
    case "provider-synthetic":
      return "synthetic mock provider path；非真实 provider 执行，仅用于契约连线验证";
    case "provider-reserved":
      return "provider-backed reserved slot；尚未接入真实 provider 执行";
    default:
      return `${executionSource ?? "unknown/reserved"}；no real provider evidence`;
  }
}

const DEFAULT_PROVIDER_EXECUTION_FRAGMENT = Object.freeze({
  selection: null,
  adapterKey: null,
  providerKey: null,
  providerSlot: null,
  builtin: false,
  implemented: false,
  providerBacked: false,
  status: "not-executed",
  executionId: null,
  providerRunId: null,
  providerStatus: null,
  executed: false,
  providerCall: false,
  providerEvidenceAvailable: false,
  transcriptAvailable: false,
  transcriptCaptured: false,
  transcriptPersistence: false,
  persistence: "none",
  rawResponseAvailable: false,
  rawResponseSummary: null,
  rawResponseHandle: null,
  transcriptHandle: null,
  transcriptProviderManaged: false,
  implementationState: null,
  reservedStatusSet: [],
  futureRequiredFields: [],
  pendingCapabilities: [],
  note: null,
});

const DEFAULT_TRANSCRIPT_AVAILABILITY_SKELETON = Object.freeze({
  available: false,
  availability: "none",
  providerManaged: false,
  providerTranscript: false,
  handle: null,
  location: null,
  providerBacked: false,
  transcriptCaptured: false,
  transcriptPersistence: false,
  persistence: "none",
  note:
    "runtime observed mapper transcript availability skeleton only; handle semantics are same-source only and do not imply raw-response/provider-handle reuse in this phase",
});

function safeFixturePath(fixtureDir) {
  if (!fixtureDir) return null;
  const cwd = process.cwd();
  const relative = path.relative(cwd, path.resolve(fixtureDir));
  if (relative && !relative.startsWith("..") && !path.isAbsolute(relative)) return relative;
  return path.basename(path.resolve(fixtureDir));
}

function normalizeCaseStatus(status) {
  if (!status) return "not-executed";
  const normalized = String(status);
  if (!ALLOWED_DRAFT_CASE_STATUSES.has(normalized)) return "not-executed";
  return normalized;
}

function normalizeFailureReason(failureReason, status) {
  if (!failureReason || typeof failureReason !== "object" || Array.isArray(failureReason)) return null;

  return {
    ...failureReason,
    blockingCheckIds: Array.isArray(failureReason?.blockingCheckIds) ? [...failureReason.blockingCheckIds] : [],
    sourceStatus: failureReason?.sourceStatus ?? status,
    sameSource: failureReason?.sameSource === true,
    providerBackedReserved: failureReason?.providerBackedReserved === true,
  };
}

function assertProviderStatusCompatSeam({ status, providerExecution }) {
  const providerStatus = providerExecution?.providerStatus ?? null;
  if (providerExecution?.providerBacked !== true) {
    if (providerStatus != null) {
      throw new RangeError(
        "Runtime replay report non-provider-backed providerExecution must not carry internal providerStatus values",
      );
    }
    return;
  }

  if (providerStatus == null) {
    return;
  }

  const compatPublicStatus = INTERNAL_PROVIDER_STUB_STATUS_TO_PUBLIC_STATUS[providerStatus] ?? null;
  if (compatPublicStatus == null) {
    throw new RangeError(
      `Runtime replay report providerStatus must remain inside the internal stub seam, got: ${providerStatus}`,
    );
  }

  if (compatPublicStatus !== status) {
    throw new RangeError(
      `Runtime replay report forbids propagating providerStatus ${providerStatus} into public case status ${status}`,
    );
  }
}

function assertSameSourceFailurePropagation({ status, providerExecution, failureReason, observed, mode = null }) {
  if (providerExecution.providerBacked === true && !PROVIDER_BACKED_RESERVED_FAILURE_STATUSES.has(status)) {
    throw new RangeError(
      `Runtime replay report reserved provider-backed seam only allows blocked/error case statuses, got: ${status}`,
    );
  }

  if (failureReason?.sourceStatus && failureReason.sourceStatus !== status) {
    throw new RangeError("Runtime replay report failureReason sourceStatus must match case status");
  }

  if (status === "blocked") {
    if (failureReason?.code !== "RUNTIME_PREFLIGHT_BLOCKED") {
      throw new RangeError("Runtime replay report blocked case requires same-source preflight failureReason");
    }
    if (observed.evidence !== "preflight-blocked") {
      throw new RangeError("Runtime replay report blocked case must keep preflight-blocked observed evidence");
    }
  }

  if (status !== "blocked" && failureReason?.code === "RUNTIME_PREFLIGHT_BLOCKED") {
    throw new RangeError("Runtime replay report cannot reuse preflight-blocked failureReason for non-blocked case");
  }

  if (status === "error" && providerExecution.providerBacked === true && observed.evidence !== "provider-slot-reserved") {
    throw new RangeError("Runtime replay report provider-backed error must keep provider-slot-reserved observed evidence");
  }

  if (mode === "synthetic" && observed.evidence !== "synthetic-passed") {
    throw new RangeError("Runtime replay report synthetic mode must keep synthetic-passed observed evidence");
  }

  if (providerExecution.providerBacked === true) {
    const hasAnyIdentity =
      providerExecution.executionId != null ||
      providerExecution.providerRunId != null ||
      providerExecution.providerStatus != null;
    const hasFullIdentity =
      providerExecution.executionId != null &&
      providerExecution.providerRunId != null &&
      providerExecution.providerStatus != null;

    if (hasAnyIdentity !== hasFullIdentity) {
      throw new RangeError(
        "Runtime replay report forbids mixed-source or partially populated provider-backed execution identity",
      );
    }
  }

  assertProviderStatusCompatSeam({ status, providerExecution });
}

function normalizeObserved(observed, status) {
  const fallback = {
    kind: "runtime-observed-stub",
    evidence: "not-executed",
    providerCall: false,
    transcriptCaptured: false,
    sideEffectsPerformed: false,
    providerEvidenceAvailable: false,
    persistedEvidenceAvailable: false,
    note: `runtime draft reserved observed stub for status ${status}`,
  };

  if (!observed || typeof observed !== "object" || Array.isArray(observed)) return fallback;

  return {
    ...observed,
    kind: observed?.kind ?? fallback.kind,
    evidence: observed?.evidence ?? "not-executed",
    providerCall: observed?.providerCall === true,
    transcriptCaptured: observed?.transcriptCaptured === true,
    sideEffectsPerformed: observed?.sideEffectsPerformed === true,
    providerEvidenceAvailable: observed?.providerEvidenceAvailable === true,
    persistedEvidenceAvailable: observed?.persistedEvidenceAvailable === true,
    note: observed?.note ?? fallback.note,
  };
}

function normalizeTranscriptRef(transcriptRef, runtimeCase, transcriptAvailability) {
  if (!transcriptRef || typeof transcriptRef !== "object" || Array.isArray(transcriptRef)) return null;

  const available = transcriptRef?.available === true;
  const normalized = {
    ...transcriptRef,
    available,
    availability: available ? transcriptRef?.availability ?? "none" : "none",
    providerManaged: available ? transcriptRef?.providerManaged === true : false,
    providerTranscript: available ? transcriptRef?.providerTranscript === true : false,
    handle: available ? transcriptRef?.handle ?? null : null,
    location:
      available && transcriptRef?.location && typeof transcriptRef.location === "object" && !Array.isArray(transcriptRef.location)
        ? { ...transcriptRef.location }
        : null,
    persistence: available ? transcriptRef?.persistence ?? "none" : "none",
    note:
      transcriptRef?.note ??
      `draft transcript ref only for case ${runtimeCase?.id ?? "<unknown>"}; same-source only, reserved seam only, and not persisted provider evidence`,
  };

  if (transcriptAvailability?.available === true) {
    if (normalized.available !== true) {
      throw new RangeError("Runtime replay report transcriptRef must stay same-source with transcriptAvailability.available");
    }

    if ((normalized.availability ?? "none") !== (transcriptAvailability.availability ?? "none")) {
      throw new RangeError("Runtime replay report forbids mixed-source transcript availability mode");
    }

    if (normalized.providerManaged !== (transcriptAvailability.providerManaged === true)) {
      throw new RangeError("Runtime replay report forbids remapping providerManaged outside adapter→mapper→runner seam");
    }

    if (normalized.providerTranscript !== (transcriptAvailability.providerTranscript === true)) {
      throw new RangeError("Runtime replay report forbids remapping providerTranscript outside adapter→mapper→runner seam");
    }

    if ((normalized.handle ?? null) !== (transcriptAvailability.handle ?? null)) {
      throw new RangeError("Runtime replay report forbids mixed-source transcript handles");
    }

    if ((normalized.persistence ?? "none") !== (transcriptAvailability.persistence ?? "none")) {
      throw new RangeError("Runtime replay report forbids mixed-source transcript persistence state");
    }
  }

  if (normalized.available !== true) {
    if (
      normalized.availability !== "none" ||
      normalized.providerManaged === true ||
      normalized.providerTranscript === true ||
      normalized.persistence !== "none"
    ) {
      throw new RangeError(
        "Runtime replay report forbids synthesizing transcript persistence/availability/providerManaged on unavailable transcript refs",
      );
    }
  }

  return normalized;
}

function assertSameSourceRawResponseReportPropagation(providerExecution) {
  const rawResponseAvailable = providerExecution?.rawResponseAvailable === true;
  const rawResponseSummary = providerExecution?.rawResponseSummary ?? null;
  const rawResponseHandle = providerExecution?.rawResponseHandle ?? null;
  const transcriptHandle = providerExecution?.transcriptHandle ?? null;

  if (rawResponseAvailable !== true) {
    if (rawResponseSummary != null || rawResponseHandle != null) {
      throw new RangeError(
        "Runtime replay report forbids carrying rawResponse summary/handle when availability is false",
      );
    }
    return;
  }

  if (providerExecution?.providerBacked !== true) {
    throw new RangeError(
      "Runtime replay report forbids non-provider-backed rawResponse availability",
    );
  }

  if (providerExecution?.executed !== true || providerExecution?.providerCall !== true) {
    throw new RangeError(
      "Runtime replay report forbids rawResponse availability without executed provider-backed call evidence",
    );
  }

  if (providerExecution?.providerEvidenceAvailable !== true || providerExecution?.transcriptAvailable !== true) {
    throw new RangeError(
      "Runtime replay report forbids rawResponse availability without provider evidence and transcript availability",
    );
  }

  if (rawResponseHandle != null && transcriptHandle != null && rawResponseHandle === transcriptHandle) {
    throw new RangeError(
      "Runtime replay report forbids reusing transcript handles as rawResponse handles",
    );
  }
}

function assertSameSourceExecutionIdentityTuple({ providerExecution, runtimeProviderExecution }) {
  const caseTuple = SAME_SOURCE_EXECUTION_IDENTITY_FIELDS.map((field) => providerExecution?.[field] ?? null);
  const runtimeTuple = SAME_SOURCE_EXECUTION_IDENTITY_FIELDS.map((field) => runtimeProviderExecution?.[field] ?? null);
  const caseHasAnyIdentity = caseTuple.some((value) => value != null);
  const caseHasFullIdentity = caseTuple.every((value) => value != null);
  const runtimeHasAnyIdentity = runtimeTuple.some((value) => value != null);
  const runtimeHasFullIdentity = runtimeTuple.every((value) => value != null);

  if (caseHasAnyIdentity !== caseHasFullIdentity) {
    throw new RangeError(
      "Runtime replay report forbids partially populated execution identity tuple on runtime cases",
    );
  }

  if (runtimeHasAnyIdentity !== runtimeHasFullIdentity) {
    throw new RangeError(
      "Runtime replay report forbids partially populated execution identity tuple in runtime metadata",
    );
  }

  if (runtimeHasAnyIdentity === true && JSON.stringify(caseTuple) !== JSON.stringify(runtimeTuple)) {
    throw new RangeError(
      "Runtime replay report providerExecution metadata must stay same-source with case providerExecution tuple",
    );
  }
}

function normalizeProviderExecution(providerExecution) {
  if (!providerExecution || typeof providerExecution !== "object" || Array.isArray(providerExecution)) {
    return { ...DEFAULT_PROVIDER_EXECUTION_FRAGMENT };
  }

  const selection =
    providerExecution?.selection && typeof providerExecution.selection === "object" && !Array.isArray(providerExecution.selection)
      ? { ...providerExecution.selection }
      : null;

  const normalizedSelection = selection
    ? {
        ...selection,
        kind: selection?.kind ?? "runtime-provider-selection",
        version: selection?.version ?? null,
        adapterKey: selection?.adapterKey ?? providerExecution?.adapterKey ?? DEFAULT_PROVIDER_EXECUTION_FRAGMENT.adapterKey,
        providerKey: selection?.providerKey ?? providerExecution?.providerKey ?? DEFAULT_PROVIDER_EXECUTION_FRAGMENT.providerKey,
        providerSlot: selection?.providerSlot ?? providerExecution?.providerSlot ?? DEFAULT_PROVIDER_EXECUTION_FRAGMENT.providerSlot,
        builtin: selection?.builtin === true || providerExecution?.builtin === true,
        implemented: selection?.implemented === true || providerExecution?.implemented === true,
        providerBacked: selection?.providerBacked === true || providerExecution?.providerBacked === true,
      }
    : null;

  const adapterKey = normalizedSelection?.adapterKey ?? providerExecution?.adapterKey ?? DEFAULT_PROVIDER_EXECUTION_FRAGMENT.adapterKey;
  const providerKey = normalizedSelection?.providerKey ?? providerExecution?.providerKey ?? DEFAULT_PROVIDER_EXECUTION_FRAGMENT.providerKey;
  const providerSlot = normalizedSelection?.providerSlot ?? providerExecution?.providerSlot ?? DEFAULT_PROVIDER_EXECUTION_FRAGMENT.providerSlot;
  const builtin = normalizedSelection?.builtin === true || providerExecution?.builtin === true;
  const implemented = normalizedSelection?.implemented === true || providerExecution?.implemented === true;
  const providerBacked = normalizedSelection?.providerBacked === true || providerExecution?.providerBacked === true;
  const transcriptAvailable = providerExecution?.transcriptAvailable === true;
  const rawResponseAvailable = providerExecution?.rawResponseAvailable === true;
  const executionId = providerExecution?.executionId ?? null;
  const providerRunId = providerExecution?.providerRunId ?? null;
  const providerStatus = providerExecution?.providerStatus ?? null;

  if (providerBacked === true) {
    const hasAnyIdentity = executionId != null || providerRunId != null || providerStatus != null;
    const hasFullIdentity = executionId != null && providerRunId != null && providerStatus != null;

    if (hasAnyIdentity !== hasFullIdentity) {
      throw new RangeError(
        "Runtime replay report provider-backed execution identity must be propagated as an all-or-nothing same-source tuple",
      );
    }
  }

  const normalized = {
    ...providerExecution,
    selection: normalizedSelection,
    adapterKey,
    providerKey,
    providerSlot,
    builtin,
    implemented,
    providerBacked,
    status: providerExecution?.status ?? DEFAULT_PROVIDER_EXECUTION_FRAGMENT.status,
    executionId,
    providerRunId,
    providerStatus,
    executed: providerExecution?.executed === true,
    providerCall: providerExecution?.providerCall === true,
    providerEvidenceAvailable: providerExecution?.providerEvidenceAvailable === true,
    transcriptAvailable,
    transcriptCaptured: providerExecution?.transcriptCaptured === true,
    transcriptPersistence: providerExecution?.transcriptPersistence === true,
    persistence: providerExecution?.persistence ?? DEFAULT_PROVIDER_EXECUTION_FRAGMENT.persistence,
    rawResponseAvailable,
    rawResponseSummary: rawResponseAvailable ? providerExecution?.rawResponseSummary ?? null : null,
    rawResponseHandle: rawResponseAvailable ? providerExecution?.rawResponseHandle ?? null : null,
    transcriptHandle: transcriptAvailable ? providerExecution?.transcriptHandle ?? null : null,
    transcriptProviderManaged: transcriptAvailable && providerExecution?.transcriptProviderManaged === true,
    implementationState: providerExecution?.implementationState ?? null,
    reservedStatusSet: Array.isArray(providerExecution?.reservedStatusSet)
      ? [...providerExecution.reservedStatusSet]
      : [...DEFAULT_PROVIDER_EXECUTION_FRAGMENT.reservedStatusSet],
    futureRequiredFields: Array.isArray(providerExecution?.futureRequiredFields)
      ? [...providerExecution.futureRequiredFields]
      : [...DEFAULT_PROVIDER_EXECUTION_FRAGMENT.futureRequiredFields],
    pendingCapabilities: Array.isArray(providerExecution?.pendingCapabilities)
      ? [...providerExecution.pendingCapabilities]
      : [],
    note: providerExecution?.note ?? DEFAULT_PROVIDER_EXECUTION_FRAGMENT.note,
  };

  assertSameSourceRawResponseReportPropagation(normalized);

  return normalized;
}

function normalizeTranscriptAvailability(transcriptAvailability) {
  if (!transcriptAvailability || typeof transcriptAvailability !== "object" || Array.isArray(transcriptAvailability)) {
    return { ...DEFAULT_TRANSCRIPT_AVAILABILITY_SKELETON };
  }

  const available = transcriptAvailability?.available === true;
  const availability = available ? transcriptAvailability?.availability ?? "none" : "none";
  const providerManaged = available && transcriptAvailability?.providerManaged === true;
  const providerTranscript = available && transcriptAvailability?.providerTranscript === true;
  const persistence = available ? transcriptAvailability?.persistence ?? "none" : "none";

  if (available !== true) {
    const rawPersistence = transcriptAvailability?.persistence ?? "none";
    const rawTranscriptPersistence = transcriptAvailability?.transcriptPersistence;
    if (rawPersistence !== "none" || rawTranscriptPersistence === true) {
      throw new RangeError(
        "Runtime replay report forbids transcriptAvailability from inventing persistence/providerManaged state when available=false",
      );
    }
  }

  return {
    ...transcriptAvailability,
    available,
    availability,
    providerManaged,
    providerTranscript,
    handle: available ? transcriptAvailability?.handle ?? null : null,
    location:
      available &&
      transcriptAvailability?.location &&
      typeof transcriptAvailability.location === "object" &&
      !Array.isArray(transcriptAvailability.location)
        ? { ...transcriptAvailability.location }
        : null,
    providerBacked: transcriptAvailability?.providerBacked === true,
    transcriptCaptured: transcriptAvailability?.transcriptCaptured === true,
    transcriptPersistence: transcriptAvailability?.transcriptPersistence === true,
    persistence,
    note: transcriptAvailability?.note ?? DEFAULT_TRANSCRIPT_AVAILABILITY_SKELETON.note,
  };
}

function normalizeRuntimeCase(runtimeCase) {
  const status = normalizeCaseStatus(runtimeCase?.status);
  const observed = normalizeObserved(runtimeCase?.observed, status);
  const providerExecution = normalizeProviderExecution(runtimeCase?.providerExecution);
  const transcriptAvailability = normalizeTranscriptAvailability(runtimeCase?.transcriptAvailability);
  const failureReason = normalizeFailureReason(runtimeCase?.failureReason, status);

  assertSameSourceFailurePropagation({
    status,
    providerExecution,
    failureReason,
    observed,
  });

  const normalizedTranscriptRef = normalizeTranscriptRef(
    runtimeCase?.transcriptRef,
    runtimeCase,
    transcriptAvailability,
  );

  if (transcriptAvailability.available !== (normalizedTranscriptRef?.available === true)) {
    throw new RangeError(
      "Runtime replay report transcript availability must match the single upstream transcriptRef source without fallback",
    );
  }

  if (providerExecution.transcriptAvailable !== transcriptAvailability.available) {
    throw new RangeError(
      "Runtime replay report providerExecution.transcriptAvailable must stay aligned with transcriptAvailability.available",
    );
  }

  if ((providerExecution.transcriptHandle ?? null) !== (transcriptAvailability.handle ?? null)) {
    throw new RangeError(
      "Runtime replay report providerExecution.transcriptHandle must remain same-source with transcriptAvailability.handle",
    );
  }

  if (providerExecution.transcriptProviderManaged !== (transcriptAvailability.available && transcriptAvailability.providerManaged === true)) {
    throw new RangeError(
      "Runtime replay report providerExecution.transcriptProviderManaged must remain same-source with transcript availability",
    );
  }

  if (transcriptAvailability.providerTranscript !== (normalizedTranscriptRef?.providerTranscript === true)) {
    throw new RangeError(
      "Runtime replay report transcriptAvailability.providerTranscript must remain same-source with transcriptRef.providerTranscript",
    );
  }

  if ((transcriptAvailability.availability ?? "none") !== ((normalizedTranscriptRef?.availability ?? "none"))) {
    throw new RangeError(
      "Runtime replay report transcript availability mode must remain same-source with transcriptRef.availability",
    );
  }

  if (providerExecution.providerBacked !== true) {
    if (observed.transcriptCaptured === true || providerExecution.transcriptCaptured === true || transcriptAvailability.transcriptCaptured === true) {
      throw new RangeError(
        "Runtime replay report non-provider-backed paths must not carry transcriptCaptured=true from any source",
      );
    }
  }

  return {
    id: runtimeCase?.id ?? null,
    type: runtimeCase?.type ?? null,
    status,
    expectedBehavior: runtimeCase?.expectedBehavior ?? null,
    observed,
    providerExecution,
    transcriptAvailability,
    transcriptRef: normalizedTranscriptRef,
    transcript: runtimeCase?.transcript ?? null,
    failureReason,
  };
}

function normalizeCheck(check) {
  return {
    id: check?.id ?? null,
    scope: check?.scope ?? "runtime",
    status: check?.status ?? "info",
    severity: check?.severity ?? "P2",
    message: check?.message ?? null,
    evidence: Array.isArray(check?.evidence) ? [...check.evidence] : [],
  };
}

function normalizeError(error) {
  return {
    code: error?.code ?? "RUNTIME_REPLAY_ERROR",
    message: error?.message ?? String(error),
    caseId: error?.caseId ?? null,
    checkId: error?.checkId ?? null,
    file: error?.file ?? null,
  };
}

function buildSummary(runtimeCases, checks, errors) {
  const passedCases = 0;
  const failedCases = runtimeCases.filter((runtimeCase) => FAILING_CASE_STATUSES.has(runtimeCase.status)).length;
  const blockedCases = runtimeCases.filter((runtimeCase) => BLOCKED_CASE_STATUSES.has(runtimeCase.status)).length;
  const warnings = checks.filter((check) => WARNING_CHECK_STATUSES.has(check.status)).length;
  const errorCount = errors.length + checks.filter((check) => ERROR_CHECK_STATUSES.has(check.status)).length;

  return {
    passed: false,
    totalCases: runtimeCases.length,
    passedCases,
    failedCases,
    blockedCases,
    warnings,
    errors: errorCount,
  };
}

export function buildRuntimeReplayReport({
  fixtureDir,
  fixture = null,
  runtime = null,
  cases = [],
  checks = [],
  errors = [],
  options = {},
} = {}) {
  const normalizedCases = cases.map(normalizeRuntimeCase);
  const normalizedChecks = checks.map(normalizeCheck).sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const normalizedErrors = errors.map(normalizeError);
  const summary = buildSummary(normalizedCases, normalizedChecks, normalizedErrors);
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const caseProviderExecution = normalizedCases[0]?.providerExecution ?? { ...DEFAULT_PROVIDER_EXECUTION_FRAGMENT };
  const reportProviderExecution = normalizeProviderExecution(
    runtime?.providerExecution ?? caseProviderExecution,
  );
  const reportTranscriptAvailability = normalizeTranscriptAvailability(
    normalizedCases[0]?.transcriptAvailability ?? runtime?.transcriptAvailability,
  );

  assertSameSourceExecutionIdentityTuple({
    providerExecution: caseProviderExecution,
    runtimeProviderExecution: reportProviderExecution,
  });

  return {
    kind: RUNTIME_REPLAY_KIND,
    reportVersion: options.reportVersion ?? RUNTIME_REPLAY_REPORT_VERSION,
    protocolVersion: options.protocolVersion ?? RUNTIME_REPLAY_PROTOCOL_VERSION,
    fixture: {
      path: safeFixturePath(fixtureDir),
      id: fixture?.id ?? runtime?.fixture?.id ?? null,
      version: fixture?.version ?? runtime?.fixture?.version ?? null,
      entry: fixture?.entry ?? runtime?.fixture?.entry ?? null,
      profile: fixture?.profile ?? runtime?.fixture?.profile ?? null,
    },
    status: normalizedCases.some((runtimeCase) => BLOCKED_CASE_STATUSES.has(runtimeCase.status)) ? "blocked" : "draft",
    summary,
    cases: normalizedCases,
    checks: normalizedChecks,
    errors: normalizedErrors,
    metadata: {
      generatedAt,
      runner: runtime?.runner ?? options.runner ?? null,
      sandbox: runtime?.sandbox ?? options.sandbox ?? null,
      executionMode: runtime?.mode ?? null,
      note: options.note ?? DEFAULT_METADATA_NOTE,
      statusTaxonomy: {
        reportStatuses: ["draft", "blocked"],
        caseStatuses: [...ALLOWED_DRAFT_CASE_STATUSES],
        providerBackedReservedCaseStatuses: [...PROVIDER_BACKED_RESERVED_FAILURE_STATUSES],
        passedReserved: true,
        providerReadyPassPathImplemented: false,
      },
      providerExecution: reportProviderExecution,
      transcriptAvailability: reportTranscriptAvailability,
      executionSource: deriveExecutionProvenance({
        providerExecution: reportProviderExecution,
        transcriptAvailability: reportTranscriptAvailability,
        mode: runtime?.mode ?? null,
      }).executionSource,
      provenance: deriveExecutionProvenance({
        providerExecution: reportProviderExecution,
        transcriptAvailability: reportTranscriptAvailability,
        mode: runtime?.mode ?? null,
      }),
      provenanceSummary: deriveExecutionProvenance({
        providerExecution: reportProviderExecution,
        transcriptAvailability: reportTranscriptAvailability,
        mode: runtime?.mode ?? null,
      }).provenanceSummary,
      providerBackedContract: {
        currentState: reportProviderExecution.implementationState,
        reservedFailurePropagation: {
          allowedCaseStatuses: [...PROVIDER_BACKED_RESERVED_FAILURE_STATUSES],
          sameSourceOnly: true,
          mixedSourceFailureReasonDisallowed: true,
          blockedReasonCode: "RUNTIME_PREFLIGHT_BLOCKED",
          errorObservedEvidence: "provider-slot-reserved",
        },
        reservedFields: {
          runtimeCaseStatuses: [...reportProviderExecution.reservedStatusSet],
          providerEvidenceAvailable: reportProviderExecution.providerEvidenceAvailable,
          transcriptAvailable: reportProviderExecution.transcriptAvailable,
          transcriptPersistence: reportProviderExecution.persistence,
          rawResponseAvailable: reportProviderExecution.rawResponseAvailable,
          runtimePassedAvailable: false,
        },
        futureRequiredOutputs: [...reportProviderExecution.futureRequiredFields],
      },
      lineage: {
        static: {
          kind: runtime?.staticBaseline?.kind ?? null,
          reportVersion: runtime?.staticBaseline?.reportVersion ?? null,
          ruleSetVersion: runtime?.staticBaseline?.ruleSetVersion ?? null,
          status: runtime?.staticBaseline?.status ?? null,
        },
        preflight: {
          kind: runtime?.preflight?.kind ?? null,
          reportVersion: runtime?.preflight?.reportVersion ?? null,
          protocolVersion: runtime?.preflight?.protocolVersion ?? null,
          ruleSetVersion: runtime?.preflight?.ruleSetVersion ?? null,
          status: runtime?.preflight?.status ?? null,
        },
        replayCases: {
          kind: runtime?.replayCases?.kind ?? null,
          fixtureId: runtime?.replayCases?.fixtureId ?? null,
        },
      },
      sourceStaticReportVersion: runtime?.staticBaseline?.reportVersion ?? null,
      sourceStaticRuleSetVersion: runtime?.staticBaseline?.ruleSetVersion ?? null,
      sourcePreflightReportVersion: runtime?.preflight?.reportVersion ?? null,
      sourcePreflightProtocolVersion: runtime?.preflight?.protocolVersion ?? null,
      sourceReplayCasesKind: runtime?.replayCases?.kind ?? null,
    },
    pendingCapabilities: Array.isArray(runtime?.pendingCapabilities)
      ? [...runtime.pendingCapabilities]
      : [...DEFAULT_PENDING_CAPABILITIES],
  };
}

export default buildRuntimeReplayReport;
