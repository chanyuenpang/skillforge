# ADR: SkillForge 真实运行最小产品闭环

## Status

accepted

## Context

当前计划已经完成并确认 SkillForge 从“静态验证、fixture、CI 最小门禁、contract 与治理骨架较完整”推进到“真实 provider-backed 运行、原始输入输出、transcript persistence、run detail / evidence 回看链路可闭环”的阶段。前序 ADR 已经分别固定了最小真实执行闭环、`executionId` 级 transcript 证据锚点、最小真实证据链与回归验收基线，以及默认工作流中间层的 `review plan → optimize prompt → spawn` 规则；本次计划不再是能力设想，而是把这些能力收束成一条已经成立的最小产品主链。

计划记录明确指出：真实入口发起 `task4` runtime run，`execution/transcript` 已持久化，`run detail` 可查询并回看关联，最小真实运行闭环已成立。与此同时，`reserved seam/stub` 字段仍不能被误报为真实 provider execution/transcript 能力，后续继续围绕真实链路推进，而不是继续把静态 contract 当成闭环完成。

## Decision

决定将 SkillForge 的主线固定为“真实运行最小产品闭环”，并把验收重心收敛为一条已经打通的最小事实链：一次真实任务从入口发起，进入系统完成真实执行，原始输入输出与 transcript 证据落盘，`run detail` 可以直接回看关联结果。

这次计划的关键落点不是再抽象出新的门槛，而是确认并固化以下长期约束：

1. **真实 provider-backed run**：真实任务必须走真实执行链，不能用静态 fixture、stub 或 reserved seam 冒充。
2. **原始输入输出保留**：真实任务的输入输出必须留痕，供后续回看与复盘。
3. **transcript 持久化**：transcript 必须可追溯落盘，并沿 `executionId` 主链可回看。
4. **run detail / evidence 回看**：`run detail` 必须能查询并回看关联的 `execution/transcript`，验证 `evidence.transcript` 与真实执行绑定。

同时，继续采用 SkillForge 默认工作流中间层：

- 先做负责人思考与现状盘点。
- 再做主链设计与实施分解。
- 每次派发 subagent 前先优化 prompt。
- 最后以真实运行闭环是否成立作为验证收口。

## Alternatives Considered

- 继续优先扩写设计文档：被拒绝，因为这会把“文档完备”继续误写成“产品闭环已完成”。
- 只补静态 contract / CI 门禁：被拒绝，因为它们不能证明真实 provider-backed execution 与证据回看链路成立。
- 先开放高阶能力再补最小闭环：被拒绝，因为当前最小闭环尚未成立，不能外推规模化能力。

## Related Code

| Path | Role |
| --- | --- |
| `plan.json` | 本次计划记录，承载真实运行最小产品闭环的任务骨架与验收约束 |
| `src/skillforge/transcript-store.mjs` | `transcript` 持久化与 `executionId` 级关联的核心存储锚点 |
| `web-server.mjs` | `buildRunDetail(runId)` 与 `evidence.transcript` 回看入口 |
| `docs/skillforge-owner-decision-page-v2.md` | 负责人裁决输入与目标切换来源 |
| `docs/skillforge-d5-phase-d-closeout-inputs-v1.md` | 前序阶段收口与下一轮主计划的基线来源 |

## Consequences

- 正向：真实入口发起、执行落日志、transcript 持久化、`run detail` 可回看这条主链已经成立，后续实现可以围绕既有闭环继续增强。
- 正向：`executionId` 级 transcript 证据锚点与 `buildRunDetail(runId)` 回看入口形成统一主链，便于 UI、Retro 与审计复用。
- 正向：默认工作流中间层继续生效，减少无约束的裸 spawn 与偏题返工。
- 取舍：`reserved seam/stub` 字段仍不应被当作真实能力对外宣称，避免把可观察痕迹误当产品事实。
- 风险：如果后续只做局部增强而不保持这条主链，仍可能退回到“看起来能跑、实际不闭环”的状态。
- 验证锚点：`plan.json` 的完成态记录、真实入口发起 `task4` runtime run、`execution/transcript` 持久化、`run detail` 可查询回看关联。

## Search Terms

- `真实运行最小产品闭环`
- `provider-backed run`
- `transcript persistence`
- `run detail`
- `evidence.transcript`
- `executionId`
- `fixtureId`
- `task4`
- `execution/transcript`
- `review plan`
- `optimize prompt`
- `spawn`
