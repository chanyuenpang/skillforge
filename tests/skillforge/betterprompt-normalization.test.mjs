import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCompiledOutput } from '../../src/skillforge/betterprompt-builder.mjs';

test('normalizeCompiledOutput accepts lightweight compilation fields', () => {
  const normalized = normalizeCompiledOutput({
    executorPrompt: 'Check prerequisites first, validate the browser page flow, and return a concise evidence-oriented report.',
    objective: 'Validate the browser page flow and report issues.',
    stepOutline: [
      'Check prerequisites and open the target page.',
      'Walk through the main page flow and note any blockers.',
      'Summarize findings with concise evidence.',
    ],
    hardConstraints: ['Do not modify application code during validation.'],
    stopRules: ['Stop if the page cannot be opened or prerequisites fail.'],
    reportSections: ['Summary', 'Evidence', 'Blocking issues'],
    artifacts: ['Screenshots if relevant'],
    rationale: ['The task is a browser validation workflow.'],
  });

  assert.equal(normalized.executorPrompt, 'Check prerequisites first, validate the browser page flow, and return a concise evidence-oriented report.');
  assert.equal(normalized.guidance.objective, 'Validate the browser page flow and report issues.');
  assert.deepEqual(normalized.guidance.stepOutline, [
    'Check prerequisites and open the target page.',
    'Walk through the main page flow and note any blockers.',
    'Summarize findings with concise evidence.',
  ]);
  assert.deepEqual(normalized.guidance.reportHints, ['Summary', 'Evidence', 'Blocking issues']);
  assert.deepEqual(normalized.guidance.hardConstraints, ['Do not modify application code during validation.']);
});
