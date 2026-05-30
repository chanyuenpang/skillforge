import { promises as fs } from 'node:fs';
import path from 'node:path';

const DEFAULT_MODEL = 'deepseek-chat';
const DEEPSEEK_PROVIDER_KEYS = ['DeepSeek', 'deepseek'];
const OPENAI_PROVIDER_KEYS = ['OpenAI', 'openai'];
const ZHIPU_PROVIDER_KEYS = ['zhipu', 'Zhipu'];

function hasText(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function getProviderModel(provider = {}) {
  if (!provider || typeof provider !== 'object') return null;
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
  const forcedProvider = hasText(process.env.SKILLFORGE_PROVIDER) ? process.env.SKILLFORGE_PROVIDER.trim() : '';
  const forcedModel = hasText(process.env.SKILLFORGE_MODEL) ? process.env.SKILLFORGE_MODEL.trim() : '';

  if (hasText(forcedModel)) return forcedModel;

  if (hasText(forcedProvider)) {
    const provider = providers?.[forcedProvider];
    const model = getProviderModel(provider);
    if (hasText(model)) return model;
  }

  for (const providerKey of [...DEEPSEEK_PROVIDER_KEYS, ...OPENAI_PROVIDER_KEYS, ...ZHIPU_PROVIDER_KEYS]) {
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
  const zhipuProvider = ZHIPU_PROVIDER_KEYS.map((k) => providers?.[k]).find(Boolean) ?? null;
  const forcedProvider = hasText(process.env.SKILLFORGE_PROVIDER) ? process.env.SKILLFORGE_PROVIDER.trim() : '';
  const forcedModel = hasText(process.env.SKILLFORGE_MODEL) ? process.env.SKILLFORGE_MODEL.trim() : '';

  const openaiEnvActive = hasText(process.env.OPENAI_API_KEY) || hasText(process.env.OPENAI_BASE_URL);
  const deepseekEnvActive = hasText(process.env.DEEPSEEK_API_KEY) || hasText(process.env.DEEPSEEK_BASE_URL);
  const zhipuEnvActive = hasText(process.env.ZHIPU_API_KEY) || hasText(process.env.ZHIPU_BASE_URL);
  const openaiConfigHasKey = hasText(openaiProvider?.apiKey);
  const deepseekConfigHasKey = hasText(deepseekProvider?.apiKey);
  const zhipuConfigHasKey = hasText(zhipuProvider?.apiKey);
  const openaiConfigActive = openaiConfigHasKey || hasText(openaiProvider?.baseURL) || hasText(openaiProvider?.baseUrl) || hasText(getProviderModel(openaiProvider));
  const deepseekConfigActive = deepseekConfigHasKey || hasText(deepseekProvider?.baseURL) || hasText(deepseekProvider?.baseUrl) || hasText(getProviderModel(deepseekProvider));
  const zhipuConfigActive = zhipuConfigHasKey || hasText(zhipuProvider?.baseURL) || hasText(zhipuProvider?.baseUrl) || hasText(getProviderModel(zhipuProvider));

  const providerByName = {
    OpenAI: openaiProvider,
    openai: openaiProvider,
    DeepSeek: deepseekProvider,
    deepseek: deepseekProvider,
    zhipu: zhipuProvider,
    Zhipu: zhipuProvider,
  };

  const selectedProvider = hasText(forcedProvider) && providerByName[forcedProvider]
    ? providerByName[forcedProvider]
    : openaiEnvActive
      ? openaiProvider
      : deepseekEnvActive
        ? deepseekProvider
        : zhipuEnvActive
          ? zhipuProvider
          : openaiConfigHasKey
            ? openaiProvider
            : deepseekConfigHasKey
              ? deepseekProvider
              : zhipuConfigHasKey
                ? zhipuProvider
                : openaiConfigActive
                  ? openaiProvider
                  : deepseekConfigActive
                    ? deepseekProvider
                    : zhipuConfigActive
                      ? zhipuProvider
                      : (openaiProvider || deepseekProvider || zhipuProvider);

  const envApiKey = openaiEnvActive
    ? process.env.OPENAI_API_KEY || null
    : deepseekEnvActive
      ? process.env.DEEPSEEK_API_KEY || null
      : zhipuEnvActive
        ? process.env.ZHIPU_API_KEY || null
        : process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.ZHIPU_API_KEY || null;
  const envBaseUrl = openaiEnvActive
    ? process.env.OPENAI_BASE_URL || null
    : deepseekEnvActive
      ? process.env.DEEPSEEK_BASE_URL || null
      : zhipuEnvActive
        ? process.env.ZHIPU_BASE_URL || null
        : process.env.OPENAI_BASE_URL || process.env.DEEPSEEK_BASE_URL || process.env.ZHIPU_BASE_URL || null;

  const configApiKey = selectedProvider?.apiKey || null;
  const configBaseUrl = selectedProvider?.baseURL || selectedProvider?.baseUrl || null;

  const apiKey = envApiKey || configApiKey;
  const baseUrl = envBaseUrl || configBaseUrl || 'https://api.deepseek.com/v1';
  const endpoint = `${String(baseUrl).replace(/\/+$/, '')}/chat/completions`;
  const model = forcedModel || getProviderModel(selectedProvider) || pickModel(config);

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

export { resolveProviderConfig, pickModel };

export default getProviderConfig;
