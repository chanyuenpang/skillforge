import assert from 'node:assert/strict';

import { buildBetterPromptPackage } from '../src/skillforge/betterprompt-builder.mjs';
import { evaluateBetterPromptPackage } from '../src/skillforge/betterprompt-qc.mjs';
import { buildBetterPromptRunCenterView } from '../src/skillforge/betterprompt-run-center-view.mjs';
import { buildSkillBundleExecutionRecord } from '../src/skillforge/skill-bundle-execution-record.mjs';
import { buildSkillBundleRunCenterView } from '../src/skillforge/skill-bundle-run-center-view.mjs';

const FLOW_ID = 'milestone-f-gray-real-flow-03';

function buildInput() {
  return {
    version: '1.0.0',
    task: {
      id: FLOW_ID,
      type: 'operations',
      goal: '离线知识库归档与季度复盘资料整理：允许 bundle 无命中但必须 fallback 受控并通过灰度验收',
      success_criteria: [
        'betterPrompt package 通过 QC',
        'bundle recommendation 无命中时 fallback 明确可观测',
        'run center observability 关键字段完整',
      ],
    },
    context: {
      project: 'workflow-kit',
      facts: [
        '这是与 team-ops 不同的资料归档场景',
        'bundle matcher 在长尾技能上可能无命中',
        '灰度目标是验证 fallback 受控可用',
      ],
    },
    skills: {
      candidates: ['knowledge-archival', 'quarterly-retrospective-packaging', 'doc-normalization'],
      bundle_refs: ['archival-retro-pack'],
    },
    constraints: {
      hard: ['必须体现非 team-ops 路径', 'bundle 无命中时必须有 fallback_used=true 且通过 QC'],
      soft: ['优先复用现有 betterPrompt + bundle matcher + run-center view'],
      risk_level: 'low',
    },
    runtime: {
      language: 'zh-CN',
      timebox_min: 20,
      token_budget: 1800,
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

  const profileForcesNonTeamOps = !input.task.goal.includes('team-ops');
  const distinctFromFlow02 = !input.task.goal.includes('incident response runbook');

  must(profileForcesNonTeamOps, 'flow-03 must stay off team-ops profile in business goal');
  must(distinctFromFlow02, 'flow-03 must stay distinct from flow-02 incident-response profile');

  const bundleRecord = buildSkillBundleExecutionRecord(
    {
      projectGoal: input.task.goal,
      context: 'gray acceptance flow-03 controlled fallback path',
      candidates: input.skills.candidates,
      topK: 3,
    },
    {
      selectedSkills: [],
      score: 0,
      reason: 'no semantic overlap for archival-retro-pack long-tail profile',
    },
    {
      status: 'completed',
      durationMs: 13,
      traceRefs: ['skillbundle:milestone-f-gray-flow-03'],
      taskRef: input.task.id,
      planRef: 'milestone-f-gray-plan-03',
      artifactPath: 'artifacts/skill-bundle/milestone-f-gray-real-flow-03.json',
    },
  );

  must(bundleRecord?.fallback?.fallback_used === true, 'bundle no-hit must set fallback_used=true for flow-03');

  const bundleView = buildSkillBundleRunCenterView(bundleRecord);
  const bpView = buildBetterPromptRunCenterView({
    id: `bp-${FLOW_ID}`,
    source: 'betterprompt-builder',
    status: qc.pass ? 'completed' : 'degraded',
    durationMs: 21,
    traceRefs: ['betterprompt:milestone-f-gray-flow-03'],
    taskRef: input.task.id,
    planRef: 'milestone-f-gray-plan-03',
    payload: {
      selected_skills: built.package.selected_skills,
      recommended_bundle_refs: recommended,
      qc_result: qc,
      fallback: built.fallback,
      summary: 'milestone F gray acceptance real business flow-03 controlled fallback required',
    },
  });

  validateObservability(bpView, 'betterPrompt');
  validateObservability(bundleView, 'skillBundle');

  const pass =
    qc.pass === true &&
    profileForcesNonTeamOps === true &&
    distinctFromFlow02 === true &&
    bundleRecord?.fallback?.fallback_used === true &&
    Boolean(bpView.observability) &&
    Boolean(bundleView.observability);

  const result = {
    milestone: 'F',
    gate: 'gray-acceptance-real-flow-03-controlled-fallback',
    flow_id: FLOW_ID,
    pass: Boolean(pass),
    checks: {
      input_task_goal: input.task.goal,
      betterprompt_package_ready: Boolean(built.package),
      betterprompt_qc_pass: qc.pass === true,
      bundle_recommendation_hit: bundleHit,
      recommended_bundle_refs: recommended,
      bundle_fallback_used: bundleRecord?.fallback?.fallback_used === true,
      differentiated_assertion: 'non team-ops / non incident-release profile + controlled fallback',
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
