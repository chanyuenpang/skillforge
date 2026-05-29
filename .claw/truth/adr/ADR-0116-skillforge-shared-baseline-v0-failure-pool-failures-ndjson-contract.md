# ADR: SkillForge shared baseline v0 failure pool / failures.ndjson 契约定型

## Status

accepted

## Context

shared baseline v0 已经进入后续增强阶段，但 failure pool 还没有稳定的最小契约，就会让 Batch 2 / Batch 3、nightly / 回归接入、以及上层消费各自发明口径，最后把同一个失败事实写成不同结构。

本次计划明确要求先冻结 `failure pool / failures.ndjson` 的最小可执行契约，再继续扩样、nightly 或产品消费。计划还给出了验证要求：要确认有失败样本时能正确产出、无失败样本时行为一致、下游可稳定读取。

## Decision

决定将 shared baseline v0 的失败输出固定为 `failure pool / failures.ndjson` 的统一契约，并按以下规则执行：

1. **契约优先于扩展**
   - 先固定最小字段、触发条件、去重/重试语义、无失败时行为、落盘策略和消费约定。
   - `Batch 2` / `Batch 3`、`nightly`、回归接入和上层消费都必须建立在这份契约上，不得各自发明输出格式。

2. **统一挂接在 summary 之后抽取**
   - failure pool 的抽取位置固定在 summary 构建之后。
   - 复用已有 `sampleResults` 结构，避免在每个 stage runner 里分别收集失败数据。
   - 这样能把失败事实和 baseline summary 对齐，减少实现分叉。

3. **无失败时采用空文件口径**
   - 无失败场景下，`failures.ndjson` 采用 0 bytes 空文件。
   - 不再用空集、缺文件或其他口径混用。
   - 这个约定是为了让下游读取逻辑稳定，不必额外区分多种“没有失败”的表示法。

4. **去重与重试语义必须明确**
   - 对重复失败记录要有明确去重口径。
   - 对重试导致的多次失败记录要有稳定的记录语义。
   - 目标是避免后续扩样、趋势统计和回归口径漂移。

5. **验证环节必须保留**
   - 必须验证有失败样本时能产出正确记录。
   - 必须验证无失败样本时输出行为一致。
   - 必须验证下游可以稳定读取该文件。

## Alternatives Considered

- **把 failure pool 当成每个 stage 的临时附件**：被拒绝。这样会让失败口径散落在多个 runner 中，后续无法统一消费。
- **等 Batch 2 / Batch 3 做完再回头定契约**：被拒绝。没有先验契约，后续扩样和回归会不断改口径。
- **允许无失败时空文件、空集、缺文件并存**：被拒绝。多种表示法会直接增加下游复杂度。
- **把失败收集逻辑直接埋进各 stage runner**：被拒绝。这样实现会分叉，且不利于与 summary 对齐。

## Related Code

| Path | Role |
| ---- | ---- |
| `scripts/run-shared-baseline-v0.mjs` | 失败池首版最可能挂接的 runner 入口。 |
| `baselines/shared/v0/results/summary.json` | 当前 shared baseline v0 的结果输出锚点，failure pool 需要与之对齐。 |
| `plan.json` | 本次契约定型计划源记录，包含最小契约、行为约定与验证要求。 |
| `adr/ADR-0114-skillforge-shared-baseline-v0-sample-protocol-runner-report-and-phase1-batches.md` | shared baseline v0 的样本协议、统一 runner 与 Phase 1 批次基线。 |
| `adr/ADR-0115-skillforge-shared-baseline-v0-mainline-judgement-and-follow-up-structure.md` | shared baseline v0 主线裁决与后续增强拆分口径。 |

## Consequences

- 正向：`failures.ndjson` 成为 shared baseline v0 的统一失败契约，后续增强可以直接复用。
- 正向：无失败时统一写空文件，下游消费最稳定。
- 正向：failure pool 放到 summary 之后抽取，能最大限度复用已有结构，减少改动面。
- 取舍：契约一旦固定，后续扩字段需要谨慎评估，不能随意漂移。
- 风险：如果后续把阶段级临时字段塞回 `failures.ndjson`，会破坏统一消费口径。
- 验证锚点：在失败/无失败两种场景下都要验证产物一致性和下游可读性。

## Search Terms

- `failure pool`
- `failures.ndjson`
- `sampleResults`
- `summary.json`
- `Batch 2`
- `Batch 3`
- `nightly`
- `回归接入`
- `空文件`
- `去重`
- `重试`
