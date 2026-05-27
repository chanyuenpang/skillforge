import assert from 'node:assert/strict';
import { buildBetterPromptPackage } from '../src/skillforge/betterprompt-builder.mjs';

const input = {
  version: 'betterprompt.v1',
  task: {
    id: 'bundle-softref-smoke',
    goal: '需要支持 team incident response runbook 与 release checklist automation，并把 bundle 推荐接到 betterPrompt 软引用输出',
    type: 'implementation',
    success_criteria: ['输出推荐 bundle refs', '输出建议 skill refs'],
  },
  context: {
    project: 'workflow-kit',
    facts: ['已有 skill-bundle-loader', '已有 skill-bundle-matcher', '当前场景是 team incident response runbook 与 release checklist automation'],
  },
  skills: {
    candidates: ['coding-agent-workflow', 'skillforge-core', 'contract-driven-dev'],
  },
  constraints: {
    hard: ['不做 UI，只打通最小软引用闭环', '不硬绑定 bundle'],
    soft: ['优先复用现有 bundle loader 与 matcher'],
    risk_level: 'low',
  },
  runtime: {
    language: 'zh-CN',
  },
};

const built = await buildBetterPromptPackage(input);
const pkg = built.package;

assert.ok(Array.isArray(pkg.recommended_bundle_refs), 'recommended_bundle_refs 应存在');
assert.ok(pkg.recommended_bundle_refs.length > 0, 'recommended_bundle_refs 至少 1 个');
assert.ok(Array.isArray(pkg.suggested_skill_refs), 'suggested_skill_refs 应存在');
assert.ok(pkg.suggested_skill_refs.length > 0, 'suggested_skill_refs 至少 1 个');

console.log(JSON.stringify({
  package_id: pkg.package_id,
  selected_skills: pkg.selected_skills,
  recommended_bundle_refs: pkg.recommended_bundle_refs,
  suggested_skill_refs: pkg.suggested_skill_refs,
  qc_pass: built.qc_result?.pass,
}, null, 2));
