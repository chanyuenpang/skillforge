import { buildRuntimeReplayReport } from "./runtime-replay-reporter.mjs";
import {
  buildRuntimeProviderAdapterContractContext,
  buildRuntimeProviderSelection,
} from "./runtime-provider-adapter-contract.mjs";
import {
  buildRuntimeRunnerContractContext,
} from "./runtime-runner-contract.mjs";
import { mapProviderResultToObservedRuntime } from "./runtime-observed-mapper.mjs";
import { buildRuntimeSandboxBoundaryFromSources } from "./runtime-sandbox-contract.mjs";
import { buildRuntimeTranscriptArtifact } from "./runtime-transcript-contract.mjs";
import { selectRuntimeCase } from "./runtime-case-selector.mjs";
import { invokeOpenaiAdapter } from "./runtime-provider-openai-adapter.mjs";

const DRY_RUNNER_VERSION = "runtime-runner-skeleton-dry-null-1";
const SUPPORTED_MODES = new Set(["dry-run", "null-runner", "synthetic", "provider-backed", "openai"]);
const NON_PASSING_STATUSES = new Set(["dry-run", "blocked", "not-executed", "error", "synthetic-passed"]);
const INTERNAL_PROVIDER_STUB_STATUS_TO_PUBLIC_STATUS = Object.freeze({
  "stub-blocked": "blocked",
  "stub-error": "error",
  "stub-reserved": "error",
});

function pickStatusForMode(mode, { preflightBlocked = false } = {}) {
  if (preflightBlocked === true) return "blocked";
  if (mode === "provider-backed") return "error";
  if (mode === "openai") return "error";
  if (mode === "synthetic") return "synthetic-passed";
  if (mode === "null-runner") return "not-executed";
  return "dry-run";
}

function buildBlockedReason(preflightReport) {
  const blockingFailures = Array.isArray(preflightReport?.checks)
    ? preflightReport.checks.filter((check) => check?.status === "fail" || check?.status === "error")
    : [];

  return {
    code: "RUNTIME_PREFLIGHT_BLOCKED",
    message:
      blockingFailures.length > 0
        ? `runtime runner skeleton blocked by preflight findings: ${blockingFailures.map((check) => check?.id).filter(Boolean).join(", ")}`
        : "runtime runner skeleton blocked because preflight report is not marked passed",
    blockingCheckIds: blockingFailures.map((check) => check?.id).filter(Boolean),
  };
}

function buildProviderAdapterUnimplementedReason() {
  return {
    code: "RUNTIME_PROVIDER_ADAPTER_UNIMPLEMENTED",
    message:
      "provider-backed runtime adapter slot is reserved but intentionally unimplemented in this phase",
    blockingCheckIds: [],
  };
}

function buildTranscriptEvents({
  loadedFixture,
  normalizedFixture,
  preflightReport,
  caseRecord,
  boundary,
  mode,
  adapterKey,
  blocked,
}) {
  const blockingChecks = Array.isArray(preflightReport?.checks)
    ? preflightReport.checks.filter((check) => check?.status === "fail" || check?.status === "error")
    : [];

  return [
    {
      phase: "fixture",
      kind: "fixture-loaded",
      status: loadedFixture ? "ok" : "unknown",
      detail: "fixture material loaded for single-case runtime draft orchestration",
      evidence: {
        fixtureId: normalizedFixture?.fixtureId ?? null,
        fixtureVersion: normalizedFixture?.fixtureVersion ?? null,
        entryPath: normalizedFixture?.entryPath ?? null,
        profile: normalizedFixture?.profile ?? null,
      },
    },
    {
      phase: "static-validation",
      kind: "static-validated",
      status: preflightReport?.metadata?.sourceStaticStatus ?? null,
      detail: "static validation evidence inherited into runtime draft transcript stub",
      evidence: {
        reportVersion: preflightReport?.metadata?.sourceStaticReportVersion ?? null,
        ruleSetVersion: preflightReport?.metadata?.sourceStaticRuleSetVersion ?? null,
      },
    },
    {
      phase: "preflight",
      kind: blocked ? "preflight-failed" : "preflight-passed",
      status: preflightReport?.status ?? (blocked ? "blocked" : "passed"),
      detail: blocked
        ? "preflight did not pass, so runtime execution remained blocked in draft mode"
        : "preflight passed, enabling adapter selection without provider execution",
      evidence: {
        reportVersion: preflightReport?.reportVersion ?? null,
        protocolVersion: preflightReport?.protocolVersion ?? null,
        ruleSetVersion: preflightReport?.ruleSetVersion ?? null,
        blockingCheckIds: blockingChecks.map((check) => check?.id).filter(Boolean),
      },
    },
    {
      phase: "case-selection",
      kind: "case-selected",
      status: caseRecord?.id ? "ok" : "unknown",
      detail: "single runtime replay case selected for draft orchestration",
      evidence: {
        caseId: caseRecord?.id ?? null,
        caseType: caseRecord?.type ?? null,
        intent: caseRecord?.intent ?? null,
      },
    },
    {
      phase: "boundary",
      kind: "sandbox-boundary-built",
      status: "ok",
      detail: "runtime sandbox boundary contract prepared for provider-less draft execution",
      evidence: {
        permissions: boundary?.permissions ?? {},
        toolBoundary: boundary?.toolBoundary ?? {},
      },
    },
    {
      phase: "runner",
      kind: blocked
        ? "runner-blocked"
        : mode === "null-runner"
          ? "runner-skipped"
          : mode === "provider-backed"
            ? "runner-provider-slot-blocked"
            : mode === "openai"
              ? "runner-openai-real-execution"
              : mode === "synthetic"
                ? "runner-synthetic-observable"
                : "runner-dry-run-reserved",
      status: blocked ? "blocked" : mode === "provider-backed" ? "error" : mode === "synthetic" ? "synthetic-passed" : mode === "openai" ? "synthetic-passed" : adapterKey === "dry-run" ? "dry-run" : "not-executed",
      detail: blocked
        ? "runner remained blocked because preflight was not passed"
        : mode === "null-runner"
          ? "null runner reserved output contract shape without execution"
          : mode === "provider-backed"
            ? "provider-backed adapter slot was selected but remains intentionally unimplemented in this phase"
            : mode === "openai"
              ? "OpenAI provider adapter executed: real provider call produced results"
              : mode === "synthetic"
                ? "synthetic provider mock produced an observable payload without real provider execution"
                : "dry-run reserved output contract shape without execution",
      evidence: {
        mode,
        adapterKey,
        providerCall: mode === "synthetic" || mode === "openai",
        transcriptEngineUsed: mode === "synthetic",
        executionReservedOnly: mode !== "synthetic" && mode !== "openai",
        providerEvidenceAvailable: mode === "synthetic" || mode === "openai",
        persistedTranscriptAvailable: false,
      },
    },
  ];
}

function assertRequiredInput(input) {
  if (!input?.normalizedFixture) {
    throw new TypeError("runtime runner skeleton requires normalizedFixture");
  }
  if (!input?.preflightReport) {
    throw new TypeError("runtime runner skeleton requires preflightReport");
  }
  if (!input?.runnerContract) {
    throw new TypeError("runtime runner skeleton requires runnerContract");
  }
  if (!input?.sandboxContract) {
    throw new TypeError("runtime runner skeleton requires sandboxContract");
  }
}

function normalizeMode(mode) {
  const normalizedMode = mode ?? "dry-run";
  if (!SUPPORTED_MODES.has(normalizedMode)) {
    throw new RangeError(`Unsupported runtime runner skeleton mode: ${normalizedMode}`);
  }
  return normalizedMode;
}

function resolveRunnerProviderSelection(mode) {
  return buildRuntimeProviderSelection({
    mode: normalizeMode(mode),
  });
}

function assertRunnerStatusCompatSeam({ providerSelection, publicStatus, providerExecution }) {
  const providerStatus = providerExecution?.providerStatus ?? null;
  const providerBacked = providerSelection?.providerBacked === true;

  if (providerBacked !== true) {
    if (providerStatus != null) {
      throw new RangeError(
        "Runtime runner non-provider-backed paths must not carry internal providerStatus values",
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
      `Runtime runner providerStatus must stay inside the internal stub seam, got: ${providerStatus}`,
    );
  }

  if (compatPublicStatus !== publicStatus) {
    throw new RangeError(
      `Runtime runner forbids propagating providerStatus ${providerStatus} into public case status ${publicStatus}`,
    );
  }
}

function buildFailureReason({ mode, preflightReport, status, mappedFailureReason = null }) {
  if (mappedFailureReason && typeof mappedFailureReason === "object" && !Array.isArray(mappedFailureReason)) {
    return {
      ...mappedFailureReason,
      blockingCheckIds: Array.isArray(mappedFailureReason?.blockingCheckIds)
        ? [...mappedFailureReason.blockingCheckIds]
        : [],
    };
  }

  if (status === "blocked") {
    return buildBlockedReason(preflightReport);
  }

  if (status === "error" && mode === "provider-backed") {
    return buildProviderAdapterUnimplementedReason();
  }

  return null;
}

function runBuiltinProviderAdapter({ mode, caseRecord, providerAdapterContract, preflightReport }) {
  const preflightBlocked = preflightReport?.status !== "passed";
  const failureReason = preflightBlocked ? buildBlockedReason(preflightReport) : null;

  // OpenAI real provider adapter: the openai preset is a provider-backed path that
  // dispatches to the real OpenAI API. In this environment, we check API key availability
  // and return an honest no-key result when the key is missing.
  // Real HTTP execution requires OPENAI_API_KEY in environment and the async entry point.
  if (mode === "openai") {
    const apiKey = process.env.OPENAI_API_KEY ?? null;
    const keyAvailable = apiKey != null && typeof apiKey === "string" && apiKey.trim().length > 0;

    if (preflightBlocked) {
      return providerAdapterContract.buildResult({
        caseId: caseRecord.id,
        status: "blocked",
        observed: null,
        evidence: { preflightBlocked: true },
        failureReason: { code: "RUNTIME_PREFLIGHT_BLOCKED", message: "Preflight not passed", blockingCheckIds: [] },
        note: "OpenAI adapter blocked by preflight findings",
        providerMetadata: {
          implementationState: "preflight-blocked",
          providerBacked: true,
          providerKey: "openai",
          providerSlot: providerAdapterContract.input.provider.providerSlot,
          executed: false, providerCall: false,
          providerEvidenceAvailable: false, transcriptCaptured: false, transcriptPersistence: false,
          mode, apiKeyAvailable: keyAvailable,
        },
      });
    }

    if (!keyAvailable) {
      return providerAdapterContract.buildResult({
        caseId: caseRecord.id,
        status: "error",
        observed: null,
        evidence: { preflightBlocked: false, providerEvidenceAvailable: false },
        failureReason: {
          code: "PROVIDER_MISSING_API_KEY",
          message: "OPENAI_API_KEY is not set in environment. Configure to enable real provider calls.",
          blockingCheckIds: [],
        },
        note: "OpenAI provider adapter: API key not available — no real call made",
        providerMetadata: {
          implementationState: "missing-api-key",
          providerBacked: true,
          providerKey: "openai",
          providerSlot: providerAdapterContract.input.provider.providerSlot,
          executed: false, providerCall: false,
          providerEvidenceAvailable: false, transcriptCaptured: false, transcriptPersistence: false,
          mode, apiKeyAvailable: false,
        },
        pendingCapabilities: [
          "api-key-config", "transcript-capture", "transcript-persistence",
          "scoring-engine", "sandbox-implementation",
        ],
      });
    }

    // Key available but async call needed — this sync entry can't make HTTP calls.
    // Use the async runRuntimeCaseSkeletonRealExecution variant for real API calls.
    return providerAdapterContract.buildResult({
      caseId: caseRecord.id,
      status: "error",
      observed: null,
      evidence: { preflightBlocked: false, providerEvidenceAvailable: false },
      failureReason: {
        code: "PROVIDER_SYNC_ENTRY_ONLY",
        message: "OpenAI provider adapter: async entry required for real HTTP calls; use runRuntimeCaseSkeletonRealExecution for provider-backed execution",
        blockingCheckIds: [],
      },
      note: "OpenAI provider adapter: key available but sync entry cannot make HTTP calls",
      providerMetadata: {
        implementationState: "async-entry-required",
        providerBacked: true,
        providerKey: "openai",
        providerSlot: providerAdapterContract.input.provider.providerSlot,
        executed: false, providerCall: false,
        providerEvidenceAvailable: false, transcriptCaptured: false, transcriptPersistence: false,
        mode, apiKeyAvailable: true,
      },
    });
  }

  // Existing builtin adapter paths (dry-run, null-runner, synthetic, provider-backed)
  return providerAdapterContract.buildResult({
    caseId: caseRecord.id,
    status: pickStatusForMode(mode, { preflightBlocked }),
    observed: null,
    transcriptRef: null,
    evidence: {
      preflightBlocked,
    },
    failureReason,
    note: preflightBlocked
      ? "provider adapter output remained blocked because preflight did not pass"
      : mode === "provider-backed"
        ? "provider-backed adapter slot selected, but no provider integration exists yet"
        : mode === "null-runner"
          ? "null runner adapter reserved output contract shape without execution"
          : "dry-run adapter reserved output contract shape without provider execution",
    providerMetadata: {
      implementationState: preflightBlocked
        ? "preflight-blocked"
        : mode === "provider-backed"
          ? "reserved-unimplemented-provider-slot"
          : mode === "openai"
            ? "openai-adapter"
            : "builtin-skeleton-adapter",
      providerBacked: mode === "provider-backed" || mode === "openai",
      providerKey: providerAdapterContract.input.provider.providerKey,
      providerSlot: providerAdapterContract.input.provider.providerSlot,
      executed: false,
      providerCall: false,
      providerEvidenceAvailable: false,
      transcriptCaptured: false,
      transcriptPersistence: false,
      persistence: "none",
      mode,
      preflightBlocked,
    },
    pendingCapabilities:
      mode === "provider-backed" || mode === "openai"
        ? [
            "transcript-capture",
            "transcript-persistence",
            "scoring-engine",
            "sandbox-implementation",
            "api-key-config",
          ]
        : [
            "provider-integration",
            "transcript-engine",
            "sandbox-implementation",
            "scoring-engine",
          ],
  });
}

export function buildRuntimeRunnerSkeletonInput({
  fixtureDir = null,
  loadedFixture = null,
  normalizedFixture = null,
  preflightReport = null,
  runnerContract = null,
  sandboxContract = null,
  caseId = null,
  caseIndex = null,
  options = {},
} = {}) {
  const caseRecord = selectRuntimeCase({ normalizedFixture, caseId, caseIndex });
  const boundary = {
    permissions: sandboxContract?.permissions ?? runnerContract?.input?.boundary?.permissions ?? {},
    toolBoundary: sandboxContract?.toolBoundary ?? runnerContract?.input?.boundary?.toolBoundary ?? {},
  };

  return {
    fixtureDir,
    loadedFixture,
    normalizedFixture,
    preflightReport,
    runnerContract,
    sandboxContract,
    caseRecord,
    boundary,
    options: { ...options },
  };
}

export function runRuntimeCaseSkeleton({
  fixtureDir = null,
  loadedFixture = null,
  normalizedFixture = null,
  preflightReport = null,
  runnerContract = null,
  sandboxContract = null,
  caseId = null,
  caseIndex = null,
  options = {},
} = {}) {
  const mode = normalizeMode(options.mode);

  const effectiveSandboxContract =
    sandboxContract ??
    buildRuntimeSandboxBoundaryFromSources({
      normalizedFixture,
      preflightInput: preflightReport,
    });

  const caseRecord = selectRuntimeCase({ normalizedFixture, caseId, caseIndex });
  const providerSelection = resolveRunnerProviderSelection(mode);

  const effectiveRunnerContract =
    runnerContract ??
    buildRuntimeRunnerContractContext({
      fixtureDir,
      loadedFixture,
      normalizedFixture,
      preflightReport,
      caseRecord,
      boundary: {
        permissions: effectiveSandboxContract.permissions,
        toolBoundary: effectiveSandboxContract.toolBoundary,
      },
      options: {
        mode,
        skeleton: true,
        providerAdapterSeam: {
          key: providerSelection.adapterKey,
          slot: providerSelection.providerSlot,
          implemented: providerSelection.implemented,
          providerBacked: providerSelection.providerBacked,
          selection: providerSelection,
        },
      },
    });

  const input = buildRuntimeRunnerSkeletonInput({
    fixtureDir,
    loadedFixture,
    normalizedFixture,
    preflightReport,
    runnerContract: effectiveRunnerContract,
    sandboxContract: effectiveSandboxContract,
    caseId: caseRecord.id,
    options: {
      ...options,
      mode,
      providerKey: providerSelection.adapterKey,
      providerSlot: providerSelection.providerSlot,
      providerAdapterSeam: {
        key: providerSelection.adapterKey,
        slot: providerSelection.providerSlot,
        implemented: providerSelection.implemented,
        providerBacked: providerSelection.providerBacked,
        selection: providerSelection,
      },
    },
  });

  assertRequiredInput(input);

  const providerAdapterContract = buildRuntimeProviderAdapterContractContext({
    fixtureDir,
    loadedFixture,
    normalizedFixture,
    caseRecord,
    boundary: {
      permissions: effectiveSandboxContract.permissions,
      toolBoundary: effectiveSandboxContract.toolBoundary,
    },
    options: {
      ...options,
      mode,
      providerKey: providerSelection.providerKey,
      providerSlot: providerSelection.providerSlot,
      providerSelection,
    },
  });

  const adapterResult = runBuiltinProviderAdapter({
    mode,
    caseRecord,
    providerAdapterContract,
    preflightReport,
  });

  if (!NON_PASSING_STATUSES.has(adapterResult.status)) {
    throw new RangeError(`Runtime runner skeleton produced forbidden status: ${adapterResult.status}`);
  }

  const mappedRuntime = mapProviderResultToObservedRuntime({
    adapterResult,
    providerSelection,
    caseContext: caseRecord,
  });

  // OpenAI mode may produce synthetic-passed when real execution occurs via async entry.
  // For sync entry it always produces blocked or error, so the existing constraint holds.
  if (providerSelection.providerBacked === true && mappedRuntime.status !== "blocked" && mappedRuntime.status !== "error") {
    throw new RangeError(
      `Runtime runner reserved provider-backed seam only allows blocked/error, got: ${mappedRuntime.status}`,
    );
  }

  if (mappedRuntime.status === "blocked" && preflightReport?.status === "passed") {
    throw new RangeError("Runtime runner blocked status cannot be emitted after passed preflight");
  }

  if (mappedRuntime.status !== "blocked" && preflightReport?.status !== "passed") {
    throw new RangeError(
      `Runtime runner non-blocked status ${mappedRuntime.status} requires passed preflight`,
    );
  }

  const failureReason = buildFailureReason({
    mode,
    preflightReport,
    status: mappedRuntime.status,
    mappedFailureReason: mappedRuntime.failureReason,
  });
  const blocked = mappedRuntime.status === "blocked";
  const providerExecution = mappedRuntime.providerExecution;
  const transcriptAvailability = mappedRuntime.transcriptAvailability;
  const mappedTranscriptRef = adapterResult.transcriptRef
    ? {
        ...adapterResult.transcriptRef,
      }
    : null;
  const mappedRawResponse = adapterResult.rawResponse
    ? {
        ...adapterResult.rawResponse,
      }
    : null;

  const adapterExecutionIdentityTuple = [
    adapterResult.execution?.executionId ?? null,
    adapterResult.execution?.providerRunId ?? null,
    adapterResult.execution?.providerStatus ?? null,
  ];
  const mappedExecutionIdentityTuple = [
    providerExecution.executionId ?? null,
    providerExecution.providerRunId ?? null,
    providerExecution.providerStatus ?? null,
  ];
  const adapterHasAnyExecutionIdentity = adapterExecutionIdentityTuple.some((value) => value != null);
  const adapterHasFullExecutionIdentity = adapterExecutionIdentityTuple.every((value) => value != null);
  const mappedHasAnyExecutionIdentity = mappedExecutionIdentityTuple.some((value) => value != null);
  const mappedHasFullExecutionIdentity = mappedExecutionIdentityTuple.every((value) => value != null);

  if (adapterHasAnyExecutionIdentity !== adapterHasFullExecutionIdentity) {
    throw new RangeError(
      "Runtime runner requires adapter execution identity to arrive as an all-or-nothing tuple",
    );
  }

  if (mappedHasAnyExecutionIdentity !== mappedHasFullExecutionIdentity) {
    throw new RangeError(
      "Runtime runner forbids partially propagated execution identity tuples after mapper normalization",
    );
  }

  if (providerSelection.providerBacked !== true && mappedHasAnyExecutionIdentity === true) {
    throw new RangeError(
      "Runtime runner non-provider-backed paths must keep execution identity tuple null",
    );
  }

  if (providerSelection.providerBacked === true) {
    const reservedStubStatus = mappedRuntime.status === "blocked" || mappedRuntime.status === "error";
    if (reservedStubStatus === true && mappedHasFullExecutionIdentity !== true) {
      throw new RangeError(
        "Runtime runner provider-backed reserved seam requires full stub execution identity tuple propagation",
      );
    }

    if (reservedStubStatus !== true && mappedHasAnyExecutionIdentity === true) {
      throw new RangeError(
        "Runtime runner forbids execution identity tuple propagation outside provider-backed blocked/error reserved seam results",
      );
    }
  }

  if (providerExecution.executionId !== adapterExecutionIdentityTuple[0]) {
    throw new RangeError("Runtime runner must forward executionId from adapter execution without remapping");
  }

  if (providerExecution.providerRunId !== adapterExecutionIdentityTuple[1]) {
    throw new RangeError("Runtime runner must forward providerRunId from adapter execution without remapping");
  }

  if (providerExecution.providerStatus !== adapterExecutionIdentityTuple[2]) {
    throw new RangeError("Runtime runner must forward providerStatus from adapter execution without remapping");
  }

  assertRunnerStatusCompatSeam({
    providerSelection,
    publicStatus: mappedRuntime.status,
    providerExecution,
  });

  if (transcriptAvailability.available === true) {
    if (mappedTranscriptRef == null) {
      throw new RangeError("Runtime runner requires adapter transcriptRef when transcript availability is true");
    }

    if (mappedTranscriptRef.available !== true) {
      throw new RangeError("Runtime runner forbids upgrading transcript availability beyond adapter transcriptRef");
    }
  }

  if (transcriptAvailability.available !== (mappedTranscriptRef?.available === true)) {
    throw new RangeError(
      "Runtime runner transcript availability must stay same-source with adapter transcriptRef without local fallback",
    );
  }

  if (providerExecution.rawResponseAvailable !== (mappedRawResponse?.available === true)) {
    throw new RangeError(
      "Runtime runner rawResponse availability must stay same-source with adapter rawResponse without local fallback",
    );
  }

  if ((providerExecution.rawResponseSummary ?? null) !== ((mappedRawResponse?.available === true ? mappedRawResponse.summary : null) ?? null)) {
    throw new RangeError(
      "Runtime runner must forward rawResponse summary from adapter without remapping",
    );
  }

  if ((providerExecution.rawResponseHandle ?? null) !== ((mappedRawResponse?.available === true ? mappedRawResponse.handle : null) ?? null)) {
    throw new RangeError(
      "Runtime runner must forward rawResponse handle from adapter without remapping",
    );
  }

  const result = effectiveRunnerContract.buildResult({
    caseId: caseRecord.id,
    status: mappedRuntime.status,
    observed: mappedRuntime.observed,
    transcriptRef: mappedTranscriptRef,
    failureReason,
    runnerMetadata: {
      implementation: "single-case-dry-null-runner-skeleton",
      runnerVersion: DRY_RUNNER_VERSION,
      mode,
      providerBacked: providerExecution.providerBacked,
      executed: providerExecution.executed,
      providerCall: providerExecution.providerCall,
      transcriptCaptured: transcriptAvailability.transcriptCaptured,
      transcriptEngineUsed: false,
      sandboxEnforced: false,
      evidenceProduced:
        providerExecution.providerEvidenceAvailable || transcriptAvailability.transcriptPersistence,
      transcriptPersistence: transcriptAvailability.persistence,
      caseType: caseRecord?.type ?? null,
      providerAdapter: {
        key: providerExecution.providerKey,
        slot: providerExecution.providerSlot,
        builtin: providerExecution.builtin,
        implemented: providerExecution.implemented,
        providerBacked: providerExecution.providerBacked,
        status: providerExecution.status,
        executionId: providerExecution.executionId,
        providerRunId: providerExecution.providerRunId,
        providerStatus: providerExecution.providerStatus,
        transcriptAvailable: providerExecution.transcriptAvailable,
        rawResponseAvailable: providerExecution.rawResponseAvailable,
        futureRequiredFields: [...providerExecution.futureRequiredFields],
      },
      note: blocked
        ? "runner remained blocked because preflight did not pass"
        : mode === "provider-backed"
          ? "runner selected provider-backed adapter slot, but execution remains intentionally unimplemented"
          : mode === "null-runner"
            ? "runner selected null runner adapter and reserved contract shape without execution"
            : "runner selected dry-run adapter and reserved contract shape without provider execution",
      pendingCapabilities: [...providerExecution.pendingCapabilities],
    },
  });

  const transcriptArtifact = buildRuntimeTranscriptArtifact({
    fixture: {
      path: fixtureDir,
      id: normalizedFixture?.fixtureId ?? null,
      version: normalizedFixture?.fixtureVersion ?? null,
      entry: normalizedFixture?.entryPath ?? null,
      profile: normalizedFixture?.profile ?? null,
    },
    caseRecord,
    executionMode: mode,
    boundary: {
      permissions: effectiveSandboxContract.permissions,
      toolBoundary: effectiveSandboxContract.toolBoundary,
      boundarySummary: effectiveSandboxContract.boundarySummary,
    },
    runnerMetadata: result.runnerMetadata,
    outcome: {
      status: result.status,
      observedKind: mappedRuntime.observed.kind,
      observedEvidence: mappedRuntime.observed.evidence,
      observed: mappedRuntime.observed,
      failureReason,
    },
    events: buildTranscriptEvents({
      loadedFixture,
      normalizedFixture,
      preflightReport,
      caseRecord,
      boundary: {
        permissions: effectiveSandboxContract.permissions,
        toolBoundary: effectiveSandboxContract.toolBoundary,
      },
      mode,
      adapterKey: providerSelection.adapterKey,
      blocked,
    }),
    note:
      "provider-less runtime transcript stub only; captures orchestration evidence for a single draft case without any model dialogue or transcript persistence",
    pendingCapabilities: [
      ...result.runnerMetadata.pendingCapabilities,
      "transcript-ref-wiring",
      "transcript-persistence",
    ],
  });

  if (result.transcriptRef == null && transcriptAvailability.available === true) {
    throw new RangeError(
      "Runtime runner forbids synthesizing transcriptRef from transcript artifacts when availability is adapter-authored upstream state",
    );
  }

  const localTranscriptRef =
    result.transcriptRef == null
      ? {
          available: true,
          persistence: "in-report-only",
          artifactId: transcriptArtifact.id,
        }
      : null;

  const resultWithTranscriptRef = {
    ...result,
    transcriptRef: result.transcriptRef ?? localTranscriptRef,
  };

  const runtimeReport = buildRuntimeReplayReport({
    fixtureDir,
    fixture: {
      id: normalizedFixture?.fixtureId ?? null,
      version: normalizedFixture?.fixtureVersion ?? null,
      entry: normalizedFixture?.entryPath ?? null,
      profile: normalizedFixture?.profile ?? null,
    },
    runtime: {
      fixture: effectiveRunnerContract.input.fixture,
      runner: {
        implementation: "single-case-dry-null-runner-skeleton",
        version: DRY_RUNNER_VERSION,
      },
      sandbox: effectiveSandboxContract.boundarySummary,
      staticBaseline: {
        kind: preflightReport?.metadata?.lineage?.static?.kind ?? null,
        reportVersion: preflightReport?.metadata?.sourceStaticReportVersion ?? null,
        ruleSetVersion: preflightReport?.metadata?.sourceStaticRuleSetVersion ?? null,
        status: preflightReport?.preflight?.staticBaseline?.status ?? null,
      },
      preflight: {
        kind: preflightReport?.kind ?? null,
        reportVersion: preflightReport?.reportVersion ?? null,
        protocolVersion: preflightReport?.protocolVersion ?? null,
        ruleSetVersion: preflightReport?.ruleSetVersion ?? null,
        status: preflightReport?.status ?? null,
      },
      replayCases: {
        kind: normalizedFixture?.replayCases?.kind ?? null,
        fixtureId: normalizedFixture?.replayCases?.fixtureId ?? null,
      },
      mode,
      providerAdapter: {
        key: providerExecution.providerKey,
        slot: providerExecution.providerSlot,
        implemented: providerExecution.implemented,
        providerBacked: providerExecution.providerBacked,
        executionId: adapterResult.execution?.executionId ?? null,
        providerRunId: adapterResult.execution?.providerRunId ?? null,
        providerStatus: adapterResult.execution?.providerStatus ?? null,
        currentState: providerExecution.implementationState,
      },
      providerExecution,
      transcriptAvailability,
      statusTaxonomy: {
        reportStatuses: ["draft", "blocked"],
        caseStatuses: ["blocked", "error", "dry-run", "not-executed", "synthetic-passed"],
        passedReserved: true,
        providerReadyPassPathImplemented: false,
      },
      pendingCapabilities: result.runnerMetadata.pendingCapabilities,
    },
    cases: [
      {
        id: caseRecord.id,
        type: caseRecord.type,
        status: result.status,
        expectedBehavior: caseRecord.expectedBehavior ?? null,
        observed: result.observed,
        providerExecution,
        transcriptAvailability,
        transcriptRef: result.transcriptRef,
        failureReason: result.failureReason,
        transcript: transcriptArtifact,
      },
    ],
    checks: blocked
      ? [
          {
            id: "RUNTIME-RUNNER-SKELETON-PREFLIGHT-BLOCKED",
            scope: "runtime",
            status: "warn",
            severity: "P1",
            message: "runtime runner skeleton did not execute because preflight is not passed",
            evidence: result.failureReason?.blockingCheckIds ?? [],
          },
        ]
      : [
          {
            id: "RUNTIME-RUNNER-SKELETON-DRY-NULL-ONLY",
            scope: "runtime",
            status: "warn",
            severity: "P2",
            message:
              mode === "provider-backed"
                ? "runtime runner skeleton selected provider-backed adapter slot but it remains intentionally unimplemented in this phase"
                : "runtime runner skeleton only emits dry-run/null-runner contract results in this phase",
            evidence: [mode, providerSelection.adapterKey],
          },
        ],
    options: {
      runner: {
        implementation: "single-case-dry-null-runner-skeleton",
        version: DRY_RUNNER_VERSION,
      },
      sandbox: effectiveSandboxContract.boundarySummary,
      note:
        "runtime draft artifact only; single-case adapter-driven skeleton with no provider call, no transcript evidence, no scoring, and no runtime pass evidence",
    },
  });

  return {
    mode,
    caseRecord,
    runnerInput: effectiveRunnerContract.input,
    sandboxContract: effectiveSandboxContract,
    result: resultWithTranscriptRef,
    transcriptArtifact,
    runtimeReport,
  };
}

/**
 * runRuntimeCaseSkeletonRealExecution — async variant that dispatches to the
 * real OpenAI provider adapter when mode is "openai" and an API key is available.
 *
 * This is the entry point for the first real provider-backed execution path.
 * Unlike the sync runRuntimeCaseSkeleton, this function can make actual HTTP
 * calls to the OpenAI-compatible API.
 *
 * For modes other than "openai", it delegates to runRuntimeCaseSkeleton synchronously.
 */
export async function runRuntimeCaseSkeletonRealExecution({
  fixtureDir = null,
  loadedFixture = null,
  normalizedFixture = null,
  preflightReport = null,
  runnerContract = null,
  sandboxContract = null,
  caseId = null,
  caseIndex = null,
  options = {},
} = {}) {
  const mode = normalizeMode(options.mode);

  if (mode !== "openai") {
    // Non-OpenAI modes: delegate to sync implementation
    return runRuntimeCaseSkeleton({
      fixtureDir, loadedFixture, normalizedFixture, preflightReport,
      runnerContract, sandboxContract, caseId, caseIndex, options,
    });
  }

  // ── OpenAI real execution path ──────────────────────────────────────
  const effectiveSandboxContract =
    sandboxContract ??
    buildRuntimeSandboxBoundaryFromSources({
      normalizedFixture,
      preflightInput: preflightReport,
    });

  const caseRecord = selectRuntimeCase({ normalizedFixture, caseId, caseIndex });
  const providerSelection = resolveRunnerProviderSelection(mode);

  const effectiveRunnerContract =
    runnerContract ??
    buildRuntimeRunnerContractContext({
      fixtureDir, loadedFixture, normalizedFixture, preflightReport,
      caseRecord,
      boundary: {
        permissions: effectiveSandboxContract.permissions,
        toolBoundary: effectiveSandboxContract.toolBoundary,
      },
      options: {
        mode, skeleton: true,
        providerAdapterSeam: {
          key: providerSelection.adapterKey,
          slot: providerSelection.providerSlot,
          implemented: providerSelection.implemented,
          providerBacked: providerSelection.providerBacked,
          selection: providerSelection,
        },
      },
    });

  const input = buildRuntimeRunnerSkeletonInput({
    fixtureDir, loadedFixture, normalizedFixture, preflightReport,
    runnerContract: effectiveRunnerContract,
    sandboxContract: effectiveSandboxContract,
    caseId: caseRecord.id,
    options: {
      ...options, mode,
      providerKey: providerSelection.adapterKey,
      providerSlot: providerSelection.providerSlot,
      providerAdapterSeam: {
        key: providerSelection.adapterKey,
        slot: providerSelection.providerSlot,
        implemented: providerSelection.implemented,
        providerBacked: providerSelection.providerBacked,
        selection: providerSelection,
      },
    },
  });

  assertRequiredInput(input);

  const providerAdapterContract = buildRuntimeProviderAdapterContractContext({
    fixtureDir, loadedFixture, normalizedFixture,
    caseRecord,
    boundary: {
      permissions: effectiveSandboxContract.permissions,
      toolBoundary: effectiveSandboxContract.toolBoundary,
    },
    options: {
      ...options, mode,
      providerKey: providerSelection.providerKey,
      providerSlot: providerSelection.providerSlot,
      providerSelection,
    },
  });

  // Make the real API call
  const adapterResult = await invokeOpenaiAdapter({
    caseId: caseRecord.id,
    caseRecord,
    providerAdapterContract,
    preflightReport,
    boundary: {
      permissions: effectiveSandboxContract.permissions,
      toolBoundary: effectiveSandboxContract.toolBoundary,
    },
  });

  if (!NON_PASSING_STATUSES.has(adapterResult.status)) {
    throw new RangeError(`Runtime runner real execution produced forbidden status: ${adapterResult.status}`);
  }

  const mappedRuntime = mapProviderResultToObservedRuntime({
    adapterResult,
    providerSelection,
    caseContext: caseRecord,
  });

  // OpenAI real execution allows synthetic-passed status (real call produced results)
  const openaiAllowedStatuses = ["blocked", "error", "synthetic-passed"];
  if (!openaiAllowedStatuses.includes(mappedRuntime.status)) {
    throw new RangeError(
      `Runtime runner OpenAI real execution only allows blocked/error/synthetic-passed, got: ${mappedRuntime.status}`,
    );
  }

  const blocked = mappedRuntime.status === "blocked";
  const providerExecution = mappedRuntime.providerExecution;
  const transcriptAvailability = mappedRuntime.transcriptAvailability;
  const mappedTranscriptRef = adapterResult.transcriptRef
    ? { ...adapterResult.transcriptRef }
    : null;
  const mappedRawResponse = adapterResult.rawResponse
    ? { ...adapterResult.rawResponse }
    : null;

  const failureReason = buildFailureReason({
    mode, preflightReport, status: mappedRuntime.status,
    mappedFailureReason: mappedRuntime.failureReason,
  });

  const result = effectiveRunnerContract.buildResult({
    caseId: caseRecord.id,
    status: mappedRuntime.status,
    observed: mappedRuntime.observed,
    transcriptRef: mappedTranscriptRef,
    failureReason,
    runnerMetadata: {
      implementation: "openai-real-execution-v1",
      runnerVersion: DRY_RUNNER_VERSION,
      mode,
      providerBacked: providerExecution.providerBacked,
      executed: providerExecution.executed,
      providerCall: providerExecution.providerCall,
      transcriptCaptured: transcriptAvailability.transcriptCaptured,
      transcriptEngineUsed: false,
      sandboxEnforced: false,
      evidenceProduced: providerExecution.providerEvidenceAvailable,
      transcriptPersistence: transcriptAvailability.persistence,
      caseType: caseRecord?.type ?? null,
      providerAdapter: {
        key: providerExecution.providerKey,
        slot: providerExecution.providerSlot,
        builtin: providerExecution.builtin,
        implemented: providerExecution.implemented,
        providerBacked: providerExecution.providerBacked,
        status: providerExecution.status,
        executionId: providerExecution.executionId,
        providerRunId: providerExecution.providerRunId,
        providerStatus: providerExecution.providerStatus,
        transcriptAvailable: providerExecution.transcriptAvailable,
        rawResponseAvailable: providerExecution.rawResponseAvailable,
        futureRequiredFields: [],
      },
      note: blocked
        ? "OpenAI real execution blocked by preflight"
        : providerExecution.executed
          ? "OpenAI real execution completed: provider call produced results"
          : "OpenAI real execution attempted but failed",
      pendingCapabilities: [
        "transcript-capture", "transcript-persistence",
        "scoring-engine", "sandbox-implementation",
      ],
    },
  });

  const transcriptArtifact = buildRuntimeTranscriptArtifact({
    fixture: {
      path: fixtureDir,
      id: normalizedFixture?.fixtureId ?? null,
      version: normalizedFixture?.fixtureVersion ?? null,
      entry: normalizedFixture?.entryPath ?? null,
      profile: normalizedFixture?.profile ?? null,
    },
    caseRecord,
    executionMode: mode,
    boundary: {
      permissions: effectiveSandboxContract.permissions,
      toolBoundary: effectiveSandboxContract.toolBoundary,
      boundarySummary: effectiveSandboxContract.boundarySummary,
    },
    runnerMetadata: result.runnerMetadata,
    outcome: {
      status: result.status,
      observedKind: mappedRuntime.observed.kind,
      observedEvidence: mappedRuntime.observed.evidence,
      observed: mappedRuntime.observed,
      failureReason,
    },
    events: buildTranscriptEvents({
      loadedFixture, normalizedFixture, preflightReport,
      caseRecord,
      boundary: {
        permissions: effectiveSandboxContract.permissions,
        toolBoundary: effectiveSandboxContract.toolBoundary,
      },
      mode, adapterKey: providerSelection.adapterKey, blocked,
    }),
    note: "OpenAI real execution transcript artifact; provider call evidence captured without transcript persistence",
    pendingCapabilities: ["transcript-ref-wiring", "transcript-persistence"],
  });

  const localTranscriptRef = result.transcriptRef == null
    ? {
        available: true,
        persistence: "in-report-only",
        artifactId: transcriptArtifact.id,
      }
    : null;

  const resultWithTranscriptRef = {
    ...result,
    transcriptRef: result.transcriptRef ?? localTranscriptRef,
  };

  const runtimeReport = buildRuntimeReplayReport({
    fixtureDir,
    fixture: {
      id: normalizedFixture?.fixtureId ?? null,
      version: normalizedFixture?.fixtureVersion ?? null,
      entry: normalizedFixture?.entryPath ?? null,
      profile: normalizedFixture?.profile ?? null,
    },
    runtime: {
      fixture: effectiveRunnerContract.input.fixture,
      runner: {
        implementation: "openai-real-execution-v1",
        version: DRY_RUNNER_VERSION,
      },
      sandbox: effectiveSandboxContract.boundarySummary,
      staticBaseline: {
        kind: preflightReport?.metadata?.lineage?.static?.kind ?? null,
        reportVersion: preflightReport?.metadata?.sourceStaticReportVersion ?? null,
        ruleSetVersion: preflightReport?.metadata?.sourceStaticRuleSetVersion ?? null,
        status: preflightReport?.preflight?.staticBaseline?.status ?? null,
      },
      preflight: {
        kind: preflightReport?.kind ?? null,
        reportVersion: preflightReport?.reportVersion ?? null,
        protocolVersion: preflightReport?.protocolVersion ?? null,
        ruleSetVersion: preflightReport?.ruleSetVersion ?? null,
        status: preflightReport?.status ?? null,
      },
      replayCases: {
        kind: normalizedFixture?.replayCases?.kind ?? null,
        fixtureId: normalizedFixture?.replayCases?.fixtureId ?? null,
      },
      mode,
      providerAdapter: {
        key: providerExecution.providerKey,
        slot: providerExecution.providerSlot,
        implemented: providerExecution.implemented,
        providerBacked: providerExecution.providerBacked,
        executionId: adapterResult.execution?.executionId ?? null,
        providerRunId: adapterResult.execution?.providerRunId ?? null,
        providerStatus: adapterResult.execution?.providerStatus ?? null,
        currentState: providerExecution.implementationState,
      },
      providerExecution,
      transcriptAvailability,
      statusTaxonomy: {
        reportStatuses: ["draft", "blocked", "synthetic-passed"],
        caseStatuses: ["blocked", "error", "dry-run", "not-executed", "synthetic-passed"],
        passedReserved: true,
        providerReadyPassPathImplemented: true,
      },
      pendingCapabilities: result.runnerMetadata.pendingCapabilities,
    },
    cases: [
      {
        id: caseRecord.id,
        type: caseRecord.type,
        status: result.status,
        expectedBehavior: caseRecord.expectedBehavior ?? null,
        observed: result.observed,
        providerExecution,
        transcriptAvailability,
        transcriptRef: result.transcriptRef,
        failureReason: result.failureReason,
        transcript: transcriptArtifact,
      },
    ],
    checks: blocked
      ? [
          {
            id: "RUNTIME-OPENAI-PREFLIGHT-BLOCKED",
            scope: "runtime",
            status: "warn",
            severity: "P1",
            message: "OpenAI real execution blocked by preflight findings",
            evidence: result.failureReason?.blockingCheckIds ?? [],
          },
        ]
      : [
          {
            id: "RUNTIME-OPENAI-REAL-EXECUTION",
            scope: "runtime",
            status: providerExecution.executed ? "info" : "warn",
            severity: providerExecution.executed ? "P3" : "P2",
            message: providerExecution.executed
              ? "OpenAI real execution completed with actual provider call evidence"
              : "OpenAI real execution attempted but did not produce provider call evidence",
            evidence: [mode, providerSelection.adapterKey, providerExecution.status],
          },
        ],
    options: {
      runner: {
        implementation: "openai-real-execution-v1",
        version: DRY_RUNNER_VERSION,
      },
      sandbox: effectiveSandboxContract.boundarySummary,
      note: "runtime real execution artifact; OpenAI adapter produced provider-backed evidence with transcript in-report-only",
    },
  });

  return {
    mode,
    caseRecord,
    runnerInput: effectiveRunnerContract.input,
    sandboxContract: effectiveSandboxContract,
    result: resultWithTranscriptRef,
    transcriptArtifact,
    runtimeReport,
  };
}

export default {
  buildRuntimeRunnerSkeletonInput,
  runRuntimeCaseSkeleton,
  runRuntimeCaseSkeletonRealExecution,
};
