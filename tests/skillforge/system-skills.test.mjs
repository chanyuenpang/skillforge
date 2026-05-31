import test from 'node:test';
import assert from 'node:assert/strict';
import { BETTERPLAN_REVIEW_SKILL, BETTERPROMPT_COMPILATION_SKILL } from '../../src/skillforge/system-skills.mjs';

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
  assert.match(prompt, /implementation, verification, and review should usually be separate tasks/i);
  assert.match(prompt, /verb-first/i);
  assert.match(prompt, /atomicity[\s\S]*stage completeness[\s\S]*workflow fit[\s\S]*completion clarity/i);
  assert.match(prompt, /engineering: research -> implement -> verify -> finish/i);
  assert.match(prompt, /documentation plans should usually keep review separate from writing/i);
  assert.match(prompt, /ops plans should usually keep execute separate from verify/i);
  assert.match(prompt, /suggestions should be concrete plan edits/i);
});

test('betterprompt compilation skill prefers concise execution briefs over tutorials', () => {
  const prompt = BETTERPROMPT_COMPILATION_SKILL.buildUserPrompt(
    {
      rawPrompt: 'Modify compiler/compile.py to detect duplicate ids and fail loudly.',
      goal_hint: 'Keep the change minimal and return validation commands.',
    },
    [
      {
        id: 'local-skills:coding-agent-workflow',
        name: 'coding-agent-workflow',
        kind: 'subagent',
      },
    ],
    [],
  );

  assert.match(prompt, /concise execution brief/i);
  assert.match(prompt, /not a tutorial/i);
  assert.match(prompt, /Do not name or explain the workflow in the main body/i);
  assert.match(prompt, /Prefer compact imperative language/i);
  assert.match(prompt, /Only make steps explicit when they are necessary for execution accuracy/i);
  assert.match(prompt, /do not mechanically mirror the original prompt structure/i);
  assert.match(prompt, /strip wrapper language like/i);
  assert.match(prompt, /a sharp objective/i);
  assert.match(prompt, /the non-negotiable constraints/i);
  assert.match(prompt, /Selected routed skills:/i);
  assert.doesNotMatch(prompt, /Rejected skills:/i);
});
