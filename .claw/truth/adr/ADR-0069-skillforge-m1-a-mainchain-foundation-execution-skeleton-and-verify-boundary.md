# ADR: SkillForge M1-A 主链基础件执行骨架与 verify 边界

## Status

accepted

## Context

L1-A 已完成负责人级真实执行骨架收口：首条真实样本主链的基础实现切片、代码落点、coding/verify 原子任务、依赖顺序、verify 独立性与阶段禁区已经固定。若不把这些约束沉淀成 ADR，后续很容易把“真实执行骨架”再次退回成可变计划，导致后续实现与验证重新混 scope、混职责、混验收。

## Decision

决定将 M1-A 固化为“主链基础件执行骨架”，并按以下规则推进：

1. 先锁定主链基础实现件的范围，再派发实现型任务；重点覆盖对象链、状态机、审批硬门禁、Run 版本固化与 Evidence 锚点。
2. 实现任务与验证任务必须拆开，verify 作为独立职责存在，不揉进实现任务里。
3. 依赖关系、并行窗口与阶段禁区要提前写清，避免后续任务在 scope 上交叉、在职责上混淆。
4. 后续真正的 coding / verify 派发必须以这份执行骨架为起点，而不是重新从零定义任务边界。
5. coding 原子任务按 C1 对象与引用链 schema/类型落地、C2 锁定态与版本修订策略、C3 审批硬门禁接入 Run create/start、C4 Run 版本快照固化与防漂移、C5 Evidence 关联与回看查询最小能力推进；verify 原子任务按 V1 主链连续性验证、V2 门禁负例验证、V3 版本漂移防护验证、V4 Run-Evidence 绑定与可回看验证推进。
6. 顺序固定为 C1→C2→C3→(C4∥C5)→(V1∥V2∥V3∥V4)，且 verify 必须独立于 coding。

## Alternatives Considered

- 直接把 M1-A 当成代码实现完成来收口：被放弃，因为此轮完成的是执行骨架，不是代码层最终落地。
- 把 verify 和实现揉成一个任务：被放弃，因为会破坏可审计、可回退的验收边界。
- 不提前定义禁区与并行窗口：被放弃，因为会让后续派发再次出现混 scope 和混职责。

## Related Code

| Path | Role |
| --- | --- |
| `plans/subplan-2-subplan-l1a-主链基础件真实落地.json` | L1-A 计划记录与任务骨架来源 |
| `docs/skillforge-p0-phase5-acceptance-map-and-mainline-anchor-v1.md` | 第五阶段主线与验收锚点 |
| `docs/skillforge-p1-minimal-real-object-chain-and-state-machine-draft-v1.md` | 对象链与状态机基线 |
| `docs/skillforge-p3-minimal-real-evidence-chain-and-regression-acceptance-baseline-draft-v1.md` | 证据链与回归验收基线 |

## Consequences

- 正向：后续实现任务有了稳定的执行骨架，减少一上来就混 scope 的风险。
- 正向：verify 独立后，验收更容易审计，也更容易回退与复核。
- 正向：对象链、状态机、门禁、版本与证据锚点被纳入同一推进框架，利于真实样本链路持续演进。
- 正向：C1/C2/C3/C4/C5 与 V1/V2/V3/V4 的拆分关系明确，后续可直接派发原子任务。
- 取舍：这次完成的是“骨架收口”，不等于对象链、门禁、版本固化和 evidence 锚点已经在代码层全部落地。
- 风险：如果后续派发不继续沿用这套边界，M1-A 收口会迅速失效。

## Search Terms

- `对象链`
- `状态机`
- `审批硬门禁`
- `Run`
- `Evidence`
- `verify`
- `coding`
- `M1-A`
- `C1`
- `V1`
