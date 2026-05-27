import assert from 'node:assert/strict';

import { buildBetterPromptPackage } from '../src/skillforge/betterprompt-builder.mjs';
import { evaluateBetterPromptPackage } from '../src/skillforge/betterprompt-qc.mjs';
import { buildBetterPromptRunCenterView } from '../src/skillforge/betterprompt-run-center-view.mjs';
import { buildSkillBundleExecutionRecord } from '../src/skillforge/skill-bundle-execution-record.mjs';
import { buildSkillBundleRunCenterView } from '../src/skillforge/skill-bundle-run-center-view.mjs';

const FLOW_ID = 'milestone-f-gray-real-flow-02';

function buildInput() {
  return {
    version: '1.0.0',
    task: {
      id: FLOW_ID,
      type: 'implementation',
      goal: '交付 team incident response runbook 与 release checklist 的业务流，优先命中 bundle recommendation 并完成灰度验收',
      success_criteria: [
        'betterPrompt package 通过 QC',
        'bundle recommendation 真命中（非 fallback）',
        'run center observability 关键字段完整',
      ],
    },
    context: {
      project: 'workflow-kit',
      facts: [
        'Run Center observability 已可用',
        'bundle matcher 与 betterPrompt 软引用链路已打通',
        '灰度目标是真实业务流，不走纯 fallback',
      ],
    },
    skills: {
      candidates: [
        'coding-agent-workflow',
        'incident-response-runbook',
        'release-checklist-automation',
        'skillforge-core',
      ],
      bundle_refs: ['incident-response-release-checklist', 'skillforge-core'],
    },
    constraints: {
      hard: ['必须验证 bundle recommendation 命中，不允许 fallback 代替通过', '不做大 UI 与大架构改造'],
      soft: ['优先复用现有 betterPrompt + bundle matcher + run-center view'],
      risk_level: 'low',
    },
    runtime: {
      language: 'zh-CN',
      timebox_min: 20,
      token_budget: 2200,
    },
  };
}

function must(condition, message) {
  assert.ok(condition, message);
}

function validateObservability(view, name) {
  must(view && typeof view === 'object', `${name}: view missing`);
  must(view.observability && typeof view.observability === 'object', `${name}: observability missing`);
  must(['ok', 'degraded', 'error'].includes(view.observability.status), `${name}: invalid observability.status`);
  must(typeof view.observability.duration_ms === 'number', `${name}: observability.duration_ms must be number`);
  must(Array.isArray(view.observability.trace_refs), `${name}: observability.trace_refs must be array`);
  must(['info', 'warn', 'error'].includes(view.observability.alert_level), `${name}: invalid observability.alert_level`);
}

async function main() {
  const input = buildInput();

  const built = await buildBetterPromptPackage(input);
  const qc = evaluateBetterPromptPackage(built.package);

  must(built && typeof built === 'object', 'betterPrompt build result missing');
  must(built.package && typeof built.package === 'object', 'betterPrompt package missing');
  must(Array.isArray(built.package.selected_skills), 'betterPrompt selected_skills missing');
  must(qc && qc.pass === true, 'betterPrompt QC did not pass');

  const recommended = Array.isArray(built.package.recommended_bundle_refs)
    ? built.package.recommended_bundle_refs
    : [];
  const bundleHit = recommended.length > 0;

  must(bundleHit, 'bundle recommendation must hit for flow-02 (fallback is not acceptable)');

  const bundleRecord = buildSkillBundleExecutionRecord(
    {
      projectGoal: input.task.goal,
      context: 'gray acceptance flow-02 real business path',
      candidates: input.skills.candidates,
      topK: 3,
    },
    {
      selectedSkills: built.package.selected_skills,
      score: 12.2,
      reason: `bundle matcher hit: ${recommended.join(', ')}`,
    },
    {
      status: 'completed',
      durationMs: 11,
      traceRefs: ['skillbundle:milestone-f-gray-flow-02'],
      taskRef: input.task.id,
      planRef: 'milestone-f-gray-plan-02',
      artifactPath: 'artifacts/skill-bundle/milestone-f-gray-real-flow-02.json',
    },
  );

  const bundleView = buildSkillBundleRunCenterView(bundleRecord);
  const bpView = buildBetterPromptRunCenterView({
    id: `bp-${FLOW_ID}`,
    source: 'betterprompt-builder',
    status: qc.pass ? 'completed' : 'degraded',
    durationMs: 19,
    traceRefs: ['betterprompt:milestone-f-gray-flow-02'],
    taskRef: input.task.id,
    planRef: 'milestone-f-gray-plan-02',
    payload: {
      selected_skills: built.package.selected_skills,
      recommended_bundle_refs: recommended,
      qc_result: qc,
      fallback: built.fallback,
      summary: 'milestone F gray acceptance real business flow-02 bundle-hit required',
    },
  });

  validateObservability(bpView, 'betterPrompt');
  validateObservability(bundleView, 'skillBundle');

  const pass =
    qc.pass === true &&
    bundleHit === true &&
    bundleRecord?.fallback?.fallback_used !== true &&
    Boolean(bpView.observability) &&
    Boolean(bundleView.observability);

  const result = {
    milestone: 'F',
    gate: 'gray-acceptance-real-flow-02-bundle-hit',
    flow_id: FLOW_ID,
    pass: Boolean(pass),
    checks: {
      input_task_goal: input.task.goal,
      betterprompt_package_ready: Boolean(built.package),
      betterprompt_qc_pass: qc.pass === true,
      bundle_recommendation_hit: bundleHit,
      recommended_bundle_refs: recommended,
      bundle_fallback_used: bundleRecord?.fallback?.fallback_used === true,
      run_center_observability: {
        betterprompt: bpView.observability,
        skillbundle: bundleView.observability,
      },
    },
  };

  if (!pass) {
    console.error(JSON.stringify(result, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log(JSON.stringify(result, null, 2));
}

await main();
