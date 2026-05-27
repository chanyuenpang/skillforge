# ADR: SkillForge P1 最小真实对象链与状态机收敛

## Status

accepted

## Context

第五阶段主线已经明确要从“治理收口”推进到“最小真实执行闭环 + 可验证产品主线”。在这个前提下，P1 不再是继续扩写高阶能力，而是先把后续 P2-P4 共同依赖的最小真实对象链、相邻引用关系、状态机主干和关键门禁约束收成统一锚点，避免对象定义、状态边界和冻结项在后续实现中再次发散。

如果没有这层收敛，`Task / Request`、`PromptDraft`、`StepPlan`、`Approval`、`ExecutionRun`、`Retro`、`Asset Feedback` 之间的关系就会继续停留在分散定义状态，后续产品面、证据链和回沉链很容易出现对象漂移、状态漂移和门禁漂移。

## Decision

决定将 SkillForge 第五阶段 P1 的负责人级交付固定为“最小真实对象链与状态机收敛”，并按以下规则推进：

1. 最小真实对象集合固定为 `Task` / `PromptDraft` / `StepPlan` / `Approval` / `ExecutionRun` / `Retro` / `Asset Feedback`，并以相邻引用链方式组织，不再扩展为复杂图谱或跨项目关系。
2. 每个节点都必须明确身份、版本、状态与最小证据位；节点之间必须能形成前后可追溯、可回看、可校验的连续链路。
3. 状态机只收敛主干状态，不引入自动化异常恢复策略；审批、执行与回沉的关键门禁要显式固化，尤其要保持“未批不跑”、`Run` 绑定获准版本、`Retro` 三分法等约束。
4. 对象链、状态流、证据位与禁区说明必须形成后续 P2-P4 可直接引用的锚点文档，作为产品面、证据链设计与回沉设计的统一结构基础。
5. 本阶段只做结构基础定义，不把最小对象链外推成已成立的完整产品能力。

## Alternatives Considered

- 直接进入最小真实执行主线实现：被拒绝，因为对象定义与门禁尚未统一收敛，容易导致后续实现漂移。
- 继续扩展复杂图谱或跨项目关系：被拒绝，因为 P1 的目标是先锁定最小骨架，而不是提前做规模化结构。
- 只记录任务拆分，不沉淀统一锚点：被拒绝，因为这样会让后续 P2-P4 缺少共同依据。

## Related Code

| Path | Role |
| --- | --- |
| `docs/skillforge-p1-minimal-real-object-chain-and-state-machine-draft-v1.md` | P1 对象集合、相邻引用链、状态流与禁区说明的锚点文档 |
| `plan.json` | P1 主计划的任务骨架与推进约束来源 |
| `docs/skillforge-p0-phase5-acceptance-map-and-mainline-anchor-v1.md` | 第五阶段主线与验收图的上位依据 |

## Consequences

- 正向：`Task / Request` 到 `Retro` 的最小对象链被固定，后续产品面与证据链有了统一骨架。
- 正向：状态机主干和关键门禁被收口，`未批不跑`、`Run` 绑定获准版本、`Retro` 三分法等约束不容易漂移。
- 正向：P2-P4 可以直接复用这份锚点文档，减少重复定义。
- 取舍：P1 只解决结构基础，不承诺更深层的产品交互或自动化能力。
- 风险：如果后续实现绕过对象链锚点直接扩展功能，状态和证据边界会再次松动。

## Search Terms

- `Task`
- `Request`
- `PromptDraft`
- `StepPlan`
- `Approval`
- `ExecutionRun`
- `Retro`
- `Asset Feedback`
- `未批不跑`
- `Run`
- `Retro 三分法`
- `状态机`
