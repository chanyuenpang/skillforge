import { validateBetterPlanInput, validateBetterPlanOutput } from './betterplan-contract.mjs';
import { callJsonModel } from './llm-json.mjs';
import { resolveSkills } from './skill-resolver.mjs';
import { BETTERPLAN_REVIEW_SKILL } from './system-skills.mjs';

const DEFAULT_MAX_OUTPUT_TOKENS = 2200;
const MAX_PLAN_CHARS = 24000;

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function uniq(items = []) {
  return [...new Set(items.filter((item) => hasText(item)).map((item) => String(item).trim()))];
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (hasText(value)) return String(value).trim();
  }
  return '';
}

function cropPlanText(plan, maxChars = MAX_PLAN_CHARS) {
  const text = String(plan || '').trim();
  if (text.length <= maxChars) return text;
  const headLen = Math.floor(maxChars * 0.65);
  const tailLen = maxChars - headLen - 64;
  return `${text.slice(0, headLen)}\n\n... [cropped middle for review] ...\n\n${text.slice(-tailLen)}`;
}

function buildReviewPrompt(planText, goalHint, routingResult) {
  const workflowBasis = routingResult.selected.map((skill) => ({
    id: skill.id,
    name: skill.name,
    description: skill.description,
    workflowSkeletonSummary: skill.workflowSkeletonSummary,
    entrypointHints: skill.entrypointHints,
    requiredTools: skill.requiredTools,
  }));
  return BETTERPLAN_REVIEW_SKILL.buildUserPrompt(planText, hasText(goalHint) ? goalHint : '(none)', workflowBasis);
}

function normalizeReview(raw) {
  const workflowBasis = uniq(Array.isArray(raw?.workflowBasis) ? raw.workflowBasis : []);
  const findings = Array.isArray(raw?.findings) && raw.findings.length > 0
    ? raw.findings.map((finding) => ({
        severity: ['info', 'warning', 'error'].includes(finding?.severity) ? finding.severity : 'warning',
        basis: ['workflow', 'general'].includes(finding?.basis) ? finding.basis : 'general',
        type: hasText(finding?.type) ? String(finding.type).trim() : 'review_issue',
        message: hasText(finding?.message) ? String(finding.message).trim() : 'review issue identified',
        suggestion: hasText(finding?.suggestion) ? String(finding.suggestion).trim() : 'refine the plan accordingly',
        ...(hasText(finding?.source_skill_ref) ? { source_skill_ref: String(finding.source_skill_ref).trim() } : {}),
      }))
    : [];

  return {
    reviewText: hasText(raw?.reviewText) ? String(raw.reviewText).trim() : '',
    summary: hasText(raw?.summary) ? String(raw.summary).trim() : '',
    workflowBasis,
    findings,
    confidence: typeof raw?.confidence === 'number'
      ? Math.max(0, Math.min(1, raw.confidence))
      : Number.NaN,
  };
}

function deriveWorkflowGuidance(review) {
  const workflowFindings = Array.isArray(review?.findings)
    ? review.findings.filter((finding) => finding?.basis === 'workflow')
    : [];
  if (workflowFindings.length === 0) return [];

  return uniq(workflowFindings.map((finding) => firstNonEmpty(finding.suggestion, finding.message)));
}

export function renderReviewText(review) {
  if (hasText(review?.reviewText)) return review.reviewText.trim();

  const lines = [];
  if (hasText(review?.summary)) lines.push(review.summary.trim());
  const workflowGuidance = deriveWorkflowGuidance(review);
  if (workflowGuidance.length > 0) {
    lines.push('');
    lines.push('Workflow guidance:');
    for (const item of workflowGuidance) lines.push(`- ${item}`);
  }
  for (const finding of review?.findings || []) {
    const severity = String(finding.severity || 'warning').toUpperCase();
    const basis = finding.basis === 'workflow' ? 'workflow' : 'general';
    lines.push(`[${severity}][${basis}] ${finding.message} Suggestion: ${finding.suggestion}`);
  }
  return lines.join('\n');
}

export async function runBetterPlan(input) {
  const meta = {
    startedAt: new Date().toISOString(),
    inputSize: 0,
    croppedSize: 0,
    validationPassed: false,
    llmCalled: false,
    routingUsed: false,
    model: null,
    warnings: [],
    errors: [],
  };

  const inputValidation = validateBetterPlanInput(input);
  if (!inputValidation.valid) {
    meta.errors = inputValidation.errors;
    return {
      result: null,
      meta,
      error: `input validation failed: ${inputValidation.errors.map((error) => `${error.field}:${error.message}`).join('; ')}`,
    };
  }

  meta.inputSize = input.plan.length;
  const planText = cropPlanText(input.plan);
  meta.croppedSize = planText.length;

  const routingResult = await resolveSkills({
    context: {
      intent: input.goal_hint || '',
      description: planText,
      text: planText,
      tools: [],
    },
  });
  meta.routingUsed = true;

  const llmResult = await callJsonModel({
    stage: 'betterplan_review',
    systemPrompt: BETTERPLAN_REVIEW_SKILL.systemPrompt,
    userPrompt: buildReviewPrompt(planText, input.goal_hint, routingResult),
    maxTokens: Number.isFinite(input.max_tokens) ? input.max_tokens : DEFAULT_MAX_OUTPUT_TOKENS,
  });

  meta.llmCalled = llmResult.meta.llmCalled;
  meta.model = llmResult.meta.model;
  meta.warnings.push(...(llmResult.meta.warnings || []));
  meta.errors.push(...(llmResult.meta.errors || []));

  const normalized = normalizeReview(llmResult.data);
  normalized.reviewText = renderReviewText(normalized);
  const outputValidation = validateBetterPlanOutput(normalized);
  meta.validationPassed = outputValidation.valid;
  if (!outputValidation.valid) throw new Error(`betterPlan output validation failed: ${outputValidation.errors.map((error) => `${error.field}:${error.message}`).join('; ')}`);

  return {
    result: normalized,
    meta,
    routing: routingResult,
  };
}

export default runBetterPlan;
