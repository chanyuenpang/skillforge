import assert from 'node:assert/strict';

import { buildBetterPromptPackage } from '../src/skillforge/betterprompt-builder.mjs';
import { evaluateBetterPromptPackage } from '../src/skillforge/betterprompt-qc.mjs';
import { buildBetterPromptRunCenterView } from '../src/skillforge/betterprompt-run-center-view.mjs';
import { buildSkillBundleExecutionRecord } from '../src/skillforge/skill-bundle-execution-record.mjs';
import { buildSkillBundleRunCenterView } from '../src/skillforge/skill-bundle-run-center-view.mjs';

const FLOW_ID = 'milestone-f-gray-real-flow-01';

function buildInput() {
  return {
    version: '1.0.0',
    task: {
      id: FLOW_ID,
      type: 'implementation',
      goal: '把 task goal 经过 betterPrompt 生成可执行 package，并带出 skill bundle 推荐，再沉淀 run center 可观测记录',
      success_criteria: [
        'betterPrompt 产出 package 且 QC 通过',
        'bundle recommendation 有命中；无命中时有 fallback 信号',
        'run center view 有关键 observability 字段',
      ],
    },
    context: {
      project: 'workflow-kit',
      facts: [
        'A-E MVP already done',
        'Run Center observability already available',
        'fallback hardening already done',
      ],
    },
    skills: {
      candidates: ['coding-agent-workflow', 'prompt-design', 'contract-driven-dev', 'skillforge-core'],
      bundle_refs: ['skillforge-core'],
    },
    constraints: {
      hard: ['仅做最小闭环，不做 UI 改造'],
      soft: ['优先复用现有 betterPrompt + bundle matcher + run-center view'],
      risk_level: 'low',
    },
    runtime: {
      language: 'zh-CN',
      timebox_min: 20,
      token_budget: 2000,
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

  // Step 1: betterPrompt package
  const built = await buildBetterPromptPackage(input);
  const qc = evaluateBetterPromptPackage(built.package);

  must(built && typeof built === 'object', 'betterPrompt build result missing');
  must(built.package && typeof built.package === 'object', 'betterPrompt package missing');
  must(Array.isArray(built.package.selected_skills), 'betterPrompt selected_skills missing');
  must(qc && qc.pass === true, 'betterPrompt QC did not pass');

  // Step 2: bundle recommendation OR fallback signal
  const recommended = Array.isArray(built.package.recommended_bundle_refs)
    ? built.package.recommended_bundle_refs
    : [];

  const bundleHit = recommended.length > 0;
  const bundleFallbackRecord = buildSkillBundleExecutionRecord(
    {
      projectGoal: input.task.goal,
      context: 'gray acceptance fallback probe',
      candidates: input.skills.candidates,
      topK: 3,
    },
    bundleHit
      ? { selectedSkills: ['coding-agent-workflow'], score: 10.5, reason: 'bundle matcher hit' }
      : { selectedSkills: [], score: 0, reason: 'no semantic overlap' },
    {
      status: 'completed',
      durationMs: 9,
      traceRefs: ['skillbundle:milestone-f-gray'],
      taskRef: input.task.id,
      planRef: 'milestone-f-gray-plan-01',
      artifactPath: 'artifacts/skill-bundle/milestone-f-gray-real-flow-01.json',
    },
  );

  const bundleView = buildSkillBundleRunCenterView(bundleFallbackRecord);

  if (!bundleHit) {
    must(bundleFallbackRecord?.fallback?.fallback_used === true, 'bundle no-hit must have fallback_used=true');
  }

  // Step 3: run-center / execution-record observability
  const bpView = buildBetterPromptRunCenterView({
    id: `bp-${FLOW_ID}`,
    source: 'betterprompt-builder',
    status: qc.pass ? 'completed' : 'degraded',
    durationMs: 17,
    traceRefs: ['betterprompt:milestone-f-gray'],
    taskRef: input.task.id,
    planRef: 'milestone-f-gray-plan-01',
    payload: {
      selected_skills: built.package.selected_skills,
      qc_result: qc,
      fallback: built.fallback,
      summary: 'milestone F gray acceptance real business flow',
    },
  });

  validateObservability(bpView, 'betterPrompt');
  validateObservability(bundleView, 'skillBundle');

  // Final pass/fail
  const pass =
    qc.pass === true &&
    (bundleHit || bundleFallbackRecord?.fallback?.fallback_used === true) &&
    bpView.observability &&
    bundleView.observability;

  const result = {
    milestone: 'F',
    gate: 'gray-acceptance-real-flow',
    flow_id: FLOW_ID,
    pass: Boolean(pass),
    checks: {
      input_task_goal: input.task.goal,
      betterprompt_package_ready: Boolean(built.package),
      betterprompt_qc_pass: qc.pass === true,
      bundle_recommendation_hit: bundleHit,
      bundle_fallback_used: bundleFallbackRecord?.fallback?.fallback_used === true,
      run_center_observability: {
        betterprompt: bpView.observability,
        skillbundle: bundleView.observability,
      },
    },
    recommendation: {
      min_launch_gate: [
        '必须通过本脚本（pass=true）',
        'betterPrompt QC pass 且 package 非空',
        'bundle 命中或 fallback_used=true（二选一）',
        'run center 关键字段完整：status/duration_ms/trace_refs/alert_level',
      ],
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
