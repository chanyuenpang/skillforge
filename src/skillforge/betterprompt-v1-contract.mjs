import { z } from 'zod';

const NonEmptyString = z.string().trim().min(1);

const CandidateSkillSchema = z.object({
  id: NonEmptyString,
  name: NonEmptyString,
  kind: z.enum(['skill', 'subagent']).default('skill'),
  description: NonEmptyString,
  sourceRef: z.object({ path: NonEmptyString }).optional(),
  requiredTools: z.array(NonEmptyString).optional(),
  entrypointHints: z.array(NonEmptyString).optional(),
  reportHints: z.array(NonEmptyString).optional(),
  stopRuleHints: z.array(NonEmptyString).optional(),
  constraintHints: z.array(NonEmptyString).optional(),
  workflowSkeletonSummary: z.string().optional(),
});

export const BetterPromptV1Input = z.object({
  rawPrompt: NonEmptyString,
  goal_hint: NonEmptyString.optional(),
  taskContext: z.object({
    taskId: z.string().optional(),
    title: z.string().optional(),
    goal: z.string().optional(),
    constraints: z.array(NonEmptyString).optional(),
  }).optional(),
  planContext: z.object({
    planId: z.string().optional(),
    milestoneId: z.string().optional(),
    upstreamDependencies: z.array(NonEmptyString).optional(),
  }).optional(),
  projectToolContext: z.array(NonEmptyString).optional(),
  runtimeToolContext: z.array(NonEmptyString).optional(),
  candidateSkills: z.array(CandidateSkillSchema).optional(),
});

export function normalizeBetterPromptV1Input(input) {
  if (typeof input === 'string') return { rawPrompt: input };
  if (!input || typeof input !== 'object') return { rawPrompt: '' };

  if (typeof input.rawPrompt === 'string' && input.rawPrompt.trim()) return input;
  if (typeof input.prompt === 'string' && input.prompt.trim()) {
    return {
      rawPrompt: input.prompt,
      goal_hint: input.goal_hint,
      taskContext: input.taskContext,
      planContext: input.planContext,
      candidateSkills: input.candidateSkills || input.skillAssets,
      projectToolContext: input.projectToolContext,
      runtimeToolContext: input.runtimeToolContext,
    };
  }
  if (typeof input.task?.goal === 'string' && input.task.goal.trim()) {
    return {
      rawPrompt: input.task.goal,
      goal_hint: input.goal_hint || input.context?.intent,
      taskContext: input.taskContext || { goal: input.task.goal },
      planContext: input.planContext,
      candidateSkills: input.candidateSkills || input.skillAssets,
      projectToolContext: input.projectToolContext,
      runtimeToolContext: input.runtimeToolContext,
    };
  }
  return { rawPrompt: '' };
}

export function validateBetterPromptV1Input(input) {
  return BetterPromptV1Input.safeParse(normalizeBetterPromptV1Input(input));
}

export const BetterPromptV1Output = z.object({
  version: z.literal('betterprompt.v2'),
  input: z.object({
    rawPrompt: NonEmptyString,
    goal_hint: z.string().optional(),
  }),
  routing: z.object({
    selected: z.array(CandidateSkillSchema),
    rejected: z.array(z.object({
      id: NonEmptyString,
      reason: NonEmptyString,
    })),
    rationale: z.array(NonEmptyString).min(1),
    toolGate: z.object({
      projectToolContext: z.array(NonEmptyString),
      runtimeToolContext: z.array(NonEmptyString),
    }),
  }),
  execution: z.object({
    objective: NonEmptyString,
    steps: z.array(z.object({
      id: NonEmptyString,
      title: NonEmptyString,
      intent: NonEmptyString,
      entrypoint: z.string().optional(),
      checks: z.array(NonEmptyString).min(1),
    })).min(1),
    completionCriteria: z.array(NonEmptyString).min(1),
  }),
  constraints: z.object({
    hard: z.array(NonEmptyString),
    stopRules: z.array(NonEmptyString),
    nonGoals: z.array(NonEmptyString),
  }),
  report: z.object({
    requiredSections: z.array(NonEmptyString).min(1),
    artifacts: z.array(NonEmptyString),
  }),
  trace: z.object({
    sourcePromptRef: NonEmptyString,
    skillRefs: z.array(NonEmptyString).min(1),
    planId: z.string().nullable().optional(),
    taskId: z.string().nullable().optional(),
  }),
  qc: z.object({
    pass: z.boolean(),
    score: z.number().min(0).max(100),
    tags: z.array(NonEmptyString),
    issues: z.array(z.string()),
  }),
});

export function validateBetterPromptV1Output(output) {
  return BetterPromptV1Output.safeParse(output);
}
