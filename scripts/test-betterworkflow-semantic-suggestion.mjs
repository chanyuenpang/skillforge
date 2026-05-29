import { buildSuggestionFromSemanticAsset } from '../src/skillforge/betterworkflow-suggestion-from-semantic.mjs';

const samples = [
  {
    id: 's1-llm-pass',
    fixtureId: 'fx-llm-pass-1',
    source: { type: 'skillforge-fixture', location: 'fixtures/real-session-1.json' },
    semanticAsset: {
      summary: '把技能安装流程标准化为可复用执行链',
      capabilities: ['解析技能目录', '抽取语义资产', '写入注册信息'],
      constraints: ['不破坏现有接口', '仅最小增量改动'],
      intent: ['workflow', 'registry', 'semantic'],
      confidence: 0.86,
      extractor: 'llm:gpt-4.1-mini',
      quality: { passed: true, score: 0.91 },
    },
  },
  {
    id: 's2-llm-pass',
    fixtureId: 'fx-llm-pass-2',
    source: { type: 'skillforge-fixture', location: 'fixtures/real-session-2.json' },
    semanticAsset: {
      summary: '构建最小 plan suggestion 输出并可追踪来源',
      capabilities: ['生成里程碑', '生成原子任务', '映射到 plan DTO'],
      constraints: ['只处理 qualityPassed=true', '不接外围系统'],
      intent: ['plan', 'trace'],
      confidence: 0.83,
      extractor: 'llm',
      quality: { passed: true, score: 0.88 },
    },
  },
  {
    id: 's3-rules-pass-should-skip',
    fixtureId: 'fx-rules-pass-1',
    source: { type: 'skillforge-fixture', location: 'fixtures/real-session-3.json' },
    semanticAsset: {
      summary: '规则回退抽取样本',
      capabilities: ['fallback parsing'],
      constraints: ['仅兜底'],
      intent: ['fallback'],
      confidence: 0.5,
      extractor: 'rules-fallback',
      quality: { passed: true, score: 0.7 },
    },
  },
  {
    id: 's4-llm-fail-should-skip',
    fixtureId: 'fx-llm-fail-1',
    source: { type: 'skillforge-fixture', location: 'fixtures/real-session-4.json' },
    semanticAsset: {
      summary: '质量不过样本',
      capabilities: ['demo'],
      constraints: ['demo'],
      intent: ['demo'],
      confidence: 0.4,
      extractor: 'llm:gpt-4.1-mini',
      quality: { passed: false, score: 0.42 },
    },
  },
];

const outputs = samples.map((sample) => ({
  id: sample.id,
  suggestion: buildSuggestionFromSemanticAsset(sample),
}));

const generated = outputs.filter((x) => x.suggestion !== null);
const skipped = outputs.filter((x) => x.suggestion === null);

console.log(JSON.stringify({
  total: outputs.length,
  generated: generated.length,
  skipped: skipped.length,
  details: outputs.map((x) => ({
    id: x.id,
    generated: x.suggestion !== null,
    workflowMilestones: x.suggestion?.workflowSuggestion?.milestones?.length ?? 0,
    workflowAtomicTasks: x.suggestion?.workflowSuggestion?.atomicTasks?.length ?? 0,
    planTasks: x.suggestion?.planSuggestion?.tasks?.length ?? 0,
    traceKind: x.suggestion?.trace?.kind ?? null,
  })),
}, null, 2));
