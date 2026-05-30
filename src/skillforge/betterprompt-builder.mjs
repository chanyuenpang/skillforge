import { normalizeBetterPromptV1Input, validateBetterPromptV1Input, validateBetterPromptV1Output } from './betterprompt-v1-contract.mjs';
import { assemblePrompt } from './prompt-assembler.mjs';
// [DELETED] import evaluateBetterPromptPackage from './betterprompt-qc.mjs';
import { resolveSkills } from './skill-resolver.mjs';

function normalizeText(v) {
  return typeof v === 'string' ? v.trim() : '';
}

function toArray(v) {
  return Array.isArray(v) ? v : [];
}

function uniq(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function extractSourceSkillRefs(rawPrompt = '') {
  const refs = [];
  const lines = rawPrompt.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/source_skill_ref\s*[:=]\s*([a-zA-Z0-9._-]+)/i);
    if (m?.[1]) refs.push(m[1]);
  }
  return uniq(refs);
}

function extractNormalizedTags(rawPrompt = '') {
  const tags = [];
  const lines = rawPrompt.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/normalized_tag\s*[:=]\s*([^\n#]+)/i);
    if (m?.[1]) {
      m[1]
        .split(/[，,;；\s]+/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
        .forEach((s) => tags.push(s));
    }
  }
  return uniq(tags);
}

function extractGoal(rawPrompt = '', goalHint = '') {
  const hint = normalizeText(goalHint || '');
  if (hint) return hint;

  const lines = rawPrompt.split(/\r?\n/);
  let inGoalSection = false;
  for (const line of lines) {
    const l = line.trim();
    if (/^#{1,3}\s*(目标|任务目标|任务$|Goal|Task|Objective)/i.test(l)) {
      inGoalSection = true;
      continue;
    }
    if (inGoalSection && l.length >= 8 && !l.startsWith('#') && !/^(source_skill|normalized_)/i.test(l)) {
      return l.replace(/^[-*]\s*/, '').slice(0, 200);
    }
  }

  for (const line of lines) {
    const l = line.trim();
    if (!l) continue;
    if (l.startsWith('#') || /^(source_skill|normalized_)/i.test(l)) continue;
    return l.replace(/^[-*]\s*/, '').slice(0, 200);
  }

  return rawPrompt.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160) || '完成输入任务';
}

function extractConstraintLines(rawPrompt = '') {
  const lines = rawPrompt
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  return lines.filter((line) => /必须|禁止|不要|不得|仅|只|must|must not|do not|should not/i.test(line));
}

function buildExecutionSkeleton(resolved, assembled) {
  const steps = [];
  const skills = toArray(resolved?.resolvedSkills);
  if (skills.length > 0) {
    steps.push(`优先参考已解析技能：${skills.map((s) => s.skillId).join(' -> ')}`);
  }
  if (normalizeText(assembled?.promptText)) {
    steps.push('基于 prompt-assembler 的最终拼装结果执行，不回读原始噪声段');
  }
  steps.push('由 LLM 自行理解、提炼并填充任务要点，程序只负责裁剪与拼装');
  steps.push('执行后做轻量 QC，确认七区块完整、约束未丢失');
  return steps;
}

function buildOutputRequirements() {
  return [
    '输出必须使用七区块模板：目标/边界/执行骨架/约束/验收/交付/输出要求',
    '每个区块至少一条可执行信息，禁止空话',
    '保留 source_skill_ref + normalized_tag 的可追踪映射',
  ];
}

function buildV1Template({ goal, boundaries, skeleton, constraints, acceptance, delivery, outputReqs }) {
  return [
    '## 目标',
    `- ${goal}`,
    '',
    '## 边界',
    ...boundaries.map((x) => `- ${x}`),
    '',
    '## 执行骨架',
    ...skeleton.map((x) => `- ${x}`),
    '',
    '## 约束',
    ...constraints.map((x) => `- ${x}`),
    '',
    '## 验收',
    ...acceptance.map((x) => `- ${x}`),
    '',
    '## 交付',
    ...delivery.map((x) => `- ${x}`),
    '',
    '## 输出要求',
    ...outputReqs.map((x) => `- ${x}`),
  ].join('\n');
}

function buildV1PromptPackage({ promptText, goal, output, constraints, delivery, sourceSkillRefs, normalizedTags }) {
  return {
    version: 'betterprompt.v1',
    package_id: `betterprompt-v1-${Date.now()}`,
    source_skill_ref: sourceSkillRefs?.[0] || 'fallback',
    normalized_tag: normalizedTags?.[0] || 'fallback',
    intent: {
      goal,
      done_definition: [
        '七区块模板完整',
        '保留 source_skill_ref + normalized_tag',
        '轻量 QC 通过',
      ],
    },
    selected_skills: output.traces.resolved_skill_ids,
    prompt: {
      system: '你是一个严格的任务骨架生成器，只输出可执行结构。',
      user_template: '请基于 {{task_goal}} 生成七区块规范化 prompt：目标/边界/执行骨架/约束/验收/交付/输出要求。',
      input_slots: ['task_goal'],
    },
    execution_hints: [
      '先过滤噪声，再裁剪信息密度',
      '优先保留约束、边界、交付与验收',
      '程序只做裁剪和拼装，LLM 负责理解提炼',
    ],
    guardrails: {
      must_not: [
        '不要扩展 UI / 审批 / run center',
        '不要让程序主导技能语义拆解',
        '不要丢失 source_skill_ref + normalized_tag',
      ],
    },
    metadata: {
      builder_version: 'betterprompt-builder-v1',
      created_at: new Date().toISOString(),
      source_prompt_length: promptText.length,
      constraint_count: constraints.length,
      delivery_count: delivery.length,
    },
    delivery_package: {
      finalGuidance: output.output.sections.execution_skeleton,
      finalPackage: {
        deliveryType: 'seven-section-template',
        objective: goal,
        executionSequence: output.output.sections.execution_skeleton,
      },
      selfCheck: {
        pass: output.qc?.pass === true,
        summary: `score=${output.qc?.score ?? 0}`,
        checks: (output.qc?.checks || []).map((c) => `${c.name}:${c.pass ? 'pass' : 'fail'}`),
        issues: (output.qc?.issues || []).map((i) => i.detail),
      },
      assumptions: ['输入主体是 prompt/goal_hint/skillAssets', 'LLM 负责理解与提炼'],
      applicableScope: ['轻量任务骨架生成', '子代理 prompt 收敛'],
      nonApplicableCases: ['UI 扩展', '审批流', 'run center 重构'],
      failureModes: ['输入太短', '约束缺失', '技能引用不足'],
      correctionActions: ['补充 prompt 原文', '补充 goal_hint', '补充 skillAssets'],
      expectedImprovement: {
        baseline: '旧流程更重、拆解更散',
        now: '更短链、更可执行',
        delta: ['更少治理层', '更高可追踪性', '更低噪声'],
      },
    },
  };
}

export async function buildBetterPromptV1(input) {
  const validated = validateBetterPromptV1Input(input);
  if (!validated.success) {
    const msg = (validated.error?.issues || []).map((i) => i.message).join('; ') || 'invalid input';
    throw new Error(`betterPrompt v1 input 校验失败: ${msg}`);
  }

  const { prompt, goal_hint, skillAssets } = validated.data;
  const rawPrompt = normalizeText(prompt);
  const goal = extractGoal(rawPrompt, goal_hint);

  const sourceSkillRefs = uniq([
    ...extractSourceSkillRefs(rawPrompt),
    ...toArray(skillAssets).map((s) => normalizeText(s?.source_skill_ref || s?.skill_id || s?.skillId)),
  ]);
  const normalizedTags = uniq([
    ...extractNormalizedTags(rawPrompt),
    ...toArray(skillAssets).flatMap((s) => toArray(s?.normalized_tags).map((t) => normalizeText(t).toLowerCase())),
  ]);

  const resolved = resolveSkills({
    context: {
      tags: normalizedTags,
      description: rawPrompt,
      intent: goal,
    },
    explicitSkills: sourceSkillRefs,
  });

  const assembled = assemblePrompt({
    resolvedSkills: toArray(resolved?.resolvedSkills),
    options: {
      preamble: `任务目标：${goal}`,
    },
  });

  const boundaries = uniq([
    '输入主体仅使用 prompt、goal_hint、skillAssets',
    '程序仅做裁剪和拼装，不做程序化 skill 语义拆解',
    '技能语义理解与提炼交给 LLM',
  ]);

  const constraints = uniq([
    ...extractConstraintLines(rawPrompt),
    '保留 source_skill_ref + normalized_tag',
    '不扩展 UI / 审批 / run center',
  ]);

  const acceptance = uniq([
    '七区块模板完整输出',
    '目标、边界、约束、验收之间无明显冲突',
    '轻量 QC 通过（score>=70）',
  ]);

  const delivery = uniq([
    'betterPrompt v1 规范化文本',
    '可追踪的技能引用与标签映射',
    'QC 结果摘要',
  ]);

  const outputReqs = buildOutputRequirements();
  const skeleton = buildExecutionSkeleton(resolved, assembled);
  const template = buildV1Template({ goal, boundaries, skeleton, constraints, acceptance, delivery, outputReqs });

  const semantic_summary = `goal=${goal}; skills=${toArray(resolved?.resolvedSkills).map((s) => s.skillId).join(',') || 'none'}; tags=${normalizedTags.join(',') || 'none'}`;

  const output = {
    version: 'betterprompt.v1',
    contract: { input: '{ prompt, goal_hint?, skillAssets? }', output: 'seven-section-template' },
    input: { prompt: rawPrompt, goal_hint: goal_hint || undefined, skillAssets: skillAssets || undefined },
    output: {
      sections: {
        goal,
        boundaries,
        execution_skeleton: skeleton,
        constraints,
        acceptance,
        delivery,
        output_requirements: outputReqs,
      },
      template,
      decomposition: [
        {
          source_skill_ref: sourceSkillRefs[0] || 'fallback',
          normalized_tag: normalizedTags[0] || 'fallback',
        },
      ],
    },
    traces: {
      resolved_skill_ids: toArray(resolved?.resolvedSkills).map((s) => s.skillId),
      semantic_summary,
      assembled_prompt_preview: normalizeText(assembled?.promptText).slice(0, 240),
    },
  };

  const qc = runV1QC(output);
  output.qc = qc;

  const packagePayload = buildV1PromptPackage({
    promptText: rawPrompt,
    goal,
    output,
    constraints,
    delivery,
    sourceSkillRefs,
    normalizedTags,
  });
  output.package = packagePayload;

  output.fallback = {
    fallback_used: false,
    fallback_reason: null,
    package_minimal_ready: true,
    resume_hint: "input accepted via betterPrompt v1 contract",
  };

  const outputValidated = validateBetterPromptV1Output(output);
  if (!outputValidated.success) {
    const msg = (outputValidated.error?.issues || []).map((i) => i.message).join('; ') || 'invalid output';
    throw new Error(`betterPrompt v1 output 校验失败: ${msg}`);
  }

  return output;
}

function runV1QC(out) {
  const sections = out?.output?.sections || {};
  const hasSeven = ['goal', 'boundaries', 'execution_skeleton', 'constraints', 'acceptance', 'delivery', 'output_requirements'].every((k) => Array.isArray(sections[k]) || typeof sections[k] === 'string');
  const hasGoal = typeof sections.goal === 'string' || (Array.isArray(sections.goal) && sections.goal.length > 0);
  const pass = Boolean(hasSeven && hasGoal);
  return {
    pass,
    score: pass ? 100 : 60,
    tags: [pass ? 'ready-for-downstream' : 'needs-fix'],
    checks: [
      { name: 'seven_sections', pass: hasSeven, detail: '七区块完整' },
      { name: 'goal_present', pass: hasGoal, detail: '目标已规范化' },
    ],
    issues: pass ? [] : ['v1 qc failed'],
  };
}

export const buildBetterPromptPackage = buildBetterPromptV1;

const ALLOWED_RAW_OPTIONS_KEYS = new Set(['goal_hint', 'skillAssets', 'language']);

function pickAllowedRawOptions(options = {}) {
  const out = {};
  const unknownKeys = [];
  for (const [key, value] of Object.entries(options || {})) {
    if (ALLOWED_RAW_OPTIONS_KEYS.has(key)) {
      out[key] = value;
    } else {
      unknownKeys.push(key);
    }
  }
  return { options: out, unknownKeys };
}

/**
 * buildBetterPromptFromRawText(rawText, options?)
 *
 * 说明：
 * - 保留 raw adapter 兼容旧入口
 * - options 仅允许白名单字段；未知字段会直接报错，不再静默忽略
 * - 推荐新调用方直接使用 buildBetterPromptV1(input)
 */
export function buildBetterPromptFromRawText(rawText, options) {
  let goalHint;
  let skillAssets;
  let unknownKeys = [];

  if (typeof options === 'string') {
    goalHint = options;
  } else if (options && typeof options === 'object') {
    const picked = pickAllowedRawOptions(options);
    goalHint = typeof picked.options.goal_hint === 'string' ? picked.options.goal_hint : undefined;
    skillAssets = picked.options.skillAssets || undefined;
    unknownKeys = picked.unknownKeys;
  }

  if (unknownKeys.length > 0) {
    throw new Error(`buildBetterPromptFromRawText optionsBag 含未知字段: ${unknownKeys.join(', ')}`);
  }

  return buildBetterPromptV1({ prompt: rawText, goal_hint: goalHint, skillAssets });
}

export default buildBetterPromptV1;
