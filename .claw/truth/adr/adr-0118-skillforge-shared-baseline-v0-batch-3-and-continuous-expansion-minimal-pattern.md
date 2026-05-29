# ADR: SkillForge shared baseline v0 的 Batch 3 扩样与连续扩样最小模式

## Status

accepted

## Context

shared baseline v0 已经完成 Batch 1、Batch 2，并且 nightly 首版也已成立。当前问题不再是“基线能不能跑”，而是要把 Batch 3 的扩样方式和后续连续扩样的最小骨架钉死，避免以后每加一批样本都重新设计接线方式。

这次计划给出的稳定事实是：

- Batch 3 不是更高阶段能力的自动成立，只是 shared baseline v0 继续扩样。
- 扩样仍然要兼容 `summary.json` / `failures.ndjson` 契约，不新增平行产物协议。
- 样本接入优先复用 Batch 2 已验证通过的 `manifest` 驱动方式。
- 连续扩样机制的目标是让后续 Batch 4/5 继续按同一模式追加，不必改 runner 或重新设计接线。
- 这次还要求把验证环节明确保留，至少证明 Batch 3 可接入、可运行、且与前两批口径一致。

所以这条决策的核心，不是“再加 1 条样本”本身，而是确认 append-only 的样本接入模式可以持续复用。

## Decision

决定将 shared baseline v0 的 Batch 3 固定为“扩样 + 连续扩样最小骨架”阶段，并采用以下规则：

1. **Batch 3 继续沿用 manifest 驱动接入**
   - 新样本优先通过 `manifest` 尾部追加条目接入。
   - 继续复用现有 runner，不为 Batch 3 单独改造消费链路。
   - 保持 `summary.json` / `failures.ndjson` 作为唯一统一结果口径。

2. **连续扩样采用 append-only 最小模式**
   - 后续批次按“追加样本文件 + 追加 manifest 条目”的方式持续扩展。
   - 不引入新的并行协议或额外中间层。
   - 扩样骨架的目标是低摩擦复用，而不是把每次扩样都做成新设计。

3. **Batch 3 只负责扩样，不扩治理面**
   - 不把上层消费、产品面接入或额外治理逻辑混入本次阶段。
   - 不把 Batch 3 误写成 shared baseline v0 之后的自动升级证明。
   - 保持与 Batch 1 / Batch 2 的口径连续性。

4. **验证必须覆盖连续扩样成立**
   - 至少验证 Batch 3 样本可接入。
   - 至少验证 Batch 3 可以真实跑起来。
   - 至少验证输出口径与前两批保持一致。
   - 至少验证后续继续追加样本时，接线方式不需要重做。

## Alternatives Considered

- **为 Batch 3 重新设计新的扩样协议**：被拒绝。会破坏与 Batch 1 / Batch 2 的统一口径，也不利于后续连续扩样。
- **把 Batch 3 直接扩展成上层消费或产品面入口**：被拒绝。本阶段目标只应聚焦扩样与最小骨架，不混入更高层能力。
- **让 Batch 3 改 runner 来适配新增样本**：被拒绝。现有 `manifest` 驱动方式已经足够，应该继续复用。

## Related Code

| Path | Role |
| ---- | ---- |
| `plans/subplan-4-plan.json` | 本次 Batch 3 扩样与连续扩样机制计划源记录。 |
| `baselines/shared/v0/manifest.json` | Batch 3 继续沿用的样本接入锚点。 |
| `baselines/shared/v0/results/summary.json` | Batch 3 必须兼容的成功结果口径。 |
| `baselines/shared/v0/results/failures.ndjson` | Batch 3 必须兼容的失败结果口径。 |
| `baselines/shared/v0/samples/` | Batch 3 以及后续批次新增样本的落点目录。 |
| `.github/workflows/nightly-shared-baseline-v0.yml` | nightly 首版已成立，后续扩样应自然纳入同一链路。 |
| `adr/ADR-0114-skillforge-shared-baseline-v0-sample-protocol-runner-report-and-phase1-batches.md` | shared baseline v0 的统一协议与 runner 基线。 |
| `adr/ADR-0115-skillforge-shared-baseline-v0-mainline-judgement-and-follow-up-structure.md` | 主线裁决与后续增强拆分口径。 |
| `adr/ADR-0117-skillforge-shared-baseline-v0-batch-2-sample-expansion-and-comparability-baseline.md` | Batch 2 的 manifest 驱动扩样与可比性基线。 |

## Consequences

- 正向：Batch 3 的扩样方式被固定下来，后续 Batch 4/5 可以直接沿用同一套 append-only 模式。
- 正向：runner 和结果口径保持稳定，`summary.json` / `failures.ndjson` 继续作为统一契约。
- 正向：连续扩样的最小骨架成立，降低后续加样本的接线成本。
- 取舍：扩样方式更克制，新增样本必须服从 manifest 驱动和统一结果口径。
- 风险：如果后续有人想绕开 append-only 模式，连续扩样就会失去可维护性。
- 验证锚点：Batch 3 首版必须能真实运行，并证明 append-only manifest + batch 文件模式可继续复用。

## Search Terms

- `shared baseline`
- `baseline v0`
- `Batch 3`
- `manifest`
- `summary.json`
- `failures.ndjson`
- `append-only`
- `continuous expansion`
- `nightly-shared-baseline-v0.yml`
- `scripts/run-shared-baseline-v0.mjs`
