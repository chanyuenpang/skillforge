# ADR-0021: SkillForge sandbox enforcement 保持 reserved stub，`enforced` 恒为 false，且 `sandboxMode` 仅允许 `none` / `reserved-pending`

## Status

accepted

## Context

决定先行：在 ADR-0007 已把 `runtime-sandbox-contract` 冻结为 declaration-only boundary contract、并明确 `enforcementImplemented=false` 之后，Phase 3 继续把 **sandbox enforcement** 收口为最小 reserved stub，而不是提前伪装成真实隔离、超时或资源限制能力。

来源计划“Phase 3 sandbox enforcement reserved stub”已完成（`end.completed`）。计划中的 `done` 任务、review 与 retrospective 固定了以下事实：

- 已冻结 `SANDBOX_MODES` 等 4 个导出符号，说明 sandbox enforcement 目前只允许以显式 reserved stub 合同存在。
- sandbox enforcement 的 same-source propagation 已收紧，且三层传播 review 明确为“完整，无需改动”。
- retrospective 的 knowledge candidate 明确写死：`enforced` 永远为 `false`，`sandboxMode` 当前只允许 `none` / `reserved-pending`。
- retrospective 同时明确 `runner sandboxEnforced:false` 硬编码是当前已知 tech debt。
- 已补 7 个新测试，总体验证达到 `84/84`。

这需要沉淀为 ADR，因为它定义的是未来真实 sandbox enforcement 接入前的长期约束：当前系统可以保留 enforcement 槽位与模式语义，但不得把 reserved stub、传播结果或 runner 默认值误报成“已经实现真实 sandbox 隔离”。

## Decision

决定将 SkillForge 当前阶段的 sandbox enforcement 合同冻结为 **reserved stub only**：在真实 sandbox isolation、timeout、resource limits 等能力接通前，sandbox enforcement 相关结构只能表达“未来可扩展的保留槽位”，不能表达“当前已经执行了真实 enforcement”。

当前阶段的具体规则如下：

- `SANDBOX_MODES` 当前只允许 `none` 与 `reserved-pending` 两种模式，用来区分“没有 sandbox enforcement 语义”与“保留未来 enforcement 槽位”，而不是声明真实 enforcement 已落地。
- `enforced` 当前必须恒为 `false`。即使存在 reserved mode、stub 或跨层传播对象，也不得把 `enforced` 置为 `true`。
- sandbox enforcement 相关字段必须继续遵守 same-source propagation；既有三层传播链可以透传 reserved 语义，但不得在 downstream 层引入本地推断，把未实现能力包装成已实现事实。
- runner 层当前 `sandboxEnforced:false` 的硬编码被视为显式技术债，只能作为 stub 时代的诚实默认值存在，不能被上升解释为真实 enforcement 结果来源。
- 后续若要接入真实 sandbox enforcement，必须显式扩展现有 reserved stub、调整传播规则与 contract tests，并重新定义何时允许 `enforced=true`；不能在现有 stub 语义上偷偷放宽。

## Alternatives Considered

- 让 reserved stub 直接返回 `enforced=true`，把保留槽位当作“已实现隔离”的近似替身：拒绝。来源计划已明确 `enforced` 永远为 `false`。
- 在现阶段提前接入真实 sandbox isolation、timeout 或 resource limits：拒绝。来源计划目标已明确“当前阶段不做真实 sandbox 隔离/超时/资源限制”。
- 允许 runner 的硬编码默认值被下游解释为真实 enforcement 证据：拒绝。来源计划已把 `sandboxEnforced:false` 标记为 tech debt，说明它只是占位实现，不是能力证明。

## Related Code

| Path | Role |
| ---- | ---- |
| `SANDBOX_MODES` | sandbox enforcement mode 的冻结入口。 |
| `sandboxMode` | 当前仅允许 `none` / `reserved-pending` 的公共语义锚点。 |
| `enforced` | 当前必须恒为 `false` 的 contract 锚点。 |
| `sandboxEnforced` | runner 层硬编码 `false` 的技术债与回归锚点。 |

## Consequences

- 正向：sandbox enforcement 语义被明确限制在 reserved stub，未来真实隔离能力接入前，不会因预留字段或传播结果制造“已经 enforced”的假象。
- 正向：`enforced=false` 与 `sandboxMode` 双模式冻结，让下游能稳定地区分“保留槽位”与“真实 enforcement 能力”。
- 正向：same-source propagation 继续收口到单一保守语义，避免跨层自行脑补 sandbox 已生效。
- 取舍：当前仍然没有真实 sandbox isolation、timeout 或 resource limits；`reserved-pending` 只是未来扩展位，不代表 capability 已完成。
- 取舍：runner 层 `sandboxEnforced:false` 硬编码仍是技术债，后续接入真实 enforcement 时必须显式替换，而不是继续堆补丁。
- 验证锚点：来源完成记录确认新增 7 个测试，总体验证 `84/84` 通过，且三层传播检查保持完整。

## Search Terms

- `SANDBOX_MODES`
- `sandboxMode`
- `none`
- `reserved-pending`
- `enforced`
- `enforced always false`
- `sandboxEnforced`
- `same-source propagation`
- `sandbox enforcement reserved stub`
- `84/84`
