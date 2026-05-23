# ADR-0023: SkillForge synthetic provider pipeline 通过 deterministic mock provider layer 串联 adapter → mapper → runner → report

## Status

accepted

## Context

决定先行：在 ADR-0012 已把 provider adapter result 冻结为未来 provider-backed runtime 的单一结构化 truth payload、ADR-0018 已冻结 selection public input contract、ADR-0014 已冻结 failure taxonomy 与 same-source 传播规则之后，Phase 3 进一步把 **synthetic provider** 接入为真实 provider 之前的稳定中间层。

来源计划 `Phase 3 synthetic provider pipeline wiring` 已完成（`end.completed`）。计划中的 `done` 任务、review 与 retrospective 固定了以下事实：

- 已新增 `runtime-provider-synthetic.mjs`，用于 deterministic mock provider 路径验证。
- adapter 已接入 synthetic 分支，且 `contract guard synthetic 白名单` 与 adapter 接入一次完成，`99/99` 不回归。
- 已补 5 个 synthetic pipeline 端到端 tests，总测试数推进到 `104/104`。
- `synthetic provider` 被明确描述为“当前边界下推进 provider-backed 路径的有效中间层”，而不是真实 provider call。
- retrospective 的 knowledge candidate 明确：`runtime-provider-synthetic.mjs` 只用于 deterministic mock provider 路径验证，不代表真实 execution evidence；同时，synthetic provider 通过 adapter 白名单允许 `providerCall=true`，但仍保持 `rawResponse`、`transcript`、`scoring`、`sandbox` 等 reserved seams 的诚实保守语义。
- 文档已同步 3 份，并完成单文件提交 `f92a6f9`。

这需要沉淀为 ADR，因为它定义了未来真实 provider 接入前的稳定“夹层”边界：系统可以通过 synthetic provider 把 adapter → mapper → runner → report 全链路跑通，但不能把这条 deterministic mock 路径误写成真实 provider evidence、真实 transcript 或能力完成态。

## 后续修改

本 ADR 的 case status 语义被 **ADR-0027** 补充：`synthetic-passed` 现在是一等公民的公共 case status，不再是 mapper 层内部状态。详见 ADR-0027。

## Decision

决定将 SkillForge 的 synthetic provider 固定为 **deterministic mock provider layer**：它可以作为 provider-backed 路径的稳定中间层，允许 adapter → mapper → runner → report 全链路接通并进行合同验证，但其语义仍然是 mock / reserved / conservative，不得被解释为真实 provider execution。

当前阶段的具体规则如下：

- `runtime-provider-synthetic.mjs` 是 synthetic provider 的 canonical 入口，只用于 deterministic mock provider 路径验证，不代表真实 execution evidence。
- adapter 的 synthetic 分支必须与 selection public input contract、provider-backed guard 与 failure taxonomy 保持同源约束；synthetic 只能作为白名单路径进入，不得绕过既有 contract。
- synthetic provider 允许 `providerCall=true` 的测试/验证语义，但 `rawResponse`、`transcript`、`scoring`、`sandbox` 等 reserved seams 必须继续保持保守语义，不得因为 synthetic layer 而被误写成真实完成态。
- `adapter -> mapper -> runner -> report` 的链路可以在 synthetic provider 下完整跑通，用于验证 deterministic mock 行为、合同对齐与回归护栏；但这条链路仍然不等于真实 provider call、真实 provider transcript、真实评分或真实 sandbox enforcement。
- 未来若要从 synthetic provider 过渡到真实 provider，必须显式替换 synthetic layer 的 mock 语义与白名单规则，不能把当前 deterministic mock 路径当作真实能力默认升级。

## Alternatives Considered

- 直接把 synthetic provider 视为真实 provider execution：拒绝。来源计划已明确它只是 deterministic mock provider 路径验证，不代表真实 execution evidence。
- 继续让 provider-backed 路径在没有中间层的情况下硬接真实 provider：拒绝。计划 retrospective 已把 synthetic provider 定义为推进 provider-backed 路径的有效中间层，说明这层在当前阶段有明确价值。
- 允许 synthetic provider 绕过 selection / failure / reserved seam contracts：拒绝。计划明确它必须保持 adapter 白名单与 reserved seams 的诚实保守语义。

## Related Code

| Path | Role |
| ---- | ---- |
| `runtime-provider-synthetic.mjs` | synthetic provider canonical 入口与 deterministic mock provider 路径验证锚点。 |
| `adapter synthetic` | adapter 接入 synthetic 分支与 provider-backed 链路入口锚点。 |
| `contract guard synthetic white-list` | synthetic provider 白名单与 guard 锚点。 |
| `adapter -> mapper -> runner -> report` | synthetic provider 下完整链路验证锚点。 |
| `rawResponse` | synthetic layer 下仍需保持保守语义的 reserved seam 锚点。 |
| `transcript` | synthetic layer 下仍需保持保守语义的 reserved seam 锚点。 |
| `scoring` | synthetic layer 下仍需保持保守语义的 reserved seam 锚点。 |
| `sandbox` | synthetic layer 下仍需保持保守语义的 reserved seam 锚点。 |
| `scripts/test-runtime-contracts.mjs` | synthetic pipeline 端到端 tests 与 `104/104` 验证锚点。 |

## Consequences

- 正向：provider-backed 路径获得一个 deterministic mock 中间层，能在不接真实 provider 的前提下把 adapter → mapper → runner → report 全链路跑通。
- 正向：synthetic provider 作为白名单路径，能帮助稳定验证 selection、failure taxonomy 与 reserved seam 约束是否仍然同源。
- 正向：`runtime-provider-synthetic.mjs` 为未来真实 provider 接入提供了清晰的替换点，降低直接硬接真实 provider 的风险。
- 取舍：synthetic provider 不是真实 execution evidence，不能把其产物解释为真实 provider call、真实 transcript、真实 scoring 或真实 sandbox enforcement。
- 取舍：synthetic provider 仍然必须遵守既有 contract；短期灵活性换来的是长期 truth 一致性和回归可控性。
- 验证锚点：来源完成记录确认已补 5 个 synthetic pipeline tests，总体验证达到 `104/104`，并完成文档同步与提交 `f92a6f9`。

## Search Terms

- `runtime-provider-synthetic.mjs`
- `deterministic mock provider`
- `synthetic provider`
- `providerCall=true`
- `adapter -> mapper -> runner -> report`
- `rawResponse`
- `transcript`
- `scoring`
- `sandbox`
- `contract guard synthetic white-list`
- `104/104`
