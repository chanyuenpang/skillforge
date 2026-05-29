# ADR: SkillForge shared baseline v0 的样本协议、统一 runner、报告与 Phase 1 批次顺序

## Status

accepted

## Context

`betterPlan` / `betterPrompt` 的质量闭环已经进入 shared baseline 落地阶段。此次完成计划把之前的研究结论真正收口到仓库：先完成 Batch 1，打通最小样本集、统一 runner、baseline 报告与失败样本池的可执行链路，并保留后续 Batch 2 / Batch 3 的扩展挂点。

计划同时明确了两条长期约束：

- 只做 Phase 1 / Batch 1，不提前扩到阈值阻断与失败治理运营层。
- 每次派发 subagent 前先做 prompt 优化，并且所有新增脚本与输出都必须补验证环节。

这说明 shared baseline v0 不是一次性实验，而是后续 `betterPlan` / `betterPrompt` 质量对比的共同地基。

## Decision

决定将 SkillForge shared baseline v0 固定为以下四项长期约束：

1. **统一样本协议 v0**
   - 样本协议固定为 10 个共享字段。
   - 差异信息通过 `task_type`、`checks`、`meta` 承载。
   - 文件组织固定为 `baselines/shared/v0/samples/*.jsonl` 加 `manifest.json`。
   - 后续新增样本必须遵守同一协议，不能为单个场景单独发明新格式。

2. **统一评测命令与执行路径 v0**
   - 统一 runner 固定为 `scripts/run-shared-baseline-v0.mjs`。
   - 统一命令入口固定为 `baseline:shared:v0`。
   - 执行链路固定覆盖 `betterPrompt -> betterPlan -> integration`。
   - summary 输出采用 shared summary schema，避免不同阶段各自输出不同结构。

3. **baseline v0 报告与失败样本池格式**
   - baseline 报告保留最小结构，不追求花哨展示。
   - 失败样本池采用 ndjson。
   - 聚合视图至少包含 `severity`、`by_stage`、`top failures` 三类第一版统计。
   - 失败样本池与 baseline 报告必须共享同一批真实样本起点，便于后续对比与复跑。

4. **Phase 1 批次顺序固定为三段式**
   - Batch 1：先跑通链路，产出最小样本集、runner 脚本与 baseline / 失败池文件。
   - Batch 2：再补阈值与复跑机制，确认可重复判断。
   - Batch 3：最后做失败治理与趋势对比，把问题从一次性修复转为持续治理。
   - 这三批顺序是实施节奏的一部分，不能反过来先做治理再补基础设施。

## Alternatives Considered

- **继续停留在质量闭环抽象层，不固化 shared baseline v0**：被拒绝。没有统一协议和 runner，质量闭环无法持续复核。
- **为每个场景单独设计样本格式与报告结构**：被拒绝。会导致口径碎片化，失去 baseline 可比性。
- **先做失败治理，再回头补 runner 和报告**：被拒绝。没有共同基线，治理结果无法稳定对比。
- **直接扩成完整平台化评测系统**：被拒绝。当前阶段的目标是 shared baseline 起点，不是扩展治理面。

## Related Code

| Path | Role |
| ---- | ---- |
| `plan.json` | 本次计划源记录，包含 shared baseline v0 的协议、runner、报告与 Phase 1 批次设计。 |
| `adr/ADR-0113-skillforge-betterplan-betterprompt-quality-loop.md` | 上一层质量闭环，定义 shared baseline 作为起点。 |
| `adr/ADR-0107-betterplan-evaluation-criteria-and-minimum-template.md` | `betterPlan` 的评价基线，作为 shared baseline 样本判定依据。 |
| `adr/ADR-0108-skillforge-betterplan-betterprompt-cli-boundary-and-convergent-rewrite.md` | `betterPlan` / `betterPrompt` 收敛边界与真实样本回归要求。 |
| `scripts/run-shared-baseline-v0.mjs` | 统一 runner 的目标入口。 |
| `baselines/shared/v0/samples/` | 统一样本协议的建议落点。 |
| `baselines/shared/v0/manifest.json` | 样本清单与版本锚点。 |

## Consequences

- 正向：shared baseline v0 有了固定样本协议与统一 runner，后续回归可以复跑、复核、复比。
- 正向：baseline 报告与失败样本池共享同一协议，便于把问题从观察转成治理。
- 正向：Phase 1 的三批实施顺序明确，避免一上来就跳到复杂治理。
- 取舍：协议一旦固化，后续新增样本需要遵守统一格式，灵活性下降。
- 取舍：先做基础链路与报告，会增加前期整理成本，但换来后续评测可比性。
- 风险：若后续把 `baseline:shared:v0` 扩成多个分叉命令，baseline 会失去单一参照系。
- 验证锚点：Batch 1 必须先产出最小样本集、runner 脚本与 baseline / 失败池文件，才算 shared baseline v0 真正起步。

## Search Terms

- `shared baseline`
- `baseline v0`
- `sample protocol`
- `runner`
- `failure pool`
- `severity`
- `by_stage`
- `top failures`
- `baseline:shared:v0`
- `scripts/run-shared-baseline-v0.mjs`
- `baselines/shared/v0`
