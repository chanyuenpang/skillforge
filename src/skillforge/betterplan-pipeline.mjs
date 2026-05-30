/**
 * betterplan-pipeline.mjs - betterPlan v1 pipeline
 *
 * Flow:
 *   1. Validate input against BetterPlanInput contract
 *   2. Filter/crop plan text (program's job: sanitize, truncate)
 *   3. Assemble LLM prompt (program's job: structure the extraction request)
 *   4. Call LLM through provider-config
 *   5. Parse + validate LLM output against BetterPlanOutput contract
 *   6. Guard and return structured result
 *
 * Design rules:
 *   - 程序负责过滤、裁剪、拼装和校验
 *   - LLM 负责理解、提炼和生成
 *   - No heavy workflow state machine
 *   - No governance pipeline
 *   - Pure pipeline: input → process → output
 */

import { getProviderConfig } from './provider-config.mjs';
import {
  validateBetterPlanInput,
  validateBetterPlanOutput,
} from './betterplan-contract.mjs';

// ── Constants ────────────────────────────────────────────────────────────────

const MAX_PLAN_CHARS = 24000;       // max chars sent to LLM (to keep context lean)
const DEFAULT_MAX_OUTPUT_TOKENS = 4096;  // LLM output token budget
const FALLBACK_SKELETON_TITLES = [
  '理解需求与目标对齐',
  '拆解关键任务步骤',
  '识别依赖与风险',
  '制定执行顺序',
  '定义完成标准',
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Build a structural fallback when LLM output is completely unusable.
 * Extracts meaningful lines from plan text directly so callers always get
 * a non-null result even on LLM parse failure.
 */
function buildFallbackFromPlan(planText, goalHint) {
  const goal = hasText(goalHint) ? goalHint : '执行计划';
  const lines = planText.split('\n').filter((l) => hasText(l));
  const contentLines = lines
    .filter((l) => l.length > 8 && !l.trim().startsWith('#') && !l.trim().startsWith('-') && !l.trim().startsWith('*'))
    .map((l) => l.trim().replace(/^[*#\-\s]+/, '').slice(0, 200))
    .filter((l) => l.length > 5);

  const keyPoints = contentLines.length >= 2
    ? contentLines.slice(0, 3)
    : ['最小要点:LLM 输出不可用,计划文本未提取到关键点'];

  return {
    goal,
    boundaries: ['无明确边界约束(LLM 输出不可用,需人工补充)'],
    skeleton: FALLBACK_SKELETON_TITLES.map((title, i) => ({
      id: `s${i + 1}`,
      title,
      order: i + 1,
      dependsOn: i === 0 ? [] : [`s${i}`],
    })),
    keyPoints,
    order_rationale: 'LLM 输出不可用,按通用模板排序',
    gaps: ['提取失败:LLM 输出无法解析,未识别到缺口信息'],
    closure_condition: '所有步骤完成并经人工确认',
    confidence: 0.3,
  };
}

// ── Step 1: Filter & Crop Plan Text ────────────────────────────────────────

/**
 * Repair truncated/incomplete JSON from LLM.
 * Tries to close unclosed brackets/braces and remove trailing commas.
 */
function repairTruncatedJSON(jsonText) {
  let repaired = jsonText.trim();

  // Remove trailing commas before closing brackets
  repaired = repaired.replace(/,(\s*[}\]])/g, '$1');

  // Count open/close brackets and braces
  const counts = { '{': 0, '}': 0, '[': 0, ']': 0 };
  let inString = false;
  let prev = '';
  for (const ch of repaired) {
    if (ch === '"' && prev !== '\\') inString = !inString;
    if (!inString && counts.hasOwnProperty(ch)) counts[ch]++;
    prev = ch;
  }

  // Close unclosed arrays first (must close before objects)
  const missingArrays = counts['['] - counts[']'];
  const missingObjects = counts['{'] - counts['}'];

  // Truncate to last valid position if we have an unclosed string
  if (inString) {
    const lastValidComma = repaired.lastIndexOf(',');
    if (lastValidComma > 0) {
      repaired = repaired.slice(0, lastValidComma);
    }
  }

  // Remove trailing comma if present
  repaired = repaired.replace(/,\s*$/, '');

  // Close brackets
  for (let i = 0; i < missingArrays; i++) repaired += ']';
  for (let i = 0; i < missingObjects; i++) repaired += '}';

  return repaired;
}

/**
 * Crop plan text to a manageable size for LLM context.
 * Keeps the beginning and end, trims middle if needed.
 */
function cropPlanText(plan, maxChars = MAX_PLAN_CHARS) {
  const text = String(plan).trim();

  if (text.length <= maxChars) return text;

  // Keep first 60% and last 40% when truncating, to preserve intro and conclusion
  const headLen = Math.floor(maxChars * 0.6);
  const tailLen = maxChars - headLen - 50; // 50 chars for separator

  const head = text.slice(0, headLen);
  const tail = text.slice(-tailLen);

  return `${head}\n\n... [中间内容已裁剪,保留开头与结尾] ...\n\n${tail}`;
}

// ── Step 2: Assemble LLM Prompt ──────────────────────────────────────────────

function buildExtractionPrompt(planText, goalHint) {
  const hintLine = hasText(goalHint) ? `额外目标提示:${goalHint}\n\n` : '';

  return `你是任务骨架抽取器。请仔细阅读以下计划文本，抽取结构化的任务骨架。

${hintLine}计划文本：
---
${planText}
---

请输出纯 JSON（不要 markdown 代码块），字段说明：

- goal：用一句话概括计划目标（中文）
- plan_title：建议的计划标题（可选，最多30字）
- boundaries：明确的边界/硬约束列表（至少1条），每条不超过80字
- skeleton：按执行顺序排列的任务骨架步骤数组，每个步骤必须包含以下字段：
  - id：唯一标识（如 "s1", "s2"...）
  - title：简短任务名（中文，不超过20字）
  - order：执行序号（1开始）
  - action：可独立执行的具体动作描述（中文，必须包含动词+对象，例如"创建 src/normalize.mjs 并导出 normalizeInput 函数"）
  - expected_output：该步骤完成后的具体产出物（例如"产出 normalize.mjs 文件，包含 normalizeInput 函数"）
  - verification：验收信号，如何确认此步完成（例如"通过 node -e 'require("./normalize")' 无报错"）
  - dependsOn：前置步骤的id数组，表示必须先完成哪些步骤（无依赖则为空数组）
  - dependencies：该步骤所需的前置条件列表（字符串数组，描述需要什么就绪才能开始，例如["已确认输入数据结构"]）
  - blockers：可能的阻塞点列表（字符串数组，描述可能卡住的原因，例如["不确定输入字段列表"]，无阻塞则为空数组）
- order_rationale：解释为什么这样排序（中文）
- keyPoints：提取到的关键要点/主要结论（至少1条，常见输入下不应为空）
- gaps：识别到的缺口/风险/未明确事项（至少能区分"无缺口"与"提取失败/缺信息"）
- closure_condition：如何判断目标已完成（中文，一句话）
- confidence：你对输出的信心度（0.0-1.0）

重要：
- 只提取计划中明确提到的内容，不要自己编造
- skeleton 步骤数量3-10个，宁少勿多
- 每个步骤必须是可独立开始和完成的动作；应写成具体操作，不要写成阶段标题或抽象路线图（如"实现标准化层"是阶段标题，"创建 normalize.mjs 并实现 normalizeInput() 函数"是具体动作）
- action 必须是动词+对象格式，明确做什么、对什么做
- expected_output 和 verification 必须具体可检查，不能写"完成实现"这种空泛描述
- gaps 必须具体到字段/配置级别（例如"缺输入字段白名单定义"而不是"信息不足"）
- dependencies 和 blockers 帮助执行者预判卡点，不能留空泛内容
- 边界应该从计划文本中的约束、限制、非目标内容中提取`;
}

// ── Step 3: Call LLM ─────────────────────────────────────────────────────────

async function callLLM(prompt, providerConfig, maxTokens = DEFAULT_MAX_OUTPUT_TOKENS) {
  const { endpoint, apiKey, llm } = providerConfig;
  const model = llm?.model || 'deepseek-chat';

  if (!apiKey) {
    throw new Error('MISSING_API_KEY: 未找到 LLM API Key,请检查 openclaw.json 或环境变量');
  }

  if (!endpoint) {
    throw new Error('MISSING_ENDPOINT: 未找到 LLM endpoint');
  }

  const body = {
    model,
    messages: [
      {
        role: 'system',
        content: '你是一个严谨的计划骨架抽取助手。只输出有效 JSON,不输出其他内容。',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.2,
    max_tokens: maxTokens,
  };

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`LLM_HTTP_${resp.status}: ${errText.slice(0, 200)}`);
  }

  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!hasText(content)) {
    throw new Error('LLM_EMPTY_RESPONSE: LLM 返回了空内容');
  }

  return content;
}

// ── Step 4: Parse LLM Output ─────────────────────────────────────────────────

function parseLLMOutput(rawText) {
  // Strip markdown code fences if present
  let jsonText = rawText.trim();

  // Remove ```json ... ``` or ``` ... ```
  const fenceMatch = jsonText.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
  if (fenceMatch) {
    jsonText = fenceMatch[1].trim();
  }

  // Try to find JSON object bounds if there's surrounding text
  const firstBrace = jsonText.indexOf('{');
  const lastBrace = jsonText.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    jsonText = jsonText.slice(firstBrace, lastBrace + 1);
  }

  // First attempt: direct parse
  try {
    const parsed = JSON.parse(jsonText);
    if (isPlainObject(parsed)) return parsed;
  } catch {
    // Fall through to repair
  }

  // Second attempt: repair truncated JSON and retry
  const repaired = repairTruncatedJSON(jsonText);
  const parsed = JSON.parse(repaired);

  if (!isPlainObject(parsed)) {
    throw new Error('LLM_PARSE_ERROR: LLM 输出不是合法的 JSON 对象');
  }

  return parsed;
}

// ── Step 5: Guard & Normalize Output ─────────────────────────────────────────

/**
 * Normalize and guard the LLM output, ensuring all required fields exist
 * with sensible defaults even if the LLM missed something.
 */
function guardAndNormalize(raw, planText, goalHint) {
  const goal = hasText(raw.goal) ? raw.goal : (hasText(goalHint) ? goalHint : '执行计划');
  const planTitle = hasText(raw.plan_title) ? raw.plan_title : undefined;

  const hasExtractionProblem = (value, arrayValue, aliasValue) => {
    // Proper array → extraction succeeded (even if empty)
    if (Array.isArray(arrayValue)) return false;
    if (Array.isArray(aliasValue)) return false;
    // Present but not an array (string, number, etc.) → malformed → extraction problem
    if (value !== undefined && value !== null && value !== '') return true;
    if (aliasValue !== undefined && aliasValue !== null && aliasValue !== '') return true;
    // No gaps-related fields at all → extraction problem
    return true;
  };

  // Normalize boundaries
  const boundaries = (Array.isArray(raw.boundaries) ? raw.boundaries : [])
    .filter((b) => hasText(b))
    .map((b) => String(b).trim().slice(0, 120));

  if (boundaries.length === 0) {
    boundaries.push('无明确边界约束(建议补充)');
  }

  // Normalize skeleton
  let skeleton = Array.isArray(raw.skeleton) ? raw.skeleton : [];
  skeleton = skeleton
    .filter((s) => isPlainObject(s))
    .map((s, index) => {
      const id = hasText(s?.id) ? String(s.id).trim() : `s${index + 1}`;
      return {
        id,
        title: hasText(s?.title) ? String(s.title).trim().slice(0, 40) : `步骤 ${index + 1}`,
        order: Number.isFinite(s?.order) && s.order > 0 ? s.order : index + 1,
        action: hasText(s?.action) ? String(s.action).trim() : (hasText(s?.title) ? String(s.title).trim() : ''),
        expected_output: hasText(s?.expected_output) ? String(s.expected_output).trim() : '',
        verification: hasText(s?.verification) ? String(s.verification).trim() : '',
        dependsOn: Array.isArray(s?.dependsOn)
          ? s.dependsOn.filter((d) => typeof d === 'string' && d.trim()).map((d) => d.trim())
          : [],
        dependencies: Array.isArray(s?.dependencies)
          ? s.dependencies.filter((d) => typeof d === 'string' && d.trim()).map((d) => d.trim())
          : [],
        blockers: Array.isArray(s?.blockers)
          ? s.blockers.filter((d) => typeof d === 'string' && d.trim()).map((d) => d.trim())
          : [],
      };
    });

  // Sort by order
  skeleton.sort((a, b) => a.order - b.order);
  // Reassign order after sorting
  skeleton = skeleton.map((s, i) => ({ ...s, order: i + 1 }));

  if (skeleton.length === 0) {
    // Build fallback skeleton from plan length
    skeleton = FALLBACK_SKELETON_TITLES.map((title, i) => ({
      id: `s${i + 1}`,
      title,
      order: i + 1,
      action: title,
      expected_output: '',
      verification: '',
      dependsOn: i === 0 ? [] : [`s${i}`],
      dependencies: [],
      blockers: [],
    }));
  }

  const makeMinimalKeyPoint = (source) => {
    const text = hasText(source) ? String(source).trim().slice(0, 200) : '';
    return text || '1. 最小要点:LLM 输出不足,已启用兜底提取';
  };

  // Normalize key points
  const extractedKeyPoints = Array.isArray(raw.keyPoints)
    ? raw.keyPoints
    : Array.isArray(raw.key_points)
      ? raw.key_points
      : Array.isArray(raw.keypoints)
        ? raw.keypoints
        : [];

  let keyPoints = extractedKeyPoints
    .filter((k) => hasText(k))
    .map((k) => String(k).trim().slice(0, 200));

  if (keyPoints.length === 0) {
    // Try extracting meaningful lines from plan text as fallback key points
    const planLines = planText.split('\n')
      .filter((l) => hasText(l) && l.trim().length > 8 && !l.trim().startsWith('#'))
      .map((l) => l.trim().replace(/^[*#\-\s]+/, '').slice(0, 200))
      .filter((l) => l.length > 5);

    if (planLines.length >= 2 && skeleton.length >= 1) {
      // Mix plan-derived insights with skeleton entries for richer output
      keyPoints = [
        planLines[0],
        `${skeleton[0].order}. ${skeleton[0].title}`,
        ...(skeleton.length >= 2 ? [`${skeleton[1].order}. ${skeleton[1].title}`] : []),
      ];
    } else if (skeleton.length >= 2) {
      keyPoints = skeleton.slice(0, 3).map((s) => `${s.order}. ${s.title}`);
    } else if (skeleton.length === 1) {
      keyPoints = [makeMinimalKeyPoint(`${skeleton[0].order}. ${skeleton[0].title}`)];
    } else {
      keyPoints = [makeMinimalKeyPoint(goal)];
    }
  }

  // Normalize gaps
  const extractedGaps = Array.isArray(raw.gaps)
    ? raw.gaps
    : Array.isArray(raw.gap)
      ? raw.gap
      : [];

  const gapsExtractFailed = hasExtractionProblem(raw.gaps, raw.gaps, raw.gap);

  let gaps = extractedGaps
    .filter((g) => hasText(g))
    .map((g) => String(g).trim().slice(0, 200));

  if (gaps.length === 0) {
    gaps = gapsExtractFailed
      ? ['提取失败:未从 LLM 输出中识别到缺口信息']
      : ['无缺口:计划未明确提出待补充项'];
  }

  // Other fields
  const orderRationale = hasText(raw.order_rationale)
    ? raw.order_rationale.trim().slice(0, 500)
    : `依次执行 ${skeleton.length} 个步骤`;

  const closureCondition = hasText(raw.closure_condition)
    ? raw.closure_condition.trim().slice(0, 300)
    : '所有步骤完成并经人工确认';

  const confidence = typeof raw.confidence === 'number'
    ? Math.max(0, Math.min(1, raw.confidence))
    : 0.7;

  return {
    goal,
    ...(planTitle ? { plan_title: planTitle } : {}),
    boundaries,
    skeleton,
    keyPoints,
    order_rationale: orderRationale,
    gaps,
    closure_condition: closureCondition,
    confidence,
  };
}

// ── Main Pipeline Entry ──────────────────────────────────────────────────────

/**
 * runBetterPlan(input) → { result, meta }
 *
 * @param {object} input
 * @param {string} input.plan       - raw plan text (required)
 * @param {string} [input.goal_hint] - optional high-level hint
 * @param {number} [input.max_tokens] - optional LLM max_tokens override
 * @returns {Promise<object>} { result: BetterPlanOutput | null, meta: {...} }
 */
export async function runBetterPlan(input) {
  const meta = {
    startedAt: new Date().toISOString(),
    inputSize: 0,
    croppedSize: 0,
    model: null,
    llmCalled: false,
    llmDurationMs: 0,
    validationPassed: false,
    fallbackUsed: false,
    errors: [],
    warnings: [],
  };

  // 1. Validate input
  const inputValidation = validateBetterPlanInput(input);
  if (!inputValidation.valid) {
    meta.errors = inputValidation.errors;
    return {
      result: null,
      meta,
      error: `输入校验失败: ${inputValidation.errors.map((e) => `${e.field}: ${e.message}`).join('; ')}`,
    };
  }

  meta.inputSize = input.plan.length;

  // 2. Filter & crop
  const planText = cropPlanText(input.plan);
  meta.croppedSize = planText.length;

  if (meta.inputSize > MAX_PLAN_CHARS) {
    meta.warnings.push(`计划文本从 ${meta.inputSize} 字符裁剪到 ${meta.croppedSize} 字符`);
  }

  // 3. Get provider config
  let providerConfig;
  try {
    providerConfig = await getProviderConfig();
    meta.model = providerConfig.llm?.model || 'unknown';
  } catch (err) {
    meta.errors.push({ stage: 'provider_config', message: err.message });
    return {
      result: null,
      meta,
      error: `无法加载 LLM 配置: ${err.message}`,
    };
  }

  // 4. Assemble prompt & call LLM
  const prompt = buildExtractionPrompt(planText, input.goal_hint);
  let rawOutput;

  const llmStart = Date.now();
  const maxTokens = (Number.isFinite(input.max_tokens) && input.max_tokens > 0)
    ? input.max_tokens
    : DEFAULT_MAX_OUTPUT_TOKENS;
  try {
    rawOutput = await callLLM(prompt, providerConfig, maxTokens);
    meta.llmCalled = true;
    meta.llmDurationMs = Date.now() - llmStart;
  } catch (err) {
    meta.errors.push({ stage: 'llm_call', message: err.message });
    meta.llmDurationMs = Date.now() - llmStart;
    meta.fallbackUsed = true;
    meta.warnings.push(`LLM 不可用，已使用结构兜底: ${err.message}`);
    const fallbackResult = buildFallbackFromPlan(planText, input.goal_hint);
    const fallbackValidation = validateBetterPlanOutput(fallbackResult);
    meta.validationPassed = fallbackValidation.valid;
    return {
      result: fallbackResult,
      meta,
      error: null,
    };
  }

  // 5. Parse LLM output
  let parsed;
  try {
    parsed = parseLLMOutput(rawOutput);
  } catch (err) {
    meta.errors.push({ stage: 'llm_parse', message: err.message, rawSnippet: rawOutput.slice(0, 200) });
    meta.fallbackUsed = true;
    meta.warnings.push(`LLM 输出解析失败,已使用结构兜底: ${err.message}`);
    const fallbackResult = buildFallbackFromPlan(planText, input.goal_hint);
    const fallbackValidation = validateBetterPlanOutput(fallbackResult);
    meta.validationPassed = fallbackValidation.valid;
    return {
      result: fallbackResult,
      meta,
      error: null,
    };
  }

  // 6. Guard & normalize
  const normalized = guardAndNormalize(parsed, planText, input.goal_hint);

  // 7. Validate against output contract
  const outputValidation = validateBetterPlanOutput(normalized);
  if (!outputValidation.valid) {
    meta.warnings.push(
      `输出校验未完全通过: ${outputValidation.errors.map((e) => `${e.field}: ${e.message}`).join('; ')}`
    );
    // Don't fail - normalized output should satisfy contract after guard
    // But flag it
  }
  meta.validationPassed = outputValidation.valid;

  return {
    result: normalized,
    meta,
  };
}

export default runBetterPlan;
