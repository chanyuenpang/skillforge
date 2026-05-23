// --- Synthetic provider for end-to-end pipeline testing ---
// Returns deterministic responses without real provider calls.
// Current phase: synthetic is for pipeline validation only, NOT real execution.

export const SYNTHETIC_PROVIDER_MARKER = "synthetic-provider";

export function buildSyntheticProviderResult(options = {}) {
  const {
    adapterKey = "synthetic-test",
    status = "synthetic-passed",
    observed = { response: "synthetic mock response", tokens: 42 },
    executionTime = 100,
    providerMetadata = { model: "synthetic-model-v1", region: "synthetic" }
  } = options;

  return {
    kind: "provider-result",
    version: "0.1.0-synthetic",
    synthetic: true,
    providerCall: true,
    executed: true,
    status,
    observed,
    executionTime,
    providerMetadata,
    // Reserved seam fields - honest conservative values
    rawResponse: {
      kind: "synthetic-raw-response",
      version: "0.1.0",
      available: false,
      captureMode: "none",
      summary: null,
      handle: null,
      note: "synthetic: raw response not captured"
    },
    transcriptRef: {
      available: false,
      persistence: "none",
      transcriptPersistence: false,
      handle: null,
      note: "synthetic: transcript not captured"
    },
    executionIdentity: {
      executionId: `synthetic-${Date.now()}`,
      providerRunId: null,
      providerStatus: status,
      note: "synthetic: execution identity is simulated"
    },
    transcriptCaptured: false,
    scoring: {
      scored: false,
      scoringMode: "none",
      score: null,
      note: "synthetic: scoring not performed"
    },
    sandbox: {
      enforced: false,
      sandboxMode: "none",
      note: "synthetic: sandbox not enforced"
    },
    multiCase: {
      caseMode: "single",
      caseCount: 1,
      note: "synthetic: single case only"
    }
  };
}

export function isSyntheticProviderResult(result) {
  return result && result.synthetic === true && result.kind === "provider-result";
}

export function assertSyntheticProviderContract(result) {
  if (!result || typeof result !== "object") {
    throw new Error("synthetic: result must be an object");
  }
  if (!result.synthetic) {
    throw new Error("synthetic: result must have synthetic=true marker");
  }
  if (result.providerCall !== true) {
    throw new Error("synthetic: providerCall must be true");
  }
  if (result.executed !== true) {
    throw new Error("synthetic: executed must be true");
  }
}
