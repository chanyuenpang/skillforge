# ADR: SkillForge B2 任务编排独立路径产品化

## Status

accepted

## Context

B2 这次不是单纯补一个功能点，而是把 `PromptDraft` / `StepPlan` 从运行中心工作台内的浅层承接位，推进成独立可操作路径。计划已经把边界收紧到一套稳定基线：要有独立入口、稳定对象分区、最小动作集、提交门禁、版本锚点与执行绑定追溯链，并且必须明确冻结边界，不提前承诺 B3/B4 的 `Skeleton` 深能力、智能推荐或跨域治理。

如果只把它当成“做完了几个页面/步骤”，后续就会再次把任务编排塞回工作台浅层位，导致入口、动作、提交和追溯链重新变散。

## Decision

决定将 B2 的任务编排固定为一条独立产品路径，而不是运行中心工作台里的附属承接位。

具体规则如下：

1. `PromptDraft` / `StepPlan` 需要拥有独立入口与对象分区，便于直接操作与追溯。
2. 编排动作只保留最小可用动作集，并配套提交门禁，避免把未收口的状态直接推进到后续环节。
3. 每次提交都必须带上版本锚点，并能回链到执行绑定记录，形成可追踪闭环。
4. B2 只收口到文档基线与最小验证口径，不提前扩展到 B3/B4 的 `Skeleton` 深能力、智能推荐或跨域治理。
5. 后续实现与验证必须沿这条独立路径推进，不能再把编排对象混回运行中心浅层工作台位。

## Alternatives Considered

- 继续把任务编排挂在运行中心工作台内：被拒绝，因为入口、动作和追溯链都会继续分散，难以形成稳定路径。
- 直接承诺 B3/B4 的深能力一起做：被拒绝，因为当前 B2 的目标是先把边界、门禁和追溯链收稳，不应提前扩大承诺面。
- 只做文档描述，不固化独立路径：被拒绝，因为这会让后续实现仍然回到浅层承接位，失去产品化意义。

## Related Code

| Path | Role |
| --- | --- |
| `docs/skillforge-b2-scope-and-guardrails-one-pager-v1.md` | B2 问题陈述与边界守门锚点 |
| `docs/skillforge-b2-entry-and-object-layout-v1.md` | 独立入口与对象分区锚点 |
| `docs/skillforge-b2-actions-and-gating-v1.md` | 最小动作集与提交门禁锚点 |
| `docs/skillforge-b2-version-binding-and-traceability-v1.md` | 版本锚点与执行绑定追溯链锚点 |
| `docs/skillforge-b2-validation-and-evidence-rules-v1.md` | 最小样本验证与口径标注锚点 |
| `docs/skillforge-b2-doc-sync-and-closing-note-v1.md` | 文档回写与收口结论锚点 |

## Consequences

- 正向：任务编排拥有独立入口、动作和追溯链，不再依赖工作台浅层承接。
- 正向：提交门禁与版本绑定可以作为后续实现和验证的稳定约束。
- 正向：B2 的边界清晰，后续 B3/B4 可以在不混淆承诺面的前提下继续演进。
- 取舍：B2 明确冻结在文档基线与最小验证，不把深能力提前纳入。
- 风险：如果后续实现重新把编排塞回工作台浅层位，会破坏这次产品化收口。
- 验证锚点：计划已完成 `PromptDraft` / `StepPlan` 独立路径、最小动作集、提交门禁、版本锚点与追溯链的文档落盘。

## Search Terms

- `PromptDraft`
- `StepPlan`
- `Skeleton`
- `提交门禁`
- `版本锚点`
- `追溯链`
- `独立入口`
- `对象分区`