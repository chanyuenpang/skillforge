import assert from 'node:assert/strict';
import { buildSkillBundleExecutionRecord } from '../src/skillforge/skill-bundle-execution-record.mjs';
import { buildSkillBundleRunCenterView } from '../src/skillforge/skill-bundle-run-center-view.mjs';

const input = {
  projectGoal: '给 betterPrompt 做 Skill Bundle soft recommendation',
  context: 'Milestone E Run Center 兼容验证',
  candidates: ['planning', 'prompt-polish', 'risk-check'],
  topK: 2,
};

const matchResult = {
  selectedSkills: ['planning', 'prompt-polish'],
  score: 0.86,
  reason: '覆盖了规划与提示词打磨能力',
};

const record = buildSkillBundleExecutionRecord(input, matchResult, {
  durationMs: 123,
  planRef: 'plan-e-001',
  taskRef: 'task-e-043',
  traceRefs: { traceId: 'trace-e-043' },
  artifactPath: 'artifacts/skill-bundle/exec-001.json',
});

const view = buildSkillBundleRunCenterView(record);

assert.equal(view.kind, 'skillbundle.run');
assert.equal(view.source, 'skill-bundle-soft-recommendation');
assert.equal(view.status, 'completed');
assert.equal(typeof view.id, 'string');
assert.equal(typeof view.createdAt, 'string');
assert.equal(view.selectedCount, 2);
assert.deepEqual(view.selectedSkills, ['planning', 'prompt-polish']);
assert.equal(view.score, 0.86);
assert.equal(view.reason, '覆盖了规划与提示词打磨能力');
assert.equal(view.planRef, 'plan-e-001');
assert.equal(view.taskRef, 'task-e-043');
assert.equal(view.artifactRef, 'artifacts/skill-bundle/exec-001.json');

console.log('✅ skill-bundle run-center-view test passed');
