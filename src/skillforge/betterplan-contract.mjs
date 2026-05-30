function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function pushError(errors, field, message) {
  errors.push({ field, message });
}

const FINDING_SEVERITIES = new Set(['info', 'warning', 'error']);
const FINDING_BASES = new Set(['workflow', 'general']);

export const BetterPlanInputSchema = Object.freeze({
  name: 'BetterPlanInput',
  version: '2.0.0',
  fields: Object.freeze({
    plan: 'string (required, non-empty)',
    goal_hint: 'string (optional)',
    max_tokens: 'number (optional)',
  }),
});

export const BetterPlanOutputSchema = Object.freeze({
  name: 'BetterPlanOutput',
  version: '2.0.0',
  fields: Object.freeze({
    reviewText: 'string (required, non-empty)',
    summary: 'string (required, non-empty)',
    workflowBasis: ['string'],
    findings: [
      {
        severity: 'info|warning|error',
        basis: 'workflow|general',
        type: 'string (required)',
        message: 'string (required)',
        suggestion: 'string (required)',
        source_skill_ref: 'string (optional)',
      },
    ],
    confidence: 'number (0-1)',
  }),
});

export function validateBetterPlanInput(input) {
  const errors = [];
  if (!isPlainObject(input)) {
    pushError(errors, '$', 'input must be an object');
    return { valid: false, errors };
  }

  if (!hasText(input.plan)) pushError(errors, 'plan', 'is required and must be a non-empty string');
  if (typeof input.plan === 'string' && input.plan.length > 64000) pushError(errors, 'plan', 'exceeds 64000 character limit');
  if (input.goal_hint != null && typeof input.goal_hint !== 'string') pushError(errors, 'goal_hint', 'must be a string if provided');
  if (input.max_tokens != null && (!Number.isFinite(input.max_tokens) || input.max_tokens <= 0)) {
    pushError(errors, 'max_tokens', 'must be a positive number if provided');
  }

  return { valid: errors.length === 0, errors };
}

function validateFinding(finding, index, errors) {
  const basePath = `findings[${index}]`;
  if (!isPlainObject(finding)) {
    pushError(errors, basePath, 'must be an object');
    return;
  }
  if (!FINDING_SEVERITIES.has(finding.severity)) pushError(errors, `${basePath}.severity`, 'must be info|warning|error');
  if (!FINDING_BASES.has(finding.basis)) pushError(errors, `${basePath}.basis`, 'must be workflow|general');
  if (!hasText(finding.type)) pushError(errors, `${basePath}.type`, 'is required');
  if (!hasText(finding.message)) pushError(errors, `${basePath}.message`, 'is required');
  if (!hasText(finding.suggestion)) pushError(errors, `${basePath}.suggestion`, 'is required');
  if (finding.source_skill_ref != null && !hasText(finding.source_skill_ref)) pushError(errors, `${basePath}.source_skill_ref`, 'must be a non-empty string when provided');
}

export function validateBetterPlanOutput(output) {
  const errors = [];
  if (!isPlainObject(output)) {
    pushError(errors, '$', 'output must be an object');
    return { valid: false, errors };
  }

  if (!hasText(output.reviewText)) pushError(errors, 'reviewText', 'is required');
  if (!hasText(output.summary)) pushError(errors, 'summary', 'is required');
  if (!Array.isArray(output.workflowBasis)) {
    pushError(errors, 'workflowBasis', 'must be an array');
  } else if (!output.workflowBasis.every((item) => typeof item === 'string')) {
    pushError(errors, 'workflowBasis', 'must contain only strings');
  }

  if (!Array.isArray(output.findings) || output.findings.length === 0) {
    pushError(errors, 'findings', 'must be a non-empty array');
  } else {
    output.findings.forEach((finding, index) => validateFinding(finding, index, errors));
  }

  if (typeof output.confidence !== 'number' || output.confidence < 0 || output.confidence > 1) {
    pushError(errors, 'confidence', 'must be a number between 0 and 1');
  }

  return { valid: errors.length === 0, errors };
}

export default {
  BetterPlanInputSchema,
  BetterPlanOutputSchema,
  validateBetterPlanInput,
  validateBetterPlanOutput,
};
