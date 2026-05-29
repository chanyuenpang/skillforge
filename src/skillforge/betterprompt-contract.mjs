import { z } from 'zod';

const NonEmptyString = z.string().trim().min(1);

const TaskSchema = z.object({
  id: NonEmptyString.optional(),
  goal: NonEmptyString,
  type: NonEmptyString,
  success_criteria: z.array(NonEmptyString).min(1).optional(),
});

// Upstream suggestion shapes (varying sources, loosely validated)
const SemanticAssetSchema = z.object({
  summary: NonEmptyString.optional(),
  capabilities: z.array(NonEmptyString).optional(),
  constraints: z.array(NonEmptyString).optional(),
  intent: z.array(NonEmptyString).optional(),
  quality: z.object({ passed: z.boolean().optional() }).optional(),
  extractor: NonEmptyString.optional(),
}).passthrough();

const PlanSuggestionSchema = z.object({
  milestones: z.array(z.object({
    title: NonEmptyString.optional(),
    tasks: z.array(z.object({ title: NonEmptyString.optional() }).passthrough()).optional(),
  }).passthrough()).optional(),
  suggested_skill_refs: z.array(NonEmptyString).optional(),
  steps: z.array(NonEmptyString).optional(),
  title: NonEmptyString.optional(),
  summary: NonEmptyString.optional(),
}).passthrough();

const WorkflowSuggestionSchema = z.object({
  summary: NonEmptyString.optional(),
  milestones: z.array(z.object({
    name: NonEmptyString.optional(),
    objective: NonEmptyString.optional(),
    title: NonEmptyString.optional(),
  }).passthrough()).optional(),
  suggested_skill_refs: z.array(NonEmptyString).optional(),
  atomicTasks: z.array(z.object({
    title: NonEmptyString.optional(),
    goal: NonEmptyString.optional(),
    summary: NonEmptyString.optional(),
  }).passthrough()).optional(),
}).passthrough();

const ContextSchema = z.object({
  project: NonEmptyString,
  artifacts: z.array(NonEmptyString).optional(),
  facts: z.array(NonEmptyString).optional(),
  semantic_asset: SemanticAssetSchema.optional(),
  plan_suggestion: PlanSuggestionSchema.optional(),
  workflow_suggestion: WorkflowSuggestionSchema.optional(),
});

const SkillsSchema = z.object({
  candidates: z.array(NonEmptyString).optional(),
  bundle_refs: z.array(NonEmptyString).optional(),
});

const ConstraintsSchema = z.object({
  hard: z.array(NonEmptyString).optional(),
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

const DeliveryPackageSchema = z.object({
  finalGuidance: z.array(NonEmptyString).min(1),
  finalPackage: z.object({
    deliveryType: NonEmptyString,
    objective: NonEmptyString,
    executionSequence: z.array(NonEmptyString).min(1),
  }),
  selfCheck: z.object({
    pass: z.boolean(),
    summary: NonEmptyString,
    checks: z.array(NonEmptyString),
    issues: z.array(NonEmptyString),
  }),
  assumptions: z.array(NonEmptyString).min(1),
  applicableScope: z.array(NonEmptyString).min(1),
  nonApplicableCases: z.array(NonEmptyString).min(1),
  failureModes: z.array(NonEmptyString).min(1),
  correctionActions: z.array(NonEmptyString).min(1),
  expectedImprovement: z.object({
    baseline: NonEmptyString,
    now: NonEmptyString,
    delta: z.array(NonEmptyString).min(1),
  }),
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
  delivery_package: DeliveryPackageSchema,
});

export function validateBetterPromptInput(input) {
  return BetterPromptInput.safeParse(input);
}

export function validateBetterPromptOutput(output) {
  return BetterPromptOutput.safeParse(output);
}
