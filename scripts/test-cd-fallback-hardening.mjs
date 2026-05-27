import assert from 'node:assert/strict';

import { buildBetterPromptPackage } from '../src/skillforge/betterprompt-builder.mjs';
import { buildBetterPromptRunCenterView } from '../src/skillforge/betterprompt-run-center-view.mjs';
import { buildSkillBundleFallback } from '../src/skillforge/skill-bundle-fallback.mjs';
import { buildSkillBundleExecutionRecord } from '../src/skillforge/skill-bundle-execution-record.mjs';
import { buildSkillBundleRunCenterView } from '../src/skillforge/skill-bundle-run-center-view.mjs';

const badInput = {
  version: '1.0.0',
  task: {
    id: 'cd-bad-001',
    type: 'analysis',
    goal: '推进一个完全未知域任务，不给候选 skill，也不提供可识别能力线索',
    success_criteria: ['给出可执行包'],
  },
  context: { project: 'workflow-kit', facts: ['该场景故意弱输入'] },
  skills: { candidates: [], bundle_refs: [] },
  constraints: { hard: ['只在现有框架内最小增量'], soft: [], risk_level: 'high' },
  runtime: { language: 'zh-CN' },
};

const built = await buildBetterPromptPackage(badInput);
assert.equal(typeof built.qc_result?.pass, 'boolean');
assert.equal(built.fallback?.fallback_used, built.qc_result.pass !== true);
assert.equal(typeof built.fallback?.recoverable, 'boolean');
assert.equal(typeof built.fallback?.package_minimal_ready, 'boolean');

const bpView = buildBetterPromptRunCenterView({
  id: 'bp-fallback-001',
  source: 'betterprompt-builder',
  status: built.qc_result.pass ? 'completed' : 'degraded',
  durationMs: 12,
  traceRefs: ['bp:cd-fallback'],
  payload: {
    selected_skills: built.package.selected_skills || [],
    qc_result: built.qc_result,
    fallback: built.fallback,
  },
});
assert.ok(bpView.fallback && typeof bpView.fallback === 'object');
assert.ok(['info', 'warn', 'error'].includes(bpView.observability.alert_level));

const lowConfidenceMatch = { selectedSkills: ['contract-driven-dev'], score: 4.2, reason: 'hit weakly' };
const noHitMatch = { selectedSkills: [], score: 0, reason: 'no semantic overlap' };

const lowFb = buildSkillBundleFallback(lowConfidenceMatch, { lowConfidenceThreshold: 8 });
const noHitFb = buildSkillBundleFallback(noHitMatch, { lowConfidenceThreshold: 8 });

assert.equal(lowFb.fallback_used, true);
assert.equal(lowFb.confidence, 'low');
assert.equal(lowFb.non_blocking, true);
assert.equal(noHitFb.fallback_used, true);
assert.equal(noHitFb.confidence, 'none');
assert.equal(noHitFb.non_blocking, true);

const bundleRecord = buildSkillBundleExecutionRecord(
  { projectGoal: 'unknown mission', context: 'minimal coverage', candidates: [], topK: 3 },
  noHitMatch,
  { status: 'completed', durationMs: 7 },
);
assert.ok(bundleRecord.fallback && bundleRecord.fallback.fallback_used === true);

const sbView = buildSkillBundleRunCenterView(bundleRecord);
assert.ok(sbView.fallback && sbView.fallback.fallback_used === true);
assert.equal(sbView.observability.alert_level, 'warn');

console.log('✅ C/D fallback hardening acceptance passed (betterPrompt + Skill Bundle)');
