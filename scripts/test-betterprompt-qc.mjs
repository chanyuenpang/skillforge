import { buildBetterPromptPackage } from '../src/skillforge/betterprompt-builder.mjs';
import { evaluateBetterPromptPackage } from '../src/skillforge/betterprompt-qc.mjs';

const goodInput = {
  version: '0.1.0',
  task: {
    id: 'task-good-001',
    goal: '实现一个最小可运行的 prompt package QC 校验脚本并输出结构化结果',
    type: 'implementation',
    success_criteria: ['有 pass/checks/issues', '能区分 good 与 bad'],
  },
  context: {
    project: 'workflow-kit',
    facts: ['betterprompt-contract 已存在', 'betterprompt-builder 已存在'],
  },
  skills: {
    candidates: ['coding-agent-workflow', 'contract-driven-dev', 'prompt-design'],
  },
  constraints: {
    hard: ['只做 betterPrompt package 的 QC', '不接 execution-log / run center', '不回退到 betterWorkflow'],
    soft: ['尽量简单，先能跑起来'],
    output_format: 'json',
    risk_level: 'low',
  },
  runtime: {
    language: 'zh-CN',
    timebox_min: 20,
  },
};

const { package: goodPkg } = buildBetterPromptPackage(goodInput);
const goodResult = evaluateBetterPromptPackage(goodPkg);

// bad sample: 破坏关键字段与一致性
const badPkg = {
  ...goodPkg,
  package_id: '',
  prompt: {
    ...goodPkg.prompt,
    user_template: '请完成任务：{{task_goal}}',
    input_slots: ['task_goal', 'task_id'], // task_id 未在模板中出现
  },
  guardrails: {
    must_not: [],
  },
  metadata: {
    created_at: '',
  },
};

const badResult = evaluateBetterPromptPackage(badPkg);

console.log('=== Good Package QC ===');
console.log(JSON.stringify(goodResult, null, 2));
console.log('');
console.log('=== Bad Package QC ===');
console.log(JSON.stringify(badResult, null, 2));
console.log('');

if (!goodResult.pass) {
  throw new Error('期望 good package QC 通过，但未通过');
}
if (badResult.pass) {
  throw new Error('期望 bad package QC 失败，但通过了');
}

console.log('✅ betterprompt-qc 最小验证通过：成功区分 good/bad package');
