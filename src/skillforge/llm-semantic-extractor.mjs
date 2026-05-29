import { promises as fs } from 'node:fs';
import path from 'node:path';

const DEFAULT_MODEL = 'deepseek-chat';
const DEEPSEEK_PROVIDER_KEYS = ['DeepSeek', 'deepseek'];
const MIN_SUMMARY_LEN = 12;
const MIN_CAPABILITIES = 2;
const MIN_CONSTRAINTS = 1;
const MIN_INTENT = 1;

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

function parseSections(content = '') {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const sections = [];
  let current = null;

  for (const line of lines) {
    const m = line.match(/^(#{1,6})\s+(.+)$/);
    if (m) {
      if (current) sections.push(current);
      current = { heading: m[2].trim(), level: m[1].length, body: [] };
      continue;
    }
    if (!current) {
      current = { heading: 'root', level: 0, body: [] };
    }
    current.body.push(line);
  }
  if (current) sections.push(current);
  return sections.map((s) => ({ ...s, text: s.body.join('\n').trim() }));
}

function fallbackExtract(content = '', skillName = '') {
  const sections = parseSections(content);
  const summary = (sections.find((s) => s.level > 0 && hasText(s.text))?.text || content)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 220);

  return {
    summary: summary || `${skillName} skill`,
    capabilities: [],
    constraints: [],
    intent: [],
    confidence: 0.35,
    extractor: 'rules-fallback'
  };
}

function normalizeTag(value = '', skillName = '') {
  const source = hasText(value) ? value : skillName;
  const tag = String(source || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
    .slice(0, 80);
  return tag || 'untagged';
}

function normalizeIntent(intent = [], skillName = '') {
  const cleaned = (Array.isArray(intent) ? intent : [])
    .filter(hasText)
    .map((x) => x.trim().toLowerCase())
    .filter((x) => !/^(intent|意图|todo|tbd|none|null|n\/a|unknown|misc|other|通用|其它)$/.test(x))
    .slice(0, 8);

  return cleaned;
}

function guardSemanticOutput(semantic, fallback, { skillName = '', sourceSkillRef = '' } = {}) {
  const output = {
    summary: hasText(semantic?.summary) ? semantic.summary.trim().slice(0, 300) : fallback.summary,
    capabilities: Array.isArray(semantic?.capabilities)
      ? semantic.capabilities.filter(hasText).map((x) => x.trim().slice(0, 200)).slice(0, 8)
      : fallback.capabilities,
    constraints: Array.isArray(semantic?.constraints)
      ? semantic.constraints.filter(hasText).map((x) => x.trim().slice(0, 200)).slice(0, 8)
      : fallback.constraints,
    intent: normalizeIntent(semantic?.intent, skillName),
    confidence: typeof semantic?.confidence === 'number' ? Math.max(0, Math.min(1, semantic.confidence)) : fallback.confidence,
    extractor: hasText(semantic?.extractor) ? semantic.extractor : fallback.extractor,
    source_skill_ref: hasText(semantic?.source_skill_ref) ? String(semantic.source_skill_ref).trim() : sourceSkillRef,
    normalized_tag: normalizeTag(semantic?.normalized_tag, skillName)
  };

  const qualityGatePassed =
    hasText(output.summary) &&
    output.summary.length >= MIN_SUMMARY_LEN &&
    output.capabilities.length > 0 &&
    output.constraints.length > 0 &&
    output.intent.length > 0;

  if (!qualityGatePassed) {
    output.summary = fallback.summary;
    output.capabilities = fallback.capabilities;
    output.constraints = fallback.constraints;
    output.intent = normalizeIntent(fallback.intent, skillName);
    output.confidence = Math.min(output.confidence, 0.5);
    output.extractor = 'rules-fallback:quality-gated';
    output.source_skill_ref = sourceSkillRef;
    output.normalized_tag = normalizeTag(skillName || sourceSkillRef);
  }

  return {
    ...output,
    quality: {
      passed: qualityGatePassed,
      minSummaryLen: MIN_SUMMARY_LEN,
      minCapabilities: 1,
      minConstraints: 1,
      minIntent: 1
    }
  };
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

async function extractByLlm({ content, skillName, model, providerConfig }) {
  const endpoint = providerConfig?.endpoint;
  const apiKey = providerConfig?.apiKey;
  if (!apiKey) {
    throw new Error('MISSING_API_KEY');
  }

  const prompt = `你是技能语义抽取器。请从 SKILL.md 中理解、提炼并生成语义对象。\n只输出 JSON，不要解释，不要套模板，不要把程序化规则当作主导。\n\n输出必须包含这些字段：\n{\n  "summary": "一句话概述",\n  "capabilities": ["能力点"],\n  "constraints": ["约束"],\n  "intent": ["意图关键词"],\n  "confidence": 0.0~1.0,\n  "extractor": "llm",\n  "source_skill_ref": "可追溯来源引用",\n  "normalized_tag": "规范化标签"\n}\n\nskillName=${skillName}\nsourceSkillRef=${sourcePath || skillName}\n\n内容:\n${content.slice(0, 8000)}`;

  const body = {
    model,
    messages: [
      { role: 'system', content: '你是严谨的结构化信息抽取助手。只输出 JSON。' },
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

export async function extractSkillSemantic({ content, skillName, sourcePath }) {
  const config = await loadOpenClawConfig();
  const model = pickModel(config);
  const fallback = fallbackExtract(content, skillName);

  const providerConfig = resolveProviderConfig(config);

  try {
    const llmResult = await extractByLlm({ content, skillName, model, providerConfig });
    return {
      model,
      sourcePath,
      ...guardSemanticOutput({ ...llmResult, extractor: llmResult?.extractor || `llm:${model}` }, fallback, { skillName, sourceSkillRef: sourcePath || skillName }),
      usedFallback: false
    };
  } catch (error) {
    return {
      model,
      sourcePath,
      ...guardSemanticOutput(null, fallback, { skillName, sourceSkillRef: sourcePath || skillName }),
      usedFallback: true,
      fallbackReason: error instanceof Error ? error.message : String(error)
    };
  }
}
