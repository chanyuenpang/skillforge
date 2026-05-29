export const BETTERPROMPT_RAW_EVIDENCE_SAMPLES = [
  {
    id: "raw-evidence-building-v1",
    shape: 'missing-raw-evidence',
    expectFallback: false,
    input: {
      version: 'betterprompt.v0',
      task: {
        id: 'bp-raw-001',
        goal: '整理一次回归分析结论并输出最小执行建议。',
        type: 'quality-check',
      },
      context: {
        project: 'workflow-kit',
        facts: ['当前仅有聚合结论，未附原始证据片段'],
        semantic_asset: {
          summary: '结论已给出，但缺少 raw 主证据',
          capabilities: ['validation'],
        },
      },
      skills: {
        candidates: ['coding-agent-workflow', 'task-planning'],
      },
      constraints: {
        hard: ['必须基于 raw 主证据输出结论', '不做大重构'],
        soft: ['信息不足时触发降级并显式标记'],
        output_format: 'markdown',
        risk_level: 'high',
      },
      runtime: {
        timebox_min: 8,
        token_budget: 900,
        language: 'zh-CN',
      },
    },
  },
  {
    id: "raw-evidence-present-v1",
    shape: 'has-raw-evidence',
    expectFallback: false,
    input: {
      version: 'betterprompt.v0',
      task: {
        id: 'bp-raw-002',
        goal: '基于 raw 主证据输出一次结构化回归结论。',
        type: 'quality-check',
      },
      context: {
        project: 'workflow-kit',
        facts: ['已提供原始证据文本与定位信息'],
        semantic_asset: {
          summary: 'raw 主证据完整，可直接用于结论生成',
          capabilities: ['validation'],
        },
      },
      skills: {
        candidates: ['coding-agent-workflow', 'contract-driven-dev', 'task-planning'],
      },
      constraints: {
        hard: ['必须基于 raw 主证据输出结论', '必须输出结构化结果'],
        soft: ['保证结论可复核'],
        output_format: 'json',
        risk_level: 'medium',
      },
      runtime: {
        timebox_min: 8,
        token_budget: 900,
        language: 'zh-CN',
      },
    },
  },
];

export default BETTERPROMPT_RAW_EVIDENCE_SAMPLES;
