export const BETTERPROMPT_SAMPLES = [
  {
    id: 'clear-goal-landing-copy-v1',
    shape: '清晰目标',
    input: {
      version: 'betterprompt.v0',
      task: {
        id: 'bp-sample-001',
        goal: '为 SkillForge 产品页生成一版 120 字以内中文 Hero 文案，突出“技能编排 + 质量闭环”价值。',
        type: 'prompt-design',
        success_criteria: ['文案不超过 120 字', '包含一个价值主张和一个行动号召'],
      },
      context: {
        project: 'workflow-kit',
        artifacts: ['docs/skillforge-product-shape.md'],
        facts: ['目标用户是正在搭建个人 AI 助手的开发者', '需要可快速上线的文案版本'],
      },
      skills: {
        candidates: ['prompt-design', 'coding-agent-workflow', 'task-planning'],
        bundle_refs: ['skillforge-core'],
      },
      constraints: {
        hard: ['只输出中文', '不做 UI 代码实现', '必须给出可直接粘贴的最终文案'],
        soft: ['文风简洁有力', '尽量贴近开发者语境'],
        output_format: 'markdown',
        risk_level: 'low',
      },
      runtime: {
        timebox_min: 10,
        token_budget: 1200,
        language: 'zh-CN',
      },
    },
  },
  {
    id: 'missing-info-dispatch-policy-v1',
    shape: '信息缺失',
    input: {
      version: 'betterprompt.v0',
      task: {
        id: 'bp-sample-002',
        goal: '设计 betterPrompt 的 dispatch 策略说明，确保可用于后续自动分发。',
        type: 'workflow-design',
      },
      context: {
        project: 'workflow-kit',
        facts: ['目前只确定要兼容现有 dispatch integration，具体渠道未定'],
      },
      skills: {
        candidates: ['coding-agent-workflow', 'task-planning', 'prompt-design'],
      },
      constraints: {
        hard: ['不引入新依赖', '不回退到 betterWorkflow'],
        soft: ['如信息不足，先列出默认假设与待确认项'],
        output_format: 'markdown',
        risk_level: 'medium',
      },
      runtime: {
        timebox_min: 15,
        token_budget: 1800,
        language: 'zh-CN',
      },
    },
  },
  {
    id: 'conflicting-constraints-regression-v1',
    shape: '冲突约束',
    input: {
      version: 'betterprompt.v0',
      task: {
        id: 'bp-sample-003',
        goal: '编写 betterPrompt 回归检查结果摘要，并给出稳定性判断。',
        type: 'quality-check',
        success_criteria: ['输出包含结论', '输出包含风险项'],
      },
      context: {
        project: 'workflow-kit',
        artifacts: ['scripts/test-betterprompt-regression.mjs'],
      },
      skills: {
        candidates: ['coding-agent-workflow', 'prompt-design', 'task-planning'],
        bundle_refs: ['contract-driven-dev'],
      },
      constraints: {
        hard: ['必须严格输出 JSON', '输出必须是自然语言段落', '不做大重构'],
        soft: ['优先保证结构化可解析'],
        output_format: 'json',
        risk_level: 'high',
      },
      runtime: {
        timebox_min: 12,
        token_budget: 1600,
        language: 'zh-CN',
      },
    },
  },
  {
    id: 'noisy-mixed-input-mvp-v1',
    shape: '噪声混杂',
    input: {
      version: 'betterprompt.v0',
      task: {
        id: 'bp-sample-004',
        goal: '把 betterPrompt MVP Task 5 的“样本+回归基线”先跑起来，给主链路一个能 dogfooding 的起点。顺便提下别忘了明天开会。',
        type: 'implementation + planning + prompt???',
        success_criteria: ['可运行', '有统计', '可复用'],
      },
      context: {
        project: 'workflow-kit',
        facts: [
          '已有 contract/builder/qc/dispatch integration',
          '当前重点不是 UI',
          '输入里混杂了和任务无关提醒信息',
        ],
      },
      skills: {
        candidates: ['coding-agent-workflow', 'skillforge-core', 'task-planning', 'prompt-design'],
        bundle_refs: ['non-existent-skill-ref'],
      },
      constraints: {
        hard: ['只做 betterPrompt 样本与最小回归', '不接 Run Center UI', '不回退到 betterWorkflow'],
        soft: ['尽量一步到位，不反复确认', '输出可用于后续持续追加样本'],
        output_format: 'markdown+json',
        risk_level: 'medium',
      },
      runtime: {
        timebox_min: 20,
        token_budget: 2200,
        language: 'zh-CN',
      },
    },
  },
];

export default BETTERPROMPT_SAMPLES;
