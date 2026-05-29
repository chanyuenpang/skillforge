# ADR: SkillForge shared baseline v0 的 nightly / 回归首版接线策略

## Status

accepted

## Context

shared baseline v0 与 `failure pool` 契约已经成立，但这次计划的目标不是继续扩 Batch 2 / Batch 3，也不是把上层产品面能力一起接进来，而是先把 baseline + Batch 1 稳定挂入最小 nightly / 回归节奏。

计划明确了几个长期约束：

- nightly / 回归首版只做最小接线，不混入后续批次扩样。
- 调度入口、退出码、结果产物、失败回传必须与现有 `summary.json` / `failures.ndjson` 对齐，不能新增平行产物协议。
- 产物必须可追溯，且验证环节必须覆盖“可触发、可失败返回、产物路径稳定、结果可追溯”。
- truth 文档默认不手动改写，优先通过 plan、脚本、配置与说明文档承接。

这说明 nightly / 回归不是一份临时跑批脚本，而是 shared baseline v0 的稳定运行方式之一，后续回归与扩样都要沿着这条接线复用。

## Decision

决定将 SkillForge shared baseline v0 的 nightly / 回归首版固定为以下实现与治理规则：

1. **采用独立 nightly workflow 作为最小接线点**
   - 通过新增独立 workflow 接入 nightly / 回归节奏，而不是把逻辑塞回已有主流程。
   - workflow 同时支持 cron 定时触发与手动触发，保证可运维、可补跑。
   - 首版以最小接线为目标，不提前扩成复杂调度平台。

2. **复用既有 baseline runner 与现有产物协议**
   - 继续复用 `scripts/run-shared-baseline-v0.mjs` 作为执行入口。
   - 仍然围绕现有 `summary.json` 与 `failures.ndjson` 两类产物组织结果。
   - 结果上传采用“双产物”思路，保证 baseline 成功与失败样本都能被回收。

3. **nightly / 回归首版的职责边界固定**
   - 只承接 baseline + Batch 1 的最小稳定调度。
   - 不把 Batch 2 / Batch 3 扩样、通知告警、上一轮对比等增强项混进首版。
   - 后续增强必须作为独立增量继续推进，不能破坏首版的单一职责。

4. **验证以可触发与可追溯为准**
   - 首版必须验证能真实触发。
   - 必须验证失败路径能回传。
   - 必须验证产物路径稳定，且结果可以从 workflow 回收到同一批 summary / failures 产物。

## Alternatives Considered

- **继续只保留手工跑批，不接 nightly / 回归**：被拒绝。没有稳定调度，shared baseline v0 难以成为长期回归节奏。
- **把 nightly / 回归做成大而全的平台化调度系统**：被拒绝。当前阶段只需要最小、最稳的首版接线。
- **新增一套平行产物协议**：被拒绝。会破坏 `summary.json` / `failures.ndjson` 的统一口径。
- **把 Batch 2 / Batch 3、通知告警、趋势对比一起并进首版**：被拒绝。首版应先把调度、失败回传与可追溯性跑稳。

## Related Code

| Path | Role |
| ---- | ---- |
| `scripts/run-shared-baseline-v0.mjs` | shared baseline v0 的复用 runner 主入口。 |
| `baselines/shared/v0/results/summary.json` | nightly / 回归首版的成功结果产物。 |
| `baselines/shared/v0/results/failures.ndjson` | nightly / 回归首版的失败回传产物。 |
| `.github/workflows/nightly-shared-baseline-v0.yml` | 新增独立 nightly workflow，承载 cron 与手动触发。 |
| `plans/subplan-3-plan.json` | 本次 nightly / 回归首版接线计划源记录。 |
| `adr/ADR-0114-skillforge-shared-baseline-v0-sample-protocol-runner-report-and-phase1-batches.md` | shared baseline v0 的样本协议、统一 runner 与 Phase 1 基线。 |
| `adr/ADR-0115-skillforge-shared-baseline-v0-mainline-judgement-and-follow-up-structure.md` | 主线裁决与后续增强拆分口径。 |

## Consequences

- 正向：shared baseline v0 有了最小 nightly / 回归节奏，后续可以稳定调度与复跑。
- 正向：继续复用 `scripts/run-shared-baseline-v0.mjs`，避免引入平行执行链。
- 正向：`summary.json` / `failures.ndjson` 的统一口径被保持，结果可追溯性更强。
- 取舍：首版只做最小接线，暂不覆盖 Batch 2 / Batch 3、通知告警和趋势对比。
- 取舍：新增独立 workflow 会增加一点运维面，但换来调度与回归边界更清晰。
- 风险：如果后续把更多治理逻辑塞回首版 workflow，会再次破坏“首版只管调度与回传”的边界。
- 验证锚点：workflow 必须能触发、能失败返回、能稳定上传 summary / failures 双产物，并保持结果路径一致。

## Search Terms

- `nightly`
- `回归`
- `summary.json`
- `failures.ndjson`
- `scripts/run-shared-baseline-v0.mjs`
- `nightly-shared-baseline-v0.yml`
- `baseline + Batch 1`
- `可追溯`
- `独立 workflow`
