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

function pickModel(config) {
  const providers = config?.models?.providers;

  for (const providerKey of DEEPSEEK_PROVIDER_KEYS) {
    const provider = providers?.[providerKey];
    if (!provider) continue;

    const modelIds = Array.isArray(provider.models)
      ? provider.models.map((item) => item?.id).filter(hasText)
      : [];

    if (modelIds.length > 0) {
      return modelIds[0];
    }

    if (hasText(provider?.model)) {
      return provider.model;
    }
  }

  const candidates = [
    config?.model,
    config?.default_model,
    config?.llm?.model,
    config?.providers?.deepseek?.model,
    DEFAULT_MODEL
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

  return {
    apiKey,
    endpoint
  };
}

async function callTaggerLlm({ prompt, model, providerConfig }) {
  const endpoint = providerConfig?.endpoint;
  const apiKey = providerConfig?.apiKey;
  if (!apiKey) {
    throw new Error('MISSING_API_KEY');
  }

  const body = {
    model,
    messages: [
      { role: 'system', content: '你是标签选择助手。仅输出 JSON。' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.1
  };

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    throw new Error(`LLM_HTTP_${resp.status}`);
  }

  const data = await resp.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!hasText(text)) throw new Error('LLM_EMPTY_RESPONSE');

  const jsonText = text.trim().replace(/^```json\s*/i, '').replace(/^```/, '').replace(/```$/, '').trim();
  return JSON.parse(jsonText);
}

function extractValidTagIds(result, allowedTagIds) {
  const tags = Array.isArray(result) ? result : [];
  const uniq = [];
  for (const t of tags) {
    if (typeof t === 'string' && allowedTagIds.has(t) && !uniq.includes(t)) {
      uniq.push(t);
    }
  }
  return uniq.slice(0, 5);
}

async function generateTags(prompt, tagSchema) {
  const allowedTagIds = new Set((tagSchema?.tags || []).map((t) => t.id));
  const config = await loadOpenClawConfig();
  const model = pickModel(config);
  const providerConfig = resolveProviderConfig(config);

  const llmPrompt = `${prompt}\n\n输出格式要求：仅输出 JSON 对象，格式为 {"tags":["tag-id-1","tag-id-2"]}，不要 markdown，不要解释。`;
  const result = await callTaggerLlm({ prompt: llmPrompt, model, providerConfig });

  return extractValidTagIds(result?.tags, allowedTagIds);
}

export async function generateSkillTags(skillMdContent, tagSchema) {
  const prompt = `已知可用的 tag 定义如下：\n${JSON.stringify(tagSchema?.tags || [])}\n\n分析以下技能内容，从可用 tag 中选择最匹配的 3-5 个，只返回 tag id 的 JSON 数组。不要解释。\n\n${skillMdContent}`;
  return generateTags(prompt, tagSchema);
}

export async function generatePromptTags(taskGoal, context, tagSchema) {
  const prompt = `已知 tag 定义：${JSON.stringify(tagSchema?.tags || [])}\n\n分析以下任务目标，选择最匹配的 3-5 个 tag，只返回 tag id 的 JSON 数组。不要解释。\n任务：${taskGoal}\n\n上下文：${context || ''}`;
  return generateTags(prompt, tagSchema);
}
