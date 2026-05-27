# ADR: SkillForge Plan 与 Run 可观测性双拦截点

## Status

accepted

## Context

SkillForge 的真实任务链路里，`plan` 创建和 `subagent` 派发分别对应两个独立的可观测入口。如果只在单点写入或只记录最终结果，就会丢失“谁创建了计划、谁发起了执行、执行后是否真的落入 run 记录”的追溯能力。

本次里程碑把目标收敛为一条长期约束：`plan` 记录与 `run` 记录必须作为两条独立链路同时存在，并且能够在 `Run Center` 中互相关联。这样才能让第一单真实任务成为可追溯的基线样本，而不是一次性的手工验证。

## Decision

决定将 SkillForge 的真实任务可观测性固定为以下长期规则：

1. **`plan` 创建与 `subagent` 派发是两个独立拦截点**
   - `plan` 侧负责记录计划本身的创建事实。
   - 执行侧负责记录 `run` 的发生与结果。
   - 两者不能合并成单一日志点，否则后续无法区分“计划已写入”与“执行已发生”。

2. **每个 task 的 `subagent` 派发必须经过 SkillForge operate 管线**
   - 真实任务的数据源不是抽象草稿，而是本项目自身的 `plan/task/spawn` 记录。
   - 派发路径必须可追溯，不能绕过 operate 管线直接写入最终态。

3. **每个 task 完成后必须在 `execution-log` 中产生对应 `run` 记录**
   - 任务完成不是只看状态变化，而是要看是否确实落地了 run 记录。
   - `run` 记录需要能和 `plan` 通过关联字段互相追索。

4. **`Run Center` 详情必须展示 `planRef` 与 `plan` 摘要**
   - 运行详情页应能直接看见关联计划，而不是只看到孤立的执行结果。
   - 关联展示是可观测性的一部分，不是额外装饰。

5. **验证口径必须覆盖真实端到端闭环**
   - 必须以真实 `plan + run` 数据验证链路闭环，而不是只验证单次 API 或单表写入。
   - 当链路成立时，`plan-record + run-record + rawIO + planSummary` 应能形成完整可追踪路径。

## Alternatives Considered

- **只保留 `plan` 记录，不单独记录 `run`**：拒绝。这样看不到真实执行发生与结果。
- **只保留 `run` 记录，不回链到 `plan`**：拒绝。这样失去计划来源与执行语境。
- **把 `plan` 与 `run` 合并成一条流水记录**：拒绝。会破坏独立拦截点，后续难以定位责任边界。

## Related Code

| Path | Role |
| ---- | ---- |
| `web-server.mjs` | `plan` 创建写入入口与 `execution-log` 的 `planRef` 关联点。 |
| `web/src/components/RunCenterDetail.jsx` | `planRef` 与 `plan` 摘要的展示锚点。 |
| `plan.json` | 本里程碑的真实任务源与完成事实记录。 |

## Consequences

- 正向：`plan` 与 `run` 各自保留独立事实，排障与追溯更清晰。
- 正向：`Run Center` 能直接把执行结果回链到计划上下文，减少“只见结果不见来源”的断链。
- 正向：第一单真实任务可作为后续里程碑的稳定可观测基线。
- 取舍：需要维护 `planRef` 这类关联字段，链路写入复杂度略高。
- 风险：如果后续某条写入路径绕开 operate 管线，链路会再次出现断点。
- 验证锚点：后续应继续检查真实 `plan + run` 是否能在 `plan-record / run-record / rawIO / planSummary` 四层同时可见。

## Search Terms

- `planRef`
- `execution-log`
- `RunCenterDetail`
- `plan-record`
- `run-record`
- `rawIO`
- `planSummary`
- `plan/task/spawn`
