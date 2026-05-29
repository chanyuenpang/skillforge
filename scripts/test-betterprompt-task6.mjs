import { buildBetterPromptPackage } from '../src/skillforge/betterprompt-builder.mjs';

const samples = [
  {
    name: 'sample-1-skillforge-task6',
    input: {
      version: 'v1',
      task: {
        id: 'task6-001',
        goal: '基于 semanticAsset 与 workflow/plan suggestion 产出最小可运行 prompt guidance',
        type: 'prompt-guidance-build',
        success_criteria: ['生成可执行 guidance', '接入上游建议'],
      },
      context: {
        project: 'workflow-kit',
        facts: ['Task4 语义资产已可用', 'Task5 workflowSuggestion 已可用'],
        semantic_asset: {
          summary: '需要将技能语义压缩为可执行提示词指导',
          capabilities: ['prompt engineering', 'workflow', 'validation'],
          constraints: ['仅做第一轮最小打样'],
          intent: ['缩短prompt', '增强稳定性'],
        },
        plan_suggestion: {
          milestones: [
            { title: 'M1: 接入语义资产', tasks: [{ title: '映射能力槽位' }] },
            { title: 'M2: 生成 guidance', tasks: [{ title: '产出 system/developer guidance' }] },
          ],
          suggested_skill_refs: ['prompt-design', 'task-planning'],
        },
        workflow_suggestion: {
          summary: '先收敛约束，再生成 guidance，最后做 QC',
          milestones: [{ name: 'Collect' }, { name: 'Compose' }, { name: 'QC' }],
          suggested_skill_refs: ['coding-agent-workflow'],
        },
      },
      skills: { candidates: ['prompt-design', 'coding-agent-workflow'], bundle_refs: ['team-ops-bundle'] },
      constraints: {
        hard: ['不拼接 skill 原文', '保持最小可运行链路'],
        soft: ['输出简短可执行', '保留 QC 检查点'],
        output_format: 'markdown',
        risk_level: 'medium',
      },
      runtime: { language: 'zh-CN' },
    },
  },
  {
    name: 'sample-2-contract',
    input: {
      version: 'v1',
      task: { goal: '为接口变更生成契约优先的执行提示', type: 'api-contract-task' },
      context: {
        project: 'workflow-kit',
        semantic_asset: {
          summary: '接口字段升级，先校验 schema',
          capabilities: ['contract', 'schema validation'],
          constraints: ['不能跳过校验'],
          intent: ['降低回归风险'],
        },
      },
      skills: { candidates: ['contract-driven-dev', 'task-planning'] },
      constraints: { hard: ['必须先做 schema 校验'], soft: ['再推进实现'], risk_level: 'high' },
      runtime: { language: 'zh-CN' },
    },
  },
  {
    name: 'sample-3-workflow-only',
    input: {
      version: 'v1',
      task: { goal: '把复杂需求拆成里程碑并形成可执行提示', type: 'planning-workflow' },
      context: {
        project: 'workflow-kit',
        workflow_suggestion: {
          summary: '三段式推进：分析→拆解→交付',
          milestones: [{ name: '分析' }, { name: '拆解' }, { name: '交付' }],
          suggested_skill_refs: ['task-planning'],
        },
      },
      skills: { candidates: ['task-planning', 'prompt-design'] },
      constraints: { hard: ['不做无关扩展'], soft: ['输出要短'], risk_level: 'low' },
      runtime: { language: 'zh-CN' },
    },
  },
];

for (const s of samples) {
  const result = await buildBetterPromptPackage(s.input);
  console.log(`\n=== ${s.name} ===`);
  console.log(JSON.stringify({
    selected_skills: result.package.selected_skills,
    suggested_skill_refs: result.package.suggested_skill_refs,
    recommended_bundle_refs: result.package.recommended_bundle_refs,
    guidance_count: result.package.metadata?.suggestion_guidance_count,
    qc_pass: result.qc_result?.pass,
    qc_issues: result.qc_result?.issues,
    system_preview: result.package.prompt.system.slice(0, 180),
  }, null, 2));
}
