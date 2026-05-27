# ADR: SkillForge L3-A Retro Finalized 真实执行骨架与 verify 边界

## Status

accepted

## Context

L3-A 这次收口的关键，不是已经完成了完整真实 Retro 样本闭环，而是把第一波真实回沉所需的执行骨架固定下来。计划明确了 Retro 完整化必须围绕 `Retro Finalized`、三分法、证据锚点、覆盖/未覆盖/回退条件，以及 `run` / `evidence` 强绑定来推进；同时把 coding 类与 verify 类原子任务、依赖顺序、verify 独立性和阶段禁区一并固定。

如果不把这些边界收口，后续很容易把“真实样本准备”误当成“真实样本已完全落地并通过验证”，或者把 `Skeleton proposal/newVersion`、最终审查与回写治理提前混入本阶段。

## Decision

决定将 L3-A 的负责人级结论固定为“Retro Finalized 真实执行骨架”，并按以下规则作为后续执行约束：

1. L3-A 第一波只围绕 `Retro Finalized`、三分法、证据锚点、覆盖/未覆盖范围、回退条件，以及 `run` / `evidence` 强绑定推进。
2. 先固化 Retro 结构与 `Finalized` 门槛，再补 `run` / `evidence` 绑定与字段完整性验证。
3. coding 类与 verify 类任务必须拆成原子任务，并明确依赖顺序、并行窗口与综合收口方式。
4. verify 必须保持独立性，不得和实现任务混成一个不可分拆的复合任务。
5. 阶段边界必须显式冻结：`Skeleton proposal/newVersion`、最终审查与回写治理不属于 L3-A 的完成态。
6. 当前完成态是“真实执行骨架”而不是“真实 Retro 样本已经在代码与数据层完整落地并通过验证”。

## Alternatives Considered

- 直接把 L3-A 解释为真实 Retro 已完整落地：被拒绝，因为计划的 retrospective 已明确这次完成的是骨架收口，不是完整样本闭环。
- 把 `Skeleton proposal/newVersion` 与最终审查一并纳入：被拒绝，因为会越过本阶段的执行边界。
- 把 verify 与 coding 合并为单一任务：被拒绝，因为会削弱 verify 的独立性，降低边界校核价值。

## Related Code

| Path | Role |
| --- | --- |
| `plans/subplan-5-subplan-l3a-retro完整化真实落地.json` | L3-A 子计划完成记录、任务骨架、retrospective 与边界来源 |
| `plan.json` | 上位主计划锚点 |

## Consequences

- 正向：L3-A 的 Retro 结构、`Finalized` 门槛、`run` / `evidence` 绑定和 verify 边界被固定，后续可直接接力执行。
- 正向：coding/verify 原子任务可以直接派发，不必重新发明拆分方式。
- 正向：避免把未完成的真实样本落地误写成已验证完成。
- 取舍：本阶段不进入 `Skeleton proposal/newVersion`、最终审查与回写治理，推进会更克制。
- 风险：如果后续把“执行骨架”当成“完整样本闭环”，会误判完成度。
- 验证锚点：`plans/subplan-5-subplan-l3a-retro完整化真实落地.json` 中 tasks 1-3 的 done 记录与 retrospective。

## Search Terms

- `Retro Finalized`
- `三分法`
- `run`
- `evidence`
- `coding-agent`
- `verify-agent`
- `Skeleton proposal/newVersion`
- `verify 独立性`
- `阶段禁区`
