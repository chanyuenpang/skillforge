import {
  normalizeBetterPromptV1Input,
  validateBetterPromptV1Input,
  validateBetterPromptV1Output,
} from './betterprompt-v1-contract.mjs';
import { resolveSkills } from './skill-resolver.mjs';
import { callJsonModel } from './llm-json.mjs';

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function uniq(items = []) {
  const values = Array.isArray(items) ? items : [items];
  return [...new Set(values.filter((item) => hasText(item)).map((item) => String(item).trim()))];
}

function summarizeCandidate(candidate) {
  return {
    id: candidate.id,
    name: candidate.name,
    kind: candidate.kind,
    description: candidate.description,
    requiredTools: candidate.requiredTools || [],
    entrypointHints: candidate.entrypointHints || [],
    stopRuleHints: candidate.stopRuleHints || [],
    reportHints: candidate.reportHints || [],
    constraintHints: candidate.constraintHints || [],
    workflowSkeletonSummary: candidate.workflowSkeletonSummary || '',
    ...(candidate.sourceRef?.path ? { sourceRef: { path: candidate.sourceRef.path } } : {}),
  };
}

function buildCompilationPrompt(input, routingResult) {
  return `You are a prompt-compilation skill for a general downstream executor.

Your job is to digest the current task together with the routed skills, then produce guidance that a general executor agent can directly follow.

Think like this:
- what is the real objective
- what workflow shape should be preserved
- what tool or entrypoint expectations matter
- what must be checked before or during execution
- what should the final report contain

Keep the output lightweight.
Do not over-engineer the shape.
If the task naturally benefits from steps, provide a short step outline.
If the task is simple, keep it simple.

Return JSON only with:
- executorPrompt: string
- objective: string (optional)
- stepOutline: string[] (optional)
- hardConstraints: string[] (optional)
- stopRules: string[] (optional)
- nonGoals: string[] (optional)
- reportSections: string[] (optional)
- artifacts: string[] (optional)
- rationale: string[]

Task input:
${JSON.stringify({
  rawPrompt: input.rawPrompt,
  goal_hint: input.goal_hint || null,
  taskContext: input.taskContext || null,
  planContext: input.planContext || null,
}, null, 2)}

Selected routed skills:
${JSON.stringify(routingResult.selected.map(summarizeCandidate), null, 2)}

Rejected skills:
${JSON.stringify(routingResult.rejected, null, 2)}

Rules:
- executorPrompt is the primary output and must be directly usable by a downstream executor
- write executorPrompt in natural language, not as an API schema
- stepOutline is optional and should only be included when it genuinely helps the executor
- preserve workflow and tool-entry expectations from selected skills
- keep the output lightweight and easy for a general model to produce
- report output should be concise and evidence-oriented`;
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (hasText(value)) return String(value).trim();
  }
  return '';
}

function normalizeStringArray(values, fallback = []) {
  const items = Array.isArray(values) ? values : fallback;
  return uniq(items);
}

function deriveObjective(compiled = {}, input = {}) {
  return firstNonEmpty(
    compiled?.execution?.objective,
    compiled?.execution?.goal,
    compiled?.objective,
    input?.taskContext?.goal,
    input?.goal_hint,
    input?.rawPrompt,
  );
}

function deriveSelectedSkillRefs(routingResult = {}) {
  return uniq((routingResult.selected || []).map((skill) => skill.sourceRef?.path || skill.id));
}

function deriveConstraintHints(routingResult = {}) {
  const selected = routingResult.selected || [];
  return {
    hard: uniq(selected.flatMap((skill) => skill.constraintHints || [])),
    stopRules: uniq(selected.flatMap((skill) => skill.stopRuleHints || [])),
    reportHints: uniq(selected.flatMap((skill) => skill.reportHints || [])),
    entrypoints: uniq(selected.flatMap((skill) => skill.entrypointHints || [])),
  };
}

function titleFromText(text = '', index = 0) {
  const cleaned = firstNonEmpty(text).replace(/\s+/g, ' ').trim();
  if (!cleaned) return `Step ${index + 1}`;
  return cleaned.length <= 80 ? cleaned : `${cleaned.slice(0, 77)}...`;
}

function normalizeCompiledStep(step, index) {
  if (hasText(step)) {
    const text = String(step).trim();
    return {
      id: `step-${index + 1}`,
      title: titleFromText(text, index),
      intent: text,
      entrypoint: '',
      checks: ['Confirm the step completed successfully and produced the expected result.'],
    };
  }

  const value = step && typeof step === 'object' ? step : {};
  const title = firstNonEmpty(value.title, value.name, value.step, value.label, value.intent);
  const intent = firstNonEmpty(value.intent, value.description, value.goal, value.action, title);
  const entrypoint = firstNonEmpty(value.entrypoint, value.tool, value.command);
  const checks = normalizeStringArray(
    value.checks || value.validation || value.verify || value.acceptanceCriteria,
    ['Confirm the step completed successfully and produced the expected result.'],
  );

  return {
    id: firstNonEmpty(value.id, `step-${index + 1}`),
    title: titleFromText(title || intent, index),
    intent,
    ...(hasText(entrypoint) ? { entrypoint } : {}),
    checks,
  };
}

export function normalizeCompiledOutput(compiled = {}) {
  const execution = compiled?.execution && typeof compiled.execution === 'object' ? compiled.execution : {};
  const constraints = compiled?.constraints && typeof compiled.constraints === 'object' ? compiled.constraints : {};
  const report = compiled?.report && typeof compiled.report === 'object' ? compiled.report : {};
  const stepOutline = Array.isArray(compiled?.stepOutline)
    ? compiled.stepOutline
    : Array.isArray(execution?.steps)
      ? execution.steps.map((step) => firstNonEmpty(step?.intent, step?.description, step?.title, step?.name))
      : [];

  return {
    executorPrompt: firstNonEmpty(compiled?.executorPrompt, compiled?.executionPrompt),
    rationale: uniq(compiled.rationale || compiled.reasons || compiled.reasoning || []),
    guidance: {
      objective: firstNonEmpty(execution.objective, execution.goal, compiled.objective),
      stepOutline: normalizeStringArray(stepOutline),
      hardConstraints: normalizeStringArray(compiled.hardConstraints || constraints.hard || constraints.must || constraints.required),
      stopRules: normalizeStringArray(compiled.stopRules || constraints.stopRules || constraints.stop || constraints.abortConditions),
      nonGoals: normalizeStringArray(compiled.nonGoals || constraints.nonGoals || constraints.outOfScope),
      reportHints: normalizeStringArray(compiled.reportSections || report.requiredSections || report.sections || report.mustInclude),
      artifacts: normalizeStringArray(compiled.artifacts || report.artifacts || report.outputs || report.deliverables),
    },
  };
}

function runQc(output) {
  const issues = [];
  if (output.routing.selected.length === 0) issues.push('no selected skills');
  if (!hasText(output.executorPrompt)) issues.push('no executor prompt');
  return {
    pass: issues.length === 0,
    score: issues.length === 0 ? 100 : 70,
    tags: issues.length === 0 ? ['routing-aware', 'executor-ready'] : ['incomplete-output'],
    issues,
  };
}

function createRoutingFailure(routingResult, message = 'betterPrompt routing failed: no skills were selected for compilation') {
  const error = new Error(message);
  error.code = 'BETTERPROMPT_ROUTING_EMPTY';
  error.meta = {
    stage: 'skill_routing',
    routingResult: {
      candidates: routingResult.candidates || [],
      selected: routingResult.selected || [],
      rejected: routingResult.rejected || [],
      routingRationale: routingResult.routingRationale || [],
      metadata: routingResult.metadata || null,
      toolGateSummary: routingResult.toolGateSummary || null,
      inputContext: routingResult.inputContext || null,
    },
  };
  return error;
}

export async function buildBetterPromptV1(input) {
  const validated = validateBetterPromptV1Input(input);
  if (!validated.success) {
    const message = validated.error.issues.map((issue) => issue.message).join('; ') || 'invalid input';
    throw new Error(`betterPrompt input validation failed: ${message}`);
  }

  const normalizedInput = normalizeBetterPromptV1Input(input);
  const projectToolContext = uniq(normalizedInput.projectToolContext || []);
  const runtimeToolContext = uniq(normalizedInput.runtimeToolContext || []);

  const routingResult = normalizedInput.candidateSkills && normalizedInput.candidateSkills.length > 0
    ? {
        selected: normalizedInput.candidateSkills,
        rejected: [],
        routingRationale: ['caller supplied candidateSkills directly'],
        metadata: { llmCalled: false, model: null },
      }
    : await resolveSkills({
        context: {
          intent: normalizedInput.goal_hint || '',
          description: normalizedInput.rawPrompt,
          text: normalizedInput.rawPrompt,
          tools: uniq([...projectToolContext, ...runtimeToolContext]),
          tags: [],
        },
      });

  if (!Array.isArray(routingResult.selected) || routingResult.selected.length === 0) {
    throw createRoutingFailure(routingResult);
  }

  const llmResult = await callJsonModel({
    stage: 'betterprompt_compilation',
    systemPrompt: 'You are a prompt-compilation skill. Turn routed skills and task context into lightweight executor guidance, then return JSON only.',
    userPrompt: buildCompilationPrompt(normalizedInput, routingResult),
    maxTokens: 2600,
  });

  const compiled = normalizeCompiledOutput(llmResult.data);
  const derivedObjective = deriveObjective(compiled, normalizedInput);
  const constraintHints = deriveConstraintHints(routingResult);
  const executorPrompt = firstNonEmpty(compiled.executorPrompt);
  const output = {
    version: 'betterprompt.v2',
    executorPrompt,
    input: {
      rawPrompt: normalizedInput.rawPrompt,
      ...(hasText(normalizedInput.goal_hint) ? { goal_hint: normalizedInput.goal_hint } : {}),
    },
    routing: {
      selected: routingResult.selected.map(summarizeCandidate),
      rejected: routingResult.rejected || [],
      rationale: uniq(compiled.rationale || routingResult.routingRationale || ['compiled from routed skills']),
      toolGate: {
        projectToolContext,
        runtimeToolContext,
      },
    },
    guidance: {
      objective: derivedObjective,
      stepOutline: uniq(compiled?.guidance?.stepOutline || []),
      hardConstraints: uniq(compiled?.guidance?.hardConstraints || constraintHints.hard || []),
      stopRules: uniq(compiled?.guidance?.stopRules || constraintHints.stopRules || []),
      nonGoals: uniq(compiled?.guidance?.nonGoals || []),
      reportHints: uniq(compiled?.guidance?.reportHints || constraintHints.reportHints || []),
      artifacts: uniq(compiled?.guidance?.artifacts || []),
    },
    trace: {
      sourcePromptRef: 'spawn-input',
      skillRefs: deriveSelectedSkillRefs(routingResult),
      planId: normalizedInput.planContext?.planId || null,
      taskId: normalizedInput.taskContext?.taskId || null,
    },
  };
  output.qc = runQc(output);

  const validatedOutput = validateBetterPromptV1Output(output);
  if (!validatedOutput.success) {
    const message = validatedOutput.error.issues.map((issue) => issue.message).join('; ') || 'invalid output';
    throw new Error(`betterPrompt output validation failed: ${message}`);
  }

  output.meta = {
    routing: routingResult.metadata || null,
    compilation: llmResult.meta,
  };

  return output;
}

export const buildBetterPromptPackage = buildBetterPromptV1;

export function buildBetterPromptFromRawText(rawText, options) {
  let goalHint;
  if (typeof options === 'string') goalHint = options;
  else if (options && typeof options === 'object') goalHint = options.goal_hint;
  return buildBetterPromptV1({ rawPrompt: rawText, goal_hint: goalHint });
}

export default buildBetterPromptV1;
