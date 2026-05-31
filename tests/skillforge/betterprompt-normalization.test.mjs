import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCompiledOutput, renderReferencedSkills, summarizeCandidate } from '../../src/skillforge/betterprompt-builder.mjs';
import { validateBetterPromptV1Output } from '../../src/skillforge/betterprompt-v1-contract.mjs';

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

test('renderReferencedSkills includes only skill refs', () => {
  const text = renderReferencedSkills({
    selected: [
      {
        id: 'local-skills:browser-agent-workflow',
        name: 'browser-agent-workflow',
        kind: 'skill',
        description: 'Use browser automation workflow.',
        sourceRef: { path: 'skills/browser-agent-workflow/SKILL.md' },
        entrypointHints: ['browseros-cli'],
        workflowSkeletonSummary: 'Check prerequisites, execute browser flow, and report evidence.',
      },
    ],
  });

  assert.match(text, /Referenced skills to consult if needed:/);
  assert.match(text, /skills\/browser-agent-workflow\/SKILL\.md/);
  assert.doesNotMatch(text, /Workflow hint:/);
  assert.doesNotMatch(text, /Entrypoints:/);
  assert.doesNotMatch(text, /Report hints:/);
});

test('betterprompt output schema accepts lightweight diagnostics timings', () => {
  const result = validateBetterPromptV1Output({
    version: 'betterprompt.v2',
    executorPrompt: 'Modify compiler/compile.py to add duplicate id detection and report the changed files.',
    input: { rawPrompt: 'Modify compile.py duplicate id detection' },
    routing: {
      selected: [
        {
          id: 'local-skills:coding-agent-workflow',
          name: 'coding-agent-workflow',
          kind: 'skill',
          description: 'Code execution workflow',
          sourceRef: { path: 'skills/coding-agent-workflow/SKILL.md' },
        },
      ],
      rejected: [],
      rationale: ['Code modification task'],
      toolGate: { projectToolContext: [], runtimeToolContext: [] },
    },
    guidance: {
      objective: 'Add duplicate id detection',
      stepOutline: ['Inspect compile.py', 'Add validation', 'Report changes'],
      hardConstraints: ['Keep changes minimal'],
      stopRules: [],
      nonGoals: [],
      reportHints: ['Modified files', 'Validation command'],
      artifacts: [],
    },
    trace: {
      sourcePromptRef: 'spawn-input',
      skillRefs: ['skills/coding-agent-workflow/SKILL.md'],
      planId: null,
      taskId: null,
    },
    diagnostics: {
      timings: {
        routingMs: 120,
        compilationMs: 640,
        totalMs: 760,
      },
      model: {
        routing: 'glm-5-turbo',
        compilation: 'glm-5-turbo',
      },
    },
    qc: {
      pass: true,
      score: 100,
      tags: ['routing-aware', 'executor-ready'],
      issues: [],
    },
  });

  assert.equal(result.success, true);
});

test('summarizeCandidate preserves id and kind for output validation', () => {
  const summary = summarizeCandidate({
    id: 'local-skills:coding-agent-workflow',
    name: 'coding-agent-workflow',
    kind: 'subagent',
    description: 'Code execution workflow',
    sourceRef: { path: 'skills/coding-agent-workflow/SKILL.md' },
  });

  assert.equal(summary.id, 'local-skills:coding-agent-workflow');
  assert.equal(summary.kind, 'subagent');
});
