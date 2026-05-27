# ADR: SkillForge 运行中心 B1 可操作工作台最小闭环与边界冻结

## Status

accepted

## Context

运行中心在此前阶段已经完成只读闭环，但如果继续只停留在“可看不可操作”的状态，就无法支撑单任务上下文中的基础工作流。B1 这次计划明确把目标收敛为：让 `PromptDraft`、`StepPlan`、`Approval`、`Run` 在单任务上下文里形成“可编辑、可提交、可执行、可回看”的最小动作链，同时明确冻结边界，不把 B2/B3 的深编排能力和 `Skeleton` 深能力提前引入。

## Decision

决定将 SkillForge 运行中心的 B1 实现固定为**可操作工作台最小闭环**，并同时执行边界冻结：

1. **先完成最小动作链，不追求深编排**  
   B1 只覆盖 `PromptDraft` / `StepPlan` / `Approval` / `Run` 的基础动作链，目标是形成可编辑、可提交、可执行、可回看的闭环。

2. **围绕单任务上下文落地工作台能力**  
   所有动作都必须服务于单任务上下文，不把多任务编排、复杂工作流编排或跨任务调度当作 B1 范围。

3. **审批与执行之间的断点必须被显式收口**  
   B1 不只做页面动作，还要把审批到执行之间的衔接断点整理清楚，避免“能点但接不上”的伪可用。

4. **最小追溯证据位要同步定义**  
   可回看不是附属展示，而是 B1 的验收组成部分；必须定义最小追溯证据位，让工作台动作链有可验证的回溯锚点。

5. **严格冻结 B1 边界**  
   不提前承诺或实现 B2/B3 的深编排能力，也不把 `Skeleton` 深能力纳入 B1 基线，避免范围漂移。

## Alternatives Considered

- 直接把工作台做成完整编排平台：拒绝。会把 B1 拉进 B2/B3 的范围，破坏阶段边界。
- 继续保持只读闭环，不引入基础操作链：拒绝。会让运行中心停留在“可看不可做”的状态，无法形成工作台。
- 先做大范围多任务能力，再回头补单任务闭环：拒绝。会增加验证复杂度，且不符合本次计划的收口顺序。

## Related Code

| Path | Role |
| --- | --- |
| `docs/skillforge-b1-scope-and-guardrails-one-pager-v1.md` | B1 范围与口径守门锚点 |
| `docs/skillforge-b1-action-surface-inventory-v1.md` | 运行中心动作面与承接位盘点锚点 |
| `docs/skillforge-b1-minimal-operation-chain-v1.md` | `PromptDraft` / `StepPlan` 最小操作链锚点 |
| `docs/skillforge-b1-approval-run-gap-inventory-v1.md` | 审批与执行衔接断点锚点 |
| `docs/skillforge-b1-minimal-traceability-evidence-v1.md` | 最小追溯证据位锚点 |
| `docs/skillforge-b1-first-batch-workbench-actions-v1.md` | 第一批工作台动作方案与收口结论锚点 |

## Consequences

- 正向：运行中心从只读闭环进入基础可操作工作台，单任务工作流具备最小可执行性。
- 正向：`PromptDraft`、`StepPlan`、`Approval`、`Run` 的基础动作链形成稳定基线，便于后续扩展。
- 正向：审批到执行的断点、回看证据位和动作边界都被提前收口，减少后续返工。
- 取舍：B1 不会覆盖深编排和 `Skeleton` 深能力，能力边界保持保守。
- 风险：如果后续把 B2/B3 能力提前塞回 B1，工作台边界会再次漂移。
- 验证锚点：`docs/skillforge-b1-scope-and-guardrails-one-pager-v1.md`、`docs/skillforge-b1-minimal-operation-chain-v1.md`、`docs/skillforge-b1-approval-run-gap-inventory-v1.md`、`docs/skillforge-b1-minimal-traceability-evidence-v1.md`、`docs/skillforge-b1-first-batch-workbench-actions-v1.md`。

## Search Terms

- `PromptDraft`
- `StepPlan`
- `Approval`
- `Run`
- `Skeleton`
- `可操作工作台`
- `最小闭环`
- `边界冻结`
