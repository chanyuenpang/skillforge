# ADR: SkillForge B3 Skeleton 原型以治理基线与 StepPlan 映射收口

## Status

accepted

## Context

B3 的目标不是直接宣称 Skeleton 库已经可规模化复用，而是先把 Skeleton 从定义态对象推进为可操作原型，并在知识与资产域内形成最小可创建、可选择、可应用、可追溯的闭环。

这次收口的关键约束是：`skeletonRef` 必须在任务编排与 `StepPlan` 链路里具备明确锚点；同时必须冻结边界，不提前承诺评分、推荐、自动优化与规模化资产治理能力。换句话说，B3 先把“可治理、可追溯、可继续验证”的负责人级文档基线收稳，再谈更深能力。

## Decision

决定将 B3 的 Skeleton 方案固定为一条“原型治理基线 + 映射链路”的收口路径，而不是直接进入规模化复用或智能化扩展。

具体规则如下：

1. Skeleton 先作为结构化骨架资产对象落地，必须具备最小创建、选择、应用与追溯闭环。
2. `skeletonRef` 必须在任务编排与 `StepPlan` 链路中作为明确锚点存在，不能只是定义层字段。
3. Skeleton → `StepPlan` 的映射链路必须明确可写入文档基线，并能作为后续执行的约束口径。
4. 引用锚点、一致性检查、验证样例与证据模板要先收敛为治理基线，避免原型能力漂移到评分、推荐、自动优化或规模化治理叙事。
5. B3 的完成标准以文档治理基线和可继续验证为主，不以规模化复用能力作为当前阶段承诺。

## Alternatives Considered

- 直接宣称 Skeleton 库已可规模化复用：被拒绝，因为当前成果仍停留在原型治理基线层，缺少真实样例执行与证据沉淀。
- 提前承诺评分、推荐或自动优化：被拒绝，因为这些能力会把原型阶段带入更深智能化承诺，超出当前边界。
- 只保留对象定义，不建立映射与验证口径：被拒绝，因为这样无法形成可治理、可追溯、可继续验证的闭环。

## Related Code

| Path | Role |
| --- | --- |
| `docs/skillforge-b3-scope-and-guardrails-one-pager-v1.md` | B3 范围与边界守门锚点 |
| `docs/skillforge-b3-skeleton-object-and-lifecycle-v1.md` | Skeleton 最小对象与生命周期锚点 |
| `docs/skillforge-b3-skeleton-stepplan-mapping-v1.md` | Skeleton 到 `StepPlan` 映射链路锚点 |
| `docs/skillforge-b3-skeleton-reference-and-consistency-rules-v1.md` | 引用锚点与一致性检查锚点 |
| `docs/skillforge-b3-validation-samples-and-evidence-template-v1.md` | 验证样例与证据模板锚点 |
| `docs/skillforge-b3-doc-sync-and-closing-note-v1.md` | 文档回写与收口结论锚点 |

## Consequences

- 正向：B3 的 Skeleton 原型被收束成可治理、可追溯、可继续验证的基线。
- 正向：`skeletonRef` 与 `StepPlan` 的关系被固定为明确锚点，后续实现不容易漂移。
- 正向：引用锚点、一致性检查与验证模板形成统一口径，便于后续阶段继续推进。
- 取舍：当前仍停留在原型治理基线层，尚未进入真实样例执行与证据沉淀。
- 风险：如果后续绕过这条基线直接推进评分、推荐或自动优化，原型会失去边界。

## Search Terms

- `Skeleton`
- `skeletonRef`
- `StepPlan`
- `Apply→Adjust→Lock→Trace`
- `引用锚点`
- `一致性检查`
- `验证样例`
- `证据模板`