import { z } from 'zod';

const NonEmptyString = z.string().trim().min(1);

const TaskSchema = z.object({
  id: NonEmptyString.optional(),
  goal: NonEmptyString,
  type: NonEmptyString,
  success_criteria: z.array(NonEmptyString).min(1).optional(),
});

const ContextSchema = z.object({
  project: NonEmptyString,
  artifacts: z.array(NonEmptyString).optional(),
  facts: z.array(NonEmptyString).optional(),
});

const SkillsSchema = z.object({
  candidates: z.array(NonEmptyString).optional(),
  bundle_refs: z.array(NonEmptyString).optional(),
});

const ConstraintsSchema = z.object({
  hard: z.array(NonEmptyString).min(1),
  soft: z.array(NonEmptyString).optional(),
  output_format: NonEmptyString.optional(),
  risk_level: z.enum(['low', 'medium', 'high']).optional(),
});

const RuntimeSchema = z.object({
  timebox_min: z.number().int().positive().optional(),
  token_budget: z.number().int().positive().optional(),
  language: NonEmptyString,
});

export const BetterPromptInput = z.object({
  version: NonEmptyString,
  task: TaskSchema,
  context: ContextSchema,
  skills: SkillsSchema,
  constraints: ConstraintsSchema,
  runtime: RuntimeSchema,
});

const IntentSchema = z.object({
  task_id: NonEmptyString.optional(),
  goal: NonEmptyString,
  done_definition: z.array(NonEmptyString).min(1).optional(),
});

const PromptSchema = z.object({
  system: NonEmptyString,
  developer: NonEmptyString.optional(),
  user_template: NonEmptyString,
  input_slots: z.array(NonEmptyString),
});

const GuardrailsSchema = z.object({
  must_not: z.array(NonEmptyString).min(1),
  escalation_when: z.array(NonEmptyString).optional(),
});

export const BetterPromptOutput = z.object({
  version: NonEmptyString,
  package_id: NonEmptyString,
  intent: IntentSchema,
  selected_skills: z.array(NonEmptyString).optional(),
  recommended_bundle_refs: z.array(NonEmptyString).optional(),
  suggested_skill_refs: z.array(NonEmptyString).optional(),
  prompt: PromptSchema,
  execution_hints: z.array(NonEmptyString).optional(),
  guardrails: GuardrailsSchema,
  metadata: z.record(z.any()).optional(),
});

export function validateBetterPromptInput(input) {
  return BetterPromptInput.safeParse(input);
}

export function validateBetterPromptOutput(output) {
  return BetterPromptOutput.safeParse(output);
}
