# ADR-0019: SkillForge provider transcript capture 保持 reserved skeleton，`captured` 恒为 false，且 report 层不得泄漏本地补齐 transcriptRef

## Status

accepted

## Context

决定先行：在 ADR-0015 已冻结 transcript handle / availability / persistence 的 reserved-only same-source seam、ADR-0018 已冻结 selection wiring public input contract 之后，Phase 3 继续把 **provider transcript capture** 的最小 skeleton 收口为可长期依赖的保留合同，而不是提前伪装成真实 capture 能力。

来源计划“Phase 3 provider transcript capture reserved skeleton”已完成（`end.completed`）。计划中的 `done` 任务、review 与 retrospective 固定了以下事实：

- 已冻结 `TRANSCRIPT_CAPTURE_MODES`、`captureProviderTranscriptStub`、`assertTranscriptCaptureStubContract`，说明 transcript capture 目前只允许以显式 reserved skeleton 形式存在。
- 已收紧 transcript capture same-source propagation，并修复 dry-run `transcriptRef` 回归；retrospective 明确“dry-run runner result 有本地 complement `transcriptRef`，report 层不泄漏”。
- 已补 7 个 contract tests，总体验证达到 `70/70`。
- retrospective 的 knowledge candidate 明确写死：`captured` 永远为 `false`，`captureMode` 当前只允许 `none` / `reserved-provider-captured`。

这需要沉淀为 ADR，因为它定义的是未来真实 provider transcript capture 接入前的长期约束：当前系统可以保留 capture 语义槽位，但不得把 stub、dry-run 本地补齐结果或内部同源数据误报成“已经 capture 成功”的公共事实。

## Decision

决定将 SkillForge 当前阶段的 provider transcript capture 合同冻结为 **reserved skeleton only**：在真实 provider transcript capture 能力接通前，capture 相关结构只能表达“未来可扩展的保留槽位”，不能表达“当前已经捕获到 transcript”。

当前阶段的具体规则如下：

- `TRANSCRIPT_CAPTURE_MODES` 当前只允许 `none` 与 `reserved-provider-captured` 两种模式，用来区分“没有 capture 语义”与“保留 provider capture 槽位”，而不是声明真实 capture 已落地。
- `captureProviderTranscriptStub` 与 `assertTranscriptCaptureStubContract` 共同构成当前唯一合法的 transcript capture skeleton；任何新路径都必须先满足这个 stub contract，不能绕开它直接注入 capture 结果。
- `captured` 当前必须恒为 `false`。即使存在 reserved provider capture mode、stub 或内部补齐对象，也不得把 `captured` 置为 `true`。
- dry-run runner result 中如存在本地 complement `transcriptRef`，它也只能作为局部运行态补齐事实；report 公共层不得泄漏这类本地补齐引用，不得把它升级成对外可见的 transcript capture 证据。
- transcript capture 相关字段必须继续遵守 same-source propagation；downstream 不得依据本地补齐对象、report fallback 或其他 mixed-source 数据推断出 capture 已发生。
- 后续若要接入真实 provider transcript capture，必须显式扩展现有 reserved skeleton、调整 contract tests，并重新定义何时允许 `captured=true`；不能在现有 stub 语义上偷偷放宽。

## Alternatives Considered

- 让 reserved skeleton 直接返回 `captured=true`，把保留槽位当作“已实现 capture”的近似替身：拒绝。来源计划已明确 `captured` 永远为 `false`，目的是防止半成品语义误导下游。
- 允许 dry-run runner result 的本地 complement `transcriptRef` 直接进入 report：拒绝。来源计划已把这视为回归，并明确修复口径是 report 层不泄漏。
- 不冻结 `captureMode`，继续让不同路径自由表达 capture 状态：拒绝。来源计划已经把 mode 收紧到 `none` / `reserved-provider-captured`，说明当前要先锁合同，再谈真实能力。

## Related Code

| Path | Role |
| ---- | ---- |
| `TRANSCRIPT_CAPTURE_MODES` | transcript capture mode 的冻结入口。 |
| `captureProviderTranscriptStub` | 当前 provider transcript capture reserved skeleton 的唯一 stub 实现锚点。 |
| `assertTranscriptCaptureStubContract` | capture stub contract 守门锚点。 |
| `transcriptRef` | dry-run 本地 complement 与 report no-leak 回归锚点。 |

## Consequences

- 正向：capture 语义被明确限制在 reserved skeleton，未来真实 provider transcript capture 接入前，不会因 stub 或本地补齐而制造“已捕获”的假象。
- 正向：`captured` 恒为 `false` 的规则让下游能够稳定地区分“保留槽位”与“真实能力”。
- 正向：report 层禁止泄漏 dry-run 本地 complement `transcriptRef`，可继续维持公共 truth 的诚实边界，避免内部运行态细节污染对外合同。
- 取舍：当前仍然没有真实 provider transcript capture；`reserved-provider-captured` 只是未来扩展位，不代表 capability 已完成。
- 取舍：未来若要开放 `captured=true`，必须同步扩展 skeleton、same-source 传播规则与 contract tests，接入成本更高，但语义更稳。
- 验证锚点：来源完成记录确认 transcript capture same-source propagation 回归已修复，新增 7 个 contract tests，总体验证 `70/70` 通过。

## Search Terms

- `TRANSCRIPT_CAPTURE_MODES`
- `captureProviderTranscriptStub`
- `assertTranscriptCaptureStubContract`
- `captured`
- `captured always false`
- `captureMode`
- `none`
- `reserved-provider-captured`
- `transcriptRef`
- `dry-run`
- `same-source propagation`
- `report layer no leak`
- `70/70`
