# ADR: SkillForge shared baseline v0 nightly / 回归首版接入与双产物上传

## Status

accepted

## Context

shared baseline v0 已经完成 Batch 1，并被主线裁决为可继续复用的基线节点。接下来需要的不是再扩一层平台化能力，而是把 nightly / 回归首版接入固定下来，让 baseline + Batch 1 能被稳定调度、失败可回传、结果可追溯。

本次计划明确了几个长期约束：

- 只做 nightly / 回归首版，不混入 Batch 2 / Batch 3 扩样或上层产品面消费。
- 复用现有 baseline runner，而不是再造一条新的执行链。
- 与已有 `summary.json` / `failures.ndjson` 对齐，保证结果与失败回传使用同一套产物语义。
- 每次子计划都要保留验证环节，确保“可触发、可追溯”而不是只写接线。

因此，这次接入的价值不在于新增复杂逻辑，而在于把 shared baseline v0 的最小回归闭环固化为长期可复用的运行模式。

## Decision

决定将 shared baseline v0 的 nightly / 回归首版固定为以下实现规则：

1. **使用独立 workflow 承载 nightly / 回归**
   - 新增独立 workflow 文件 `.github/workflows/nightly-shared-baseline-v0.yml`。
   - workflow 同时支持 `cron` 定时触发与 `workflow_dispatch` 手动触发。
   - nightly / 回归不与主线 Batch 1 / 样本协议混写在同一个工作流里。

2. **直接复用现有 baseline runner**
   - 执行入口继续复用 `scripts/run-shared-baseline-v0.mjs`。
   - 不新造一条平行 runner，避免双入口带来口径分裂。
   - nightly / 回归只负责调度和产物收口，不负责重新定义评测协议。

3. **固定双产物上传语义**
   - workflow 需要 `always upload` 双产物。
   - `summary.json` 作为最小成功产物，用于记录整体结果。
   - `failures.ndjson` 作为 failure 回传产物，用于承接失败样本。
   - 两个产物必须在同一条 nightly / 回归链路中同时保留，不能只保 summary 而丢失失败回传。

4. **把 nightly / 回归限定为首版接线，不提前扩展治理面**
   - 当前只做可触发、可追溯、可回传的首版接入。
   - 不在这一层提前加入 Batch 2 / Batch 3 扩样、通知增强或上层消费。
   - 后续扩展必须拆成独立 subplan，不得混进本次接线。

## Alternatives Considered

- **继续只保留 Batch 1，不接 nightly / 回归**：被拒绝。缺少定时与手动回归入口，shared baseline v0 只能停留在一次性执行。
- **为 nightly / 回归重新设计一条新 runner**：被拒绝。会导致与现有 baseline 口径分裂，破坏 shared baseline 的单一参照系。
- **只上传 `summary.json`，不保留 `failures.ndjson`**：被拒绝。这样会丢失失败样本回传能力，回归无法形成闭环。
- **把 Batch 2 / Batch 3 一起塞进首版接入**：被拒绝。当前阶段只需要把 nightly / 回归最小闭环接通，不需要扩成治理面。

## Related Code

| Path | Role |
| ---- | ---- |
| `adr/ADR-0116-skillforge-shared-baseline-v0-failure-pool-contract-and-follow-up-milestone-structure.md` | 后续增强里程碑结构，明确 nightly / 回归首版接入的顺序位置。 |
| `adr/ADR-0115-skillforge-shared-baseline-v0-mainline-judgement-and-follow-up-structure.md` | shared baseline v0 主线裁决与后续增强拆分口径。 |
| `adr/ADR-0114-skillforge-shared-baseline-v0-sample-protocol-runner-report-and-phase1-batches.md` | shared baseline v0 的样本协议、统一 runner 与 Phase 1 批次基础。 |
| `scripts/run-shared-baseline-v0.mjs` | nightly / 回归复用的 baseline runner 主入口。 |
| `.github/workflows/nightly-shared-baseline-v0.yml` | 独立 nightly / 回归 workflow 入口。 |
| `baselines/shared/v0/results/summary.json` | nightly / 回归最小成功产物。 |
| `baselines/shared/v0/results/failures.ndjson` | nightly / 回归 failure 回传产物。 |

## Consequences

- 正向：shared baseline v0 拥有了可定时、可手动触发的首版回归入口。
- 正向：继续复用同一 runner，保证 baseline / nightly / 回归的评测口径一致。
- 正向：`summary.json` 与 `failures.ndjson` 同步保留，结果与失败回传都能追溯。
- 取舍：采用独立 workflow 会增加一个调度层，但能避免与主线实现互相污染。
- 风险：如果后续把 Batch 2 / Batch 3 或治理通知塞回这个 workflow，首版接线会再次膨胀。
- 验证锚点：workflow 必须能通过 `cron` 和 `workflow_dispatch` 触发，并稳定上传 `summary.json` 与 `failures.ndjson`。

## Search Terms

- `nightly`
- `回归`
- `baseline runner`
- `scripts/run-shared-baseline-v0.mjs`
- `.github/workflows/nightly-shared-baseline-v0.yml`
- `summary.json`
- `failures.ndjson`
- `cron`
- `workflow_dispatch`
- `always upload`
