import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCompiledOutput } from '../../src/skillforge/betterprompt-builder.mjs';

test('normalizeCompiledOutput accepts lightweight compilation fields', () => {
  const normalized = normalizeCompiledOutput({
    objective: 'Validate the browser page flow and report issues.',
    stepOutline: [
      'Check prerequisites and open the target page.',
      'Walk through the main page flow and note any blockers.',
      'Summarize findings with concise evidence.',
    ],
    completionCriteria: [
      'The main browser flow is checked end to end.',
      'The final report includes evidence-oriented findings.',
    ],
    hardConstraints: ['Do not modify application code during validation.'],
    stopRules: ['Stop if the page cannot be opened or prerequisites fail.'],
    reportSections: ['Summary', 'Evidence', 'Blocking issues'],
    artifacts: ['Screenshots if relevant'],
    rationale: ['The task is a browser validation workflow.'],
  });

  assert.equal(normalized.execution.objective, 'Validate the browser page flow and report issues.');
  assert.equal(normalized.execution.steps.length, 3);
  assert.equal(normalized.execution.steps[0].id, 'step-1');
  assert.deepEqual(normalized.report.requiredSections, ['Summary', 'Evidence', 'Blocking issues']);
  assert.deepEqual(normalized.constraints.hard, ['Do not modify application code during validation.']);
});
