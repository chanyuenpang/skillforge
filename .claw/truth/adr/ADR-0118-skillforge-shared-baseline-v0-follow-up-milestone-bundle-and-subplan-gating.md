# ADR: SkillForge shared baseline v0 后续增强里程碑打包与 subplan 门禁

## Status

accepted

## Context

shared baseline v0 的主线裁决已经成立，后续增强也已经被拆成可独立推进的里程碑骨架。这个计划进一步把后续增强的推进规则固定下来：先锁定 `failure pool / failures.ndjson` 契约，再推进 Batch 2、nightly / 回归首版、Batch 3，最后才接上层消费链。

这不是在重复基线成立本身，而是在确认一个长期可复用的推进顺序：后续增强必须按里程碑逐个拆分成独立 subplan，不能把扩样、调度、消费接入揉成一个大包。否则后续任务会失去清晰的依赖边界，也会让 `failure pool` 这个共同数据地基反复被改写。

计划还明确要求：每个 subplan 都必须包含验证环节；执行统一采用 subplan 方式推进；truth 文档默认不手动改写，优先由 plan、裁决页和 roadmap 承接。

## Decision

决定将 shared baseline v0 的后续增强固定为“里程碑打包 + 独立 subplan 门禁”的推进方式：

1. **先后顺序固定为 `failure pool` → Batch 2 / nightly → Batch 3 → 上层消费**
   - `failure pool / failures.ndjson` 是扩样、nightly / 回归与上层消费的共同数据地基，必须优先定型。
   - 后续增强不得绕过这层地基直接接上层消费。
   - 里程碑之间可以并行讨论，但执行顺序不能打乱这个前置关系。

2. **每个里程碑都必须转换成独立 subplan**
   - `Milestone A` 到 `Milestone E` 分别对应独立 subplan。
   - 每个 subplan 只负责自己的范围与验证，不与别的里程碑合并成复合任务。
   - 后续推进时只需逐个进入 subplan，不再重排优先级。

3. **`failure pool` 契约优先于其他增强项**
   - `failure pool / failures.ndjson` 的 schema、触发条件、去重/重试语义、无失败行为、落盘与消费约定，必须先固定。
   - 扩样、nightly / 回归、上层消费都应复用这一统一契约。
   - 不允许因为后续里程碑需要而反向改写它的基础协议。

4. **所有后续 subplan 都要带验证环节**
   - 每个 subplan 都要明确完成定义与验证锚点。
   - 验证不是附属动作，而是 subplan 的必备收口环节。
   - 这保证了里程碑骨架不仅能排队推进，也能在每一步维持事实可追溯。

## Alternatives Considered

- **把所有后续增强合并成一个大计划**：被拒绝。这样会让依赖关系和验证边界全部模糊。
- **先做 Batch 2 / nightly，再回头补 failure pool**：被拒绝。共同数据地基如果不先定型，后续所有环节都可能反复返工。
- **把上层消费直接接在现有结果上，不再拆里程碑**：被拒绝。会让消费链和底层契约耦合过深。
- **继续保留计划骨架，但不要求每个 subplan 都带验证**：被拒绝。没有验证环节，里程碑就只是排期，不是可验收推进。

## Related Code

| Path | Role |
| ---- | ---- |
| `plan.json` | 本次后续增强里程碑计划源记录，包含优先级、依赖关系、subplan 切分与验证要求。 |
| `adr/ADR-0115-skillforge-shared-baseline-v0-mainline-judgement-and-follow-up-structure.md` | shared baseline v0 的主线裁决与后续增强拆分口径。 |
| `adr/ADR-0116-skillforge-shared-baseline-v0-nightly-regression-first-cut.md` | nightly / 回归首版接线的治理边界。 |
| `adr/ADR-0117-skillforge-shared-baseline-v0-batch-2-sample-expansion-and-comparability-baseline.md` | Batch 2 样本扩展与可比性基线。 |
| `plans/subplan-1-plan.json` | `Milestone A` 的 `failure pool / failures.ndjson` 契约定型 subplan。 |
| `plans/subplan-2-plan.json` | `Milestone B` 的 Batch 2 扩样 subplan。 |
| `plans/subplan-3-subplan-3-plan.json` | `Milestone C` 的 nightly / 回归首版 subplan。 |
| `plans/subplan-4-plan.json` | `Milestone D` 的 Batch 3 扩样 subplan。 |
| `plans/subplan-5-plan.json` | `Milestone E` 的上层消费链接入 subplan。 |
| `workspace/MEMORY.md` | “写计划时必须补验证环节”与“truth 文档无必要不手动改写”的长期约束。 |

## Consequences

- 正向：后续增强有了固定的里程碑顺序，执行和回看都更清楚。
- 正向：`failure pool / failures.ndjson` 作为共同地基被前置锁定，减少后续反复改契约的风险。
- 正向：每个里程碑独立 subplan 化后，依赖、验收和复用边界都更稳定。
- 取舍：前置裁决和 subplan 切分会增加一点文档组织成本，但能换来长期推进的可维护性。
- 风险：如果后续把多个里程碑重新揉成一个包，`failure pool` 契约与上层消费边界会再次变松。
- 验证锚点：任何后续执行都应能沿着 `Milestone A → B/C → D → E` 追溯到对应 subplan 与各自验证结果。

## Search Terms

- `shared baseline`
- `baseline v0`
- `failure pool`
- `failures.ndjson`
- `Batch 2`
- `Batch 3`
- `nightly`
- `回归`
- `subplan`
- `验证环节`
- `SkillForge`
