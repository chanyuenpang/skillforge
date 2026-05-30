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
  return [...new Set(items.filter((item) => hasText(item)).map((item) => String(item).trim()))];
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
- objective: string
- executionPrompt: string (preferred natural-language guidance for the executor)
- stepOutline: string[] (optional but preferred)
- completionCriteria: string[]
- hardConstraints: string[]
- stopRules: string[]
- nonGoals: string[]
- reportSections: string[]
- artifacts: string[]
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
- provide a direct, execution-oriented understanding of the task
- stepOutline should contain 3 to 7 short executable steps when the task naturally benefits from steps
- if the task is simple, a shorter stepOutline is acceptable
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
      ? execution.steps
      : [];

  return {
    rationale: uniq(compiled.rationale || compiled.reasons || compiled.reasoning || []),
    execution: {
      objective: firstNonEmpty(execution.objective, execution.goal, compiled.objective),
      steps: stepOutline.map(normalizeCompiledStep),
      completionCriteria: normalizeStringArray(
        compiled.completionCriteria || execution.completionCriteria || execution.doneCriteria || execution.successCriteria,
      ),
    },
    constraints: {
      hard: normalizeStringArray(compiled.hardConstraints || constraints.hard || constraints.must || constraints.required),
      stopRules: normalizeStringArray(compiled.stopRules || constraints.stopRules || constraints.stop || constraints.abortConditions),
      nonGoals: normalizeStringArray(compiled.nonGoals || constraints.nonGoals || constraints.outOfScope),
    },
    report: {
      requiredSections: normalizeStringArray(compiled.reportSections || report.requiredSections || report.sections || report.mustInclude),
      artifacts: normalizeStringArray(compiled.artifacts || report.artifacts || report.outputs || report.deliverables),
    },
  };
}

function buildDefaultSteps({ objective, rawPrompt, routingResult, compiled }) {
  const selected = routingResult.selected || [];
  const constraintHints = deriveConstraintHints(routingResult);
  const workflowSummaries = uniq(selected.map((skill) => skill.workflowSkeletonSummary).filter(Boolean));

  const defaults = [
    {
      id: 'step-1',
      title: 'Align prerequisites',
      intent: firstNonEmpty(
        constraintHints.entrypoints[0],
        'Check prerequisites, confirm the working context, and prepare the required tools before execution.',
      ),
      checks: ['Prerequisites are satisfied and the execution context is ready.'],
    },
    {
      id: 'step-2',
      title: 'Execute the core task',
      intent: firstNonEmpty(
        compiled?.executionPrompt,
        workflowSummaries[0],
        objective,
        rawPrompt,
      ),
      checks: ['The main task flow completes and any important observations are recorded.'],
    },
    {
      id: 'step-3',
      title: 'Report the outcome',
      intent: 'Summarize the outcome in concise natural language, including evidence, blockers, and any next actions.',
      checks: ['The final report includes the required evidence and clearly states blockers or follow-up work.'],
    },
  ];

  return defaults.map(normalizeCompiledStep);
}

function deriveCompletionCriteria(compiled, routingResult, objective) {
  const explicit = normalizeStringArray(
    compiled.completionCriteria || compiled?.execution?.completionCriteria || compiled?.execution?.doneCriteria || compiled?.execution?.successCriteria,
  );
  if (explicit.length > 0) return explicit;

  const reportHints = deriveConstraintHints(routingResult).reportHints;
  return uniq([
    firstNonEmpty(objective) ? `The task objective is completed: ${objective}` : '',
    reportHints.length > 0 ? `The final report covers: ${reportHints.join(', ')}` : 'The final report captures evidence, blockers, and next actions.',
  ]);
}

function deriveReportSections(compiled, routingResult) {
  const explicit = normalizeStringArray(compiled.reportSections || compiled?.report?.requiredSections || compiled?.report?.sections || compiled?.report?.mustInclude);
  if (explicit.length > 0) return explicit;

  const reportHints = deriveConstraintHints(routingResult).reportHints;
  if (reportHints.length > 0) return reportHints;
  return ['Summary', 'Evidence', 'Blockers or next actions'];
}

function deriveArtifacts(compiled) {
  return normalizeStringArray(compiled.artifacts || compiled?.report?.artifacts || compiled?.report?.outputs || compiled?.report?.deliverables);
}

function renderNaturalExecutionPrompt(output, compiled = {}) {
  if (hasText(compiled?.executionPrompt)) return String(compiled.executionPrompt).trim();
  return renderExecutorPrompt(output);
}

function runQc(output) {
  const issues = [];
  if (output.routing.selected.length === 0) issues.push('no selected skills');
  if (!hasText(output.executorPrompt)) issues.push('no executor prompt');
  if (output.execution.steps.length === 0) issues.push('no execution steps');
  if (output.report.requiredSections.length === 0) issues.push('no report sections');
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

function renderExecutorPrompt(output) {
  const lines = [];
  lines.push('You are the downstream executor for this task.');
  lines.push('');
  lines.push(`Objective: ${output.execution.objective}`);
  lines.push('');
  lines.push('Execute the task in the following steps:');
  for (const step of output.execution.steps) {
    lines.push(`${step.id}. ${step.title}`);
    lines.push(`Intent: ${step.intent}`);
    if (hasText(step.entrypoint)) lines.push(`Entrypoint: ${step.entrypoint}`);
    if (Array.isArray(step.checks) && step.checks.length > 0) {
      lines.push(`Checks: ${step.checks.join(' | ')}`);
    }
    lines.push('');
  }
  if (output.execution.completionCriteria.length > 0) {
    lines.push('Completion criteria:');
    for (const item of output.execution.completionCriteria) lines.push(`- ${item}`);
    lines.push('');
  }
  if (output.constraints.hard.length > 0) {
    lines.push('Hard constraints:');
    for (const item of output.constraints.hard) lines.push(`- ${item}`);
    lines.push('');
  }
  if (output.constraints.stopRules.length > 0) {
    lines.push('Stop rules:');
    for (const item of output.constraints.stopRules) lines.push(`- ${item}`);
    lines.push('');
  }
  if (output.constraints.nonGoals.length > 0) {
    lines.push('Non-goals:');
    for (const item of output.constraints.nonGoals) lines.push(`- ${item}`);
    lines.push('');
  }
  if (output.report.requiredSections.length > 0) {
    lines.push('Final report must include:');
    for (const item of output.report.requiredSections) lines.push(`- ${item}`);
    lines.push('');
  }
  if (output.report.artifacts.length > 0) {
    lines.push('Artifacts to return when available:');
    for (const item of output.report.artifacts) lines.push(`- ${item}`);
  }

  return lines.join('\n').trim();
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
  const derivedSteps = Array.isArray(compiled?.execution?.steps) && compiled.execution.steps.length > 0
    ? compiled.execution.steps
    : buildDefaultSteps({
        objective: derivedObjective,
        rawPrompt: normalizedInput.rawPrompt,
        routingResult,
        compiled: llmResult.data || {},
      });
  const derivedCompletionCriteria = deriveCompletionCriteria(compiled, routingResult, derivedObjective);
  const derivedReportSections = deriveReportSections(llmResult.data || {}, routingResult);
  const derivedArtifacts = deriveArtifacts(llmResult.data || {});
  const output = {
    version: 'betterprompt.v2',
    executorPrompt: '',
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
    execution: {
      objective: derivedObjective,
      steps: derivedSteps,
      completionCriteria: derivedCompletionCriteria,
    },
    constraints: {
      hard: uniq(compiled?.constraints?.hard || []),
      stopRules: uniq(compiled?.constraints?.stopRules || []),
      nonGoals: uniq(compiled?.constraints?.nonGoals || []),
    },
    report: {
      requiredSections: derivedReportSections,
      artifacts: derivedArtifacts,
    },
    trace: {
      sourcePromptRef: 'spawn-input',
      skillRefs: deriveSelectedSkillRefs(routingResult),
      planId: normalizedInput.planContext?.planId || null,
      taskId: normalizedInput.taskContext?.taskId || null,
    },
  };

  output.executorPrompt = renderNaturalExecutionPrompt(output, llmResult.data || {});
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
