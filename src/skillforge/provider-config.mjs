import { promises as fs } from 'node:fs';
import path from 'node:path';

const DEFAULT_MODEL = 'deepseek-chat';
const DEEPSEEK_PROVIDER_KEYS = ['DeepSeek', 'deepseek'];
const OPENAI_PROVIDER_KEYS = ['OpenAI', 'openai'];

function hasText(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function getProviderModel(provider = {}) {
  const modelIds = Array.isArray(provider.models)
    ? provider.models.map((item) => item?.id).filter(hasText)
    : [];
  if (modelIds.length > 0) return modelIds[0];
  if (hasText(provider?.model)) return provider.model;
  return null;
}

async function loadJsonConfig(configPath) {
  try {
    const raw = await fs.readFile(configPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function mergeProviderMaps(baseProviders = {}, overrideProviders = {}) {
  const merged = { ...baseProviders };
  for (const [key, value] of Object.entries(overrideProviders || {})) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      merged[key] = value;
      continue;
    }
    merged[key] = {
      ...(baseProviders?.[key] || {}),
      ...value,
    };
  }
  return merged;
}

function mergeConfigs(baseConfig = {}, overrideConfig = {}) {
  return {
    ...baseConfig,
    ...overrideConfig,
    models: {
      ...(baseConfig.models || {}),
      ...(overrideConfig.models || {}),
      providers: mergeProviderMaps(
        baseConfig?.models?.providers || {},
        overrideConfig?.models?.providers || {},
      ),
    },
  };
}

async function loadOpenClawConfig() {
  const homeConfigPath = path.join(process.env.HOME || '', '.openclaw', 'openclaw.json');
  const repoConfigPath = path.resolve('.skillforge', 'openclaw.json');
  const homeConfig = await loadJsonConfig(homeConfigPath);
  const repoConfig = await loadJsonConfig(repoConfigPath);
  return mergeConfigs(homeConfig, repoConfig);
}

function pickModel(config = {}) {
  const providers = config?.models?.providers;

  for (const providerKey of [...DEEPSEEK_PROVIDER_KEYS, ...OPENAI_PROVIDER_KEYS]) {
    const provider = providers?.[providerKey];
    if (!provider) continue;
    const model = getProviderModel(provider);
    if (hasText(model)) return model;
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
  const openaiProvider = OPENAI_PROVIDER_KEYS.map((k) => providers?.[k]).find(Boolean) ?? null;

  const openaiEnvActive = hasText(process.env.OPENAI_API_KEY) || hasText(process.env.OPENAI_BASE_URL);
  const deepseekEnvActive = hasText(process.env.DEEPSEEK_API_KEY) || hasText(process.env.DEEPSEEK_BASE_URL);
  const openaiConfigHasKey = hasText(openaiProvider?.apiKey);
  const deepseekConfigHasKey = hasText(deepseekProvider?.apiKey);
  const openaiConfigActive = openaiConfigHasKey || hasText(openaiProvider?.baseURL) || hasText(openaiProvider?.baseUrl) || hasText(getProviderModel(openaiProvider));
  const deepseekConfigActive = deepseekConfigHasKey || hasText(deepseekProvider?.baseURL) || hasText(deepseekProvider?.baseUrl) || hasText(getProviderModel(deepseekProvider));

  const selectedProvider = openaiEnvActive
    ? openaiProvider
    : deepseekEnvActive
      ? deepseekProvider
      : openaiConfigHasKey
        ? openaiProvider
        : deepseekConfigHasKey
          ? deepseekProvider
          : openaiConfigActive
            ? openaiProvider
            : deepseekConfigActive
              ? deepseekProvider
              : (openaiProvider || deepseekProvider);

  const envApiKey = openaiEnvActive
    ? process.env.OPENAI_API_KEY || null
    : deepseekEnvActive
      ? process.env.DEEPSEEK_API_KEY || null
      : process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY || null;
  const envBaseUrl = openaiEnvActive
    ? process.env.OPENAI_BASE_URL || null
    : deepseekEnvActive
      ? process.env.DEEPSEEK_BASE_URL || null
      : process.env.OPENAI_BASE_URL || process.env.DEEPSEEK_BASE_URL || null;

  const configApiKey = selectedProvider?.apiKey || null;
  const configBaseUrl = selectedProvider?.baseURL || selectedProvider?.baseUrl || null;

  const apiKey = envApiKey || configApiKey;
  const baseUrl = envBaseUrl || configBaseUrl || 'https://api.deepseek.com/v1';
  const endpoint = `${String(baseUrl).replace(/\/+$/, '')}/chat/completions`;
  const model = getProviderModel(selectedProvider) || pickModel(config);

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
