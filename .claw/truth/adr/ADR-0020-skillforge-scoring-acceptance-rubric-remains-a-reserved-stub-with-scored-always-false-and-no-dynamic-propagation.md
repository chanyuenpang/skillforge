# ADR-0020: SkillForge scoring / acceptance rubric 保持 reserved stub，`scored` 恒为 false，且 mapper/runner/reporter 不得引入动态 scoring 传播

## Status

accepted

## Context

决定先行：在 Phase 3 已连续冻结 provider-backed reserved seams 之后，当前阶段继续把 **scoring / acceptance rubric** 收口为最小 reserved stub，而不是提前开放真实评分、`passed` 状态或跨层动态传播。

来源计划“Phase 3 scoring acceptance rubric reserved stub”已完成（`end.completed`）。计划中的 `done` 任务、review 与 retrospective 固定了以下事实：

- 已冻结 `SCORING_MODES`、`buildScoringStub`、`buildScoringStubProviderReserved`、`assertScoringStubContract`，说明 scoring 目前只允许以显式 reserved stub 合同存在。
- 已确认 mapper / runner / reporter 三层**无 scoring 动态逻辑**，仅保留静态 trace 标签；任务 review 明确“三层均无 scoring 动态逻辑，仅静态 trace 标签，无需改动”。
- retrospective 的 knowledge candidate 明确写死：`scored` 永远为 `false`，`scoringMode` 当前只允许 `none` / `reserved-pending`，并由 `assertScoringStubContract` 禁止 `scored=true`。
- 已补 7 个 contract tests，总体验证达到 `77/77`。
- 后续完成计划“Phase 3 runtime acceptance record wiring”进一步固定：新增 `acceptance-builder.mjs`，由 `buildAcceptanceFromRuntimeReport` 把 `runtimeReport` 映射为 `AcceptanceRecord`；当前 `status` 只允许 `pending` / `blocked`，`accepted-reserved` 明确由 guard 拒绝。
- `orchestrator` 输出现已显式包含 `acceptance` 字段，但该字段仍只承载 reserved acceptance wiring，而非 validate 主链路中的真实验收结论。
- acceptance wiring 新增 8 个 contract tests，整体 contract 验证从 `77/77` 推进到 `99/99`。
- 文档同步已明确当前阶段 **NOT real scoring**、**NOT passed status opening**，且 acceptance 仅为 wiring、**不接入 validate 主链路**。

这需要沉淀为 ADR，因为它定义的是未来真实 scoring / acceptance rubric 接入前的长期约束：当前系统可以保留 scoring 槽位与 trace 语义，但不得让任何层把 stub、静态标签或预留 mode 误报成“已经评分”或“已经开放 passed 判定”。

## Decision

决定将 SkillForge 当前阶段的 scoring / acceptance rubric 合同冻结为 **reserved stub only**：在真实评分规则、acceptance rubric 与 `passed` 状态开放前，scoring 相关结构只能表达“未来可扩展的保留槽位”，不能表达“当前已经完成评分”。

当前阶段的具体规则如下：

- `SCORING_MODES` 当前只允许 `none` 与 `reserved-pending` 两种模式，用来区分“没有 scoring 语义”与“保留未来评分槽位”，而不是声明真实 scoring 已落地。
- `buildScoringStub`、`buildScoringStubProviderReserved` 与 `assertScoringStubContract` 共同构成当前唯一合法的 scoring reserved stub；任何新路径都必须先满足这个 stub contract，不能绕开它直接注入评分结果。
- `scored` 当前必须恒为 `false`；`assertScoringStubContract` 必须继续禁止 `scored=true`。即使存在 reserved mode、provider-reserved stub 或 trace 标签，也不得把 `scored` 置为 `true`。
- mapper / runner / reporter 三层不得引入 scoring 动态逻辑；当前允许存在的只有静态 trace 标签，不能在层间传播真实评分值、评分依据或 `passed` 结论。
- `AcceptanceRecord` 当前必须经由 `acceptance-builder.mjs` 的 `buildAcceptanceFromRuntimeReport` 从 `runtimeReport` 单向映射生成，作为 acceptance 的 canonical wiring 入口；不得在 `orchestrator`、validate 或其他下游层各自拼装第二套 acceptance 结构。
- `AcceptanceRecord.status` 当前只允许 `pending` 与 `blocked`；`accepted-reserved` 必须继续被 guard 拒绝。也就是说，系统可以公开 acceptance 槽位，但不能借由 reserved wiring 提前宣称“已通过验收”。
- `orchestrator` 可以输出 `acceptance` 字段，但它表达的是 runtime→acceptance 的 contract-first wiring，而不代表 validate 主链路已经采用 acceptance 作为正式结论来源。
- report 公共层不得借由 stub、静态 trace、`acceptance` 字段或其他补齐数据暗示 scoring / acceptance 已完成；`passed` 状态在当前阶段不得开放。
- 后续若要接入真实 scoring / acceptance rubric，必须显式扩展现有 reserved stub 与 `AcceptanceRecord` contract、补充 contract tests，并重新定义何时允许 `scored=true`、何时允许 acceptance 脱离 `pending|blocked`、以及何时接入 validate 主链路；不能在现有 wiring 语义上偷偷放宽。

## Alternatives Considered

- 让 reserved stub 直接返回 `scored=true`，把保留槽位当作“已完成评分”的近似替身：拒绝。来源计划已明确 `scored` 永远为 `false`，并由 `assertScoringStubContract` 禁止 `scored=true`。
- 在 mapper / runner / reporter 中预埋动态 scoring 传播，为未来实现提前铺路：拒绝。来源计划已确认三层当前无动态 scoring 逻辑，仅允许静态 trace 标签，以避免半成品语义泄漏到公共合同。
- 提前开放 `passed` 状态，即使暂时没有真实 rubric：拒绝。来源计划与文档同步已明确当前阶段 **NOT passed status opening**。
- 在 `orchestrator` 里直接拼一个 acceptance 字段，并允许 `accepted-reserved` 或其他近似通过状态先行对外暴露：拒绝。后续完成计划已明确 `AcceptanceRecord` 必须由 builder 单向映射生成，且当前只允许 `pending|blocked`，以避免 reserved wiring 被误读为真实验收结论。

## Related Code

| Path | Role |
| ---- | ---- |
| `SCORING_MODES` | scoring mode 的冻结入口。 |
| `buildScoringStub` | 当前 scoring reserved stub 的通用构建锚点。 |
| `buildScoringStubProviderReserved` | provider-reserved scoring stub 的构建锚点。 |
| `assertScoringStubContract` | `scored=false` 与 mode 合法性的 contract 守门锚点。 |
| `mapper / runner / reporter` | scoring same-source propagation 检查与“无动态 scoring 逻辑”边界锚点。 |
| `acceptance-builder.mjs` | `AcceptanceRecord` 的 canonical wiring builder 锚点。 |
| `buildAcceptanceFromRuntimeReport` | `runtimeReport -> AcceptanceRecord` 的单向映射入口。 |
| `orchestrator` | 对外暴露 `acceptance` 字段、但不得把 wiring 伪装成 validate 主链路结论的输出锚点。 |

## Consequences

- 正向：scoring 语义被明确限制在 reserved stub，未来真实 rubric 接入前，不会因预留字段或静态 trace 标签制造“已经评分”的假象。
- 正向：`scored` 恒为 `false`、`passed` 不开放、`AcceptanceRecord.status` 只允许 `pending|blocked`，让下游能够稳定地区分“保留槽位 / 预留接线”与“真实评分 / 真实验收能力”。
- 正向：`buildAcceptanceFromRuntimeReport` 把 acceptance 收口成单一 builder seam，避免 `orchestrator` 或其他层各自拼 acceptance，减少未来接入真实 rubric 时的分叉风险。
- 正向：mapper / runner / reporter 不引入动态 scoring 传播，且 `orchestrator.acceptance` 仅作 wiring 暴露，可继续维持同源 truth 的诚实边界，避免半成品评分语义跨层扩散。
- 取舍：当前仍然没有真实 scoring / acceptance rubric；`reserved-pending` 与 `acceptance` 只是未来扩展位，不代表 capability 已完成，也不进入 validate 主链路。
- 取舍：未来若要开放真实 scoring / acceptance，必须同步扩展 stub contract、`AcceptanceRecord` 状态语义、传播规则与 contract tests，接入成本更高，但公共语义更稳。
- 验证锚点：来源完成记录先确认新增 7 个 contract tests，总体验证 `77/77` 通过；后续 acceptance wiring 再新增 8 个 contract tests，把整体 contract 验证推进到 `99/99`。

## Search Terms

- `SCORING_MODES`
- `buildScoringStub`
- `buildScoringStubProviderReserved`
- `assertScoringStubContract`
- `scored`
- `scored always false`
- `scoringMode`
- `none`
- `reserved-pending`
- `passed status`
- `AcceptanceRecord`
- `acceptance-builder.mjs`
- `buildAcceptanceFromRuntimeReport`
- `acceptance`
- `accepted-reserved`
- `pending`
- `blocked`
- `orchestrator`
- `validate 主链路`
- `same-source propagation`
- `static trace label`
- `77/77`
- `99/99`
