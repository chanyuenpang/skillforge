# ADR-0024: synthetic acceptance provenance summary 与 execution source 作为保留审计字段分层传播

## Status

accepted

## Context

在 Phase 3 synthetic acceptance deep propagation 完成后，系统需要把 synthetic runtime report 的来源标记、字段语义和 acceptance 输出解释层继续向下传播，以增强端到端可审计性，同时保持不接真实 provider call、且不开放 `passed`。

来源计划 `Phase 3 synthetic acceptance deep propagation` 已完成（`end.completed`）。计划中的 `done` 任务与 retrospective 固定了以下事实：

- 已补齐 `runtime report` 的 `metadata.executionSource` 与 `metadata.provenance`。
- 已补齐 `acceptance.provenanceSummary`。
- 已新增 6 个 tests，总测试数达到 `110/110`。
- 新字段只承载来源语义，不触碰真实 provider 边界，也不开放 `passed`。
- retrospective 的 knowledge candidate 明确：`acceptance.provenanceSummary` 只做来源透传与说明，不参与 acceptance decision，也不能反推真实 provider execution；`metadata.executionSource` 的诚实枚举为 `provider-synthetic` / `provider-reserved` / `provider-less`，并分别对应 `synthetic-mock` / `reserved-unimplemented` / `provider-less-draft`。

这是一项需要沉淀为 ADR 的持久性决策，因为它定义了 synthetic acceptance 层未来的审计边界：哪些字段只能表达来源与解释，哪些字段绝不能被误用为真实执行证据。

## Decision

决定将 `metadata.executionSource`、`metadata.provenance` 与 `acceptance.provenanceSummary` 定位为**保留审计字段**：它们只负责把来源语义从 runtime report 传播到 acceptance 输出，不参与 acceptance decision，也不能被解释为真实 provider execution。

具体规则如下：

- `metadata.executionSource` 必须保持诚实枚举，仅允许 `provider-synthetic`、`provider-reserved`、`provider-less`，分别对应 `synthetic-mock`、`reserved-unimplemented`、`provider-less-draft`。
- `metadata.provenance` 用于保留来源链路信息，但它的职责仍然是审计解释，不是执行证明。
- `acceptance.provenanceSummary` 只做来源透传与说明，不能参与 acceptance decision，也不能反推真实 provider execution。
- synthetic acceptance 传播可以继续增强端到端可审计性，但不能因此打开 `passed`，也不能让输出层暗示真实 provider call 已发生。
- 这组字段应当作为 future-proof 的审计夹层持续复用，直到真正进入 provider 深水区时再考虑更高保真度的执行证据建模。

## Alternatives Considered

- 把 `acceptance.provenanceSummary` 直接并入 acceptance decision：拒绝。计划明确它只做来源透传与说明，不参与决策。
- 让 `metadata.executionSource` 变成可自由扩展的模糊标记：拒绝。计划给出了诚实枚举与一一对应语义，必须保持稳定。
- 把这些字段解释为真实 provider execution evidence：拒绝。计划持续强调不接真实 provider call，也不开放 `passed`。

## Related Code

| Path | Role |
| ---- | ---- |
| `runtime report` | `metadata.executionSource` 与 `metadata.provenance` 的传播锚点。 |
| `acceptance` | `acceptance.provenanceSummary` 的输出锚点。 |
| `acceptance.provenanceSummary` | 来源透传与说明字段锚点。 |
| `metadata.executionSource` | 诚实枚举与来源标记锚点。 |
| `metadata.provenance` | 来源链路解释锚点。 |
| `scripts/test-runtime-contracts.mjs` | `110/110` 传播回归验证锚点。 |

## Consequences

- 正向：synthetic runtime report 到 acceptance 的来源链路更完整，便于审计与回归排查。
- 正向：字段语义被明确分层，减少未来把来源说明误当成真实执行证据的风险。
- 取舍：这些字段不能用于解锁 `passed`，因此它们只提升可解释性，不改变 acceptance 决策边界。
- 取舍：`metadata.executionSource` 必须维持有限枚举，牺牲部分灵活性来换取 truth 一致性。
- 验证锚点：来源完成记录确认新增 6 个 tests，测试总数达到 `110/110`，并同步了 3 份文档。

## Search Terms

- `acceptance.provenanceSummary`
- `metadata.executionSource`
- `metadata.provenance`
- `provider-synthetic`
- `provider-reserved`
- `provider-less`
- `synthetic-mock`
- `reserved-unimplemented`
- `provider-less-draft`
- `110/110`
