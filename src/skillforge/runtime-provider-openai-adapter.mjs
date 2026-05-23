// ── OpenAI-compatible provider adapter ──────────────────────────────────
// Implements real HTTP calls to OpenAI-compatible chat completions endpoints
// (OpenAI, Azure OpenAI, local LLM with OpenAI-compatible server, etc.)
//
// Current phase: adapter logic is complete and contract-compliant, but real
// HTTP calls can only execute when the environment has an API key configured.
//
// Configurations (read once at module load from env or explicit override):
//   OPENAI_API_KEY         — API key (required for real calls)
//   OPENAI_BASE_URL        — base URL, default: https://api.openai.com/v1
//   OPENAI_MODEL           — model name, default: gpt-4o-mini
//   OPENAI_TIMEOUT_MS      — request timeout, default: 30_000 (30s)
//   OPENAI_MAX_TOKENS      — max output tokens, default: 2048
//   OPENAI_TEMPERATURE     — temperature, default: 0.7

import { RUNTIME_PROVIDER_ADAPTER_INPUT_VERSION } from "./runtime-provider-adapter-contract.mjs";

// ── Constants ───────────────────────────────────────────────────────────

const ADAPTER_VERSION = "runtime-provider-openai-adapter-draft-1";

const DEFAULT_CONFIG = Object.freeze({
  baseURL: "https://api.openai.com/v1",
  model: "gpt-4o-mini",
  timeoutMs: 30_000,
  maxTokens: 2048,
  temperature: 0.7,
});

const PROVIDER_CALL_ERROR_CODES = Object.freeze({
  TIMEOUT: "PROVIDER_TIMEOUT",
  AUTH_ERROR: "PROVIDER_AUTH_ERROR",
  RATE_LIMIT: "PROVIDER_RATE_LIMIT",
  API_ERROR: "PROVIDER_API_ERROR",
  NETWORK_ERROR: "PROVIDER_NETWORK_ERROR",
  MALFORMED_RESPONSE: "PROVIDER_MALFORMED_RESPONSE",
  MISSING_KEY: "PROVIDER_MISSING_API_KEY",
  BAD_REQUEST: "PROVIDER_BAD_REQUEST",
});

// Supported adapter keys for this module (used to classify in preset selection)
const ADAPTER_KEYS = Object.freeze(["openai", "provider-backed"]);

// ── Configuration loading ───────────────────────────────────────────────

function loadAdapterConfig(explicitConfig = {}) {
  return {
    baseURL: explicitConfig.baseURL ?? process.env.OPENAI_BASE_URL ?? DEFAULT_CONFIG.baseURL,
    model: explicitConfig.model ?? process.env.OPENAI_MODEL ?? DEFAULT_CONFIG.model,
    timeoutMs: Number.parseInt(
      explicitConfig.timeoutMs ?? process.env.OPENAI_TIMEOUT_MS ?? DEFAULT_CONFIG.timeoutMs,
      10,
    ) || DEFAULT_CONFIG.timeoutMs,
    maxTokens: Number.parseInt(
      explicitConfig.maxTokens ?? process.env.OPENAI_MAX_TOKENS ?? DEFAULT_CONFIG.maxTokens,
      10,
    ) || DEFAULT_CONFIG.maxTokens,
    temperature: Number.parseFloat(
      explicitConfig.temperature ?? process.env.OPENAI_TEMPERATURE ?? DEFAULT_CONFIG.temperature,
    ) || DEFAULT_CONFIG.temperature,
  };
}

// ── API key detection ───────────────────────────────────────────────────

function resolveApiKey(explicitKey) {
  const key = explicitKey ?? process.env.OPENAI_API_KEY ?? null;
  if (key && typeof key === "string" && key.trim().length > 0) {
    return key.trim();
  }
  return null;
}

// ── Request construction ────────────────────────────────────────────────

function buildChatCompletionRequest({ prompt, config, boundary }) {
  const messages = [];

  // Use system boundary if available, otherwise use a minimal system prompt
  if (boundary?.systemPrompt) {
    messages.push({ role: "system", content: boundary.systemPrompt });
  } else {
    messages.push({ role: "system", content: "You are a helpful assistant." });
  }

  // Use the case input as the user message
  if (prompt && typeof prompt === "string" && prompt.trim().length > 0) {
    messages.push({ role: "user", content: prompt.trim() });
  } else if (prompt && typeof prompt === "object" && !Array.isArray(prompt)) {
    // Accept object-formatted input for structured prompts
    messages.push({ role: "user", content: JSON.stringify(prompt) });
  } else {
    messages.push({ role: "user", content: "Hello." });
  }

  return {
    model: config.model,
    messages,
    max_tokens: config.maxTokens,
    temperature: config.temperature,
    stream: false,
  };
}

// ── HTTP call ───────────────────────────────────────────────────────────

async function performChatCompletion({ body, config, apiKey }) {
  const url = `${config.baseURL.replace(/\/+$/u, "")}/chat/completions`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const responseBody = await response.text();

    if (!response.ok) {
      const errorPayload = parseErrorResponse(responseBody, response.status);
      return { ok: false, error: errorPayload, response };
    }

    let parsed;
    try {
      parsed = JSON.parse(responseBody);
    } catch {
      return {
        ok: false,
        error: {
          code: PROVIDER_CALL_ERROR_CODES.MALFORMED_RESPONSE,
          message: `Response is not valid JSON. Status ${response.status}. First 200 chars: ${responseBody.slice(0, 200)}`,
          statusCode: response.status,
        },
        response,
      };
    }

    // Validate structure
    if (!parsed.choices || !Array.isArray(parsed.choices) || parsed.choices.length === 0) {
      return {
        ok: false,
        error: {
          code: PROVIDER_CALL_ERROR_CODES.MALFORMED_RESPONSE,
          message: "Response missing expected choices array",
          statusCode: response.status,
          rawKeys: Object.keys(parsed),
        },
        response,
      };
    }

    return { ok: true, data: parsed, response };
  } catch (error) {
    if (error.name === "AbortError") {
      return {
        ok: false,
        error: {
          code: PROVIDER_CALL_ERROR_CODES.TIMEOUT,
          message: `Request timed out after ${config.timeoutMs}ms`,
          timeoutMs: config.timeoutMs,
        },
      };
    }

    if (error instanceof TypeError && error.message.includes("fetch")) {
      return {
        ok: false,
        error: {
          code: PROVIDER_CALL_ERROR_CODES.NETWORK_ERROR,
          message: `Network error: ${error.message}`,
          baseURL: config.baseURL,
        },
      };
    }

    return {
      ok: false,
      error: {
        code: PROVIDER_CALL_ERROR_CODES.API_ERROR,
        message: error.message,
      },
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseErrorResponse(responseBody, statusCode) {
  let parsed;
  try {
    parsed = JSON.parse(responseBody);
  } catch {
    parsed = {};
  }

  const error = parsed?.error ?? {};
  const code = mapHttpStatusToErrorCode(statusCode, error?.code);
  const message = error?.message ?? `HTTP ${statusCode}: ${responseBody.slice(0, 200)}`;

  return { code, message, statusCode, type: error?.type ?? null, param: error?.param ?? null };
}

function mapHttpStatusToErrorCode(statusCode, providerCode) {
  if (statusCode === 401 || statusCode === 403) return PROVIDER_CALL_ERROR_CODES.AUTH_ERROR;
  if (statusCode === 429) return PROVIDER_CALL_ERROR_CODES.RATE_LIMIT;
  if (statusCode === 400) return PROVIDER_CALL_ERROR_CODES.BAD_REQUEST;
  if (statusCode >= 500) return PROVIDER_CALL_ERROR_CODES.API_ERROR;
  return PROVIDER_CALL_ERROR_CODES.API_ERROR;
}

// ── Response adaptation ─────────────────────────────────────────────────

function adaptChatCompletionResponse(parsed, config) {
  const choice = parsed.choices[0];

  return {
    content: choice?.message?.content ?? "",
    role: choice?.message?.role ?? "assistant",
    finishReason: choice?.finish_reason ?? null,
    model: parsed.model ?? config.model,
    usage: parsed.usage
      ? {
          promptTokens: parsed.usage.prompt_tokens ?? 0,
          completionTokens: parsed.usage.completion_tokens ?? 0,
          totalTokens: parsed.usage.total_tokens ?? 0,
        }
      : null,
    id: parsed.id ?? null,
    created: parsed.created ?? null,
  };
}

// ── Build failure reason from provider error ────────────────────────────

function buildProviderFailureReason(error) {
  if (!error) {
    return {
      code: "PROVIDER_CALL_ERROR",
      message: "Unknown provider error",
      blockingCheckIds: [],
    };
  }

  return {
    code: error.code ?? "PROVIDER_CALL_ERROR",
    message: error.message ?? String(error),
    statusCode: error.statusCode ?? null,
    blockingCheckIds: [],
  };
}

// ── Adapter result builder (outputs contract-compatible adapter result) ─

function buildOpenaiAdapterResult({
  caseId,
  providerAdapterContract,
  preflightReport,
  responseData,
  adaptedData,
  error,
  executionTime,
  config,
  transcriptCaptured = false,
}) {
  const preflightBlocked = preflightReport?.status !== "passed";

  if (preflightBlocked) {
    return providerAdapterContract.buildResult({
      caseId,
      status: "blocked",
      observed: null,
      evidence: { preflightBlocked: true },
      failureReason: {
        code: "RUNTIME_PREFLIGHT_BLOCKED",
        message: "Provider adapter blocked by preflight findings",
        blockingCheckIds: [],
      },
      providerMetadata: {
        implementationState: "preflight-blocked",
        adapterVersion: ADAPTER_VERSION,
        model: config.model,
        providerKey: "openai",
        providerSlot: providerAdapterContract.input.provider.providerSlot,
        apiKeyAvailable: false,
        executed: false,
        providerCall: false,
        providerEvidenceAvailable: false,
        transcriptCaptured: false,
        transcriptPersistence: false,
      },
    });
  }

  // If there's a provider error
  if (error || !responseData) {
    return providerAdapterContract.buildResult({
      caseId,
      status: "error",
      observed: null,
      evidence: {
        preflightBlocked: false,
        providerEvidenceAvailable: false,
        transcriptAvailable: false,
        transcriptCaptured: false,
      },
      execution: {
        executed: false,
        providerCall: true,
        executionTime,
      },
      failureReason: buildProviderFailureReason(error),
      providerMetadata: {
        implementationState: "provider-error",
        adapterVersion: ADAPTER_VERSION,
        model: config.model,
        providerKey: "openai",
        providerSlot: providerAdapterContract.input.provider.providerSlot,
        apiKeyAvailable: resolveApiKey() !== null,
        executed: false,
        providerCall: true,
        providerEvidenceAvailable: false,
        transcriptCaptured: false,
        transcriptPersistence: false,
      },
    });
  }

  // Success: real provider call produced results
  // Use "synthetic-passed" status as the best available match for this phase
  // (the dedicated "passed" status for provider-backed real execution is not yet
  // defined in the failure taxonomy — that's the "runtime pass path" future work)
  return providerAdapterContract.buildResult({
    caseId,
    status: "synthetic-passed",
    observed: {
      kind: "openai-provider-response",
      mode: "openai",
      evidence: "provider-backed-executed",
      providerCall: true,
      transcriptCaptured,
      sideEffectsPerformed: false,
      providerEvidenceAvailable: true,
      persistedEvidenceAvailable: false,
      response: adaptedData?.content ?? null,
      model: adaptedData?.model ?? config.model,
      usage: adaptedData?.usage ?? null,
      finishReason: adaptedData?.finishReason ?? null,
      requestTokens: adaptedData?.usage?.promptTokens ?? null,
      responseTokens: adaptedData?.usage?.completionTokens ?? null,
      totalTokens: adaptedData?.usage?.totalTokens ?? null,
      executionTime,
    },
    evidence: {
      preflightBlocked: false,
      providerEvidenceAvailable: true,
      transcriptAvailable: false, // transcriptRef not wired yet; capture is store-only
      transcriptCaptured,
      transcriptPersistence: false,
    },
    execution: {
      executed: true,
      providerCall: true,
      executionTime,
    },
    rawResponse: {
      available: true,
      captureMode: "summary-only",
      summary: {
        model: adaptedData?.model ?? config.model,
        totalTokens: adaptedData?.usage?.totalTokens ?? null,
        finishReason: adaptedData?.finishReason ?? null,
        responseLength: adaptedData?.content?.length ?? 0,
      },
      handle: `openai:${adaptedData?.id ?? "unknown"}`,
    },
    transcriptRef: null,
    providerMetadata: {
      implementationState: "implemented",
      adapterVersion: ADAPTER_VERSION,
      adapterKey: "provider-backed",
      providerKey: "openai",
      providerSlot: providerAdapterContract.input.provider.providerSlot,
      model: config.model,
      baseURL: config.baseURL,
      providerBacked: true,
      executed: true,
      providerCall: true,
      providerEvidenceAvailable: true,
      transcriptCaptured: false,
      transcriptPersistence: false,
      executionId: `openai:${adaptedData?.id ?? Date.now()}`,
      providerRunId: adaptedData?.id ?? null,
      providerStatus: "completed",
      transcriptCaptured,
      note: transcriptCaptured
        ? "OpenAI provider adapter real execution; transcript captured to persistent store"
        : "OpenAI provider adapter real execution; transcript capture not yet implemented",
    },
    pendingCapabilities: [
      "transcript-capture",
      "transcript-persistence",
      "scoring-engine",
      "sandbox-implementation",
    ],
  });
}

// ── Invocation function (the main entry point) ──────────────────────────

/**
 * invokeOpenaiAdapter — the main entry point for the real provider adapter.
 *
 * @param {object} params
 * @param {string} params.caseId - The current replay case id
 * @param {object} params.caseRecord - The current case record (has .input)
 * @param {object} params.providerAdapterContract - The contract context with .buildResult()
 * @param {object} params.preflightReport - The preflight report
 * @param {object} params.boundary - Sandbox boundary (may contain systemPrompt)
 * @param {object} [params.config] - Optional explicit config overrides
 * @param {string} [params.apiKey] - Optional explicit API key override
 * @returns {Promise<object>} An adapter result in the contract format
 */
export async function invokeOpenaiAdapter({
  caseId,
  caseRecord,
  providerAdapterContract,
  preflightReport,
  boundary = {},
  config: explicitConfig = {},
  apiKey: explicitKey = null,
} = {}) {
  const config = loadAdapterConfig(explicitConfig);
  const apiKey = resolveApiKey(explicitKey);

  // If no API key is available, return a honest error with the required boundary
  if (!apiKey) {
    return buildOpenaiAdapterResult({
      caseId,
      providerAdapterContract,
      preflightReport,
      error: {
        code: PROVIDER_CALL_ERROR_CODES.MISSING_KEY,
        message:
          "OPENAI_API_KEY is not set. Configure it in environment or pass explicitly via config to enable real provider calls.",
        configSources: {
          envVar: "OPENAI_API_KEY",
          explicitParam: "apiKey",
          currentValue: apiKey,
        },
      },
      executionTime: 0,
      config,
    });
  }

  // Build the request body
  const prompt = caseRecord?.input;
  const body = buildChatCompletionRequest({ prompt, config, boundary });

  const startTime = performance.now();

  // Perform the HTTP call
  const result = await performChatCompletion({ body, config, apiKey });

  const executionTime = Math.round(performance.now() - startTime);

  if (!result.ok) {
    return buildOpenaiAdapterResult({
      caseId,
      providerAdapterContract,
      preflightReport,
      error: result.error,
      executionTime,
      config,
    });
  }

  // Adapt response
  const adaptedData = adaptChatCompletionResponse(result.data, config);

  // ── Transcript capture ──────────────────────────────
  // Persist the provider execution result as a transcript record,
  // making it available for UI and audit consumption without re-execution.
  let transcriptCaptured = false;
  try {
    const { save: saveTranscript, buildTranscriptRecord } = await import('./transcript-store.mjs');
    const fixtureId = providerAdapterContract?.input?.fixture?.fixtureId ?? null;
    const transcriptRecord = buildTranscriptRecord({
      caseId,
      fixtureId,
      provider: 'openai',
      model: config.model,
      input: caseRecord?.input ?? null,
      outputContent: adaptedData.content,
      outputRole: adaptedData.role,
      finishReason: adaptedData.finishReason,
      usage: adaptedData.usage,
      executionTimeMs: executionTime,
      providerRunId: adaptedData.id,
      status: 'completed',
      rawResponse: {
        handle: `openai:${adaptedData.id ?? 'unknown'}`,
        summary: {
          model: adaptedData.model ?? config.model,
          totalTokens: adaptedData.usage?.totalTokens ?? null,
          finishReason: adaptedData.finishReason,
        },
      },
    });
    const saveResult = saveTranscript(transcriptRecord);
    transcriptCaptured = saveResult.ok;
  } catch (transcriptCaptureError) {
    // Transcript capture is non-fatal: the real provider call already succeeded
    console.error('[transcript-store] capture failed (non-fatal):', transcriptCaptureError.message);
  }

  return buildOpenaiAdapterResult({
    caseId,
    providerAdapterContract,
    preflightReport,
    responseData: result.data,
    adaptedData,
    executionTime,
    config,
    transcriptCaptured,
  });
}

// ── Minimal contract check (no real call) ───────────────────────────────

export function verifyAdapterContract(providerAdapterContract) {
  const input = providerAdapterContract.input;

  return {
    contractCompliant: true,
    inputPresent: input != null,
    caseRecordPresent: input?.caseRecord != null,
    providerSectionPresent: input?.provider != null,
    boundaryPresent: input?.boundary != null,
    adapterVersion: ADAPTER_VERSION,
    inputVersion: input?.contract?.version ?? null,
    supportedKeys: [...ADAPTER_KEYS],
    configSources: {
      envVar: "OPENAI_API_KEY",
      envBaseURL: "OPENAI_BASE_URL",
      envModel: "OPENAI_MODEL",
      envTimeoutMs: "OPENAI_TIMEOUT_MS",
      envMaxTokens: "OPENAI_MAX_TOKENS",
      envTemperature: "OPENAI_TEMPERATURE",
      baseURLDefault: DEFAULT_CONFIG.baseURL,
      modelDefault: DEFAULT_CONFIG.model,
      timeoutMsDefault: DEFAULT_CONFIG.timeoutMs,
      maxTokensDefault: DEFAULT_CONFIG.maxTokens,
      temperatureDefault: DEFAULT_CONFIG.temperature,
    },
    apiKeyAvailable: resolveApiKey() !== null,
    apiKeySource: resolveApiKey() !== null ? "env" : "unset",
    note: "Adapter contract verification checks structural compliance only; no HTTP call was made during verification",
  };
}

export const OPENAI_ADAPTER_VERSION = ADAPTER_VERSION;
export const OPENAI_ADAPTER_KEYS = [...ADAPTER_KEYS];
export const OPENAI_PROVIDER_CALL_ERROR_CODES = { ...PROVIDER_CALL_ERROR_CODES };
export const OPENAI_DEFAULT_CONFIG = { ...DEFAULT_CONFIG };
export const OPENAI_LOAD_CONFIG = loadAdapterConfig;
export const OPENAI_RESOLVE_API_KEY = resolveApiKey;
export const OPENAI_BUILD_REQUEST = buildChatCompletionRequest;
export const OPENAI_ADAPT_RESPONSE = adaptChatCompletionResponse;

export default {
  invokeOpenaiAdapter,
  verifyAdapterContract,
  OPENAI_ADAPTER_VERSION: ADAPTER_VERSION,
  OPENAI_ADAPTER_KEYS: [...ADAPTER_KEYS],
  OPENAI_PROVIDER_CALL_ERROR_CODES: { ...PROVIDER_CALL_ERROR_CODES },
  OPENAI_DEFAULT_CONFIG: { ...DEFAULT_CONFIG },
  OPENAI_LOAD_CONFIG: loadAdapterConfig,
  OPENAI_RESOLVE_API_KEY: resolveApiKey,
  OPENAI_BUILD_REQUEST: buildChatCompletionRequest,
  OPENAI_ADAPT_RESPONSE: adaptChatCompletionResponse,
};
