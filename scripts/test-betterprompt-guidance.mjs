// ── Task 6 betterPrompt 最小验证脚本 ───────────────────────────────────────
// 证明 semanticAsset + workflowSuggestion → prompt guidance 主链已贯通

import { buildBetterPromptPackage } from '../src/skillforge/betterprompt-builder.mjs';

const SAMPLES = [
  // Sample 1: LLM-quality semanticAsset + workflowSuggestion → 应产出有价值 guidance
  {
    id: 's1-llm-semantic-workflow',
    shouldGenerate: true,
    input: {
      version: 'betterprompt.v1',
      task: {
        id: 'demo-task-001',
        type: 'implementation',
        goal: '基于真实 session 样本，为 OpenClaw 的 subagent 派发任务补一套可持续迭代的 plan 模板体系',
        success_criteria: ['plan 模板可被主 agent 稳定使用', '同类任务拆解一致性提升'],
      },
      context: {
        project: 'openclaw-dev',
        facts: ['真实 session 历史已沉淀', '主 agent 需要更结构化的计划模板'],
      },
      skills: { candidates: [] },
      constraints: { hard: ['模板必须可执行', '必须包含验证环节'], soft: [], risk_level: 'medium' },
      runtime: { language: 'zh-CN' },
      semanticAsset: {
        summary: '从 OpenClaw session 历史中抽取可复用 plan 模板，辅助主 agent 快速制定结构化执行计划',
        capabilities: ['task-planning', 'template-extraction', 'session-analysis', 'plan-structuring'],
        constraints: ['不引入新 DSL', '模板复用现有 plan schema', '每轮验证基于真实 session'],
        intent: ['plan-template', 'reusable-workflow'],
        quality: { passed: true },
        extractor: 'llm',
        model: 'deepseek-v4-pro',
      },
      workflowSuggestion: {
        milestones: [
          { name: 'M1-样本萃取', objective: '从 session 历史抽 50+ 条 plan_write 样本' },
          { name: 'M2-模板提炼', objective: '从高成功率样本中抽取稳定 plan 骨架' },
          { name: 'M3-验证闭环', objective: '回放验证模板效果并迭代' },
        ],
      },
      planSuggestion: {
        title: 'Plan 模板体系建设',
        milestones: [
          { title: 'M1-样本萃取', tasks: [{ title: '抽样本' }, { title: '去敏分类' }] },
          { title: 'M2-模板提炼', tasks: [{ title: '骨架抽取' }, { title: '字段标准化' }] },
          { title: 'M3-验证', tasks: [{ title: '回放验证' }, { title: '迭代优化' }] },
        ],
        suggested_skill_refs: ['task-planning'],
      },
    },
  },

  // Sample 2: 只给 semanticAsset，无 workflowSuggestion → 应仍产出基本 guidance
  {
    id: 's2-semantic-only',
    shouldGenerate: true,
    input: {
      version: 'betterprompt.v1',
      task: {
        id: 'demo-task-002',
        type: 'planning',
        goal: '为技能注册流程补一套 LLM 参与的语义抽取链路',
        success_criteria: ['LLM 语义抽取成功', '质量门禁通过'],
      },
      context: {
        project: 'skillforge',
        facts: ['registry 已有基础单条注册链', '需补 LLM 语义锻造层'],
      },
      skills: { candidates: [] },
      constraints: { hard: ['不新增模型接入层', 'LLM 失败直接失败不 fallback'], soft: [], risk_level: 'medium' },
      runtime: { language: 'zh-CN' },
      semanticAsset: {
        summary: '对不规则 skill markdown 文件执行 LLM 驱动的语义抽取，产出高质量中间资产',
        capabilities: ['semantic-extraction', 'llm-integration', 'registry-enhancement', 'quality-gating'],
        constraints: ['no-fallback-on-failure', 'reuse-existing-config', 'deepseek-first'],
        intent: ['skill-semantic-forge', 'registry-quality'],
        quality: { passed: true },
        extractor: 'llm',
        model: 'deepseek-v4-pro',
      },
    },
  },

  // Sample 3: rules-fallback semanticAsset → 应跳过（quality 不是 LLM）
  {
    id: 's3-fallback-should-skip',
    shouldGenerate: false,
    input: {
      version: 'betterprompt.v1',
      task: { id: 'skip-001', type: 'planning', goal: 'dummy task', success_criteria: [] },
      context: { project: 'test', facts: [] },
      skills: { candidates: [] },
      constraints: { hard: [], soft: [], risk_level: 'low' },
      runtime: { language: 'zh-CN' },
      semanticAsset: {
        summary: 'fallback extraction result',
        capabilities: [],
        constraints: [],
        intent: [],
        quality: { passed: false },
        extractor: 'rules-fallback',
        model: 'none',
      },
    },
  },
];

function assertGate(out) {
  const errors = [];
  if (!out?.package?.prompt?.system?.trim()) errors.push('prompt.system 为空');
  if (!out?.package?.prompt?.developer?.trim()) errors.push('prompt.developer 为空');
  if (!Array.isArray(out?.package?.execution_hints) || out.package.execution_hints.length === 0) errors.push('execution_hints 为空');

  const guidance = out?._debug?.suggestion_guidance || [];
  if (guidance.length === 0) {
    errors.push('guidance 为空');
  } else {
    const keyChecks = [
      ['语义摘要', guidance.some((g) => g.includes('语义摘要'))],
      ['关键能力', guidance.some((g) => g.includes('关键能力'))],
    ];
    for (const [name, pass] of keyChecks) if (!pass) errors.push(`guidance 未覆盖关键字段: ${name}`);
  }

  return { pass: errors.length === 0, errors };
}

async function run() {
  const results = [];
  let generated = 0, skipped = 0;

  for (const sample of SAMPLES) {
    const sa = sample.input.semanticAsset;
    const qualityOk = sa?.quality?.passed === true;
    const isLlm = (sa?.extractor || '').startsWith('llm');

    if (!qualityOk || !isLlm) {
      skipped++;
      results.push({ id: sample.id, generated: false, reason: `quality=${qualityOk} extractor=${sa?.extractor}` });
      continue;
    }

    try {
      const out = await buildBetterPromptPackage(sample.input);
      generated++;
      const gate = assertGate(out);
      if (!gate.pass) throw new Error(gate.errors.join('; '));
      results.push({
        id: sample.id,
        generated: true,
        package_id: out.package.package_id,
        selected_skills: out.package.selected_skills || [],
        recommended_bundle_refs: out.package.recommended_bundle_refs || [],
        suggestion_guidance_count: out._debug?.suggestion_guidance?.length || 0,
        guidance_preview: (out._debug?.suggestion_guidance || []).slice(0, 3),
        prompt_system_len: out.package.prompt?.system?.length || 0,
        prompt_developer_len: out.package.prompt?.developer?.length || 0,
        qc_pass: out.qc_result?.pass,
        fallback_used: out.fallback?.fallback_used,
        builder_version: out.package.metadata?.builder_version,
      });
    } catch (err) {
      skipped++;
      results.push({ id: sample.id, generated: false, error: err.message.slice(0, 180) });
    }
  }

  console.log(JSON.stringify({ total: SAMPLES.length, generated, skipped, results }, null, 2));
}

run().catch(e => { console.error(e.message); process.exit(1); });
