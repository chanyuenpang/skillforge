import test from 'node:test';
import assert from 'node:assert/strict';
import { renderReviewText } from '../../src/skillforge/betterplan-pipeline.mjs';

test('renderReviewText includes explicit workflow guidance block', () => {
  const text = renderReviewText({
    summary: 'Plan needs refinement.',
    findings: [
      {
        severity: 'warning',
        basis: 'workflow',
        type: 'missing_precheck',
        message: 'The plan skips prerequisite verification.',
        suggestion: 'Add a prerequisite verification task before the execution tasks.',
      },
      {
        severity: 'warning',
        basis: 'general',
        type: 'granularity',
        message: 'One task mixes implementation and validation.',
        suggestion: 'Split implementation and validation into separate atomic tasks.',
      },
    ],
  });

  assert.match(text, /Workflow guidance:/);
  assert.match(text, /Add a prerequisite verification task before the execution tasks\./);
  assert.match(text, /\[WARNING\]\[workflow\]/);
});
