# ADR: Milestone N 自举试跑采用 `review plan → 回写 → optimize prompt → spawn` 链路

## Status

accepted

## Context

Milestone N 的第一单自举试跑已经跑通，并把产物正式下沉为仓库级 truth 资产。试跑过程中，任务不是直接裸 spawn，而是先做计划评审，再回写关键结论，随后优化派发提示，最后再执行派发。

计划记录明确了这条默认链路：`意图 → review plan → 回写 → optimize prompt → spawn`。它的价值不在于记录一次临时操作，而在于把后续推进项目时的默认治理顺序固定下来，减少目标漂移、上下文断裂和反复澄清。

## Decision

后续在 Milestone N 及其相关推进中，默认采用以下链路：

`意图 → review plan → 回写 → optimize prompt → spawn`

具体含义如下：

- **意图**：先明确任务目标、边界与成功标准。
- **review plan**：先评审计划质量，重点看可行性、风险、依赖与验收点。
- **回写**：把评审后的关键结论沉淀到任务上下文与相关文档。
- **optimize prompt**：把执行指令收敛为可直接派发的高质量提示。
- **spawn**：最后才进行执行派发。

这条链路作为默认推进方式，优先于直接裸 spawn。

## Alternatives Considered

- **直接裸 spawn**：被拒绝，因为虽然启动快，但容易在复杂任务中出现偏航、缺少证据链、以及后续复盘困难。
- **边做边补文档**：被拒绝，因为上下文容易碎片化，计划、规则和流程之间的边界会变模糊。

## Related Code

| Path | Role |
| --- | --- |
| `plan.json` | 本次自举试跑的源计划记录，包含 `summary`、`tasks` 和 `retrospective` |
| `adr/ADR-0084-milestone-n-artifacts-downstream-first-self-bootstrap-trial.md` | 说明 Milestone N 产物文件下沉本身已成为稳定锚点 |
| `docs/skillforge-execution-rules-v1.md` | 规则层，负责做事边界与合规约束 |
| `docs/skillforge-execution-workflow-v1.md` | workflow 层，负责阶段编排与流转顺序 |

## Consequences

- 后续任务的派发前会先经历计划评审与回写，治理质量更稳定。
- `spawn` 不再是默认第一动作，短期启动速度会略慢，但返工率和偏航概率会下降。
- 规则层与 workflow 层的职责会更清晰：前者管边界，后者管流转，本 ADR 管默认链路。
- 试跑中形成的稳定做法可以被后续项目直接复用，减少重复解释。
- 验证锚点：后续若继续沿用这条链路，任务记录中应能看到 `review plan`、回写、`optimize prompt` 和 `spawn` 的顺序一致性。

## Search Terms

- `review plan`
- `optimize prompt`
- `spawn`
- `自举试跑`
- `Milestone N`
- `回写`
- `默认链路`
