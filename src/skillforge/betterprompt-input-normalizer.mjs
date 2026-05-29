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

  return { apiKey, endpoint };
}

function sanitizeJsonText(text) {
  return String(text || '')
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```/, '')
    .replace(/```$/, '')
    .trim();
}

function uniqStrings(arr = []) {
  const out = [];
  for (const item of Array.isArray(arr) ? arr : []) {
    if (!hasText(item)) continue;
    const t = item.trim();
    if (!out.includes(t)) out.push(t);
  }
  return out;
}

function normalizeType(type, rawText) {
  const text = `${type || ''} ${rawText || ''}`.toLowerCase();
  if (/(review|审查|评审|复盘|reasoning|推理|分析)/.test(text)) return 'analysis';
  if (/(spawn|subagent|子任务|派发|执行)/.test(text)) return 'implementation';
  if (/(plan|规划|拆解|里程碑)/.test(text)) return 'planning';
  return hasText(type) ? type.trim() : 'implementation';
}

function buildFallback(rawText) {
  const text = String(rawText || '').trim();
  return {
    version: 'betterprompt-input-v1',
    task: {
      goal: text || '完成任务',
      type: normalizeType('', text),
      success_criteria: ['输出可执行结果并说明关键依据'],
    },
    context: {
      project: 'workflow-kit',
      facts: text ? [text] : [],
    },
    skills: {
      candidates: ['coding-agent-workflow', 'task-planning', 'prompt-design'],
      bundle_refs: [],
    },
    constraints: {
      hard: [],
      soft: ['优先最小变更', '保持可审计输出'],
      output_format: 'markdown',
      risk_level: 'medium',
    },
    runtime: {
      language: 'zh-CN',
    },
  };
}

export async function normalizeBetterPromptInput(rawText) {
  if (!hasText(rawText)) {
    throw new Error('normalizeBetterPromptInput 需要非空自然语言文本');
  }

  const config = await loadOpenClawConfig();
  const model = pickModel(config);
  const providerConfig = resolveProviderConfig(config);

  if (!providerConfig?.apiKey) {
    return buildFallback(rawText);
  }

  const extractionPrompt = `你是 BetterPrompt 输入归一化器。\n将用户自然语言任务提取为严格 JSON，仅输出 JSON，不要 markdown，不要解释。\n\n目标结构：\n{\n  "task": {\n    "goal": "string",\n    "type": "implementation|analysis|planning|debugging|other",\n    "success_criteria": ["string"]\n  },\n  "context": {\n    "project": "string",\n    "facts": ["string"]\n  },\n  "constraints": {\n    "hard": ["string"],\n    "soft": ["string"],\n    "output_format": "string",\n    "risk_level": "low|medium|high"\n  }\n}\n\n要求：\n1) 只提取能从文本推断出的信息，不要幻想。\n2) 未出现的字段给合理默认：\n   - output_format=\"markdown\"\n   - risk_level=\"medium\"\n   - task.type=\"implementation\"\n3) success_criteria 至少 1 条。\n4) facts/constraints 去重，保持简洁。\n\n输入文本：\n${rawText}`;

  const resp = await fetch(providerConfig.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${providerConfig.apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      messages: [
        { role: 'system', content: '你是结构化信息抽取器。仅输出 JSON。' },
        { role: 'user', content: extractionPrompt },
      ],
    }),
  });

  if (!resp.ok) {
    return buildFallback(rawText);
  }

  const data = await resp.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!hasText(text)) {
    return buildFallback(rawText);
  }

  let parsed;
  try {
    parsed = JSON.parse(sanitizeJsonText(text));
  } catch {
    return buildFallback(rawText);
  }

  const fallback = buildFallback(rawText);
  const out = {
    version: 'betterprompt-input-v1',
    task: {
      goal: hasText(parsed?.task?.goal) ? parsed.task.goal.trim() : fallback.task.goal,
      type: normalizeType(parsed?.task?.type, rawText),
      success_criteria: uniqStrings(parsed?.task?.success_criteria).slice(0, 8),
    },
    context: {
      project: hasText(parsed?.context?.project) ? parsed.context.project.trim() : fallback.context.project,
      facts: uniqStrings(parsed?.context?.facts).slice(0, 20),
    },
    skills: fallback.skills,
    constraints: {
      hard: uniqStrings(parsed?.constraints?.hard).slice(0, 20),
      soft: uniqStrings(parsed?.constraints?.soft).slice(0, 20),
      output_format: hasText(parsed?.constraints?.output_format)
        ? parsed.constraints.output_format.trim().toLowerCase()
        : 'markdown',
      risk_level: ['low', 'medium', 'high'].includes(String(parsed?.constraints?.risk_level || '').toLowerCase())
        ? String(parsed.constraints.risk_level).toLowerCase()
        : 'medium',
    },
    runtime: fallback.runtime,
  };

  if (out.task.success_criteria.length === 0) {
    out.task.success_criteria = fallback.task.success_criteria;
  }
  if (out.context.facts.length === 0) {
    out.context.facts = fallback.context.facts;
  }

  return out;
}

export default normalizeBetterPromptInput;
