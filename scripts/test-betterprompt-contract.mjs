import { validateBetterPromptInput, validateBetterPromptOutput } from '../src/skillforge/betterprompt-contract.mjs';

// --- SAMPLE: betterPrompt 规划任务 ---
const sampleInput = {
  version: '1.0.0',
  task: {
    id: 'betterprompt-mvp-plan',
    goal: '规划 betterPrompt MVP 的输入输出契约与校验逻辑',
    type: 'contract-implementation',
    success_criteria: ['contract 文件生成', '合法/非法校验通过', '真实样本验证通过'],
  },
  context: {
    project: 'workflow-kit',
    artifacts: ['docs/betterprompt-blueprint.md'],
    facts: ['基于 skillforge 体系', '使用 zod 做 schema 校验'],
  },
  skills: {
    candidates: ['prompt-design', 'contract-driven-dev'],
    bundle_refs: ['skillforge-core'],
  },
  constraints: {
    hard: ['只做 betterPrompt 契约与校验', '不做 skill 选择链'],
    soft: ['代码风格统一'],
    output_format: 'mjs',
    risk_level: 'low',
  },
  runtime: {
    timebox_min: 30,
    token_budget: 8000,
    language: 'zh-CN',
  },
};

const sampleOutput = {
  version: '1.0.0',
  package_id: 'betterprompt-contract-v1',
  intent: {
    task_id: 'betterprompt-mvp-plan',
    goal: '落地 betterPrompt 输入输出契约，供后续生成链复用',
    done_definition: ['文件真实存在', '可 import 并校验', '真实样本通过'],
  },
  selected_skills: ['contract-driven-dev', 'prompt-design'],
  prompt: {
    system: '你是 betterPrompt 契约执行器...',
    developer: '实现 betterPrompt 的 I/O schema 与校验函数',
    user_template: '请根据以下 task 生成 prompt package: {{task}}',
    input_slots: ['task', 'context', 'skills', 'constraints', 'runtime'],
  },
  execution_hints: ['先校验输入', '再生成输出'],
  guardrails: {
    must_not: ['回退到 betterWorkflow', '接入 skill 选择链'],
    escalation_when: ['输入不合法', '生成失败'],
  },
  metadata: { created_at: '2026-05-27T14:54:00Z', author: 'betterPrompt' },
  delivery_package: {
    finalGuidance: ['优先参考已解析技能', '校验输入再生成输出'],
    finalPackage: {
      deliveryType: 'seven-section-template',
      objective: '落地 betterPrompt 输入输出契约，供后续生成链复用',
      executionSequence: ['先校验输入', '再生成输出'],
    },
    selfCheck: {
      pass: true,
      summary: 'score=100',
      checks: ['seven_sections:pass'],
      issues: [],
    },
    assumptions: ['输入主体是 prompt/goal_hint/skillAssets'],
    applicableScope: ['轻量任务骨架生成', '子代理 prompt 收敛'],
    nonApplicableCases: ['UI 扩展', '审批流'],
    failureModes: ['输入太短', '约束缺失'],
    correctionActions: ['补充 prompt 原文', '补充 goal_hint'],
    expectedImprovement: {
      baseline: '旧流程更重、拆解更散',
      now: '更短链、更可执行',
      delta: ['更少治理层', '更高可追踪性'],
    },
  },
};

// --- VALID ---
console.log('=== 合法输入校验 ===');
const inputValid = validateBetterPromptInput(sampleInput);
console.log('success:', inputValid.success);
if (!inputValid.success) {
  console.error('❌ input errors:', JSON.stringify(inputValid.error?.issues ?? inputValid.error, null, 2));
} else {
  console.log('✅ input valid');
}

console.log('\n=== 合法输出校验 ===');
const outputValid = validateBetterPromptOutput(sampleOutput);
console.log('success:', outputValid.success);
if (!outputValid.success) {
  console.error('❌ output errors:', JSON.stringify(outputValid.error?.issues ?? outputValid.error, null, 2));
} else {
  console.log('✅ output valid');
}

// --- INVALID ---
console.log('\n=== 非法输入校验 ===');
const invalidInput = { ...sampleInput, task: { wrong: true } };
const inputInvalid = validateBetterPromptInput(invalidInput);
console.log('success:', inputInvalid.success);
if (!inputInvalid.success) {
  console.log('✅ 正确拒绝非法 input');
  if (inputInvalid.error?.issues) {
    console.log('issues count:', inputInvalid.error.issues.length);
  }
}

console.log('\n=== 非法输出校验 ===');
const invalidOutput = { version: 'bad', package_id: '' };
const outputInvalid = validateBetterPromptOutput(invalidOutput);
console.log('success:', outputInvalid.success);
if (!outputInvalid.success) {
  console.log('✅ 正确拒绝非法 output');
  if (outputInvalid.error?.issues) {
    console.log('issues count:', outputInvalid.error.issues.length);
  }
}

console.log('\n=== 全部通过 ✅ ===');
