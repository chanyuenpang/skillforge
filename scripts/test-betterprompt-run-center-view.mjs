import assert from 'node:assert/strict';
import { buildBetterPromptRunCenterView } from '../src/skillforge/betterprompt-run-center-view.mjs';

const record = {
  executionId: 'exec-bp-001',
  source: 'betterprompt-pipeline',
  timestamp: '2026-05-28T00:00:00.000Z',
  status: 'completed',
  durationMs: 321,
  planRef: 'plan-bp-1',
  taskRef: 'task-bp-1',
  payload: {
    title: 'BetterPrompt test run',
    summary: 'Generate prompt package for landing milestone C/E',
    selected_skills: ['planning', 'prompt-polish'],
    qc_result: 'pass',
    promptPackageType: 'landing-milestone-pack',
  },
  artifactRef: 'artifacts/betterprompt/exec-bp-001.json',
  evidenceRefs: {
    traceId: 'trace-001',
  },
};

const view = buildBetterPromptRunCenterView(record);

assert.equal(view.kind, 'betterPromptRunCenterView');
assert.equal(view.source, 'betterprompt-pipeline');
assert.equal(view.id, 'exec-bp-001');
assert.equal(view.createdAt, '2026-05-28T00:00:00.000Z');
assert.equal(view.status, 'completed');
assert.equal(view.title, 'BetterPrompt test run');
assert.equal(view.summary, 'Generate prompt package for landing milestone C/E');
assert.deepEqual(view.selected_skills, ['planning', 'prompt-polish']);
assert.equal(view.qc_result, 'pass');
assert.equal(view.promptPackageType, 'landing-milestone-pack');
assert.equal(view.planRef, 'plan-bp-1');
assert.equal(view.taskRef, 'task-bp-1');
assert.equal(view.artifactRef, 'artifacts/betterprompt/exec-bp-001.json');
assert.equal(view.durationMs, 321);
assert.deepEqual(view.traceRefs, { traceId: 'trace-001' });

console.log('✅ betterprompt run-center-view test passed');
