import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTaskExtractionPrompt, normalizeTaskRecord, extractTaskRecord } from '../../src/skillforge/task-extraction.mjs';

test('normalizeTaskRecord produces stable routing fields', () => {
  const record = normalizeTaskRecord({
    summary: 'Run a runtime gameplay test',
    projectScope: 'tiny-world',
    taskTypes: ['verification', 'verification'],
    workflowStages: ['execution', 'reporting'],
    artifactTargets: ['runtime'],
    toolHints: ['godot-mcp-cli'],
    agentArchetypes: ['debug', 'review'],
    constraints: ['needs-evidence'],
    reportExpectations: ['summary-report'],
    openTags: ['runtime-gameplay-test'],
  });

  assert.equal(record.projectScope, 'tiny-world');
  assert.deepEqual(record.taskTypes, ['verification']);
  assert.deepEqual(record.workflowStages, ['execution', 'reporting']);
  assert.deepEqual(record.toolHints, ['godot-mcp-cli']);
  assert.deepEqual(record.openTags, ['runtime-gameplay-test']);
});

test('extractTaskRecord can use precomputed context.taskRecord without LM', async () => {
  const taskRecord = {
    summary: 'Review mission-control browser flow',
    projectScope: 'mission-control',
    taskTypes: ['review'],
    workflowStages: ['validation'],
    artifactTargets: ['ui'],
    toolHints: ['browseros-cli'],
    agentArchetypes: ['review'],
    constraints: ['needs-evidence'],
    reportExpectations: ['summary-report'],
    openTags: ['browser-review'],
  };

  const result = await extractTaskRecord({ context: { taskRecord } });
  assert.equal(result.meta.llmCalled, false);
  assert.equal(result.meta.source, 'context.taskRecord');
  assert.deepEqual(result.record.toolHints, ['browseros-cli']);
});

test('buildTaskExtractionPrompt includes routing-oriented context', () => {
  const prompt = buildTaskExtractionPrompt({
    intent: 'run runtime gameplay test',
    projectScope: 'tiny-world',
    tools: ['godot-mcp-cli'],
  });

  assert.match(prompt, /runtime gameplay test/i);
  assert.match(prompt, /tiny-world/i);
  assert.match(prompt, /godot-mcp-cli/i);
});
