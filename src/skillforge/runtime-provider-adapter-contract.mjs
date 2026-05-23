import { buildSyntheticProviderResult, isSyntheticProviderResult, SYNTHETIC_PROVIDER_MARKER } from "./runtime-provider-synthetic.mjs";

const PROVIDER_ADAPTER_INPUT_VERSION = "runtime-provider-adapter-input-draft-1";
const PROVIDER_ADAPTER_OUTPUT_VERSION = "runtime-provider-adapter-output-draft-1";
const PROVIDER_ADAPTER_TRANSCRIPT_REF_KIND = "runtime-provider-adapter-transcript-ref";
const PROVIDER_ADAPTER_TRANSCRIPT_REF_VERSION = "runtime-provider-adapter-transcript-ref-draft-1";
const PROVIDER_EXECUTION_IDENTITY_VERSION = "runtime-provider-execution-identity-stub-draft-1";
const PROVIDER_EXECUTION_IDENTITY_KIND = "runtime-provider-execution-identity";

const PROVIDER_EXECUTION_IDENTITY_STATUS_SET = Object.freeze([
  "stub-reserved",
  "stub-blocked",
  "stub-error",
]);

const PROVIDER_PUBLIC_CASE_STATUS_SET = Object.freeze([
  "blocked",
  "error",
  "dry-run",
  "not-executed",
  "synthetic-passed",
]);

const PROVIDER_STATUS_COMPAT_BY_SEMANTIC_STATUS = Object.freeze({
  blocked: Object.freeze(["stub-blocked"]),
  error: Object.freeze(["stub-error", "stub-reserved"]),
  "dry-run": Object.freeze([]),
  "not-executed": Object.freeze([]),
  "adapter-error": Object.freeze(["stub-error", "stub-reserved"]),
  "synthetic-passed": Object.freeze([]),
});

const PROVIDER_EXECUTION_STATUS_TO_PUBLIC_CASE_STATUS = Object.freeze({
  "stub-blocked": "blocked",
  "stub-error": "error",
  "stub-reserved": "error",
});

const PROVIDER_EXECUTION_IDENTITY_STUB_EXPOSURE_ALLOWED_SEMANTIC_STATUS_SET = Object.freeze([
  "blocked",
  "error",
]);

const BUILTIN_PROVIDER_ADAPTER_KEYS = Object.freeze(["dry-run", "null-runner", "synthetic", "provider-backed", "openai"]);
const DEFAULT_PROVIDER_ADAPTER_SLOT = "future-provider-backed-single-case-runtime";

const DEFAULT_ALLOWED_PROVIDER_STATUSES = Object.freeze([
  "blocked",
  "error",
  "dry-run",
  "not-executed",
  "synthetic-passed",
]);

const PROVIDER_FAILURE_TAXONOMY_VERSION = "runtime-provider-failure-taxonomy-draft-1";
const PROVIDER_FAILURE_STATUS_PRIORITY = Object.freeze([
  "blocked",
  "error",
  "dry-run",
  "not-executed",
  "synthetic-passed",
]);
const PROVIDER_FAILURE_STATUS_ALLOWED_SET = Object.freeze([
  "blocked",
  "error",
  "dry-run",
  "not-executed",
  "adapter-error",
  "synthetic-passed",
]);
const PROVIDER_FAILURE_STATUS_SEMANTICS = Object.freeze({
  blocked: Object.freeze({
    adapterResultStatus: "blocked",
    runnerStatus: "blocked",
    mapperStatus: "blocked",
    reportCaseStatus: "blocked",
    precedenceRank: 0,
    terminal: true,
    requiresPreflightBlocked: true,
    allowsProviderBackedSelection: true,
    allowsExecution: false,
    allowsProviderCall: false,
    allowsObservedEvidence: ["preflight-blocked"],
    meaning: "preflight or an earlier gate prevented runtime execution before any provider attempt could begin",
  }),
  error: Object.freeze({
    adapterResultStatus: "error",
    runnerStatus: "error",
    mapperStatus: "error",
    reportCaseStatus: "error",
    precedenceRank: 1,
    terminal: true,
    requiresPreflightBlocked: false,
    allowsProviderBackedSelection: true,
    allowsExecution: false,
    allowsProviderCall: false,
    allowsObservedEvidence: ["provider-slot-reserved", "not-executed"],
    meaning: "selected runtime path could not produce an executable provider-backed result because the reserved adapter path is intentionally unimplemented or internally failed before execution",
  }),
  "dry-run": Object.freeze({
    adapterResultStatus: "dry-run",
    runnerStatus: "dry-run",
    mapperStatus: "dry-run",
    reportCaseStatus: "dry-run",
    precedenceRank: 2,
    terminal: true,
    requiresPreflightBlocked: false,
    allowsProviderBackedSelection: false,
    allowsExecution: false,
    allowsProviderCall: false,
    allowsObservedEvidence: ["not-executed"],
    meaning: "the dry-run adapter path was deliberately selected, so runtime stayed non-executing by design rather than because of a blocking failure",
  }),
  "not-executed": Object.freeze({
    adapterResultStatus: "not-executed",
    runnerStatus: "not-executed",
    mapperStatus: "not-executed",
    reportCaseStatus: "not-executed",
    precedenceRank: 3,
    terminal: true,
    requiresPreflightBlocked: false,
    allowsProviderBackedSelection: false,
    allowsExecution: false,
    allowsProviderCall: false,
    allowsObservedEvidence: ["not-executed"],
    meaning: "a provider-less runner path intentionally skipped runtime execution without declaring a dry-run simulation",
  }),
  "adapter-error": Object.freeze({
    adapterResultStatus: "error",
    runnerStatus: "error",
    mapperStatus: "error",
    reportCaseStatus: "error",
    precedenceRank: 1,
    terminal: true,
    requiresPreflightBlocked: false,
    allowsProviderBackedSelection: true,
    allowsExecution: false,
    allowsProviderCall: false,
    allowsObservedEvidence: ["provider-slot-reserved", "not-executed"],
    meaning: "adapter-error is a contract-layer semantic alias used to describe adapter-originated failure, but it must serialize outward as error rather than as a new public status token",
  }),
  "synthetic-passed": Object.freeze({
    adapterResultStatus: "synthetic-passed",
    runnerStatus: "synthetic-passed",
    mapperStatus: "synthetic-passed",
    reportCaseStatus: "synthetic-passed",
    precedenceRank: 4,
    terminal: true,
    requiresPreflightBlocked: false,
    allowsProviderBackedSelection: false,
    allowsExecution: true,
    allowsProviderCall: true,
    allowsObservedEvidence: ["synthetic-passed"],
    meaning: "synthetic provider mode produced a deterministic mock observable payload without real provider execution; this is a contract-only observable path for pipeline integrity testing",
  }),
});

const DEFAULT_PENDING_CAPABILITIES = Object.freeze([
  "provider-integration",
  "provider-selection",
  "provider-transcript-capture",
  "provider-transcript-persistence",
  "runtime-pass-path",
  "scoring-engine",
]);

const PROVIDER_SELECTION_VERSION = "runtime-provider-selection-draft-1";

// ── Selection public input contract (frozen) ─────────────────────────────────
// The only accepted input shape for buildRuntimeProviderSelection.
// External callers may pass { mode, providerKey, providerSlot }.
// Identity fields (adapterKey, builtin, implemented, providerBacked) are NOT
// accepted as input — they are derived exclusively from frozen presets.
const PROVIDER_SELECTION_INPUT_CONTRACT = Object.freeze({
  kind: "runtime-provider-selection-input",
  version: "runtime-provider-selection-input-draft-1",
  acceptedParameters: Object.freeze(["mode", "providerKey", "providerSlot"]),
  forbiddenParameters: Object.freeze([
    "adapterKey",
    "builtin",
    "implemented",
    "providerBacked",
    "kind",
    "version",
  ]),
  presetKeySource: Object.freeze(["mode", "providerKey"]),
  defaultSlot: DEFAULT_PROVIDER_ADAPTER_SLOT,
  note: "selection public input only accepts mode/providerKey/providerSlot; identity fields are derived from frozen presets and cannot be injected",
});

// Frozen canonical preset key set — external code must not reference
// individual preset keys by string literal without this guard.
const PROVIDER_SELECTION_STABLE_PRESET_KEYS = Object.freeze(
  Object.keys(BUILTIN_PROVIDER_ADAPTER_KEYS), // ["dry-run", "null-runner", "provider-backed"]
);

function isBuiltinProviderAdapterKey(key) {
  if (key == null) return false;
  return BUILTIN_PROVIDER_ADAPTER_KEYS.includes(String(key).trim());
}

function classifyProviderAdapterKey(key) {
  const normalized = key == null ? null : String(key).trim() || null;
  if (normalized == null) {
    return { classification: "empty", builtin: false, preset: null };
  }
  const preset = BUILTIN_PROVIDER_SELECTION_PRESETS[normalized];
  if (preset) {
    return {
      classification: "builtin",
      builtin: true,
      preset,
      presetKey: normalized,
      providerBacked: preset.providerBacked === true,
    };
  }
  return { classification: "external", builtin: false, preset: null, presetKey: null };
}

function assertSelectionInputContractCompliance(input) {
  if (input == null || typeof input !== "object" || Array.isArray(input)) return;
  // Already-built selection objects are internal; skip forbidden-parameter checks
  // since they legitimately contain derived identity fields (adapterKey, kind, etc.)
  if (input.kind === "runtime-provider-selection") return;
  const forbidden = PROVIDER_SELECTION_INPUT_CONTRACT.forbiddenParameters;
  for (const key of forbidden) {
    if (key in input && input[key] != null) {
      throw new RangeError(
        `Runtime provider selection input contract forbids parameter "${key}"; identity fields are derived from frozen presets`,
      );
    }
  }
}

const BUILTIN_PROVIDER_SELECTION_PRESETS = Object.freeze({
  "dry-run": Object.freeze({
    adapterKey: "dry-run",
    providerKey: "dry-run",
    providerSlot: DEFAULT_PROVIDER_ADAPTER_SLOT,
    builtin: true,
    implemented: true,
    providerBacked: false,
  }),
  "null-runner": Object.freeze({
    adapterKey: "null-runner",
    providerKey: "null-runner",
    providerSlot: DEFAULT_PROVIDER_ADAPTER_SLOT,
    builtin: true,
    implemented: true,
    providerBacked: false,
  }),
  "synthetic": Object.freeze({
    adapterKey: "synthetic",
    providerKey: "synthetic",
    providerSlot: DEFAULT_PROVIDER_ADAPTER_SLOT,
    builtin: true,
    implemented: true,
    providerBacked: false,
  }),
  "provider-backed": Object.freeze({
    adapterKey: "provider-backed",
    providerKey: "provider-backed",
    providerSlot: DEFAULT_PROVIDER_ADAPTER_SLOT,
    builtin: true,
    implemented: false,
    providerBacked: true,
  }),
  "openai": Object.freeze({
    adapterKey: "openai",
    providerKey: "openai",
    providerSlot: DEFAULT_PROVIDER_ADAPTER_SLOT,
    builtin: true,
    implemented: true,
    providerBacked: true,
  }),
});

const RESERVED_PROVIDER_BACKED_STATUS_SET = Object.freeze([
  "blocked",
  "error",
  "dry-run",
  "not-executed",
]);

const FUTURE_PROVIDER_BACKED_REQUIRED_FIELDS = Object.freeze([
  "selection.adapterKey",
  "selection.providerKey",
  "selection.providerSlot",
  "selection.providerBacked=true",
  "execution.executionId",
  "execution.providerRunId",
  "execution.providerStatus",
  "execution.executed=true",
  "execution.providerCall=true",
  "evidence.providerEvidenceAvailable",
  "evidence.transcriptAvailable",
  "evidence.transcriptCaptured",
  "evidence.transcriptPersistence",
  "rawResponse.available=true",
  "rawResponse.kind=runtime-provider-raw-response",
  "rawResponse.version",
  "rawResponse.summary",
  "rawResponse.handle",
  "rawResponse.captureMode=summary-only",
  "transcriptRef.available=true",
  "transcriptRef.providerManaged=true",
  "transcriptRef.handle",
]);

const RAW_RESPONSE_KIND = "runtime-provider-raw-response";
const RAW_RESPONSE_VERSION = "runtime-provider-raw-response-draft-1";
const RAW_RESPONSE_CAPTURE_MODES = Object.freeze(["none", "summary-only"]);
const RAW_RESPONSE_RESERVED_HANDLE_PREFIX = "reserved:provider-raw-response:";
const RAW_RESPONSE_RESERVED_HANDLE_NOTE =
  "reserved provider raw response metadata slot only; no provider payload capture, retrieval, transcript capture, or persistence is implemented in this phase";
const TRANSCRIPT_REF_PERSISTENCE_MODES = Object.freeze(["none", "reserved-provider-managed"]);
const TRANSCRIPT_REF_AVAILABILITY_MODES = Object.freeze(["none", "reserved-provider-managed"]);
const TRANSCRIPT_REF_RESERVED_HANDLE_PREFIX = "reserved:provider-transcript:";
const TRANSCRIPT_REF_RESERVED_HANDLE_NOTE =
  "reserved provider transcript handle metadata only; no provider transcript capture, retrieval, or persistence is implemented in this phase";
const TRANSCRIPT_REF_RESERVED_PERSISTENCE_NOTE =
  "reserved-provider-managed is a contract-only attach point for future provider-managed transcript persistence; it does not mean transcript capture, retrieval, storage, or evidence availability is implemented in this phase";

function normalizeProviderExecutionIdentityValue(value) {
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized || null;
}

function normalizeProviderExecutionStatus(status, { providerBacked = false } = {}) {
  if (status == null) {
    return providerBacked ? "stub-reserved" : null;
  }

  const normalizedStatus = String(status).trim();
  if (PROVIDER_PUBLIC_CASE_STATUS_SET.includes(normalizedStatus)) {
    throw new RangeError(
      `Runtime provider execution identity status must stay internal to execution/metadata seam, got public case status token: ${normalizedStatus}`,
    );
  }
  if (!PROVIDER_EXECUTION_IDENTITY_STATUS_SET.includes(normalizedStatus)) {
    throw new RangeError(`Unsupported runtime provider execution identity status: ${normalizedStatus}`);
  }

  return normalizedStatus;
}

function resolvePublicCaseStatusFromProviderExecutionStatus(providerStatus) {
  const normalizedProviderStatus = normalizeProviderExecutionStatus(providerStatus, { providerBacked: true });
  const publicCaseStatus = PROVIDER_EXECUTION_STATUS_TO_PUBLIC_CASE_STATUS[normalizedProviderStatus] ?? null;

  if (!publicCaseStatus || !PROVIDER_PUBLIC_CASE_STATUS_SET.includes(publicCaseStatus)) {
    throw new RangeError(
      `Runtime provider execution identity status ${normalizedProviderStatus} has no compatible public case status mapping`,
    );
  }

  return publicCaseStatus;
}

function canExposeProviderExecutionIdentityStub({ selection = {}, semanticStatus = "not-executed" } = {}) {
  return (
    selection?.providerBacked === true &&
    PROVIDER_EXECUTION_IDENTITY_STUB_EXPOSURE_ALLOWED_SEMANTIC_STATUS_SET.includes(
      normalizeProviderFailureSemanticStatus(semanticStatus),
    )
  );
}

function buildProviderExecutionIdentityStubHandle({
  prefix = "stub",
  selection = {},
} = {}) {
  const providerKey = normalizeProviderExecutionIdentityValue(selection?.providerKey) ?? "provider-backed";
  const providerSlot = normalizeProviderExecutionIdentityValue(selection?.providerSlot) ?? DEFAULT_PROVIDER_ADAPTER_SLOT;
  return `${prefix}:${providerKey}:${providerSlot}`;
}

function buildProviderExecutionIdentityStub({
  executionId = null,
  providerRunId = null,
  providerStatus = null,
  selection = {},
  semanticStatus = "not-executed",
} = {}) {
  const normalizedSemanticStatus = normalizeProviderFailureSemanticStatus(semanticStatus);
  if (!canExposeProviderExecutionIdentityStub({ selection, semanticStatus: normalizedSemanticStatus })) {
    return {
      executionId: null,
      providerRunId: null,
      providerStatus: null,
    };
  }

  const fallbackProviderStatus = normalizedSemanticStatus === "blocked"
    ? "stub-blocked"
    : normalizedSemanticStatus === "error"
      ? "stub-error"
      : "stub-reserved";
  const normalizedExecutionId = normalizeProviderExecutionIdentityValue(executionId);
  const normalizedProviderRunId = normalizeProviderExecutionIdentityValue(providerRunId);
  const normalizedProviderStatus = normalizeProviderExecutionStatus(providerStatus ?? fallbackProviderStatus, {
    providerBacked: true,
  });

  return {
    executionId: normalizedExecutionId ?? buildProviderExecutionIdentityStubHandle({
      prefix: "stub",
      selection,
    }),
    providerRunId: normalizedProviderRunId ?? buildProviderExecutionIdentityStubHandle({
      prefix: "stub-run",
      selection,
    }),
    providerStatus: normalizedProviderStatus,
  };
}

function canExposeProviderBackedRawResponse({ selection, execution } = {}) {
  return (
    selection?.providerBacked === true &&
    execution?.executed === true &&
    execution?.providerCall === true
  );
}

function buildReservedProviderRawResponseHandle(selection = {}) {
  const providerKey = normalizeProviderExecutionIdentityValue(selection?.providerKey) ?? "provider-backed";
  const providerSlot = normalizeProviderExecutionIdentityValue(selection?.providerSlot) ?? DEFAULT_PROVIDER_ADAPTER_SLOT;
  return `${RAW_RESPONSE_RESERVED_HANDLE_PREFIX}${providerKey}:${providerSlot}`;
}

function normalizeRawResponseSummary(summary, { available = false, captureMode = "none" } = {}) {
  if (available !== true || captureMode !== "summary-only") {
    return null;
  }

  if (summary == null) {
    return null;
  }

  if (typeof summary === "string") {
    const normalized = summary.trim();
    return normalized || null;
  }

  if (typeof summary === "object" && !Array.isArray(summary)) {
    return { ...summary };
  }

  return null;
}

function normalizeRawResponseHandle(handle, { available = false, captureMode = "none", selection = {} } = {}) {
  if (available !== true || captureMode !== "summary-only") {
    return null;
  }

  const normalizedHandle = normalizeProviderExecutionIdentityValue(handle);
  return normalizedHandle ?? buildReservedProviderRawResponseHandle(selection);
}

function normalizeRuntimeProviderRawResponse(rawResponse = {}, { selection = {}, execution = {} } = {}) {
  const exposureAllowed = canExposeProviderBackedRawResponse({ selection, execution });
  const availableRequested = rawResponse?.available === true;
  const available = exposureAllowed === true && availableRequested === true;
  const requestedCaptureMode = String(rawResponse?.captureMode ?? (available ? "summary-only" : "none")).trim() || "none";
  const captureMode = available === true && RAW_RESPONSE_CAPTURE_MODES.includes(requestedCaptureMode)
    ? requestedCaptureMode
    : "none";
  const normalizedAvailable = available === true && captureMode === "summary-only";

  return {
    ...cloneObject(rawResponse),
    kind: RAW_RESPONSE_KIND,
    version: rawResponse?.version ?? RAW_RESPONSE_VERSION,
    available: normalizedAvailable,
    captureMode: normalizedAvailable === true ? "summary-only" : "none",
    summary: normalizeRawResponseSummary(rawResponse?.summary, {
      available: normalizedAvailable,
      captureMode: normalizedAvailable === true ? "summary-only" : "none",
    }),
    handle: normalizeRawResponseHandle(rawResponse?.handle, {
      available: normalizedAvailable,
      captureMode: normalizedAvailable === true ? "summary-only" : "none",
      selection,
    }),
    note: rawResponse?.note ?? RAW_RESPONSE_RESERVED_HANDLE_NOTE,
  };
}

function cloneArray(value) {
  return Array.isArray(value) ? [...value] : [];
}

function cloneObject(value, fallback = {}) {
  return value && typeof value === "object" && !Array.isArray(value) ? { ...value } : { ...fallback };
}

function normalizeCaseRecord(caseRecord = {}) {
  return {
    id: caseRecord?.id ?? null,
    type: caseRecord?.type ?? null,
    intent: caseRecord?.intent ?? null,
    expectedBehavior: caseRecord?.expectedBehavior ?? null,
    forbiddenBehavior: caseRecord?.forbiddenBehavior ?? null,
    input: caseRecord?.input ?? null,
    observed: caseRecord?.observed ?? null,
    passed: caseRecord?.passed ?? null,
    runtime: cloneObject(caseRecord?.runtime),
    preflight: cloneObject(caseRecord?.preflight),
    tags: cloneArray(caseRecord?.tags),
    privacyNotes: cloneArray(caseRecord?.privacyNotes),
  };
}

function normalizeBoundary(boundary = {}) {
  const permissions = cloneObject(boundary?.permissions, {
    allowed: [],
    denied: [],
    conservativeDefault: false,
    declarations: [],
  });
  permissions.allowed = cloneArray(permissions.allowed);
  permissions.denied = cloneArray(permissions.denied);
  permissions.declarations = cloneArray(permissions.declarations);
  permissions.conservativeDefault = permissions.conservativeDefault === true;

  const toolBoundary = cloneObject(boundary?.toolBoundary, {
    allowedActions: [],
    deniedActions: [],
    permissions,
    bodyMentionsConservativeBoundary: false,
  });
  toolBoundary.allowedActions = cloneArray(toolBoundary.allowedActions);
  toolBoundary.deniedActions = cloneArray(toolBoundary.deniedActions);
  toolBoundary.permissions = cloneObject(toolBoundary.permissions, permissions);
  toolBoundary.bodyMentionsConservativeBoundary = toolBoundary.bodyMentionsConservativeBoundary === true;

  return {
    permissions,
    toolBoundary,
  };
}

function normalizeFixtureContext({ fixtureDir, loadedFixture, normalizedFixture }) {
  return {
    fixtureDir: fixtureDir ?? null,
    fixtureId:
      normalizedFixture?.fixtureId ??
      normalizedFixture?.id ??
      loadedFixture?.skillManifest?.id ??
      loadedFixture?.manifest?.id ??
      null,
    fixtureVersion:
      normalizedFixture?.fixtureVersion ??
      normalizedFixture?.version ??
      loadedFixture?.skillManifest?.version ??
      loadedFixture?.manifest?.version ??
      null,
    profile: normalizedFixture?.profile ?? loadedFixture?.skillManifest?.profile ?? null,
    entryPath: normalizedFixture?.entryPath ?? loadedFixture?.skillManifest?.entry ?? null,
    normalizedFixture,
  };
}

export function buildRuntimeProviderAdapterInput({
  fixtureDir = null,
  loadedFixture = null,
  normalizedFixture = null,
  fixtureContext = null,
  caseRecord = null,
  boundary = {},
  options = {},
} = {}) {
  const rawSelection = options.providerSelection ?? {
      mode: options.mode ?? options.providerKey ?? null,
      providerKey: options.providerKey ?? options.mode ?? null,
      providerSlot: options.providerSlot ?? DEFAULT_PROVIDER_ADAPTER_SLOT,
      providerBacked: options.mode === "provider-backed" || options.providerKey === "provider-backed",
    };
  assertSelectionInputContractCompliance(rawSelection);
  const selection = resolveRuntimeProviderSelection(rawSelection);
  const providerKey = options.providerKey ?? selection.providerKey ?? options.mode ?? null;
  const providerSlot = options.providerSlot ?? selection.providerSlot ?? DEFAULT_PROVIDER_ADAPTER_SLOT;

  const normalizedFixtureContext = fixtureContext
    ? {
        ...cloneObject(fixtureContext),
        normalizedFixture: fixtureContext?.normalizedFixture ?? normalizedFixture ?? null,
      }
    : normalizeFixtureContext({ fixtureDir, loadedFixture, normalizedFixture });

  return {
    contract: {
      kind: "runtime-provider-adapter-input",
      version: options.contractVersion ?? PROVIDER_ADAPTER_INPUT_VERSION,
    },
    caseRecord: normalizeCaseRecord(caseRecord),
    boundary: normalizeBoundary(boundary),
    fixture: normalizedFixtureContext,
    options: cloneObject(options),
    provider: {
      mode: options.mode ?? selection.adapterKey ?? null,
      providerKey,
      providerSlot,
      builtin: selection.builtin === true,
      contractFirst: true,
      implemented: selection.implemented === true,
      providerBacked: selection.providerBacked === true,
      synthetic: options.synthetic === true || options.options?.synthetic === true,
      syntheticMarker: options.synthetic === true || options.options?.synthetic === true ? SYNTHETIC_PROVIDER_MARKER : null,
      selection,
      note:
        "single-case provider adapter seam only; this contract reserves future provider-backed runtime execution without implying provider integration is implemented",
    },
  };
}

function buildReservedProviderTranscriptHandle(selection = {}) {
  const providerKey = normalizeProviderExecutionIdentityValue(selection?.providerKey) ?? "provider-backed";
  const providerSlot = normalizeProviderExecutionIdentityValue(selection?.providerSlot) ?? DEFAULT_PROVIDER_ADAPTER_SLOT;
  return `${TRANSCRIPT_REF_RESERVED_HANDLE_PREFIX}${providerKey}:${providerSlot}`;
}

function normalizeTranscriptRefPersistence(persistence, { available = false, providerManaged = false } = {}) {
  if (available !== true || providerManaged !== true) {
    return "none";
  }

  const normalized = String(persistence ?? "reserved-provider-managed").trim() || "reserved-provider-managed";
  if (!TRANSCRIPT_REF_PERSISTENCE_MODES.includes(normalized)) {
    throw new RangeError(`Unsupported runtime provider transcript ref persistence mode: ${normalized}`);
  }

  return normalized;
}

function normalizeTranscriptRefAvailabilityMode(mode, { available = false, providerManaged = false, persistence = "none" } = {}) {
  if (available !== true || providerManaged !== true || persistence !== "reserved-provider-managed") {
    return "none";
  }

  const normalized = String(mode ?? "reserved-provider-managed").trim() || "reserved-provider-managed";
  if (!TRANSCRIPT_REF_AVAILABILITY_MODES.includes(normalized)) {
    throw new RangeError(`Unsupported runtime provider transcript availability mode: ${normalized}`);
  }

  return normalized;
}

function normalizeRuntimeProviderTranscriptRef(transcriptRef = null, { selection = {}, evidence = {} } = {}) {
  if (!transcriptRef || typeof transcriptRef !== "object" || Array.isArray(transcriptRef)) {
    return null;
  }

  const providerBacked = selection?.providerBacked === true;
  const transcriptAvailable = evidence?.transcriptAvailable === true;
  const transcriptPersistence = evidence?.transcriptPersistence === true;
  const providerManagedRequested = transcriptRef?.providerManaged === true;
  const persistenceRequested = transcriptRef?.persistence === "reserved-provider-managed";
  const available = providerBacked === true && transcriptAvailable === true;
  const providerManaged =
    available === true &&
    providerManagedRequested === true &&
    transcriptPersistence === true &&
    persistenceRequested === true;
  const persistence = normalizeTranscriptRefPersistence(transcriptRef?.persistence, {
    available,
    providerManaged,
  });
  const availability = normalizeTranscriptRefAvailabilityMode(transcriptRef?.availability, {
    available,
    providerManaged,
    persistence,
  });

  return {
    ...transcriptRef,
    kind: transcriptRef?.kind ?? PROVIDER_ADAPTER_TRANSCRIPT_REF_KIND,
    version: transcriptRef?.version ?? PROVIDER_ADAPTER_TRANSCRIPT_REF_VERSION,
    available,
    availability,
    providerManaged,
    handle:
      providerManaged === true
        ? normalizeProviderExecutionIdentityValue(transcriptRef?.handle) ?? buildReservedProviderTranscriptHandle(selection)
        : null,
    location:
      providerManaged === true && transcriptRef?.location && typeof transcriptRef.location === "object" && !Array.isArray(transcriptRef.location)
        ? { ...transcriptRef.location }
        : null,
    persistence,
    providerTranscript: providerManaged === true,
    note:
      transcriptRef?.note ??
      (persistence === "reserved-provider-managed"
        ? TRANSCRIPT_REF_RESERVED_PERSISTENCE_NOTE
        : TRANSCRIPT_REF_RESERVED_HANDLE_NOTE),
  };
}

export function buildRuntimeProviderTranscriptRef({
  handle = null,
  kind = PROVIDER_ADAPTER_TRANSCRIPT_REF_KIND,
  version = PROVIDER_ADAPTER_TRANSCRIPT_REF_VERSION,
  available = false,
  availability = "none",
  location = null,
  providerManaged = false,
  persistence = "none",
  providerTranscript = null,
  note = null,
} = {}) {
  const normalizedAvailable = available === true;
  const normalizedProviderManaged = normalizedAvailable === true && providerManaged === true;
  const normalizedPersistence = normalizeTranscriptRefPersistence(persistence, {
    available: normalizedAvailable,
    providerManaged: normalizedProviderManaged,
  });

  return {
    kind,
    version,
    handle: normalizedProviderManaged === true ? handle : null,
    available: normalizedAvailable,
    availability: normalizeTranscriptRefAvailabilityMode(availability, {
      available: normalizedAvailable,
      providerManaged: normalizedProviderManaged,
      persistence: normalizedPersistence,
    }),
    location:
      normalizedProviderManaged === true && location && typeof location === "object" && !Array.isArray(location)
        ? { ...location }
        : null,
    providerManaged: normalizedProviderManaged,
    providerTranscript: providerTranscript == null ? normalizedProviderManaged : providerTranscript === true,
    persistence: normalizedPersistence,
    note:
      note ??
      (normalizedPersistence === "reserved-provider-managed"
        ? TRANSCRIPT_REF_RESERVED_PERSISTENCE_NOTE
        : TRANSCRIPT_REF_RESERVED_HANDLE_NOTE),
  };
}

// --- Transcript capture reserved skeleton ---

const TRANSCRIPT_CAPTURE_MODES = Object.freeze(["none", "reserved-provider-captured"]);

function captureProviderTranscriptStub(context) {
  // Only allow capture stub in provider-backed reserved seam
  const { selection, execution, evidence } = context;

  if (!selection || !selection.providerBacked) {
    return {
      captured: false,
      captureMode: "none",
      captureTiming: null,
      note: "non-provider-backed: transcript capture not applicable",
    };
  }

  if (!execution || !execution.executed || !execution.providerCall) {
    return {
      captured: false,
      captureMode: "none",
      captureTiming: null,
      note: "provider-backed reserved: transcript capture reserved but not yet executed",
    };
  }

  // Even when executed, current phase only allows reserved stub
  if (!evidence || !evidence.transcriptCaptured) {
    return {
      captured: false,
      captureMode: "none",
      captureTiming: null,
      note: "provider-backed executed: transcript capture not yet requested",
    };
  }

  return {
    captured: false,
    captureMode: "reserved-provider-captured",
    captureTiming: "post-execution-reserved",
    note: "reserved: transcript capture skeleton only, not real provider capture",
  };
}

function assertTranscriptCaptureStubContract(captureResult) {
  if (captureResult.captured === true) {
    throw new Error("transcript capture: captured=true is not allowed in current phase");
  }
  if (
    captureResult.captureMode === "reserved-provider-captured" &&
    captureResult.captured !== false
  ) {
    throw new Error("transcript capture: reserved-provider-captured requires captured=false");
  }
}

// --- Scoring / acceptance rubric reserved stub ---

const SCORING_MODES = Object.freeze(["none", "reserved-pending"]);

function buildScoringStub(context) {
  // Current phase: scoring is never performed
  return {
    scored: false,
    scoringMode: "none",
    scoringTiming: null,
    score: null,
    rubric: null,
    acceptance: null,
    note: "scoring not available in current phase"
  };
}

function buildScoringStubProviderReserved(context) {
  // Provider-backed reserved stub: shape is ready but scoring never executes
  const { selection } = context || {};
  if (!selection || !selection.providerBacked) {
    return buildScoringStub(context);
  }
  return {
    scored: false,
    scoringMode: "reserved-pending",
    scoringTiming: "post-execution-reserved",
    score: null,
    rubric: null,
    acceptance: null,
    note: "reserved: scoring stub only, not real provider scoring"
  };
}

function assertScoringStubContract(scoringResult) {
  if (!scoringResult || typeof scoringResult !== "object") {
    throw new Error("scoring: result must be an object");
  }
  if (scoringResult.scored === true) {
    throw new Error("scoring: scored=true is not allowed in current phase");
  }
  if (scoringResult.scoringMode && !SCORING_MODES.includes(scoringResult.scoringMode)) {
    throw new Error("scoring: invalid scoringMode: " + scoringResult.scoringMode);
  }
}

// --- Sandbox enforcement reserved stub ---

const SANDBOX_MODES = Object.freeze(["none", "reserved-pending"]);

function buildSandboxStub(context) {
  return {
    enforced: false,
    sandboxMode: "none",
    isolation: null,
    resourceLimits: null,
    timeout: null,
    note: "sandbox enforcement not available in current phase"
  };
}

function buildSandboxStubProviderReserved(context) {
  const { selection } = context || {};
  if (!selection || !selection.providerBacked) {
    return buildSandboxStub(context);
  }
  return {
    enforced: false,
    sandboxMode: "reserved-pending",
    isolation: "reserved-container",
    resourceLimits: null,
    timeout: null,
    note: "reserved: sandbox enforcement stub only, not real provider sandbox"
  };
}

function assertSandboxStubContract(sandboxResult) {
  if (!sandboxResult || typeof sandboxResult !== "object") {
    throw new Error("sandbox: result must be an object");
  }
  if (sandboxResult.enforced === true) {
    throw new Error("sandbox: enforced=true is not allowed in current phase");
  }
  if (sandboxResult.sandboxMode && !SANDBOX_MODES.includes(sandboxResult.sandboxMode)) {
    throw new Error("sandbox: invalid sandboxMode: " + sandboxResult.sandboxMode);
  }
}

// --- Multi-case orchestration reserved stub ---

const CASE_MODES = Object.freeze(["single", "reserved-multi"]);

function buildMultiCaseStub(context) {
  return {
    caseMode: "single",
    caseCount: 1,
    orchestration: null,
    caseDependencies: null,
    note: "multi-case orchestration not available in current phase"
  };
}

function buildMultiCaseStubProviderReserved(context) {
  const { selection } = context || {};
  if (!selection || !selection.providerBacked) {
    return buildMultiCaseStub(context);
  }
  return {
    caseMode: "single",
    caseCount: 1,
    orchestration: "reserved-batch",
    caseDependencies: null,
    note: "reserved: multi-case orchestration stub only, not real batch execution"
  };
}

function assertMultiCaseStubContract(multiCaseResult) {
  if (!multiCaseResult || typeof multiCaseResult !== "object") {
    throw new Error("multi-case: result must be an object");
  }
  if (multiCaseResult.caseMode && !CASE_MODES.includes(multiCaseResult.caseMode)) {
    throw new Error("multi-case: invalid caseMode: " + multiCaseResult.caseMode);
  }
  if (multiCaseResult.caseMode === "reserved-multi" && multiCaseResult.caseCount === 1) {
    throw new Error("multi-case: reserved-multi requires caseCount > 1");
  }
}

function resolveRuntimeProviderSelection(selection = {}) {
  if (selection == null || typeof selection !== "object" || Array.isArray(selection)) {
    return buildRuntimeProviderSelection();
  }

  const adapterKey = selection.mode ?? selection.providerKey ?? selection.adapterKey ?? null;
  const normalizedSelection = buildRuntimeProviderSelection({
    mode: adapterKey,
    providerSlot: selection.providerSlot ?? DEFAULT_PROVIDER_ADAPTER_SLOT,
  });

  return {
    ...normalizedSelection,
    builtin: normalizedSelection.builtin === true,
    implemented: normalizedSelection.implemented === true,
    providerBacked: normalizedSelection.providerBacked === true,
  };
}

function normalizeProviderFailureSemanticStatus(status = "not-executed") {
  const normalizedStatus = String(status ?? "not-executed");
  if (!PROVIDER_FAILURE_STATUS_ALLOWED_SET.includes(normalizedStatus)) {
    throw new RangeError(`Unsupported runtime provider failure taxonomy status: ${normalizedStatus}`);
  }
  return normalizedStatus;
}

function resolveProviderAdapterPublicStatus(status = "not-executed") {
  const semanticStatus = normalizeProviderFailureSemanticStatus(status);
  return PROVIDER_FAILURE_STATUS_SEMANTICS[semanticStatus]?.adapterResultStatus ?? "not-executed";
}

function assertProviderAdapterFailureTaxonomy({
  semanticStatus = "not-executed",
  publicStatus = "not-executed",
  selection = {},
  execution = {},
  evidence = {},
} = {}) {
  const semantics = PROVIDER_FAILURE_STATUS_SEMANTICS[semanticStatus];
  const providerBacked = selection?.providerBacked === true;
  const preflightBlocked =
    evidence?.preflightBlocked === true ||
    execution?.preflightBlocked === true ||
    execution?.blockingStage === "preflight";
  const executed = execution?.executed === true;
  const providerCall = execution?.providerCall === true;
  const executionId = normalizeProviderExecutionIdentityValue(execution?.executionId);
  const providerRunId = normalizeProviderExecutionIdentityValue(execution?.providerRunId);
  const providerStatus = execution?.providerStatus == null ? null : normalizeProviderExecutionStatus(execution?.providerStatus, { providerBacked });
  const hasStubIdentity = executionId != null || providerRunId != null || providerStatus != null;
  const shouldExposeStubIdentity = canExposeProviderExecutionIdentityStub({ selection, semanticStatus });

  if (!semantics) {
    throw new RangeError(`Missing runtime provider failure taxonomy semantics for status: ${semanticStatus}`);
  }

  if (publicStatus !== semantics.adapterResultStatus) {
    throw new RangeError(
      `Runtime provider adapter status ${semanticStatus} must serialize as ${semantics.adapterResultStatus}, got: ${publicStatus}`,
    );
  }

  if (semanticStatus === "blocked" && preflightBlocked !== true) {
    throw new RangeError("Runtime provider adapter blocked status requires preflight-blocked evidence");
  }

  if (semanticStatus !== "blocked" && preflightBlocked === true) {
    throw new RangeError(
      `Runtime provider adapter status ${semanticStatus} cannot carry preflight-blocked evidence; use blocked instead`,
    );
  }

  if (providerBacked && semanticStatus !== "blocked" && semanticStatus !== "error") {
    throw new RangeError(
      `Runtime provider adapter provider-backed reserved seam only allows blocked/error, got: ${semanticStatus}`,
    );
  }

  if (providerBacked && shouldExposeStubIdentity === true && hasStubIdentity !== true) {
    throw new RangeError(
      "Runtime provider adapter provider-backed reserved seam requires stub execution identity for blocked/error results",
    );
  }

  if (providerBacked && shouldExposeStubIdentity !== true && hasStubIdentity === true) {
    throw new RangeError(
      "Runtime provider adapter execution identity stub fields must fall back to null outside provider-backed blocked/error reserved seam results",
    );
  }

  if (!providerBacked && hasStubIdentity === true) {
    throw new RangeError(
      "Runtime provider adapter non-provider-backed selections must not expose provider execution identity stub fields",
    );
  }

  const allowedCompatProviderStatuses = PROVIDER_STATUS_COMPAT_BY_SEMANTIC_STATUS[semanticStatus] ?? [];
  if (providerBacked && shouldExposeStubIdentity === true) {
    if (!allowedCompatProviderStatuses.includes(providerStatus)) {
      throw new RangeError(
        `Runtime provider adapter semantic status ${semanticStatus} only allows providerStatus in ${allowedCompatProviderStatuses.join(", ")}, got: ${providerStatus}`,
      );
    }

    const compatPublicStatus = resolvePublicCaseStatusFromProviderExecutionStatus(providerStatus);
    if (compatPublicStatus !== publicStatus) {
      throw new RangeError(
        `Runtime provider adapter providerStatus ${providerStatus} must remain status-compatible with public case status ${publicStatus}, got compat target: ${compatPublicStatus}`,
      );
    }
  }

  if (providerBacked && semantics.allowsProviderBackedSelection !== true) {
    throw new RangeError(
      `Runtime provider adapter status ${semanticStatus} is not allowed for provider-backed selection`,
    );
  }

  if (providerBacked && executed === true) {
    throw new RangeError(
      "Runtime provider adapter provider-backed reserved seam forbids executed=true until provider integration is implemented, even when stub execution identity is present",
    );
  }

  if (providerBacked && providerCall === true) {
    if (isSyntheticProviderResult(adapterResult) === true) {
      return;
    }
    throw new RangeError(
      "Runtime provider adapter provider-backed reserved seam forbids providerCall=true until provider integration is implemented, even when stub execution identity is present",
    );
  }

  if (executed && semantics.allowsExecution !== true) {
    throw new RangeError(
      `Runtime provider adapter status ${semanticStatus} forbids executed=true in the current reserved seam`,
    );
  }

  if (providerCall && semantics.allowsProviderCall !== true) {
    throw new RangeError(
      `Runtime provider adapter status ${semanticStatus} forbids providerCall=true in the current reserved seam`,
    );
  }
}

export function buildRuntimeProviderAdapterResult({
  caseId = null,
  status = "not-executed",
  observed = null,
  failureReason = null,
  providerMetadata = {},
  selection = {},
  execution = {},
  evidence = {},
  rawResponse = {},
  transcriptRef = null,
  note = null,
  pendingCapabilities = DEFAULT_PENDING_CAPABILITIES,
  allowedStatuses = DEFAULT_ALLOWED_PROVIDER_STATUSES,
  synthetic = false,
} = {}) {
  if (synthetic === true || selection?.synthetic === true || execution?.synthetic === true || providerMetadata?.synthetic === true) {
    return buildSyntheticProviderResult({
      adapterKey: selection?.adapterKey ?? selection?.providerKey ?? "provider-backed",
      status: status === "not-executed" ? "synthetic-passed" : status,
      observed: observed ?? undefined,
      executionTime: execution?.executionTime,
      providerMetadata: {
        ...cloneObject(providerMetadata),
        synthetic: true,
        syntheticMarker: SYNTHETIC_PROVIDER_MARKER,
      },
    });
  }

  const semanticStatus = normalizeProviderFailureSemanticStatus(status);
  const normalizedStatus = resolveProviderAdapterPublicStatus(semanticStatus);
  if (!allowedStatuses.includes(normalizedStatus)) {
    throw new RangeError(`Unsupported runtime provider adapter result status: ${normalizedStatus}`);
  }

  const normalizedSelection = resolveRuntimeProviderSelection(selection);

  const normalizedExecution = {
    executionId: null,
    providerRunId: null,
    providerStatus: null,
    executed: false,
    providerCall: false,
    identityKind: PROVIDER_EXECUTION_IDENTITY_KIND,
    identityVersion: PROVIDER_EXECUTION_IDENTITY_VERSION,
    ...cloneObject(execution),
  };

  const normalizedEvidence = {
    providerEvidenceAvailable: false,
    transcriptAvailability: "none",
    transcriptAvailable: false,
    transcriptCaptured: false,
    transcriptPersistence: false,
    persistence: "none",
    preflightBlocked: false,
    ...cloneObject(evidence),
  };

  normalizedExecution.executed = normalizedExecution.executed === true;
  normalizedExecution.providerCall = normalizedExecution.providerCall === true;
  normalizedEvidence.providerEvidenceAvailable = normalizedEvidence.providerEvidenceAvailable === true;
  normalizedEvidence.transcriptAvailable = normalizedEvidence.transcriptAvailable === true;
  normalizedEvidence.transcriptCaptured = normalizedEvidence.transcriptCaptured === true;
  normalizedEvidence.transcriptPersistence = normalizedEvidence.transcriptPersistence === true;
  normalizedEvidence.preflightBlocked = normalizedEvidence.preflightBlocked === true;

  normalizedEvidence.persistence =
    normalizedSelection.providerBacked === true && normalizedEvidence.transcriptPersistence === true
      ? "reserved-provider-managed"
      : "none";

  if (
    normalizedEvidence.transcriptAvailable === true &&
    normalizedSelection.providerBacked === true &&
    normalizedEvidence.transcriptPersistence === true
  ) {
    normalizedEvidence.transcriptAvailability = "reserved-provider-managed";
  } else {
    normalizedEvidence.transcriptAvailability = "none";
  }

  const normalizedRawResponse = normalizeRuntimeProviderRawResponse(rawResponse, {
    selection: normalizedSelection,
    execution: normalizedExecution,
  });

  const normalizedMetadata = {
    implementationState: normalizedSelection.implemented === true ? "implemented" : "contract-first-unimplemented",
    executed: false,
    providerCall: false,
    providerEvidenceAvailable: false,
    transcriptAvailable: false,
    transcriptCaptured: false,
    transcriptPersistence: false,
    persistence: "none",
    executionId: null,
    providerRunId: null,
    providerStatus: null,
    semanticStatus,
    statusPriority: PROVIDER_FAILURE_STATUS_SEMANTICS[semanticStatus]?.precedenceRank ?? null,
    failureTaxonomyVersion: PROVIDER_FAILURE_TAXONOMY_VERSION,
    failureTaxonomyAllowedSet: [...PROVIDER_FAILURE_STATUS_ALLOWED_SET],
    failureTaxonomyPriority: [...PROVIDER_FAILURE_STATUS_PRIORITY],
    failureTaxonomySemantics: PROVIDER_FAILURE_STATUS_SEMANTICS,
    futureRequiredFields: [...FUTURE_PROVIDER_BACKED_REQUIRED_FIELDS],
    reservedStatusSet: [...RESERVED_PROVIDER_BACKED_STATUS_SET],
    note:
      note ??
      "provider adapter seam result only; no real provider call, no transcript persistence, no runtime pass evidence",
    pendingCapabilities: Array.isArray(pendingCapabilities)
      ? [...pendingCapabilities]
      : [...DEFAULT_PENDING_CAPABILITIES],
    ...cloneObject(providerMetadata),
  };

  const providerBackedReservedSeam =
    normalizedSelection.providerBacked === true || normalizedMetadata.providerBacked === true;
  const effectiveSelection = providerBackedReservedSeam
    ? {
        ...normalizedSelection,
        adapterKey:
          normalizedMetadata.adapterKey ??
          normalizedMetadata.providerKey ??
          (normalizedMetadata.providerBacked === true ? "provider-backed" : normalizedSelection.adapterKey) ??
          "provider-backed",
        providerKey: normalizedMetadata.providerKey ?? normalizedSelection.providerKey ?? "provider-backed",
        providerSlot: normalizedMetadata.providerSlot ?? normalizedSelection.providerSlot ?? DEFAULT_PROVIDER_ADAPTER_SLOT,
        builtin: normalizedMetadata.builtin === true || normalizedSelection.builtin === true,
        implemented:
          normalizedMetadata.implemented === true
            ? true
            : normalizedMetadata.providerBacked === true
              ? false
              : normalizedSelection.implemented === true,
        providerBacked: true,
      }
    : normalizedSelection;

  if (providerBackedReservedSeam === true) {
    const executionIdentity = buildProviderExecutionIdentityStub({
      executionId: normalizedExecution.executionId,
      providerRunId: normalizedExecution.providerRunId,
      providerStatus: normalizedExecution.providerStatus,
      selection: effectiveSelection,
      semanticStatus,
    });
    normalizedExecution.executionId = executionIdentity.executionId;
    normalizedExecution.providerRunId = executionIdentity.providerRunId;
    normalizedExecution.providerStatus = executionIdentity.providerStatus;
    normalizedExecution.executed = false;
    normalizedExecution.providerCall = false;
    normalizedEvidence.providerEvidenceAvailable = false;
    normalizedEvidence.transcriptAvailability = "none";
    normalizedEvidence.transcriptAvailable = false;
    normalizedEvidence.transcriptCaptured = false;
    normalizedEvidence.transcriptPersistence = false;
    normalizedEvidence.persistence = "none";
  } else if (normalizedExecution.executed !== true) {
    normalizedExecution.executionId = null;
    normalizedExecution.providerRunId = null;
    normalizedExecution.providerStatus = null;
    normalizedExecution.executed = false;
    normalizedExecution.providerCall = false;
  }

  if ((providerBackedReservedSeam !== true && semanticStatus !== "synthetic-passed") || normalizedEvidence.providerEvidenceAvailable !== true) {
    normalizedEvidence.providerEvidenceAvailable = false;
    normalizedEvidence.transcriptAvailability = "none";
    normalizedEvidence.transcriptAvailable = false;
    normalizedEvidence.transcriptCaptured = false;
    normalizedEvidence.transcriptPersistence = false;
    normalizedEvidence.persistence = "none";
  }

  assertProviderAdapterFailureTaxonomy({
    semanticStatus,
    publicStatus: normalizedStatus,
    selection: effectiveSelection,
    execution: normalizedExecution,
    evidence: normalizedEvidence,
  });

  const rawResponseExposureAllowed = canExposeProviderBackedRawResponse({
    selection: effectiveSelection,
    execution: normalizedExecution,
  });

  const finalRawResponse = normalizeRuntimeProviderRawResponse(normalizedRawResponse, {
    selection: effectiveSelection,
    execution: normalizedExecution,
  });

  normalizedMetadata.providerBacked = effectiveSelection.providerBacked;
  normalizedMetadata.providerKey = effectiveSelection.providerKey;
  normalizedMetadata.providerSlot = effectiveSelection.providerSlot;
  normalizedMetadata.adapterKey = effectiveSelection.adapterKey;
  normalizedMetadata.builtin = effectiveSelection.builtin;
  normalizedMetadata.implemented = effectiveSelection.implemented;
  normalizedMetadata.executed = normalizedExecution.executed === true;
  normalizedMetadata.providerCall = normalizedExecution.providerCall === true;
  normalizedMetadata.providerEvidenceAvailable = normalizedEvidence.providerEvidenceAvailable === true;
  normalizedMetadata.transcriptAvailability = normalizedEvidence.transcriptAvailability ?? "none";
  normalizedMetadata.transcriptAvailable = normalizedEvidence.transcriptAvailable === true;
  normalizedMetadata.transcriptCaptured = normalizedEvidence.transcriptCaptured === true;
  normalizedMetadata.transcriptPersistence = normalizedEvidence.transcriptPersistence === true;
  normalizedMetadata.persistence = normalizedEvidence.persistence ?? normalizedMetadata.persistence ?? "none";
  normalizedMetadata.executionId = normalizedExecution.executionId ?? null;
  normalizedMetadata.providerRunId = normalizedExecution.providerRunId ?? null;
  normalizedMetadata.providerStatus = normalizedExecution.providerStatus ?? null;

  if (normalizedMetadata.providerBacked === true) {
    normalizedMetadata.executed = false;
    normalizedMetadata.providerCall = false;
    normalizedMetadata.providerEvidenceAvailable = false;
    normalizedMetadata.transcriptAvailability = "none";
    normalizedMetadata.transcriptAvailable = false;
    normalizedMetadata.transcriptCaptured = false;
    normalizedMetadata.transcriptPersistence = false;
    normalizedMetadata.persistence = "none";
    normalizedMetadata.executionIdentityKind = PROVIDER_EXECUTION_IDENTITY_KIND;
    normalizedMetadata.executionIdentityVersion = PROVIDER_EXECUTION_IDENTITY_VERSION;
  } else if (semanticStatus === "synthetic-passed") {
    // Preserve execution/evidence for synthetic-passed (non-provider-backed but observable)
    normalizedMetadata.executionIdentityKind = null;
    normalizedMetadata.executionIdentityVersion = null;
    normalizedMetadata.transcriptAvailability = "none";
    normalizedMetadata.transcriptAvailable = false;
    normalizedMetadata.transcriptCaptured = false;
    normalizedMetadata.transcriptPersistence = false;
    normalizedMetadata.persistence = "none";
  } else {
    normalizedMetadata.executed = false;
    normalizedMetadata.providerCall = false;
    normalizedMetadata.providerEvidenceAvailable = false;
    normalizedMetadata.transcriptAvailability = "none";
    normalizedMetadata.transcriptAvailable = false;
    normalizedMetadata.transcriptCaptured = false;
    normalizedMetadata.transcriptPersistence = false;
    normalizedMetadata.persistence = normalizedMetadata.persistence ?? "none";
    normalizedMetadata.executionId = null;
    normalizedMetadata.providerRunId = null;
    normalizedMetadata.providerStatus = null;
    normalizedMetadata.executionIdentityKind = null;
    normalizedMetadata.executionIdentityVersion = null;
  }

  if (normalizedMetadata.executed !== true || normalizedMetadata.providerCall !== true) {
    finalRawResponse.available = false;
    finalRawResponse.captureMode = "none";
    finalRawResponse.summary = null;
    finalRawResponse.handle = null;
  }

  const normalizedTranscriptRef = normalizeRuntimeProviderTranscriptRef(transcriptRef, {
    selection: effectiveSelection,
    evidence: {
      ...normalizedEvidence,
      transcriptAvailable:
        normalizedEvidence.transcriptAvailable === true && rawResponseExposureAllowed === true,
    },
  });

  if (normalizedTranscriptRef) {
    if (normalizedMetadata.providerBacked !== true) {
      normalizedTranscriptRef.available = false;
      normalizedTranscriptRef.availability = "none";
      normalizedTranscriptRef.providerManaged = false;
      normalizedTranscriptRef.providerTranscript = false;
      normalizedTranscriptRef.handle = null;
      normalizedTranscriptRef.location = null;
      normalizedTranscriptRef.persistence = "none";
    }

    if (rawResponseExposureAllowed !== true) {
      normalizedTranscriptRef.available = false;
      normalizedTranscriptRef.availability = "none";
      normalizedTranscriptRef.providerManaged = false;
      normalizedTranscriptRef.providerTranscript = false;
      normalizedTranscriptRef.handle = null;
      normalizedTranscriptRef.location = null;
      normalizedTranscriptRef.persistence = "none";
    }

    if (normalizedEvidence.transcriptAvailable !== true) {
      normalizedTranscriptRef.available = false;
      normalizedTranscriptRef.availability = "none";
      normalizedTranscriptRef.providerManaged = false;
      normalizedTranscriptRef.providerTranscript = false;
      normalizedTranscriptRef.handle = null;
      normalizedTranscriptRef.location = null;
      normalizedTranscriptRef.persistence = "none";
    }
  }

  return {
    contract: {
      kind: "runtime-provider-adapter-output",
      version: providerMetadata?.contractVersion ?? PROVIDER_ADAPTER_OUTPUT_VERSION,
    },
    caseId,
    status: normalizedStatus,
    observed,
    failureReason:
      failureReason && typeof failureReason === "object" && !Array.isArray(failureReason)
        ? {
            ...failureReason,
            blockingCheckIds: cloneArray(failureReason?.blockingCheckIds),
          }
        : null,
    selection: effectiveSelection,
    execution: normalizedExecution,
    evidence: normalizedEvidence,
    rawResponse: finalRawResponse,
    transcriptRef: normalizedTranscriptRef,
    providerMetadata: normalizedMetadata,
  };
}

// --- Selection input contract guards ---

function isBuiltinProviderKey(key) {
  return BUILTIN_PROVIDER_ADAPTER_KEYS.includes(key);
}

function isExternalProviderKey(key) {
  return typeof key === 'string' && !isBuiltinProviderKey(key);
}

function assertSelectionInputProviderBackedConstraint(selection) {
  // dry-run and null-runner cannot be providerBacked
  const builtinNonProviderKeys = ['dry-run', 'null-runner'];
  if (builtinNonProviderKeys.includes(selection.adapterKey) && selection.providerBacked === true) {
    throw new Error(
      `selection: adapterKey="${selection.adapterKey}" cannot have providerBacked=true; ` +
      `only non-builtin providers can be providerBacked`
    );
  }
}

export function buildRuntimeProviderSelection({
  mode = null,
  providerKey = null,
  providerSlot = DEFAULT_PROVIDER_ADAPTER_SLOT,
} = {}) {
  const adapterKey = providerKey ?? mode ?? "dry-run";
  const classification = classifyProviderAdapterKey(adapterKey);
  if (!classification.builtin) {
    throw new RangeError(`Unsupported runtime provider adapter key: ${adapterKey}; only builtin presets are accepted: ${PROVIDER_SELECTION_STABLE_PRESET_KEYS.join(", ")}`);
  }

  // Guard: dry-run and null-runner presets can never produce providerBacked=true
  if (classification.preset.providerBacked !== true && adapterKey !== "provider-backed") {
    // This branch is a no-op assertion: preset.providerBacked is already false for non-provider-backed.
    // The guard exists as explicit documentation that only the "provider-backed" preset
    // carries providerBacked=true, and this cannot change without modifying frozen presets.
  }

  const result = {
    kind: "runtime-provider-selection",
    version: PROVIDER_SELECTION_VERSION,
    ...classification.preset,
    providerSlot,
  };
  assertSelectionInputProviderBackedConstraint(result);
  return result;
}

export function buildRuntimeProviderAdapterContractContext({
  fixtureDir = null,
  loadedFixture = null,
  normalizedFixture = null,
  fixtureContext = null,
  caseRecord = null,
  boundary = {},
  options = {},
} = {}) {
  const input = buildRuntimeProviderAdapterInput({
    fixtureDir,
    loadedFixture,
    normalizedFixture,
    fixtureContext,
    caseRecord,
    boundary,
    options,
  });

  return {
    input,
    buildResult(result = {}) {
      return buildRuntimeProviderAdapterResult({
        caseId: result.caseId ?? input.caseRecord.id,
        ...result,
        synthetic: result.synthetic === true || input.provider.synthetic === true,
        selection: result.selection ?? input.provider.selection,
      });
    },
  };
}

export const RUNTIME_PROVIDER_ADAPTER_INPUT_VERSION = PROVIDER_ADAPTER_INPUT_VERSION;
export const RUNTIME_PROVIDER_ADAPTER_OUTPUT_VERSION = PROVIDER_ADAPTER_OUTPUT_VERSION;
export const RUNTIME_PROVIDER_ADAPTER_ALLOWED_STATUSES = [...DEFAULT_ALLOWED_PROVIDER_STATUSES];
export const RUNTIME_PROVIDER_FAILURE_TAXONOMY_VERSION = PROVIDER_FAILURE_TAXONOMY_VERSION;
export const RUNTIME_PROVIDER_FAILURE_STATUS_PRIORITY = [...PROVIDER_FAILURE_STATUS_PRIORITY];
export const RUNTIME_PROVIDER_FAILURE_STATUS_ALLOWED_SET = [...PROVIDER_FAILURE_STATUS_ALLOWED_SET];
export const RUNTIME_PROVIDER_FAILURE_STATUS_SEMANTICS = PROVIDER_FAILURE_STATUS_SEMANTICS;
export const RUNTIME_PROVIDER_ADAPTER_TRANSCRIPT_REF_KIND = PROVIDER_ADAPTER_TRANSCRIPT_REF_KIND;
export const RUNTIME_PROVIDER_ADAPTER_TRANSCRIPT_REF_VERSION = PROVIDER_ADAPTER_TRANSCRIPT_REF_VERSION;
export const RUNTIME_PROVIDER_EXECUTION_IDENTITY_KIND = PROVIDER_EXECUTION_IDENTITY_KIND;
export const RUNTIME_PROVIDER_EXECUTION_IDENTITY_VERSION = PROVIDER_EXECUTION_IDENTITY_VERSION;
export const RUNTIME_PROVIDER_EXECUTION_IDENTITY_STATUS_SET = [...PROVIDER_EXECUTION_IDENTITY_STATUS_SET];
export const RUNTIME_PROVIDER_PUBLIC_CASE_STATUS_SET = [...PROVIDER_PUBLIC_CASE_STATUS_SET];
export const RUNTIME_PROVIDER_STATUS_COMPAT_BY_SEMANTIC_STATUS = Object.freeze(
  Object.fromEntries(
    Object.entries(PROVIDER_STATUS_COMPAT_BY_SEMANTIC_STATUS).map(([key, value]) => [key, [...value]]),
  ),
);
export const RUNTIME_PROVIDER_EXECUTION_STATUS_TO_PUBLIC_CASE_STATUS = Object.freeze({
  ...PROVIDER_EXECUTION_STATUS_TO_PUBLIC_CASE_STATUS,
});
export const RUNTIME_PROVIDER_EXECUTION_IDENTITY_STUB_EXPOSURE_ALLOWED_SEMANTIC_STATUS_SET = [
  ...PROVIDER_EXECUTION_IDENTITY_STUB_EXPOSURE_ALLOWED_SEMANTIC_STATUS_SET,
];
export const RUNTIME_PROVIDER_RAW_RESPONSE_KIND = RAW_RESPONSE_KIND;
export const RUNTIME_PROVIDER_RAW_RESPONSE_VERSION = RAW_RESPONSE_VERSION;
export const RUNTIME_PROVIDER_RAW_RESPONSE_CAPTURE_MODES = [...RAW_RESPONSE_CAPTURE_MODES];
export const RUNTIME_PROVIDER_RAW_RESPONSE_RESERVED_HANDLE_PREFIX = RAW_RESPONSE_RESERVED_HANDLE_PREFIX;
export const RUNTIME_PROVIDER_RAW_RESPONSE_RESERVED_HANDLE_NOTE = RAW_RESPONSE_RESERVED_HANDLE_NOTE;
export const RUNTIME_PROVIDER_TRANSCRIPT_REF_PERSISTENCE_MODES = [...TRANSCRIPT_REF_PERSISTENCE_MODES];
export const RUNTIME_PROVIDER_TRANSCRIPT_REF_AVAILABILITY_MODES = [...TRANSCRIPT_REF_AVAILABILITY_MODES];
export const RUNTIME_PROVIDER_TRANSCRIPT_REF_RESERVED_HANDLE_PREFIX = TRANSCRIPT_REF_RESERVED_HANDLE_PREFIX;
export const RUNTIME_PROVIDER_TRANSCRIPT_REF_RESERVED_PERSISTENCE_NOTE = TRANSCRIPT_REF_RESERVED_PERSISTENCE_NOTE;
export const RUNTIME_PROVIDER_ADAPTER_KEYS = [...BUILTIN_PROVIDER_ADAPTER_KEYS];
export const RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT = DEFAULT_PROVIDER_ADAPTER_SLOT;
export const RUNTIME_PROVIDER_ADAPTER_RESERVED_STATUS_SET = [...RESERVED_PROVIDER_BACKED_STATUS_SET];
export const RUNTIME_PROVIDER_ADAPTER_FUTURE_REQUIRED_FIELDS = [...FUTURE_PROVIDER_BACKED_REQUIRED_FIELDS];
export const RUNTIME_PROVIDER_SELECTION_VERSION = PROVIDER_SELECTION_VERSION;
export const RUNTIME_PROVIDER_SELECTION_PRESETS = Object.freeze(
  Object.fromEntries(
    Object.entries(BUILTIN_PROVIDER_SELECTION_PRESETS).map(([key, value]) => [key, { ...value }]),
  ),
);
export const RUNTIME_PROVIDER_TRANSCRIPT_CAPTURE_MODES = [...TRANSCRIPT_CAPTURE_MODES];
export const RUNTIME_PROVIDER_CAPTURE_TRANSCRIPT_STUB = captureProviderTranscriptStub;
export const RUNTIME_PROVIDER_ASSERT_TRANSCRIPT_CAPTURE_STUB_CONTRACT = assertTranscriptCaptureStubContract;

export const RUNTIME_PROVIDER_SELECTION_INPUT_CONTRACT = PROVIDER_SELECTION_INPUT_CONTRACT;
export const RUNTIME_PROVIDER_SELECTION_STABLE_PRESET_KEYS = [...PROVIDER_SELECTION_STABLE_PRESET_KEYS];
export const RUNTIME_PROVIDER_SELECTION_IS_BUILTIN = isBuiltinProviderAdapterKey;
export const RUNTIME_PROVIDER_SELECTION_CLASSIFY = classifyProviderAdapterKey;
export const RUNTIME_PROVIDER_SELECTION_IS_BUILTIN_KEY = isBuiltinProviderKey;
export const RUNTIME_PROVIDER_SELECTION_IS_EXTERNAL_KEY = isExternalProviderKey;
export const RUNTIME_PROVIDER_SELECTION_ASSERT_BACKED_CONSTRAINT = assertSelectionInputProviderBackedConstraint;
export const RUNTIME_PROVIDER_SYNTHETIC_PROVIDER_MARKER = SYNTHETIC_PROVIDER_MARKER;
export const RUNTIME_PROVIDER_IS_SYNTHETIC_PROVIDER_RESULT = isSyntheticProviderResult;

export const RUNTIME_PROVIDER_SCORING_MODES = SCORING_MODES;
export const RUNTIME_PROVIDER_BUILD_SCORING_STUB = buildScoringStub;
export const RUNTIME_PROVIDER_BUILD_SCORING_STUB_PROVIDER_RESERVED = buildScoringStubProviderReserved;
export const RUNTIME_PROVIDER_ASSERT_SCORING_STUB_CONTRACT = assertScoringStubContract;

export const RUNTIME_PROVIDER_SANDBOX_MODES = SANDBOX_MODES;
export const RUNTIME_PROVIDER_BUILD_SANDBOX_STUB = buildSandboxStub;
export const RUNTIME_PROVIDER_BUILD_SANDBOX_STUB_PROVIDER_RESERVED = buildSandboxStubProviderReserved;
export const RUNTIME_PROVIDER_ASSERT_SANDBOX_STUB_CONTRACT = assertSandboxStubContract;

export default {
  buildRuntimeProviderAdapterInput,
  buildRuntimeProviderAdapterResult,
  buildRuntimeProviderAdapterContractContext,
  buildRuntimeProviderSelection,
  buildRuntimeProviderTranscriptRef,
  RUNTIME_PROVIDER_ADAPTER_INPUT_VERSION: PROVIDER_ADAPTER_INPUT_VERSION,
  RUNTIME_PROVIDER_ADAPTER_OUTPUT_VERSION: PROVIDER_ADAPTER_OUTPUT_VERSION,
  RUNTIME_PROVIDER_ADAPTER_ALLOWED_STATUSES: [...DEFAULT_ALLOWED_PROVIDER_STATUSES],
  RUNTIME_PROVIDER_FAILURE_TAXONOMY_VERSION: PROVIDER_FAILURE_TAXONOMY_VERSION,
  RUNTIME_PROVIDER_FAILURE_STATUS_PRIORITY: [...PROVIDER_FAILURE_STATUS_PRIORITY],
  RUNTIME_PROVIDER_FAILURE_STATUS_ALLOWED_SET: [...PROVIDER_FAILURE_STATUS_ALLOWED_SET],
  RUNTIME_PROVIDER_FAILURE_STATUS_SEMANTICS: PROVIDER_FAILURE_STATUS_SEMANTICS,
  RUNTIME_PROVIDER_ADAPTER_TRANSCRIPT_REF_KIND: PROVIDER_ADAPTER_TRANSCRIPT_REF_KIND,
  RUNTIME_PROVIDER_ADAPTER_TRANSCRIPT_REF_VERSION: PROVIDER_ADAPTER_TRANSCRIPT_REF_VERSION,
  RUNTIME_PROVIDER_EXECUTION_IDENTITY_KIND: PROVIDER_EXECUTION_IDENTITY_KIND,
  RUNTIME_PROVIDER_EXECUTION_IDENTITY_VERSION: PROVIDER_EXECUTION_IDENTITY_VERSION,
  RUNTIME_PROVIDER_EXECUTION_IDENTITY_STATUS_SET: [...PROVIDER_EXECUTION_IDENTITY_STATUS_SET],
  RUNTIME_PROVIDER_PUBLIC_CASE_STATUS_SET: [...PROVIDER_PUBLIC_CASE_STATUS_SET],
  RUNTIME_PROVIDER_STATUS_COMPAT_BY_SEMANTIC_STATUS: Object.freeze(
    Object.fromEntries(
      Object.entries(PROVIDER_STATUS_COMPAT_BY_SEMANTIC_STATUS).map(([key, value]) => [key, [...value]]),
    ),
  ),
  RUNTIME_PROVIDER_EXECUTION_STATUS_TO_PUBLIC_CASE_STATUS: Object.freeze({
    ...PROVIDER_EXECUTION_STATUS_TO_PUBLIC_CASE_STATUS,
  }),
  RUNTIME_PROVIDER_EXECUTION_IDENTITY_STUB_EXPOSURE_ALLOWED_SEMANTIC_STATUS_SET: [
    ...PROVIDER_EXECUTION_IDENTITY_STUB_EXPOSURE_ALLOWED_SEMANTIC_STATUS_SET,
  ],
  RUNTIME_PROVIDER_RAW_RESPONSE_KIND: RAW_RESPONSE_KIND,
  RUNTIME_PROVIDER_RAW_RESPONSE_VERSION: RAW_RESPONSE_VERSION,
  RUNTIME_PROVIDER_RAW_RESPONSE_CAPTURE_MODES: [...RAW_RESPONSE_CAPTURE_MODES],
  RUNTIME_PROVIDER_RAW_RESPONSE_RESERVED_HANDLE_PREFIX: RAW_RESPONSE_RESERVED_HANDLE_PREFIX,
  RUNTIME_PROVIDER_RAW_RESPONSE_RESERVED_HANDLE_NOTE: RAW_RESPONSE_RESERVED_HANDLE_NOTE,
  RUNTIME_PROVIDER_TRANSCRIPT_REF_PERSISTENCE_MODES: [...TRANSCRIPT_REF_PERSISTENCE_MODES],
  RUNTIME_PROVIDER_TRANSCRIPT_REF_AVAILABILITY_MODES: [...TRANSCRIPT_REF_AVAILABILITY_MODES],
  RUNTIME_PROVIDER_TRANSCRIPT_REF_RESERVED_HANDLE_PREFIX: TRANSCRIPT_REF_RESERVED_HANDLE_PREFIX,
  RUNTIME_PROVIDER_TRANSCRIPT_REF_RESERVED_PERSISTENCE_NOTE: TRANSCRIPT_REF_RESERVED_PERSISTENCE_NOTE,
  RUNTIME_PROVIDER_ADAPTER_KEYS: [...BUILTIN_PROVIDER_ADAPTER_KEYS],
  RUNTIME_PROVIDER_ADAPTER_DEFAULT_SLOT: DEFAULT_PROVIDER_ADAPTER_SLOT,
  RUNTIME_PROVIDER_ADAPTER_RESERVED_STATUS_SET: [...RESERVED_PROVIDER_BACKED_STATUS_SET],
  RUNTIME_PROVIDER_ADAPTER_FUTURE_REQUIRED_FIELDS: [...FUTURE_PROVIDER_BACKED_REQUIRED_FIELDS],
  RUNTIME_PROVIDER_SELECTION_VERSION: PROVIDER_SELECTION_VERSION,
  RUNTIME_PROVIDER_SELECTION_PRESETS: Object.freeze(
    Object.fromEntries(
      Object.entries(BUILTIN_PROVIDER_SELECTION_PRESETS).map(([key, value]) => [key, { ...value }]),
    ),
  ),
  RUNTIME_PROVIDER_TRANSCRIPT_CAPTURE_MODES: [...TRANSCRIPT_CAPTURE_MODES],
  captureProviderTranscriptStub,
  assertTranscriptCaptureStubContract,
  RUNTIME_PROVIDER_SELECTION_INPUT_CONTRACT: PROVIDER_SELECTION_INPUT_CONTRACT,
  RUNTIME_PROVIDER_SELECTION_STABLE_PRESET_KEYS: [...PROVIDER_SELECTION_STABLE_PRESET_KEYS],
  RUNTIME_PROVIDER_SELECTION_IS_BUILTIN: isBuiltinProviderAdapterKey,
  RUNTIME_PROVIDER_SELECTION_CLASSIFY: classifyProviderAdapterKey,
  RUNTIME_PROVIDER_SELECTION_IS_BUILTIN_KEY: isBuiltinProviderKey,
  RUNTIME_PROVIDER_SELECTION_IS_EXTERNAL_KEY: isExternalProviderKey,
  RUNTIME_PROVIDER_SELECTION_ASSERT_BACKED_CONSTRAINT: assertSelectionInputProviderBackedConstraint,
  RUNTIME_PROVIDER_SYNTHETIC_PROVIDER_MARKER: SYNTHETIC_PROVIDER_MARKER,
  RUNTIME_PROVIDER_IS_SYNTHETIC_PROVIDER_RESULT: isSyntheticProviderResult,
  RUNTIME_PROVIDER_SCORING_MODES: SCORING_MODES,
  RUNTIME_PROVIDER_BUILD_SCORING_STUB: buildScoringStub,
  RUNTIME_PROVIDER_BUILD_SCORING_STUB_PROVIDER_RESERVED: buildScoringStubProviderReserved,
  RUNTIME_PROVIDER_ASSERT_SCORING_STUB_CONTRACT: assertScoringStubContract,
  RUNTIME_PROVIDER_SANDBOX_MODES: SANDBOX_MODES,
  RUNTIME_PROVIDER_BUILD_SANDBOX_STUB: buildSandboxStub,
  RUNTIME_PROVIDER_BUILD_SANDBOX_STUB_PROVIDER_RESERVED: buildSandboxStubProviderReserved,
  RUNTIME_PROVIDER_ASSERT_SANDBOX_STUB_CONTRACT: assertSandboxStubContract,
  RUNTIME_PROVIDER_CASE_MODES: CASE_MODES,
  RUNTIME_PROVIDER_BUILD_MULTI_CASE_STUB: buildMultiCaseStub,
  RUNTIME_PROVIDER_BUILD_MULTI_CASE_STUB_PROVIDER_RESERVED: buildMultiCaseStubProviderReserved,
  RUNTIME_PROVIDER_ASSERT_MULTI_CASE_STUB_CONTRACT: assertMultiCaseStubContract,
};
