import { z } from 'zod';

const NonEmptyString = z.string().trim().min(1);

// ── betterPrompt v1 Input Contract ─────────────────────────────────────────
// Canonical input shape: { prompt: string, goal_hint?: string, skillAssets?: array }

export const BetterPromptV1Input = z.object({
  prompt: NonEmptyString,
  goal_hint: NonEmptyString.optional(),
  skillAssets: z.array(z.any()).optional(),
});

export function normalizeBetterPromptV1Input(input) {
  if (typeof input === 'string') {
    return { prompt: input };
  }

  if (input && typeof input === 'object') {
    const obj = input;
    if (typeof obj.prompt === 'string' && obj.prompt.trim().length > 0) {
      return { prompt: obj.prompt, goal_hint: obj.goal_hint, skillAssets: obj.skillAssets };
    }
    if (typeof obj.task?.goal === 'string' && obj.task.goal.trim().length > 0) {
      return { prompt: obj.task.goal, goal_hint: obj.goal_hint || obj.context?.intent, skillAssets: obj.skillAssets };
    }
    if (typeof obj.goal === 'string' && obj.goal.trim().length > 0) {
      return { prompt: obj.goal, goal_hint: obj.goal_hint, skillAssets: obj.skillAssets };
    }
    if (typeof obj.description === 'string' && obj.description.trim().length > 0) {
      return { prompt: obj.description, goal_hint: obj.goal_hint, skillAssets: obj.skillAssets };
    }
  }

  return { prompt: '' };
}

export function validateBetterPromptV1Input(input) {
  return BetterPromptV1Input.safeParse(normalizeBetterPromptV1Input(input));
}

// ── betterPrompt v1 Output Contract ────────────────────────────────────────

const DecompositionItemSchema = z.object({
  source_skill_ref: NonEmptyString,
  normalized_tag: NonEmptyString,
});

const SectionsSchema = z.object({
  goal: NonEmptyString,
  boundaries: z.array(NonEmptyString).min(1),
  execution_skeleton: z.array(NonEmptyString).min(1),
  constraints: z.array(NonEmptyString).min(1),
  acceptance: z.array(NonEmptyString).min(1),
  delivery: z.array(NonEmptyString).min(1),
  output_requirements: z.array(NonEmptyString).min(1),
});

const TracesSchema = z.object({
  resolved_skill_ids: z.array(NonEmptyString),
  semantic_summary: NonEmptyString,
  assembled_prompt_preview: NonEmptyString,
});

const QCSchema = z.object({
  pass: z.boolean(),
  score: z.number().min(0).max(100),
  tags: z.array(NonEmptyString),
  checks: z.array(z.any()),
  issues: z.array(z.any()),
});

export const BetterPromptV1Output = z.object({
  version: z.literal('betterprompt.v1'),
  contract: z.object({
    input: NonEmptyString,
    output: NonEmptyString,
  }),
  input: z.object({
    prompt: NonEmptyString,
    goal_hint: NonEmptyString.optional(),
  }),
  output: z.object({
    sections: SectionsSchema,
    template: NonEmptyString,
    decomposition: z.array(DecompositionItemSchema).min(1),
  }),
  traces: TracesSchema,
  qc: QCSchema,
});

export function validateBetterPromptV1Output(output) {
  return BetterPromptV1Output.safeParse(output);
}
