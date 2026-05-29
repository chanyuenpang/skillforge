# ADR: SkillForge shared baseline v0 failure pool 合同与后续增强里程碑结构

## Status

accepted

## Context

shared baseline v0 已经被确认是真正成立的基线节点，但它只代表“基线成立”，不代表后续增强自动成立。当前这份计划的重点不是再做一轮实现，而是把后续增强的推进顺序固定下来：先把 `failure pool` / `failures.ndjson` 契约定型，再推进 Batch 2 / Batch 3 的扩样与 nightly / 回归接入，最后再接上层消费链。

这份计划还明确要求：后续执行统一用 subplan 方式推进；每个 subplan 必须包含验证环节；truth 文档默认不手动改写，优先保留在 plan、裁决页、roadmap 等人工维护层。

## Decision

决定将 shared baseline v0 之后的增强推进，固定为“先合同、后扩样、再回归、最后消费”的里程碑结构：

1. **先冻结 `failure pool` / `failures.ndjson` 契约**
   - `failure pool` 是扩样、nightly / 回归、上层消费的共同数据地基。
   - 在契约稳定前，不把 Batch 2 / Batch 3 或消费接入提前混入同一实现包。
   - 后续 subplan 必须围绕同一份契约运行，避免 schema 反复变化。

2. **后续增强按独立 subplan 推进**
   - Batch 2、Batch 3、nightly / 回归接入、上层消费分别拆成独立 subplan。
   - 各子计划之间允许有依赖关系，但不能合并成一个复合任务。
   - 每个 subplan 都必须带验证环节和完成定义。

3. **里程碑顺序固定**
   - Milestone A：`failure pool` / `failures.ndjson` 契约定型。
   - Milestone B：Batch 2 样本扩展与可比性基线。
   - Milestone C：nightly / 回归流程首版接入。
   - Milestone D：Batch 3 扩样与连续扩样机制。
   - Milestone E：上层产品面 / 运行中心消费链接入。
   - Milestone Gate：按优先级把各里程碑串成可执行的 subplan 骨架。

4. **保持 baseline 与更高阶能力的边界清晰**
   - 不得把 `shared baseline v0` 已成立误写成后续增强已自动完成。
   - 不得把合同定型、扩样、回归、消费接入混写成同一阶段完成。
   - 后续推进必须遵守既有主线裁决：baseline 只是输入地基，不是高阶能力的自动成立证明。

## Alternatives Considered

- **把 shared baseline v0 直接写成后续增强已自动完成**：被拒绝。这样会把基线成立误写成更高阶段成立。
- **把合同、扩样、回归、消费接入打成一个实现包**：被拒绝。会让契约边界与推进顺序失去可复用性。
- **先做 Batch 2 / Batch 3，再回头补 `failure pool` 契约**：被拒绝。没有共同地基，后续扩样无法稳定对比。
- **把 truth 文档当作主承接层直接手动改写**：被拒绝。当前约束要求优先使用 plan、裁决页、roadmap 等人工维护层承接。

## Related Code

| Path | Role |
| ---- | ---- |
| `adr/ADR-0115-skillforge-shared-baseline-v0-mainline-judgement-and-follow-up-structure.md` | shared baseline v0 主线裁决与后续增强拆分口径。 |
| `adr/ADR-0114-skillforge-shared-baseline-v0-sample-protocol-runner-report-and-phase1-batches.md` | shared baseline v0 的样本协议、统一 runner 与 Phase 1 批次基础。 |
| `plan.json` | 本次里程碑骨架计划源记录，包含 `failure pool`、Batch 2 / Batch 3、nightly / 回归与消费接入拆分。 |
| `baselines/shared/v0/results/summary.json` | 当前基线结果锚点，作为后续增强的对照基线。 |
| `docs/skillforge-owner-decision-page-v2.md` | 负责人裁决页锚点，确认 shared baseline v0 是正式基线节点。 |

## Consequences

- 正向：`failure pool` 契约先行，后续扩样、回归和消费可以共享同一数据地基。
- 正向：Batch 2 / Batch 3 / nightly / 消费接入的边界更清楚，后续更容易复用和验收。
- 正向：每个 subplan 都必须带验证环节，能减少“只做实现不做验收”的风险。
- 取舍：前置契约会增加一层治理成本，但能换来长期稳定的口径。
- 风险：如果后续又把里程碑重新揉成一个大包，`failure pool` 的 schema 还是可能被反复改动。
- 验证锚点：后续 subplan 必须能稳定引用 `failure pool` / `failures.ndjson` 契约，且不再反复改 schema。

## Search Terms

- `shared baseline`
- `baseline v0`
- `failure pool`
- `failures.ndjson`
- `Batch 2`
- `Batch 3`
- `nightly`
- `回归`
- `运行中心`
- `subplan`
