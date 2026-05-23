# ADR: SkillForge Phase 9 integration surface 保持 read-only，并复用既有 reporter

## Status

accepted

## Context

Phase 9 的完成计划把目标收敛到第一条最小 read-only integration surface，而不是 full UI 或完整 dashboard。计划明确写死了几条长期边界：

- UI 只做最小可观察面，不做完整应用或全功能 dashboard。
- 跨阶段集成只串已有且可诚实接入的真实链路，不发明新链路。
- 当前 subplan 不替 Phase 7 补代码构件。
- 不碰 full collaboration、real-time sync、auth、multi-tenancy。

retrospective 进一步固定了事实：当前交付物是 `scripts/skillforge-status.mjs`，它真实 import 了 `runtime-replay-reporter.mjs` 的导出，覆盖五维：注册态 / 校验态 / 阶段态 / 门槛态 / Runtime Replay 状态；`Generator` 未接入不是漏做，而是因为 Phase 7 当前缺少可 import 构件。

这类决策值得沉淀，因为它定义了 Phase 9 的长期职责边界：它是把已有产物接到一个可观察、只读的集成面上，而不是替前置阶段补实现、也不是提前做完整产品化 UI。

## Decision

决定将 SkillForge Phase 9 的 integration surface 固定为 **read-only 的最小可观察面**，并且只复用已经存在且可诚实接入的 reporter / status 链路。

具体规则如下：

- `scripts/skillforge-status.mjs` 只作为 read-only 接线与健康检查入口，不承担真实运行、执行编排或产品化 UI 责任。
- `Runtime Replay` 检查必须直接复用 `src/skillforge/runtime-replay-reporter.mjs` 的真实导出，至少包括 `buildRuntimeReplayReport`、`RUNTIME_REPLAY_KIND`、`RUNTIME_REPLAY_PROTOCOL_VERSION`、`RUNTIME_REPLAY_REPORT_VERSION`。
- `status` 输出只验证接线、协议可读性和 report 构造稳定性，不触碰真实 fixture execution、sandbox、scoring、multi-case 或 provider-backed 路径。
- Phase 9 不替 Phase 7 补 generator 可 import 构件；当上游阶段没有可接入产物时，保持显式空接入，而不是伪造链路。
- 集成范围只覆盖已能诚实接入的链路；`Generator` 暂不接入属于边界控制，不是缺陷。

## Alternatives Considered

- 做 full UI / full dashboard：拒绝。计划已明确只做最小可观察面，过早产品化会扩大耦合。
- 为 `Generator` 先补可 import 构件：拒绝。Phase 9 的职责不是替 Phase 7 补代码构件。
- 内联 mock `Runtime Replay` 逻辑：拒绝。会让 `status` 与真实实现分叉，失去诚实接线意义。
- 把 `status` 当成真实执行验证：拒绝。`status` 只应是 read-only 检查，不应暗示 runtime 已落地。

## Related Code

| Path | Role |
| ---- | ---- |
| `scripts/skillforge-status.mjs` | Phase 9 的最小 read-only integration surface 入口。 |
| `src/skillforge/runtime-replay-reporter.mjs` | `Runtime Replay` 真实导出来源。 |
| `docs/roadmap.md` | Phase 9 定位与阶段边界的来源锚点。 |
| `docs/phase-5-product-surface-ui-planning-skeleton-v0.md` | UI 只做 skeleton 级最小可观察面的参考锚点。 |

## Consequences

- 正向：`status` 继续保持轻量、诚实、可观察，不会滑向 full UI 或真实执行器。
- 正向：`Runtime Replay` 接线与协议检查直接依赖真实导出，降低脚本与源实现分叉风险。
- 正向：`Generator` 缺少可 import 构件时不会被强行接入，避免伪链路。
- 取舍：Phase 9 只覆盖已存在链路的可观察面，短期内不会得到完整产品化 UI。
- 取舍：对 `Runtime Replay` 的检查只验证读-only 健康，不代表真实 runtime execution、sandbox、scoring 已实现。
- 验证锚点：`node scripts/skillforge-status.mjs` 应保持可运行，且 `Runtime Replay` 仍然是 read-only 检查。

## Search Terms

- `scripts/skillforge-status.mjs`
- `runtime-replay-reporter.mjs`
- `buildRuntimeReplayReport`
- `RUNTIME_REPLAY_KIND`
- `RUNTIME_REPLAY_PROTOCOL_VERSION`
- `RUNTIME_REPLAY_REPORT_VERSION`
- `Runtime Replay`
- `read-only`
- `minimal integration surface`
- `Generator`
