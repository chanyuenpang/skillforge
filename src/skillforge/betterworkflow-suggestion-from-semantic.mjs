import { runBetterWorkflowPipeline } from './betterworkflow-pipeline.mjs';

function hasText(v) {
  return typeof v === 'string' && v.trim() !== '';
}

function arr(v) {
  return Array.isArray(v) ? v.filter(hasText) : [];
}

function first(v, fallback = '') {
  return hasText(v) ? v.trim() : fallback;
}

function buildWorkflowInputFromSemanticAsset(semanticAsset, options = {}) {
  const summary = first(semanticAsset?.summary, '基于语义资产生成最小可执行计划');
  const capabilities = arr(semanticAsset?.capabilities);
  const constraints = arr(semanticAsset?.constraints);
  const intent = arr(semanticAsset?.intent);

  return {
    goal: {
      summary,
      deliverable: first(options.deliverable, capabilities[0] || summary),
    },
    context: {
      project: first(options.project, 'skillforge'),
      background: [
        capabilities.length ? `能力点：${capabilities.join('；')}` : '',
        intent.length ? `意图：${intent.join('；')}` : '',
      ].filter(Boolean).join(' | ') || '由 semanticAsset 直接驱动的最小链路',
    },
    constraints: {
      timebox: first(options.timebox, '1-2d'),
      hardRules: constraints.length ? constraints : ['仅做第一轮最小可运行打样'],
    },
    parameters: {
      maxMilestones: Number.isFinite(options.maxMilestones) ? options.maxMilestones : 3,
      maxAtomicTasksPerMilestone: Number.isFinite(options.maxAtomicTasksPerMilestone) ? options.maxAtomicTasksPerMilestone : 2,
      depth: first(options.depth, 'mvp'),
    },
  };
}

export function buildSuggestionFromSemanticAsset(registryEntry, options = {}) {
  const semanticAsset = registryEntry?.semanticAsset;
  const qualityPassed = Boolean(semanticAsset?.quality?.passed);
  const extractor = semanticAsset?.extractor;

  if (!semanticAsset || typeof semanticAsset !== 'object') {
    return null;
  }
  if (!qualityPassed) return null;
  if (!hasText(extractor) || !extractor.startsWith('llm')) return null;

  const workflowInput = buildWorkflowInputFromSemanticAsset(semanticAsset, options);
  const pipelineResult = runBetterWorkflowPipeline(workflowInput);

  return {
    workflowSuggestion: pipelineResult.workflowOutput,
    planSuggestion: pipelineResult.planDTO,
    trace: {
      kind: 'betterworkflow-semantic-suggestion-v1',
      source: {
        fixtureId: registryEntry?.fixtureId ?? null,
        registryId: registryEntry?.registryId ?? null,
        sourceType: registryEntry?.source?.type ?? null,
      },
      semanticGate: {
        qualityPassed,
        extractor,
      },
      inputSummary: {
        semanticSummary: semanticAsset?.summary ?? null,
        capabilityCount: arr(semanticAsset?.capabilities).length,
        constraintCount: arr(semanticAsset?.constraints).length,
        intentCount: arr(semanticAsset?.intent).length,
      },
      pipelineSummary: pipelineResult.summary,
      generatedAt: new Date().toISOString(),
    },
  };
}

export default buildSuggestionFromSemanticAsset;
