# ADR-0101: SkillForge 第一单 Task Prompt Spec 化端到端闭环里程碑

## Status

accepted

## Context

产品总纲明确指出，SkillForge 的核心价值流不只是“执行后的治理”，更包括执行前的两层长期能力：

1. **Task Prompt Spec 化**：把原始 subagent 派发说明提炼为可执行规范对象（Goal / Context / Constraints / Steps / Acceptance）
2. **Workflow Skeleton 引导**：基于稳定方法模板生成更清晰、更稳定的结构化计划

截至当前，Web UI、运行中心、风险审批与 Registry 方向都已有较强的产品骨架，但这两项长期能力对象仍停留在“定义存在、产品未真实跑通”的状态。若继续补零散可见性或局部前端能力，而不先验证这两层是否能驱动真实任务，就会让 SkillForge 继续停留在“能演示、能规划、但没有第一单真正用它完成任务”的阶段。

## Decision

决定将下一阶段的里程碑固定为：

**SkillForge 第一单 Task Prompt Spec 化端到端闭环**

本里程碑的目标不是铺开大平台，而是让以下链路第一次在真实任务中贯通：

`原始任务描述 → PromptDraft（规范化） → Skeleton 引导计划 → Subagent 执行 → Run Center 端到端可观测`

具体要求：

1. **先把 PromptDraft 最小产品切面定义清楚**
   - 至少明确字段：Goal / Context / Constraints / Steps / Acceptance
   - 明确它与 Run / Approval / Registry 的最小关系边界

2. **Skeleton 只做首单所需的最小引导能力**
   - 不追求通用骨架平台化
   - 只要求能够把首单真实任务从原始描述转成结构化计划

3. **必须用一单真实任务完成首个闭环**
   - 不做纯模拟，不做纸面方案
   - 真实任务要从 PromptDraft 走到执行输出

4. **Run Center 负责证明这套能力可运营**
   - 打开运行记录时，负责人应该能看懂：输入的规范是什么、执行产出了什么、后续该怎么决策

## Related Code

| Path | Role |
| ---- | ---- |
| `docs/skillforge-product-charter-v1.md` | 产品总纲，定义 Task Prompt Spec 与 Workflow Skeleton 是长期能力对象 |
| `docs/skillforge-run-center-domain-spec-v0.1.md` | PromptDraft / Run 的产品层参考 |
| `docs/skillforge-knowledge-asset-domain-spec-v0.1.md` | Skeleton / StepPlan 的对象层参考 |
| `web/` + `web-server.mjs` | Run Center 观测落点 |

## Consequences

- 正向：SkillForge 将首次证明“任务规范化”不是概念，而是能驱动真实执行的产品能力。
- 正向：后续 Stage A 的三个指标（Task Prompt Spec 覆盖率 / Workflow Skeleton 使用率 / 基础可追溯率）将首次具备真实样本。
- 正向：负责人将第一次能在 Run Center 中看懂“任务是怎么被结构化并执行的”。
- 取舍：这一阶段优先验证首个闭环，不追求通用能力一次做全。
- 风险：如果第一单选择过大或过模糊，容易把里程碑拖回平台化空转。

## Search Terms

- `Task Prompt Spec`
- `PromptDraft`
- `Workflow Skeleton`
- `StepPlan`
- `Run Center`
- `第一单`
- `端到端闭环`
