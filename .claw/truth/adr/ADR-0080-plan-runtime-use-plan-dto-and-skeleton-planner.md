# ADR: Plan Runtime 采用 `PlanDTO` 与顾问式 skeleton planner

## Status

accepted

## Context

现有 `planSkeleton` 与正式 plan 工具链是两套差异很大的系统，字段、状态模型与映射口径都不一致。直接让运行时强执行正式 plan，会把抽象层次和责任边界搅乱，也会让后续实现阶段在错误抽象上继续细化。

本次阶段A完成了真实接口盘点、映射设计与原子任务切片，明确需要先把中间层和核心职责收口，再谈执行增强。

## Decision

Plan Runtime 的核心层不直接充当强执行 orchestrator，而是采用“顾问式 skeleton planner + 中立 `PlanDTO` 中间层”的设计。

具体规则如下：

1. `planSkeleton` 不直接映射到正式 plan 的写入结构，必须先落到中立 `PlanDTO`。
2. `PlanDTO` 负责承接 `planSkeleton`、正式 plan 工具与运行时状态之间的转换，不表达特定模型能力或平台习惯。
3. 核心层只表达 skeleton、contract、state，不承担强执行编排职责。
4. 运行时面向正式 plan 的输出，应通过适配层和转换策略完成，而不是让核心层直接驱动下发。
5. 阶段A 后续实现与验证任务必须按独立性原则切分，coding 与 verify 分离。

## Alternatives Considered

- 让运行时直接做强执行 orchestrator：被拒绝，因为会把两套差异很大的系统硬耦合，放大扁平化与层级保真风险。
- 继续只保留 `planSkeleton` 定义，不引入中间层：被拒绝，因为无法稳定承接正式 plan 工具链的状态与映射差异。
- 在核心层里同时塞入模型习惯和平台能力：被拒绝，因为会破坏中立抽象，后续扩展更难收口。

## Related Code

| Path | Role |
| --- | --- |
| `plans/subplan-2-plan.json` | 本次阶段A设计与切片的源计划记录 |
| `planSkeleton` | 现有骨架输入对象锚点 |
| `plan_write` | 正式 plan 写入接口锚点 |
| `plan_edit` | 正式 plan 修改接口锚点 |
| `PlanDTO` | 核心中间层锚点 |
| `skeleton planner` | 顾问式核心层职责锚点 |
| `coding` | 后续实现任务分流锚点 |
| `verify` | 后续验证任务分流锚点 |

## Consequences

- 正向：核心层职责变窄，抽象更稳定，后续实现不容易滑向强执行编排。
- 正向：`planSkeleton` 与正式 plan 的转换边界清晰，便于后续适配层实现。
- 正向：实现与验证被显式拆开，降低阶段A后续任务耦合度。
- 取舍：需要额外维护 `PlanDTO` 与转换层，短期实现路径更长。
- 风险：如果后续绕过 `PlanDTO` 直连正式 plan，层级保真问题会重新出现。

## Search Terms

- `PlanDTO`
- `planSkeleton`
- `plan_write`
- `plan_edit`
- `skeleton planner`
- `coding`
- `verify`
- `state model`