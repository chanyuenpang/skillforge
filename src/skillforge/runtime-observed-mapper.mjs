const OBSERVED_MAPPER_VERSION = "runtime-observed-mapper-draft-1";
const OBSERVED_KIND = "runtime-observed-stub";
const SUPPORTED_OBSERVED_STATUSES = Object.freeze([
  "blocked",
  "error",
  "dry-run",
  "not-executed",
  "synthetic-passed",
]);
const INTERNAL_PROVIDER_STUB_STATUS_SET = Object.freeze([
  "stub-blocked",
  "stub-error",
  "stub-reserved",
]);
const INTERNAL_PROVIDER_STUB_STATUS_TO_PUBLIC_STATUS = Object.freeze({
  "stub-blocked": "blocked",
  "stub-error": "error",
  "stub-reserved": "error",
});
const SUPPORTED_PROVIDER_SELECTION_KEYS = Object.freeze(["dry-run", "null-runner", "synthetic", "provider-backed", "openai"]);
const PROVIDER_BACKED_RESERVED_FAILURE_STATUSES = Object.freeze(["blocked", "error"]);
const SAME_SOURCE_EXECUTION_IDENTITY_FIELDS = Object.freeze([
  "executionId",
  "providerRunId",
  "providerStatus",
]);
const SAME_SOURCE_TRANSCRIPT_FIELDS = Object.freeze([
  "available",
  "availability",
  "providerManaged",
  "handle",
  "location",
  "persistence",
  "providerTranscript",
]);
const SAME_SOURCE_RAW_RESPONSE_FIELDS = Object.freeze([
  "available",
  "summary",
  "handle",
  "captureMode",
  "kind",
  "version",
  "note",
]);

function cloneNullableObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? { ...value } : null;
}

function cloneArray(value) {
  return Array.isArray(value) ? [...value] : [];
}

function cloneObject(value, fallback = {}) {
  return value && typeof value === "object" && !Array.isArray(value) ? { ...value } : { ...fallback };
}

function normalizeCaseContext(caseContext = {}) {
  return {
    id: caseContext?.id ?? null,
    type: caseContext?.type ?? null,
    intent: caseContext?.intent ?? null,
    expectedBehavior: caseContext?.expectedBehavior ?? null,
    forbiddenBehavior: caseContext?.forbiddenBehavior ?? null,
    input: caseContext?.input ?? null,
    runtime: cloneObject(caseContext?.runtime),
    preflight: cloneObject(caseContext?.preflight),
    tags: cloneArray(caseContext?.tags),
    privacyNotes: cloneArray(caseContext?.privacyNotes),
  };
}

function normalizeProviderSelection(providerSelection = {}) {
  const adapterKey = providerSelection?.adapterKey ?? providerSelection?.providerKey ?? "dry-run";
  if (!SUPPORTED_PROVIDER_SELECTION_KEYS.includes(adapterKey)) {
    throw new RangeError(`Unsupported runtime observed mapper provider selection: ${adapterKey}`);
  }

  return {
    kind: providerSelection?.kind ?? "runtime-provider-selection",
    version: providerSelection?.version ?? null,
    adapterKey,
    providerKey: providerSelection?.providerKey ?? adapterKey,
    providerSlot: providerSelection?.providerSlot ?? null,
    providerBacked:
      providerSelection?.providerBacked === true || adapterKey === "provider-backed",
    implemented:
      providerSelection?.implemented === true || adapterKey !== "provider-backed",
    builtin: providerSelection?.builtin === true,
  };
}

function normalizeAdapterResult(adapterResult = {}) {
  const status = String(adapterResult?.status ?? "not-executed");
  if (!SUPPORTED_OBSERVED_STATUSES.includes(status)) {
    throw new RangeError(`Unsupported runtime observed mapper adapter status: ${status}`);
  }

  return {
    caseId: adapterResult?.caseId ?? null,
    status,
    observed: cloneNullableObject(adapterResult?.observed),
    selection: cloneObject(adapterResult?.selection),
    execution: cloneObject(adapterResult?.execution),
    evidence: cloneObject(adapterResult?.evidence),
    rawResponse: cloneObject(adapterResult?.rawResponse),
    transcriptRef:
      adapterResult?.transcriptRef && typeof adapterResult.transcriptRef === "object" && !Array.isArray(adapterResult.transcriptRef)
        ? { ...adapterResult.transcriptRef }
        : null,
    providerMetadata: cloneObject(adapterResult?.providerMetadata),
    failureReason: cloneNullableObject(adapterResult?.failureReason),
  };
}

function inferObservedEvidence({ status, providerSelection }) {
  if (status === "blocked") return "preflight-blocked";
  if (status === "error" && providerSelection.providerBacked) return "provider-slot-reserved";
  if (providerSelection.adapterKey === "null-runner") return "not-executed";
  return "not-executed";
}

function assertFailurePropagationAlignment({ adapterResult, providerSelection }) {
  if (INTERNAL_PROVIDER_STUB_STATUS_SET.includes(adapterResult.status)) {
    throw new RangeError(
      `Runtime observed mapper forbids leaking internal provider stub status as public adapter status: ${adapterResult.status}`,
    );
  }
  if (
    providerSelection.providerBacked === true &&
    !PROVIDER_BACKED_RESERVED_FAILURE_STATUSES.includes(adapterResult.status)
  ) {
    throw new RangeError(
      `Runtime observed mapper reserved provider-backed seam only allows blocked/error, got: ${adapterResult.status}`,
    );
  }

  if (adapterResult.status === "blocked" && adapterResult.failureReason?.code !== "RUNTIME_PREFLIGHT_BLOCKED") {
    throw new RangeError("Runtime observed mapper blocked status requires same-source preflight failureReason");
  }

  if (adapterResult.status !== "blocked" && adapterResult.failureReason?.code === "RUNTIME_PREFLIGHT_BLOCKED") {
    throw new RangeError("Runtime observed mapper cannot reuse preflight-blocked failureReason for non-blocked status");
  }
}

function normalizeFailureReason({ adapterResult, providerSelection }) {
  const failureReason = adapterResult.failureReason;
  if (!failureReason) return null;

  return {
    ...failureReason,
    blockingCheckIds: cloneArray(failureReason?.blockingCheckIds),
    sourceStatus: adapterResult.status,
    sameSource: true,
    providerBackedReserved:
      providerSelection.providerBacked === true &&
      PROVIDER_BACKED_RESERVED_FAILURE_STATUSES.includes(adapterResult.status),
  };
}

function buildObserved({ adapterResult, providerSelection, caseContext }) {
  const evidence = adapterResult.evidence;
  const execution = adapterResult.execution;
  const providerBacked = adapterResult.selection?.providerBacked === true || providerSelection.providerBacked === true;
  const observedInput = adapterResult.observed;

  if (observedInput && Object.keys(observedInput).length > 0) {
    return {
      kind: observedInput.kind ?? OBSERVED_KIND,
      mode: observedInput.mode ?? providerSelection.adapterKey,
      evidence:
        providerSelection.adapterKey === "synthetic"
          ? "synthetic-passed"
          : inferObservedEvidence({ status: adapterResult.status, providerSelection }),
      providerCall: execution?.providerCall === true,
      transcriptCaptured: evidence?.transcriptCaptured === true,
      sideEffectsPerformed: false,
      providerEvidenceAvailable: evidence?.providerEvidenceAvailable === true,
      persistedEvidenceAvailable: evidence?.transcriptPersistence === true,
      note:
        observedInput.note ??
        `runtime observed mapper normalized adapter result for case ${caseContext.id ?? adapterResult.caseId ?? "<unknown>"}`,
    };
  }

  return {
    kind: OBSERVED_KIND,
    mode: providerSelection.adapterKey,
    evidence:
      providerSelection.adapterKey === "synthetic"
        ? "synthetic-passed"
        : inferObservedEvidence({ status: adapterResult.status, providerSelection }),
    providerCall: execution?.providerCall === true,
    transcriptCaptured: evidence?.transcriptCaptured === true,
    sideEffectsPerformed: false,
    providerEvidenceAvailable: evidence?.providerEvidenceAvailable === true,
    persistedEvidenceAvailable: evidence?.transcriptPersistence === true,
    note:
      adapterResult.status === "blocked"
        ? `runtime observed mapper marked case ${caseContext.id ?? adapterResult.caseId ?? "<unknown>"} as preflight-blocked without provider execution`
        : providerBacked
          ? `runtime observed mapper reserved provider-backed slot without executing provider for case ${caseContext.id ?? adapterResult.caseId ?? "<unknown>"}`
          : `runtime observed mapper normalized provider-less execution stub for case ${caseContext.id ?? adapterResult.caseId ?? "<unknown>"}`,
  };
}

function assertStubStatusCompatibility({ publicStatus, providerStatus, providerBacked }) {
  if (providerBacked !== true) {
    if (providerStatus != null) {
      throw new RangeError(
        "Runtime observed mapper non-provider-backed selections must not carry internal providerStatus values",
      );
    }
    return;
  }

  if (providerStatus == null) {
    return;
  }

  if (!INTERNAL_PROVIDER_STUB_STATUS_SET.includes(providerStatus)) {
    throw new RangeError(
      `Runtime observed mapper execution.providerStatus must stay in internal stub set when present, got: ${providerStatus}`,
    );
  }

  const compatPublicStatus = INTERNAL_PROVIDER_STUB_STATUS_TO_PUBLIC_STATUS[providerStatus] ?? null;
  if (compatPublicStatus !== publicStatus) {
    throw new RangeError(
      `Runtime observed mapper forbids propagating providerStatus ${providerStatus} into incompatible public status ${publicStatus}`,
    );
  }
}

function assertSameSourceExecutionIdentity({ adapterResult, providerSelection }) {
  const execution = adapterResult.execution;
  const metadata = adapterResult.providerMetadata;
  const status = adapterResult.status;

  if (providerSelection.providerBacked !== true) {
    for (const field of SAME_SOURCE_EXECUTION_IDENTITY_FIELDS) {
      if ((execution?.[field] ?? null) != null || (metadata?.[field] ?? null) != null) {
        throw new RangeError(
          `Runtime observed mapper non-provider-backed selections must keep ${field} null across adapter execution/providerMetadata`,
        );
      }
    }
    assertStubStatusCompatibility({
      publicStatus: status,
      providerStatus: execution?.providerStatus ?? null,
      providerBacked: false,
    });
    return;
  }

  const executionIdentityValues = SAME_SOURCE_EXECUTION_IDENTITY_FIELDS.map((field) => execution?.[field] ?? null);
  const metadataIdentityValues = SAME_SOURCE_EXECUTION_IDENTITY_FIELDS.map((field) => metadata?.[field] ?? null);
  const executionHasAnyIdentity = executionIdentityValues.some((value) => value != null);
  const executionHasFullIdentity = executionIdentityValues.every((value) => value != null);
  const metadataHasAnyIdentity = metadataIdentityValues.some((value) => value != null);
  const metadataHasFullIdentity = metadataIdentityValues.every((value) => value != null);
  const reservedStubStatus = status === "blocked" || status === "error";

  if (executionHasAnyIdentity !== executionHasFullIdentity) {
    throw new RangeError(
      "Runtime observed mapper provider-backed execution identity must arrive from adapter execution as an all-or-nothing tuple",
    );
  }

  if (metadataHasAnyIdentity !== metadataHasFullIdentity) {
    throw new RangeError(
      "Runtime observed mapper providerMetadata execution identity mirror must stay all-or-nothing when present",
    );
  }

  for (const field of SAME_SOURCE_EXECUTION_IDENTITY_FIELDS) {
    const executionValue = execution?.[field] ?? null;
    const metadataValue = metadata?.[field] ?? null;

    if (executionValue != null && metadataValue != null && executionValue !== metadataValue) {
      throw new RangeError(
        `Runtime observed mapper execution identity field ${field} must remain same-source across adapter execution/providerMetadata`,
      );
    }

    if (executionValue == null && metadataValue != null) {
      throw new RangeError(
        `Runtime observed mapper forbids providerMetadata-only execution identity for ${field}; adapter execution must be the single source`,
      );
    }
  }

  if (reservedStubStatus === true && executionHasFullIdentity !== true) {
    throw new RangeError(
      "Runtime observed mapper provider-backed reserved seam requires adapter execution to carry the full stub execution identity tuple for blocked/error results",
    );
  }

  if (reservedStubStatus !== true && executionHasAnyIdentity === true) {
    throw new RangeError(
      "Runtime observed mapper forbids provider-backed execution identity propagation outside blocked/error reserved seam results",
    );
  }

  assertStubStatusCompatibility({
    publicStatus: status,
    providerStatus: execution?.providerStatus ?? null,
    providerBacked: true,
  });
}

function assertSameSourceRawResponsePropagation({ adapterResult, providerSelection }) {
  const providerBacked = providerSelection.providerBacked === true;
  const execution = adapterResult.execution;
  const evidence = adapterResult.evidence;
  const transcriptRef = adapterResult.transcriptRef;
  const rawResponse = adapterResult.rawResponse;
  const rawResponseAvailable = rawResponse?.available === true;
  const exposureAllowed =
    providerBacked === true &&
    execution?.executed === true &&
    execution?.providerCall === true &&
    evidence?.providerEvidenceAvailable === true &&
    evidence?.transcriptAvailable === true;

  if (providerBacked !== true) {
    if (rawResponseAvailable === true) {
      throw new RangeError(
        "Runtime observed mapper non-provider-backed selections must not expose adapter rawResponse availability",
      );
    }
    return;
  }

  if (rawResponseAvailable !== true) {
    return;
  }

  if (exposureAllowed !== true) {
    throw new RangeError(
      "Runtime observed mapper forbids adapter rawResponse availability outside executed provider-backed evidence",
    );
  }

  if (transcriptRef?.available === true) {
    if ((rawResponse.handle ?? null) === (transcriptRef.handle ?? null)) {
      throw new RangeError(
        "Runtime observed mapper forbids reusing transcript handles as rawResponse handles",
      );
    }
  }

  for (const field of SAME_SOURCE_RAW_RESPONSE_FIELDS) {
    if (!(field in rawResponse)) {
      throw new RangeError(
        `Runtime observed mapper rawResponse field ${field} must stay adapter-authored when availability is claimed`,
      );
    }
  }

  if (rawResponse.captureMode !== "summary-only") {
    throw new RangeError(
      "Runtime observed mapper reserved rawResponse seam only allows summary-only captureMode when available",
    );
  }
}

function buildProviderExecution({ adapterResult, providerSelection }) {
  const execution = adapterResult.execution;
  const evidence = adapterResult.evidence;
  const rawResponse = adapterResult.rawResponse;
  const transcriptRef = adapterResult.transcriptRef;
  const providerEvidenceAvailable = evidence?.providerEvidenceAvailable === true;
  const transcriptAvailable = evidence?.transcriptAvailable === true;
  const rawResponseAvailable =
    providerSelection.providerBacked === true &&
    execution?.executed === true &&
    execution?.providerCall === true &&
    providerEvidenceAvailable === true &&
    transcriptAvailable === true &&
    rawResponse?.available === true;

  assertSameSourceExecutionIdentity({ adapterResult, providerSelection });
  assertSameSourceRawResponsePropagation({ adapterResult, providerSelection });

  const providerBacked = providerSelection.providerBacked === true;

  return {
    selection: { ...providerSelection },
    adapterKey: providerSelection.adapterKey,
    providerKey: providerSelection.providerKey,
    providerSlot: providerSelection.providerSlot,
    builtin: providerSelection.builtin === true,
    implemented: providerSelection.implemented === true,
    providerBacked,
    status: adapterResult.status,
    executionId: providerBacked ? execution?.executionId ?? null : null,
    providerRunId: providerBacked ? execution?.providerRunId ?? null : null,
    providerStatus: providerBacked ? execution?.providerStatus ?? null : null,
    executed: execution?.executed === true,
    providerCall: execution?.providerCall === true,
    providerEvidenceAvailable,
    transcriptAvailable,
    transcriptCaptured: evidence?.transcriptCaptured === true,
    transcriptPersistence: evidence?.transcriptPersistence === true,
    persistence: evidence?.persistence ?? "none",
    rawResponseAvailable,
    rawResponseSummary: rawResponseAvailable ? rawResponse?.summary ?? null : null,
    rawResponseHandle: rawResponseAvailable ? rawResponse?.handle ?? null : null,
    transcriptHandle: transcriptAvailable ? transcriptRef?.handle ?? null : null,
    transcriptProviderManaged: transcriptAvailable && transcriptRef?.providerManaged === true,
    implementationState: adapterResult.providerMetadata?.implementationState ?? null,
    reservedStatusSet: cloneArray(adapterResult.providerMetadata?.reservedStatusSet),
    futureRequiredFields: cloneArray(adapterResult.providerMetadata?.futureRequiredFields),
    pendingCapabilities: cloneArray(adapterResult.providerMetadata?.pendingCapabilities),
    note: adapterResult.providerMetadata?.note ?? null,
  };
}

function assertSameSourceTranscriptPropagation({ adapterResult, providerSelection }) {
  const transcriptRef = adapterResult.transcriptRef;
  const evidence = adapterResult.evidence;
  const metadata = adapterResult.providerMetadata;
  const providerBacked = providerSelection.providerBacked === true;

  if (providerBacked !== true) {
    if (transcriptRef != null) {
      throw new RangeError(
        "Runtime observed mapper non-provider-backed selections must not carry adapter transcriptRef objects",
      );
    }
    return;
  }

  if (transcriptRef == null) {
    if (evidence?.transcriptAvailable === true || metadata?.transcriptAvailable === true) {
      throw new RangeError(
        "Runtime observed mapper requires adapter transcriptRef to be the single transcript source when transcript availability is claimed",
      );
    }
    return;
  }

  for (const field of SAME_SOURCE_TRANSCRIPT_FIELDS) {
    const transcriptValue = transcriptRef?.[field] ?? null;
    const metadataValue = metadata?.[field] ?? null;

    if (metadataValue != null && transcriptValue == null) {
      throw new RangeError(
        `Runtime observed mapper forbids providerMetadata-only transcript field ${field}; adapter transcriptRef must be the single source`,
      );
    }

    if (
      metadataValue != null &&
      transcriptValue != null &&
      JSON.stringify(metadataValue) !== JSON.stringify(transcriptValue)
    ) {
      throw new RangeError(
        `Runtime observed mapper transcript field ${field} must remain same-source across adapter transcriptRef/providerMetadata`,
      );
    }
  }

  if (evidence?.transcriptAvailable === true && transcriptRef.available !== true) {
    throw new RangeError(
      "Runtime observed mapper forbids transcript evidence claiming availability without adapter transcriptRef.available=true",
    );
  }

  if (transcriptRef.available === true) {
    if (transcriptRef.providerManaged !== true || transcriptRef.providerTranscript !== true) {
      throw new RangeError(
        "Runtime observed mapper reserved provider-backed transcript availability requires providerManaged/providerTranscript to remain true from adapter transcriptRef",
      );
    }
  }
}

function buildTranscriptAvailability({ adapterResult, providerSelection }) {
  const transcriptRef = adapterResult.transcriptRef;
  const evidence = adapterResult.evidence;
  const providerBacked = adapterResult.selection?.providerBacked === true || providerSelection.providerBacked;

  assertSameSourceTranscriptPropagation({ adapterResult, providerSelection });

  const transcriptAvailable =
    providerBacked === true && transcriptRef?.available === true && evidence?.transcriptAvailable === true;
  const persistence = transcriptAvailable ? transcriptRef?.persistence ?? "none" : "none";
  const availability = transcriptAvailable ? transcriptRef?.availability ?? "none" : "none";
  const providerManaged = transcriptAvailable ? transcriptRef?.providerManaged === true : false;
  const providerTranscript = transcriptAvailable ? transcriptRef?.providerTranscript === true : false;

  if (transcriptAvailable !== true) {
    if (persistence !== "none" || availability !== "none" || providerManaged === true || providerTranscript === true) {
      throw new RangeError(
        "Runtime observed mapper forbids synthesizing transcript persistence/availability/providerManaged outside adapter-authored available transcriptRef",
      );
    }
  }

  return {
    available: transcriptAvailable,
    availability,
    providerManaged,
    providerTranscript,
    handle: transcriptAvailable ? transcriptRef?.handle ?? null : null,
    location:
      transcriptAvailable &&
      transcriptRef?.location && typeof transcriptRef.location === "object" && !Array.isArray(transcriptRef.location)
        ? { ...transcriptRef.location }
        : null,
    providerBacked,
    transcriptCaptured: evidence?.transcriptCaptured === true,
    transcriptPersistence: evidence?.transcriptPersistence === true,
    persistence,
    note:
      transcriptRef?.note ??
      "runtime observed mapper transcript availability skeleton only; handle semantics are same-source only and do not imply raw-response/provider-handle reuse in this phase",
  };
}

export function mapProviderResultToObservedRuntime({
  adapterResult = {},
  providerSelection = {},
  caseContext = {},
} = {}) {
  const normalizedAdapterResult = normalizeAdapterResult(adapterResult);
  const normalizedProviderSelection = normalizeProviderSelection(providerSelection);
  const normalizedCaseContext = normalizeCaseContext(caseContext);
  assertFailurePropagationAlignment({
    adapterResult: normalizedAdapterResult,
    providerSelection: normalizedProviderSelection,
  });

  return {
    contract: {
      kind: "runtime-observed-mapper-output",
      version: OBSERVED_MAPPER_VERSION,
    },
    caseId: normalizedCaseContext.id ?? normalizedAdapterResult.caseId,
    status: normalizedAdapterResult.status,
    observed: buildObserved({
      adapterResult: normalizedAdapterResult,
      providerSelection: normalizedProviderSelection,
      caseContext: normalizedCaseContext,
    }),
    providerExecution: buildProviderExecution({
      adapterResult: normalizedAdapterResult,
      providerSelection: normalizedProviderSelection,
    }),
    transcriptAvailability: buildTranscriptAvailability({
      adapterResult: normalizedAdapterResult,
      providerSelection: normalizedProviderSelection,
    }),
    failureReason: normalizeFailureReason({
      adapterResult: normalizedAdapterResult,
      providerSelection: normalizedProviderSelection,
    }),
  };
}

export const RUNTIME_OBSERVED_MAPPER_VERSION = OBSERVED_MAPPER_VERSION;
export const RUNTIME_OBSERVED_MAPPER_ALLOWED_STATUSES = [...SUPPORTED_OBSERVED_STATUSES];
export const RUNTIME_OBSERVED_MAPPER_PROVIDER_SELECTION_KEYS = [...SUPPORTED_PROVIDER_SELECTION_KEYS];

export default {
  mapProviderResultToObservedRuntime,
  RUNTIME_OBSERVED_MAPPER_VERSION: OBSERVED_MAPPER_VERSION,
  RUNTIME_OBSERVED_MAPPER_ALLOWED_STATUSES: [...SUPPORTED_OBSERVED_STATUSES],
  RUNTIME_OBSERVED_MAPPER_PROVIDER_SELECTION_KEYS: [...SUPPORTED_PROVIDER_SELECTION_KEYS],
};
