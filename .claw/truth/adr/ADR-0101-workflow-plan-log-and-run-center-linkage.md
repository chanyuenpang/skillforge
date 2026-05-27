# ADR: Workflow 计划记录与 Run Center 关联展示

## Status

proposed

## Context

当前 Workflow Runtime 里，`plan` 创建和 `subagent` 派发是两条独立的真实调用路径，但缺少统一的可观测锚点：

1. `plan` 创建时只有骨架生成结果，后续很难追溯“这个 plan 当时是如何被创建出来的”。
2. `subagent` 派发完成后虽有执行结果，但与上游 `plan` 的关联不稳定，Run Center 里看不到完整链路。
3. 需要一个轻量的 plan 记录对象，把“plan 输入”和“plan 骨架输出”固定下来，并在 run 详情页透出关联信息。

本次计划记录明确要求：两个独立拦截点分别记录输入输出；`planRef` 为可选关联；不做审批门控，也不强制先后顺序。

## Decision

引入一条轻量的计划记录链路，并把它和 Run Center 的 run 详情页打通：

1. `plan` 创建时写入轻量 `plan` 记录，保存输入与骨架输出。
2. `subagent` 派发完成时，`execution-log` 记录写入 `planRef`，并保留完整的 `skill + prompt` 上下文。
3. Run Center 的 run 详情页展示 `planRef` 和 `plan` 摘要，让单次执行可回溯到对应计划。
4. `planRef` 只是可选关联，不要求所有 run 都必须绑定 `plan`。
5. 这条链路不承担审批门控职责，也不要求 `plan` 创建与 `subagent` 派发严格按顺序发生。

## Alternatives Considered

- 只记录 `subagent` 执行日志，不记录 `plan` 骨架：被拒绝，因为上游计划输入无法追溯，链路不完整。
- 只在 `Run Center` 展示执行结果，不展示 `plan` 关联：被拒绝，因为无法把 run 回指到 plan 设计意图。
- 把 `plan` 与审批门控强绑定：被拒绝，因为本次目标是可观测性，不是权限控制。
- 强制所有 run 都必须有 `planRef`：被拒绝，因为这会把轻量观察链路变成硬约束，影响已有自由派发路径。

## Related Code

| Path | Role |
| --- | --- |
| `src/skillforge/plan-log-store.mjs` | 计划记录的轻量存储对象候选，负责 `save/loadById/list` 等基础能力 |
| `web-server.mjs` | `plan` 创建与 `subagent` 派发的两个写入入口，以及 `buildRunDetail` 关联数据构造 |
| `RunCenterDetail.jsx` | Run Center 详情页展示 `planRef` 与 `plan` 摘要的前端落点 |

## Consequences

- 正向：`plan` 创建与 `run` 执行之间形成可追溯链路，便于回看真实输入输出。
- 正向：Run Center 能展示 `planRef` 和计划摘要，提升单次执行的解释性。
- 正向：`planRef` 作为可选字段，兼容已有自由派发路径。
- 取舍：需要新增一层轻量存储与 API 写入逻辑，增加少量实现成本。
- 风险：如果后续没有持续把 `planRef` 写入执行日志，Run Center 的链路展示会退化。
- 验证锚点：真实创建一条 `plan` 记录和一条关联 `run` 记录后，Run Center 能同时看到计划骨架与执行输入输出。

## Search Terms

- `plan-log`
- `planRef`
- `RunCenterDetail`
- `buildRunDetail`
- `skill + prompt`
- `plan 创建`
- `subagent 派发`
- `可选关联`
- `全链路可观测`
