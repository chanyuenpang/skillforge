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
  return `You are compiling a downstream-executor package from a task and routed skill set.

Return JSON only with:
- execution: { objective, steps, completionCriteria }
- constraints: { hard, stopRules, nonGoals }
- report: { requiredSections, artifacts }
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
- produce 3 to 7 ordered steps
- steps must be executable by a downstream executor
- preserve workflow and tool-entry expectations from selected skills
- include checks for each step
- report output should be concise and evidence-oriented`;
}

function runQc(output) {
  const issues = [];
  if (output.routing.selected.length === 0) issues.push('no selected skills');
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
    systemPrompt: 'You compile executor-facing packages from routed skills and task context. Return JSON only.',
    userPrompt: buildCompilationPrompt(normalizedInput, routingResult),
    maxTokens: 2600,
  });

  const compiled = llmResult.data;
  const output = {
    version: 'betterprompt.v2',
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
      objective: hasText(compiled?.execution?.objective) ? compiled.execution.objective : '',
      steps: Array.isArray(compiled?.execution?.steps) ? compiled.execution.steps : [],
      completionCriteria: Array.isArray(compiled?.execution?.completionCriteria) ? compiled.execution.completionCriteria : [],
    },
    constraints: {
      hard: uniq(compiled?.constraints?.hard || []),
      stopRules: uniq(compiled?.constraints?.stopRules || []),
      nonGoals: uniq(compiled?.constraints?.nonGoals || []),
    },
    report: {
      requiredSections: uniq(compiled?.report?.requiredSections || []),
      artifacts: uniq(compiled?.report?.artifacts || []),
    },
    trace: {
      sourcePromptRef: 'spawn-input',
      skillRefs: uniq(routingResult.selected.map((skill) => skill.sourceRef?.path || skill.id)),
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
