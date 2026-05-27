# ADR: SkillForge 阶段 C 跨域联动与资产复用治理基线

## Status

accepted

## Context

阶段 C 的第三阶段收口已经完成，新增的关键事实不是“又推进了一步”，而是把入口守门、跨域对象关系、资产复用治理、执行复盘回沉以及 truth / phase / spec / ADR 的联动边界，收束成一套可长期沿用的负责人级规则层。若继续把这些内容拆成孤立结论，后续就会失去对任务—编排—审批—执行—复盘—知识沉淀连续链路的统一口径。

## Decision

决定将阶段 C 的负责人级主线固定为“跨域联动与资产复用深化”，并在已完成的 C0-C5 收口基础上，继续按以下规则作为长期治理基线：

1. 阶段 C 不是单点功能堆叠，而是围绕任务—编排—审批—执行—复盘—知识沉淀的连续链路组织后续规则。
2. 核心对象必须维持最小跨域关联集，优先保证关键链路可追踪、可引用、可复盘。
3. 编排对象 `PromptDraft` / `StepPlan` 采用资产化路线，并与 `Skeleton` 保持版本关联，形成可复用但受治理约束的对象边界。
4. `ExecutionRun` 与 `Skeleton` 之间必须保留版本关联与回沉路径，回沉时携带执行证据与复盘口径，不能退化为简单摘要回写。
5. `truth` / `phase` / `spec` / `ADR` 的联动边界稳定为“关键变更才触发对应文档回写”，避免把一次性收口动作扩展成自动化治理承诺。
6. 当前阶段明确冻结智能推荐、自动优化、自动修复/回滚、复杂跨项目治理图谱和大规模自动化治理等能力，不将它们写入当前承诺面。
7. 入口守门与阶段边界锁定、跨域对象模型、编排资产化与 Skeleton 复用治理、执行复盘回沉最小闭环、truth/phase/spec/ADR 联动基线、阶段 C 收口输入包，共同构成这一治理基线的可追溯事实底座。

## Alternatives Considered

- 继续把阶段 C 只写成入口判断与文档收口：被拒绝，因为这会错过对象资产化、回沉治理与跨域引用的主线价值。
- 直接承诺智能推荐或自动优化：被拒绝，因为当前阶段的治理边界还不足以支撑这些更深能力。
- 只做单点对象改造，不建立连续链路：被拒绝，因为这样无法形成任务—编排—审批—执行—复盘—知识沉淀的闭环。

## Related Code

| Path | Role |
| --- | --- |
| `docs/skillforge-roadmap-and-doc-governance-v1.md` | 阶段 C 主线与治理约束来源 |
| `docs/skillforge-c0-gate-and-boundary-lock-v1.md` | 入口守门与阶段边界锁定锚点 |
| `docs/skillforge-c1-cross-domain-object-model-and-reference-rules-v1.md` | 跨域对象模型与引用规范锚点 |
| `docs/skillforge-c2-orchestration-assetization-and-skeleton-reuse-governance-v1.md` | 编排资产化与 Skeleton 复用治理锚点 |
| `docs/skillforge-c3-execution-retro-and-skeleton-feedback-governance-v1.md` | 执行—复盘—骨架回沉闭环锚点 |
| `docs/skillforge-c4-doc-linkage-and-writeback-baseline-v1.md` | truth / phase / spec / ADR 联动边界锚点 |
| `docs/skillforge-c5-phase-c-closeout-inputs-v1.md` | 阶段 C 收口输入包锚点 |

## Consequences

- 正向：阶段 C 的主线从入口判定扩展为跨域联动、资产复用和回沉治理，方向更清晰。
- 正向：`PromptDraft` / `StepPlan` / `Skeleton` / `ExecutionRun` 的关系被固定为可治理的版本链路，后续实现不容易漂移。
- 正向：`truth` / `phase` / `spec` / `ADR` 的触发边界明确后，文档回写更稳定，减少过度自动化。
- 取舍：当前仍保留较强的治理边界，暂不承诺智能推荐、自动优化或大规模自动化治理。
- 风险：如果后续把回沉闭环写成简单摘要回写，`ExecutionRun` 与 `Skeleton` 的版本关系会再次失真。
- 验证锚点：`docs/skillforge-c0-gate-and-boundary-lock-v1.md`、`docs/skillforge-c1-cross-domain-object-model-and-reference-rules-v1.md`、`docs/skillforge-c2-orchestration-assetization-and-skeleton-reuse-governance-v1.md`、`docs/skillforge-c3-execution-retro-and-skeleton-feedback-governance-v1.md`、`docs/skillforge-c4-doc-linkage-and-writeback-baseline-v1.md`、`docs/skillforge-c5-phase-c-closeout-inputs-v1.md`。

## Search Terms

- `PromptDraft`
- `StepPlan`
- `Skeleton`
- `ExecutionRun`
- `truth`
- `phase`
- `spec`
- `ADR`
- `跨域联动`
- `资产复用`
- `回沉治理`
