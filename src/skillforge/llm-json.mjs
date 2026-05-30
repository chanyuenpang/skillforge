import { getProviderConfig } from './provider-config.mjs';

const DEFAULT_TIMEOUT_MS = 90000;

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function stripCodeFence(text = '') {
  const trimmed = String(text).trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

function repairTruncatedJSON(jsonText) {
  let repaired = String(jsonText || '').trim();
  repaired = repaired.replace(/^[^{[]*/, '').replace(/[^}\]]*$/, (tail) => tail.includes('{') || tail.includes('[') ? tail : '');
  repaired = repaired.replace(/,(\s*[}\]])/g, '$1');

  const counts = { '{': 0, '}': 0, '[': 0, ']': 0 };
  let inString = false;
  let prev = '';
  for (const ch of repaired) {
    if (ch === '"' && prev !== '\\') inString = !inString;
    if (!inString && Object.prototype.hasOwnProperty.call(counts, ch)) counts[ch] += 1;
    prev = ch;
  }

  if (inString) {
    const lastQuote = repaired.lastIndexOf('"');
    if (lastQuote > 0) repaired = repaired.slice(0, lastQuote);
  }

  repaired = repaired.replace(/,\s*$/, '');

  const missingArrays = counts['['] - counts[']'];
  const missingObjects = counts['{'] - counts['}'];
  for (let i = 0; i < missingArrays; i += 1) repaired += ']';
  for (let i = 0; i < missingObjects; i += 1) repaired += '}';
  return repaired;
}

export function parseJsonResponse(rawText) {
  const text = stripCodeFence(rawText);
  try {
    return JSON.parse(text);
  } catch {
    return JSON.parse(repairTruncatedJSON(text));
  }
}

export class ModelInvocationError extends Error {
  constructor(message, { code = 'MODEL_INVOCATION_FAILED', meta = {}, cause = null } = {}) {
    super(message);
    this.name = 'ModelInvocationError';
    this.code = code;
    this.meta = meta;
    if (cause) this.cause = cause;
  }
}

export async function callJsonModel({
  systemPrompt,
  userPrompt,
  maxTokens = 4096,
  temperature = 0.2,
  stage = 'llm_json',
} = {}) {
  const meta = {
    stage,
    llmCalled: false,
    provider: null,
    model: null,
    endpoint: null,
    rawSnippet: null,
    warnings: [],
    errors: [],
  };

  let providerConfig;
  try {
    providerConfig = await getProviderConfig();
  } catch (error) {
    meta.errors.push(`provider_config_failed:${error.message}`);
    throw new ModelInvocationError('failed to load provider config', {
      code: 'PROVIDER_CONFIG_FAILED',
      meta,
      cause: error,
    });
  }

  const { endpoint, apiKey, llm, baseUrl } = providerConfig || {};
  meta.model = llm?.model || 'unknown';
  meta.provider = baseUrl || endpoint || 'unknown';
  meta.endpoint = endpoint || null;

  if (!hasText(apiKey) || !hasText(endpoint)) {
    meta.errors.push('missing_provider_credentials');
    throw new ModelInvocationError('missing provider credentials', {
      code: 'MISSING_PROVIDER_CREDENTIALS',
      meta,
    });
  }

  const body = {
    model: llm?.model || 'deepseek-chat',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature,
    max_tokens: maxTokens,
    response_format: { type: 'json_object' },
  };

  const timeoutMs = Number(process.env.SKILLFORGE_LLM_TIMEOUT_MS || process.env.OPENAI_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(new Error(`request timed out after ${timeoutMs}ms`)), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    meta.llmCalled = true;

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      meta.errors.push(`http_${response.status}:${errorText.slice(0, 200)}`);
      throw new ModelInvocationError(`provider returned HTTP ${response.status}`, {
        code: 'HTTP_ERROR',
        meta,
      });
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    meta.rawSnippet = hasText(content) ? content.slice(0, 240) : null;

    if (!hasText(content)) {
      meta.errors.push('empty_model_response');
      throw new ModelInvocationError('model returned an empty response', {
        code: 'EMPTY_MODEL_RESPONSE',
        meta,
      });
    }

    let data;
    try {
      data = parseJsonResponse(content);
    } catch (error) {
      meta.errors.push(`invalid_json_response:${error.message}`);
      throw new ModelInvocationError('model returned invalid JSON', {
        code: 'INVALID_JSON_RESPONSE',
        meta,
        cause: error,
      });
    }
    return { ok: true, data, meta };
  } catch (error) {
    if (error instanceof ModelInvocationError) throw error;
    if (error?.name === 'AbortError') {
      meta.errors.push(`timeout:${timeoutMs}`);
      throw new ModelInvocationError(`model request timed out after ${timeoutMs}ms`, {
        code: 'MODEL_TIMEOUT',
        meta,
        cause: error,
      });
    }
    meta.errors.push(`fetch_failed:${error.message}`);
    throw new ModelInvocationError('model request failed', {
      code: 'MODEL_FETCH_FAILED',
      meta,
      cause: error,
    });
  } finally {
    clearTimeout(timeoutHandle);
  }
}

export default {
  callJsonModel,
  parseJsonResponse,
};
