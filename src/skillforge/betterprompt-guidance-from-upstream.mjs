import { buildBetterPromptPackage } from './betterprompt-builder.mjs';

function hasText(v) {
  return typeof v === 'string' && v.trim() !== '';
}

function arr(v) {
  return Array.isArray(v) ? v.filter(hasText).map((x) => x.trim()) : [];
}

function first(v, fallback = '') {
  return hasText(v) ? v.trim() : fallback;
}

function unique(items) {
  return [...new Set((items || []).filter(Boolean))];
}

function makeHardConstraints(semanticAsset, workflowSuggestion) {
  const semanticHard = arr(semanticAsset?.constraints);

  const workflowHard = arr(
    workflowSuggestion?.constraints?.hardRules
      || workflowSuggestion?.hardRules
      || workflowSuggestion?.constraints
  );

  return unique([
    ...semanticHard,
    ...workflowHard,
  ]);
}

function makeSoftConstraints(semanticAsset, workflowSuggestion, planSuggestion) {
  const semanticSoft = arr(semanticAsset?.intent);

  const milestoneSoft = arr(
    (workflowSuggestion?.milestones || []).map((m) => m?.name || m?.goal || m?.title).filter(Boolean)
  ).map((x) => `优先沿里程碑推进：${x}`);

  const atomicSoft = arr(
    (workflowSuggestion?.atomicTasks || []).map((t) => t?.title || t?.goal || t?.summary).filter(Boolean)
  ).slice(0, 3).map((x) => `优先落地关键原子任务：${x}`);

  const planSoft = arr(planSuggestion?.steps).slice(0, 3).map((x) => `计划建议：${x}`);

  return unique([
    ...semanticSoft,
    ...milestoneSoft,
    ...atomicSoft,
    ...planSoft,
  ]);
}

function deriveTaskGoal(semanticAsset, workflowSuggestion) {
  return first(
    workflowSuggestion?.goal?.summary,
    first(semanticAsset?.summary, '基于语义资产与流程建议生成最小可执行 prompt guidance')
  );
}

function deriveTaskType(workflowSuggestion) {
  return first(workflowSuggestion?.parameters?.depth, 'implementation');
}

function deriveSuccessCriteria(workflowSuggestion, planSuggestion) {
  const milestones = arr((workflowSuggestion?.milestones || []).map((m) => m?.name || m?.goal || m?.title));
  const planSteps = arr(planSuggestion?.steps);

  const checks = [];
  if (milestones.length > 0) {
    checks.push(`覆盖里程碑：${milestones.slice(0, 2).join('；')}`);
  }
  if (planSteps.length > 0) {
    checks.push(`覆盖计划步骤：${planSteps.slice(0, 2).join('；')}`);
  }
  checks.push('prompt guidance 可直接用于 subagent 执行');
  return checks;
}

export function buildBetterPromptInputFromUpstream(registryEntry, suggestion, options = {}) {
  const semanticAsset = registryEntry?.semanticAsset;
  const workflowSuggestion = suggestion?.workflowSuggestion;
  const planSuggestion = suggestion?.planSuggestion;

  const semanticGatePassed = Boolean(semanticAsset?.quality?.passed)
    && hasText(semanticAsset?.extractor)
    && semanticAsset.extractor.startsWith('llm');

  if (!semanticGatePassed) {
    return null;
  }

  if (!workflowSuggestion || typeof workflowSuggestion !== 'object') {
    return null;
  }

  const hard = makeHardConstraints(semanticAsset, workflowSuggestion);
  if (hard.length === 0) {
    hard.push('仅做第一轮最小可运行打样');
  }

  const soft = makeSoftConstraints(semanticAsset, workflowSuggestion, planSuggestion);

  const caps = unique(arr(semanticAsset?.capabilities));

  return {
    version: '0.1.0',
    task: {
      id: first(options.taskId, registryEntry?.fixtureId || registryEntry?.registryId || 'semantic-upstream-task'),
      goal: deriveTaskGoal(semanticAsset, workflowSuggestion),
      type: deriveTaskType(workflowSuggestion),
      success_criteria: deriveSuccessCriteria(workflowSuggestion, planSuggestion),
    },
    context: {
      project: first(options.project, workflowSuggestion?.context?.project || 'skillforge'),
      background: first(
        options.background,
        `semantic summary: ${first(semanticAsset?.summary, 'n/a')} | workflow summary: ${first(suggestion?.trace?.pipelineSummary, 'n/a')}`
      ),
      facts: unique([
        ...caps.map((c) => `能力点:${c}`),
        `语义质量通过:${Boolean(semanticAsset?.quality?.passed)}`,
        `工作流里程碑:${Array.isArray(workflowSuggestion?.milestones) ? workflowSuggestion.milestones.length : 0}`,
      ]),
    },
    skills: {
      candidates: unique([
        'coding-agent-workflow',
        'task-planning',
        'prompt-design',
      ]),
      bundle_refs: unique([
        ...(Array.isArray(options.bundleRefs) ? options.bundleRefs : []),
      ]),
    },
    constraints: {
      hard,
      soft,
      output_format: first(options.outputFormat, 'markdown'),
      risk_level: first(options.riskLevel, 'medium'),
    },
    runtime: {
      language: first(options.language, 'zh-CN'),
      max_tokens: Number.isFinite(options.maxTokens) ? options.maxTokens : 1200,
      temperature: Number.isFinite(options.temperature) ? options.temperature : 0.2,
    },
  };
}

export async function buildPromptGuidanceFromUpstream(registryEntry, suggestion, options = {}) {
  const betterPromptInput = buildBetterPromptInputFromUpstream(registryEntry, suggestion, options);
  if (!betterPromptInput) {
    return {
      skipped: true,
      reason: 'semantic_or_workflow_gate_failed',
      trace: {
        semanticQualityPassed: Boolean(registryEntry?.semanticAsset?.quality?.passed),
        semanticExtractor: registryEntry?.semanticAsset?.extractor ?? null,
        hasWorkflowSuggestion: Boolean(suggestion?.workflowSuggestion),
      },
    };
  }

  const built = await buildBetterPromptPackage(betterPromptInput);
  return {
    skipped: false,
    betterPromptInput,
    promptGuidance: {
      package: built.package,
      qc_result: built.qc_result,
      fallback: built.fallback,
    },
    trace: {
      kind: 'betterprompt-guidance-from-upstream-v1',
      source: {
        fixtureId: registryEntry?.fixtureId ?? null,
        registryId: registryEntry?.registryId ?? null,
      },
      generatedAt: new Date().toISOString(),
    },
  };
}

export default buildPromptGuidanceFromUpstream;
