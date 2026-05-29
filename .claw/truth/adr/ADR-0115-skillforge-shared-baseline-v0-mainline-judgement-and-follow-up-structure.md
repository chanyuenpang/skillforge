# ADR: SkillForge shared baseline v0 主线裁决与后续增强拆分

## Status

accepted

## Context

shared baseline v0 已完成 Batch 1 的最小闭环，覆盖最小样本集、manifest、统一 runner、baseline summary 与命令入口。这个结果说明 shared baseline v0 现在已经是一个真实成立的基线节点，但它只代表“基线成立”，不代表更高阶段或更大治理面自动成立。

本次计划的目标不是重复实现，而是把这个完成态提升为主线中的正式裁决页：先确认 shared baseline v0 的能力边界与主线挂接方式，再把后续增强项拆成独立任务，避免把局部闭环误写成阶段自动升阶。

计划还明确要求必须保留验证环节，核对当前计划、已有 summary 与主线挂接文档/事实层的一致性，避免只做文档挂接不做事实核对。

## Decision

决定将 shared baseline v0 作为 SkillForge 主线中的正式基线节点，并采用“负责人裁决 + 后续增强拆分”的固定推进方式：

1. **只确认基线成立，不自动宣称更高阶段成立**
   - shared baseline v0 的完成，只能表述为“基线节点已成立，可作为后续输入”。
   - 不得把 Batch 1 的局部闭环写成更高阶段自动成立。
   - 不得把现有结果扩写成更大范围的治理完成态。

2. **主线挂接先于增强实现**
   - 先写负责人级裁决页，明确 baseline 的边界、挂接位置与后续输入关系。
   - 再拆出 failure pool、Batch 2 / Batch 3、nightly / 回归接入等后续增强项。
   - 增强项必须作为独立任务推进，不与裁决挂接混成一个实现包。

3. **遵循 SkillForge 的推进顺序**
   - 负责人思考 → research → 裁决/挂接 → 后续任务骨架 → 验证。
   - 每次派发 subagent 前先做 prompt 优化。
   - 每个阶段都要保留验证环节，核对裁决页、实施计划 retrospective、summary 证据与后续任务骨架的一致性。

4. **后续增强项单独建模**
   - `failure pool`、后续批次、`nightly/回归接入` 不作为同一条复合任务处理。
   - 它们之间可以有依赖关系，但必须是可独立引用的后续任务骨架。

## Alternatives Considered

- **把 shared baseline v0 直接写成更高阶段自动成立**：被拒绝。Batch 1 只证明基线成立，不足以证明更高阶段能力已经成立。
- **把裁决、增强、验证打包成一个实现包**：被拒绝。这样会让主线边界模糊，后续无法清晰复用。
- **只记录实施结果，不落主线裁决页**：被拒绝。没有负责人级裁决，shared baseline v0 只能停留在局部实现事实，无法成为长期主线节点。
- **先做增强项，再回头补挂接文档**：被拒绝。这样会把基线与治理混在一起，失去主线裁决的清晰度。

## Related Code

| Path | Role |
| ---- | ---- |
| `plan.json` | 本次主线裁决计划源记录，包含 baseline 边界、挂接与后续增强拆分要求。 |
| `adr/ADR-0114-skillforge-shared-baseline-v0-sample-protocol-runner-report-and-phase1-batches.md` | shared baseline v0 的样本协议、统一 runner、报告与 Phase 1 批次顺序基线。 |
| `adr/ADR-0113-skillforge-betterplan-betterprompt-quality-loop.md` | `betterPlan` / `betterPrompt` 质量闭环的上层背景。 |
| `adr/ADR-0103-skillforge-product-shape-registry-workflow-prompt-bundle-run-center-complete-path.md` | SkillForge 主路径与持续使用 SkillForge 自身能力的既有约束。 |
| `workspace/MEMORY.md` | 负责人裁决页推进规则与“先负责人思考，再 research，再裁决/挂接”的长期推进约束。 |

## Consequences

- 正向：shared baseline v0 被正式提升为主线中的基线节点，后续计划可以稳定引用。
- 正向：baseline 成立与更高阶段成立被明确拆开，避免阶段误宣称。
- 正向：failure pool、Batch 2 / Batch 3、nightly / 回归接入能作为独立任务逐步推进。
- 取舍：先裁决后增强会增加一层文档和验证成本，但能换来主线边界清晰。
- 风险：如果后续仍把增强项塞回裁决页，会重新造成“基线完成 = 高阶完成”的误写。
- 验证锚点：裁决页必须与现有 summary、实施 retrospective 和后续任务骨架保持一致，且不得越界宣称高阶能力已完成。
- 事实锚点：`summary.json` 8/8 全通过，ADR-0114 提供样本协议与统一 runner 基线，ADR-0115 负责把其提升为主线裁决与后续增强拆分口径。

## Search Terms

- `shared baseline`
- `baseline v0`
- `负责人裁决`
- `主线挂接`
- `failure pool`
- `Batch 2`
- `Batch 3`
- `nightly`
- `回归接入`
- `SkillForge`
