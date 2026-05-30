import test from 'node:test';
import assert from 'node:assert/strict';
import { BETTERPLAN_REVIEW_SKILL } from '../../src/skillforge/system-skills.mjs';

test('betterplan review skill emphasizes execution-plan atomicity', () => {
  const prompt = BETTERPLAN_REVIEW_SKILL.buildUserPrompt(
    '- implement feature\n- test feature\n- write report',
    'ship an implementation plan',
    [{ id: 'local-skills:task-planning', name: 'task-planning' }],
  );

  assert.match(prompt, /execution plan/i);
  assert.match(prompt, /atomicity as a primary review rule/i);
  assert.match(prompt, /one subagent can finish it independently/i);
  assert.match(prompt, /objective[\s\S]*scope[\s\S]*inputs[\s\S]*expected output/i);
});
