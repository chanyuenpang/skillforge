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

    if (modelIds.length > 0) return modelIds[0];
    if (hasText(provider?.model)) return provider.model;
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

  return { apiKey, endpoint };
}

const FALLBACK_RESEARCH_DEBUG_TAGS = ['research-analysis', 'debugging'];

function normalizeExtracted(raw = {}) {
  const tags = Array.isArray(raw.tags) ? raw.tags.filter(hasText).map((x) => x.trim()) : [];
  const goal = hasText(raw.goal) ? raw.goal.trim() : '';

  const lowerSignals = [
    goal,
    hasText(raw.type) ? raw.type.trim().toLowerCase() : '',
    ...(
      Array.isArray(raw?.success_criteria)
        ? raw.success_criteria.filter(hasText).map((x) => x.trim())
        : []
    ),
    ...(Array.isArray(raw?.constraints?.hard) ? raw.constraints.hard.filter(hasText).map((x) => x.trim()) : []),
    ...(Array.isArray(raw?.constraints?.soft) ? raw.constraints.soft.filter(hasText).map((x) => x.trim()) : []),
    ...(Array.isArray(raw?.context?.facts) ? raw.context.facts.filter(hasText).map((x) => x.trim()) : []),
  ].join(' ').toLowerCase();

  const looksLikeResearchDebug = /调研|只读|研究|分析|根因|报错|错误|排查|排障|故障|debug|debugging|troubleshoot|root\s*-?cause|error|exception/.test(lowerSignals);
  const finalTags = tags.length > 0 ? tags : (looksLikeResearchDebug ? FALLBACK_RESEARCH_DEBUG_TAGS : []);

  return {
    tags: finalTags,
    goal: hasText(raw.goal) ? raw.goal.trim() : '',
    type: hasText(raw.type) ? raw.type.trim().toLowerCase() : 'general',
    success_criteria: Array.isArray(raw.success_criteria) ? raw.success_criteria.filter(hasText).map((x) => x.trim()) : [],
    constraints: {
      hard: Array.isArray(raw?.constraints?.hard) ? raw.constraints.hard.filter(hasText).map((x) => x.trim()) : [],
      soft: Array.isArray(raw?.constraints?.soft) ? raw.constraints.soft.filter(hasText).map((x) => x.trim()) : []
    },
    context: {
      project: hasText(raw?.context?.project) ? raw.context.project.trim() : 'unknown',
      facts: Array.isArray(raw?.context?.facts) ? raw.context.facts.filter(hasText).map((x) => x.trim()) : []
    },
    risk_level: hasText(raw.risk_level) ? raw.risk_level.trim().toLowerCase() : 'medium'
  };
}

export async function extractTaskFromRawInput(rawText) {
  if (!hasText(rawText)) {
    throw new Error('rawText 不能为空');
  }

  const config = await loadOpenClawConfig();
  const model = pickModel(config);
  const providerConfig = resolveProviderConfig(config);

  if (!providerConfig.apiKey) {
    throw new Error('MISSING_API_KEY');
  }

  const tagSchema = await import('./tag-schema.json', { with: { type: 'json' } });
  const prompt = `已知可用的 tag 定义如下：
${JSON.stringify(tagSchema?.default?.tags || [])}

分析以下任务描述。
最重要的：从可用 tag 中选择最匹配的 3-5 个 tag id。
其次：提取核心目标 goal。
如果原文有约束或验收标准，尽力提取；没有就空着。

任务描述：
${rawText.slice(0, 12000)}

严格返回 JSON（只输出 JSON，不要额外文字）：
{
  "tags": ["tag-id"],
  "goal": "核心目标",
  "type": "general",
  "constraints": { "hard": [], "soft": [] },
  "success_criteria": [],
  "context": { "project": "unknown", "facts": [] },
  "risk_level": "medium"
}`;

  const resp = await fetch(providerConfig.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${providerConfig.apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: '你是严谨的任务信息抽取助手。只输出 JSON。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1
    })
  });

  if (!resp.ok) throw new Error(`LLM_HTTP_${resp.status}`);

  const data = await resp.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!hasText(text)) throw new Error('LLM_EMPTY_RESPONSE');

  const jsonText = text.trim().replace(/^```json\s*/i, '').replace(/^```/, '').replace(/```$/, '').trim();
  const parsed = JSON.parse(jsonText);
  return normalizeExtracted(parsed);
}

export default extractTaskFromRawInput;
