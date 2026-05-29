# ADR: SkillForge shared baseline v0 的 Batch 2 样本扩展与可比性基线

## Status

accepted

## Context

shared baseline v0 已经完成 Batch 1，并且 `summary.json` / `failures.ndjson` 契约已经稳定。当前这一步不是再去证明基线能不能成立，而是把 Batch 2 的扩样规则固定下来：样本从哪里来、如何接入、和 Batch 1 如何保持可比、以及首版扩样必须满足什么验证条件。

计划明确了几个长期约束：

- Batch 2 只负责扩样与可比性基线，不混入 nightly、回归运营或 Batch 3 机制。
- 扩样必须优先保证与 Batch 1 结果可比，不能为了新增样本改变 failure 契约或引入平行失败协议。
- 样本接入以最小改动为原则，优先通过 `manifest` 追加让 runner 自动消费，而不是改动 runner / workflow 主体。
- truth 文档默认不手动改写，优先通过 plan、裁决页与 roadmap 承接。

这说明 Batch 2 的价值不在于“更多样本本身”，而在于把后续连续扩样的稳定接口固定下来。

## Decision

决定将 shared baseline v0 的 Batch 2 固定为“样本扩展 + 可比性基线”的独立阶段，并采用以下规则：

1. **Batch 2 只做扩样，不扩治理面**
   - 只追加新的样本文件与 `manifest` 条目。
   - 不把 nightly、回归、趋势对比或 Batch 3 机制塞进同一包。
   - 不把扩样结果误写成更高阶段能力自动成立。

2. **扩样优先走 manifest 驱动接入**
   - 样本接入优先通过 `manifest` 追加条目完成。
   - runner 继续复用现有 `scripts/run-shared-baseline-v0.mjs`。
   - 不新增平行失败协议，仍然沿用 `summary.json` / `failures.ndjson` 作为统一口径。

3. **Batch 2 的首要目标是可比性**
   - 新增样本必须能和 Batch 1 在同一基线口径下比较。
   - 可比性口径优先于样本数量扩张。
   - 若无法保证可比，就不应把该样本纳入首版扩样。

4. **验证环节必须覆盖最小接入事实**
   - 至少验证样本来源明确。
   - 至少验证接入点明确。
   - 至少验证可比性口径明确。
   - 至少验证首版可运行。

## Alternatives Considered

- **把 Batch 2 直接做成夜间回归或趋势治理入口**：被拒绝。首版扩样应先稳定样本与可比性，不应扩大到运营面。
- **为 Batch 2 发明新的失败协议**：被拒绝。会破坏与 Batch 1 的统一口径。
- **先改 runner 再补样本**：被拒绝。现有 runner 已经够用，优先让 `manifest` 承担扩样。
- **把 Batch 2 样本按更激进的差异化标准接入**：被拒绝。会削弱与 Batch 1 的可比性。

## Related Code

| Path | Role |
| ---- | ---- |
| `plans/subplan-2-plan.json` | 本次 Batch 2 扩样计划源记录，包含范围、可比性口径与验证要求。 |
| `scripts/run-shared-baseline-v0.mjs` | Batch 2 继续复用的统一 runner 入口。 |
| `baselines/shared/v0/results/summary.json` | Batch 2 必须兼容的成功结果口径。 |
| `baselines/shared/v0/results/failures.ndjson` | Batch 2 必须兼容的失败结果口径。 |
| `baselines/shared/v0/manifest.json` | 扩样优先接入的样本清单锚点。 |
| `baselines/shared/v0/samples/` | Batch 2 新样本的落点目录。 |
| `adr/ADR-0114-skillforge-shared-baseline-v0-sample-protocol-runner-report-and-phase1-batches.md` | shared baseline v0 的统一协议、runner 与 Phase 1 顺序基线。 |
| `adr/ADR-0115-skillforge-shared-baseline-v0-mainline-judgement-and-follow-up-structure.md` | 主线裁决与后续增强拆分口径。 |

## Consequences

- 正向：Batch 2 的扩样方式被固定为 `manifest` 驱动，能低成本继续扩展。
- 正向：与 Batch 1 的可比性口径保持一致，回归结果可直接对照。
- 正向：`summary.json` / `failures.ndjson` 统一口径不被破坏，后续治理可以沿用同一条链路。
- 取舍：扩样灵活性会下降，新增样本必须服从统一协议与可比性要求。
- 风险：如果后续为了赶样本数量而放松可比性，Batch 2 会失去作为基线的意义。
- 验证锚点：Batch 2 首版必须能真实运行，且能证明样本来源、接入点、可比性口径都已经明确。

## Search Terms

- `shared baseline`
- `baseline v0`
- `Batch 2`
- `manifest`
- `summary.json`
- `failures.ndjson`
- `可比性`
- `samples`
- `scripts/run-shared-baseline-v0.mjs`
