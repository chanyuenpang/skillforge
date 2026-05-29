import { buildSuggestionFromSemanticAsset } from '../src/skillforge/betterworkflow-suggestion-from-semantic.mjs';
import { buildPromptGuidanceFromUpstream } from '../src/skillforge/betterprompt-guidance-from-upstream.mjs';

function makeRegistryEntry(id, semanticAsset) {
  return {
    kind: 'registry-entry',
    fixtureId: id,
    registryId: `reg-${id}`,
    source: { type: 'skillforge-fixture', location: `fixtures/${id}.md` },
    semanticAsset,
  };
}

const samples = [
  {
    id: 'hit-1',
    entry: makeRegistryEntry('hit-1', {
      summary: '把 betterPrompt 主链打通并可复跑',
      capabilities: ['workflow', 'implementation', 'prompt-engineering'],
      constraints: ['只做第一轮最小可运行打样', '不接 execution-log / run center UI'],
      intent: ['缩短上下文', '提升可执行性'],
      quality: { passed: true },
      extractor: 'llm-openai-gpt5',
    }),
  },
  {
    id: 'hit-2',
    entry: makeRegistryEntry('hit-2', {
      summary: '把 semanticAsset + workflow suggestion 连接成 prompt guidance',
      capabilities: ['task-decomposition', 'automation'],
      constraints: ['不回退到旧 prompt 组装路径'],
      intent: ['保证稳定输出结构'],
      quality: { passed: true },
      extractor: 'llm-openai-gpt5',
    }),
  },
  {
    id: 'skip-quality',
    entry: makeRegistryEntry('skip-quality', {
      summary: '语义质量不过应跳过',
      capabilities: ['workflow'],
      constraints: ['仅验证跳过逻辑'],
      intent: ['不应继续构建 betterPrompt'],
      quality: { passed: false },
      extractor: 'llm-openai-gpt5',
    }),
  },
  {
    id: 'skip-extractor',
    entry: makeRegistryEntry('skip-extractor', {
      summary: 'extractor 非 llm 前缀应跳过',
      capabilities: ['workflow'],
      constraints: ['仅验证跳过逻辑'],
      intent: ['不应继续构建 betterPrompt'],
      quality: { passed: true },
      extractor: 'rule-based-v1',
    }),
  },
];

const rows = [];
for (const s of samples) {
  const suggestion = buildSuggestionFromSemanticAsset(s.entry, {
    project: 'skillforge',
    depth: 'mvp',
  });

  const guidance = await buildPromptGuidanceFromUpstream(s.entry, suggestion, {
    project: 'skillforge',
  });

  rows.push({
    id: s.id,
    suggestionReady: Boolean(suggestion?.workflowSuggestion),
    skipped: guidance.skipped,
    reason: guidance.reason || null,
    qcPass: guidance?.promptGuidance?.qc_result?.pass ?? null,
    selectedSkills: guidance?.promptGuidance?.package?.selected_skills ?? [],
  });
}

console.table(rows);

const hitRows = rows.filter((r) => r.skipped === false);
const skipRows = rows.filter((r) => r.skipped === true);

if (hitRows.length < 2) {
  throw new Error(`expected >=2 hit samples, got ${hitRows.length}`);
}
if (skipRows.length < 2) {
  throw new Error(`expected >=2 skip samples, got ${skipRows.length}`);
}
if (!hitRows.every((r) => r.qcPass === true)) {
  throw new Error('all hit samples must pass qc');
}

console.log('\n✅ betterPrompt upstream guidance smoke passed');