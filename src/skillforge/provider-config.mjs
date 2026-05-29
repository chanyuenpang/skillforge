import { promises as fs } from 'node:fs';
import path from 'node:path';

const DEFAULT_MODEL = 'deepseek-chat';
const DEEPSEEK_PROVIDER_KEYS = ['DeepSeek', 'deepseek'];

function hasText(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

async function loadOpenClawConfig() {
  const configPath = path.join(process.env.HOME || '', '.openclaw', 'openclaw.json');
  try {
    const raw = await fs.readFile(configPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function pickModel(config = {}) {
  const providers = config?.models?.providers;

  for (const providerKey of DEEPSEEK_PROVIDER_KEYS) {
    const provider = providers?.[providerKey];
    if (!provider) continue;

    const modelIds = Array.isArray(provider.models)
      ? provider.models.map((item) => item?.id).filter(hasText)
      : [];

    if (modelIds.length > 0) return modelIds[0];
    if (hasText(provider?.model)) return provider.model;
  }

  const candidates = [
    config?.model,
    config?.default_model,
    config?.llm?.model,
    config?.providers?.deepseek?.model,
    DEFAULT_MODEL,
  ];
  return candidates.find(hasText) || DEFAULT_MODEL;
}

function resolveProviderConfig(config = {}) {
  const providers = config?.models?.providers ?? {};
  const deepseekProvider = DEEPSEEK_PROVIDER_KEYS.map((k) => providers?.[k]).find(Boolean) ?? null;

  const envApiKey = process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY || null;
  const envBaseUrl = process.env.OPENAI_BASE_URL || process.env.DEEPSEEK_BASE_URL || null;

  const configApiKey = deepseekProvider?.apiKey || null;
  const configBaseUrl = deepseekProvider?.baseURL || deepseekProvider?.baseUrl || null;

  const apiKey = envApiKey || configApiKey;
  const baseUrl = envBaseUrl || configBaseUrl || 'https://api.deepseek.com/v1';
  const endpoint = `${String(baseUrl).replace(/\/+$/, '')}/chat/completions`;
  const model = pickModel(config);

  return {
    apiKey,
    endpoint,
    llm: { model },
    baseUrl,
  };
}

export async function getProviderConfig() {
  const config = await loadOpenClawConfig();
  return resolveProviderConfig(config);
}

export default getProviderConfig;
