/**
 * betterplan-contract.mjs — betterPlan v1 input/output contract
 *
 * Input:  { plan: string, goal_hint?: string }
 * Output: lightweight task skeleton { goal, boundaries, skeleton, ... }
 *
 * Principles:
 *  - Program validates structure; LLM fills content
 *  - Output is a skeleton, not a full workflow with atomic tasks
 *  - No phase state machine, no governance pipeline
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNonEmptyStringArray(value) {
  return Array.isArray(value) && value.length > 0 && value.every((item) => hasText(item));
}

function pushError(errors, field, message) {
  errors.push({ field, message });
}

// ── Input Contract ───────────────────────────────────────────────────────────

/**
 * BetterPlanInput
 * @property {string}  plan       — raw plan text (plan_write original or user-provided)
 * @property {string}  [goal_hint] — optional high-level goal hint
 */
export const BetterPlanInputSchema = Object.freeze({
  name: 'BetterPlanInput',
  version: '1.0.0',
  fields: Object.freeze({
    plan: 'string (required, non-empty, max ~32000 chars)',
    goal_hint: 'string (optional)',
    max_tokens: 'number (optional, LLM output limit)',
  }),
});

export function validateBetterPlanInput(input) {
  const errors = [];

  if (!isPlainObject(input)) {
    pushError(errors, '$', 'input must be an object');
    return { valid: false, errors };
  }

  if (!hasText(input.plan)) {
    pushError(errors, 'plan', 'is required and must be a non-empty string');
  } else if (input.plan.length > 64000) {
    pushError(errors, 'plan', 'exceeds 64000 character limit');
  }

  // goal_hint is optional, but if present must be a string
  if (input.goal_hint !== undefined && input.goal_hint !== null && typeof input.goal_hint !== 'string') {
    pushError(errors, 'goal_hint', 'must be a string if provided');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ── Output Contract ──────────────────────────────────────────────────────────

/**
 * BetterPlanOutput — lightweight task skeleton
 *
 * @property {object[]} skeleton  — ordered task skeleton steps
 *   @property {string}   id         — unique step identifier
 *   @property {string}   title      — short task name
 *   @property {number}   order      — execution order (1-based)
 *   @property {string[]} dependsOn  — ids this step depends on
 * @property {string}     goal           — distilled goal
 * @property {string[]}   boundaries     — scope boundaries / hard constraints
 * @property {string}     order_rationale — why this ordering
 * @property {string[]}   keyPoints      — extracted key points / main takeaways
 * @property {string[]}   gaps           — identified gaps or unknowns
 * @property {string}     closure_condition — how to determine completion
 * @property {string}     [plan_title]   — suggested plan title (optional)
 * @property {number}     confidence     — LLM confidence estimate (0-1)
 */
export const BetterPlanOutputSchema = Object.freeze({
  name: 'BetterPlanOutput',
  version: '1.1.0',
  fields: Object.freeze({
    goal: 'string (required, non-empty)',
    plan_title: 'string (optional)',
    boundaries: ['string (non-empty)'],
    skeleton: [
      {
        id: 'string (required)',
        title: 'string (required)',
        order: 'number (positive integer)',
        dependsOn: ['string'],
      },
    ],
    keyPoints: ['string'],
    order_rationale: 'string (required, non-empty)',
    gaps: ['string'],
    closure_condition: 'string (required, non-empty)',
    confidence: 'number (0-1)',
  }),
});

// ── Output Validation ────────────────────────────────────────────────────────

function validateSkeletonStep(step, index, errors, path) {
  const itemPath = `${path}[${index}]`;

  if (!isPlainObject(step)) {
    pushError(errors, itemPath, 'must be an object');
    return;
  }

  if (!hasText(step.id)) pushError(errors, `${itemPath}.id`, 'is required');
  if (!hasText(step.title)) pushError(errors, `${itemPath}.title`, 'is required');
  if (!Number.isFinite(step.order) || step.order <= 0) {
    pushError(errors, `${itemPath}.order`, 'must be a positive number');
  }
  if (!Array.isArray(step.dependsOn)) {
    pushError(errors, `${itemPath}.dependsOn`, 'must be an array of strings');
  } else if (!step.dependsOn.every((d) => typeof d === 'string')) {
    pushError(errors, `${itemPath}.dependsOn`, 'each element must be a string');
  }
}

export function validateBetterPlanOutput(output) {
  const errors = [];

  if (!isPlainObject(output)) {
    pushError(errors, '$', 'output must be an object');
    return { valid: false, errors };
  }

  // Required fields
  if (!hasText(output.goal)) pushError(errors, 'goal', 'is required');

  // boundaries: at least 1 non-empty string
  if (!Array.isArray(output.boundaries)) {
    pushError(errors, 'boundaries', 'must be an array');
  } else if (output.boundaries.length === 0) {
    pushError(errors, 'boundaries', 'must have at least 1 entry');
  } else if (!output.boundaries.every((b) => hasText(b))) {
    pushError(errors, 'boundaries', 'each entry must be a non-empty string');
  }

  // skeleton: at least 1 step
  if (!Array.isArray(output.skeleton)) {
    pushError(errors, 'skeleton', 'must be an array');
  } else if (output.skeleton.length === 0) {
    pushError(errors, 'skeleton', 'must have at least 1 step');
  } else {
    output.skeleton.forEach((step, index) => validateSkeletonStep(step, index, errors, 'skeleton'));
  }

  if (!hasText(output.order_rationale)) pushError(errors, 'order_rationale', 'is required');

  // keyPoints: array (can be empty, but should exist)
  if (output.keyPoints !== undefined && !Array.isArray(output.keyPoints)) {
    pushError(errors, 'keyPoints', 'must be an array');
  }

  // gaps: array (can be empty)
  if (!Array.isArray(output.gaps)) {
    pushError(errors, 'gaps', 'must be an array');
  }

  if (!hasText(output.closure_condition)) pushError(errors, 'closure_condition', 'is required');

  // confidence: number 0-1
  if (typeof output.confidence !== 'number' || output.confidence < 0 || output.confidence > 1) {
    pushError(errors, 'confidence', 'must be a number between 0 and 1');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export default {
  BetterPlanInputSchema,
  BetterPlanOutputSchema,
  validateBetterPlanInput,
  validateBetterPlanOutput,
};
