# Phase 3 Provenance Contract

> 本文统一 synthetic provider pipeline、synthetic acceptance provenance 与 final report `metadata.provenanceSummary` 的 contract 与 disclosure boundary。
>
> 关键边界：本文只描述**来源披露**与**合同约束**，不代表真实 provider execution、transcript capture、transcript persistence、scoring 或正式 runtime replay 已实现。凡是 informational-only 字段，均不得参与 decision。
>
> 现阶段禁止 mixed-source fallback：同一条 provenance 链路中的字段必须同源、同口径、同边界；不得把 synthetic / reserved / provider-less 字段拼接成真实 provider execution 证据。
>
> **closeout 说明**：Phase 3 synthetic/provenance 这波工作已经走到 contract-first 自然收口点。本轮重点不是继续实现，而是把“已完成、未完成、何时重启”写清楚，避免把边界误读成还能继续平推实现。

## 1. 目标与边界

### 1.0 本轮结论

本轮属于 **contract-first closeout**，不是继续扩实现面的阶段。

- 已完成：synthetic provider pipeline / acceptance provenance / `provenanceSummary` / provenance contract 文档
- 当前不继续实现的原因：边际收益低、约束边界已触顶、测试追加不划算
- 明确保留未完成项：真实 provider execution / transcript capture / persistence / scoring / sandbox / multi-case / passed path
- 后续重新开启条件：放松真实 provider 边界，或进入下一阶段设计

### 1.1 目标

本文的目标是把 Phase 3 里已经出现的三层 provenance 口径统一起来，并把本轮 closeout 的边界写死：

1. **synthetic provider pipeline**：描述当前 provider-backed / provider-reserved seam 的来源标签与占位字段。
2. **synthetic acceptance provenance**：描述验收记录中的来源披露与审计字段。
3. **final report `metadata.provenanceSummary`**：描述最终报告中的 human-readable disclosure 摘要。

### 1.2 明确不代表什么

本文明确不声明以下能力已经完成；这些仍是保留的后续实现项，不得被 closeout 文档误写成 done：

- 不代表真实 provider execution 已发生
- 不代表 transcript capture 已实现
- 不代表 transcript persistence 已实现
- 不代表 scoring / rubric engine 已实现
- 不代表 provider-backed runtime replay 已完成
- 不代表 `metadata.provenanceSummary` 可以作为 pass/fail 证据

### 1.3 读法约定

- **decision-bearing**：可用于合同守卫、状态判定、验收结论或阻断条件的字段。
- **informational-only**：仅用于披露、审计、排障、阅读理解，不参与 decision。
- **reserved / synthetic / provider-less**：都只是边界标签，不是“真实 provider 已执行”的同义词。

## 2. 术语与原则

### 2.1 术语

- **synthetic provider pipeline**：当前阶段的 provider seam 仍是合成态、保留态或 provider-less 态的统一口径，不可解释为真实 provider call。
- **synthetic acceptance provenance**：验收记录中的 provenance 只记录来源、条件、风险与审计信息，不自动构成通过证明。
- **final report provenanceSummary**：最终报告中的 `metadata.provenanceSummary` 是披露摘要，不是执行真实性证明。

### 2.2 原则

1. **同源原则**：同一 provenance 链路中的字段必须来自同一 contract 层，不允许混拼。
2. **诚实披露原则**：任何 reserved / synthetic / provider-less 字段都必须按其真实边界解释。
3. **禁止推断原则**：看到 summary、handle、stub、reserved，不得推断出 transcript、persistence、scoring 或真实 provider execution。
4. **决策隔离原则**：informational-only 字段不得进入 decision path。
5. **禁止 mixed-source fallback**：若真实 provider 证据不存在，不得用 synthetic stub、reserved metadata、report summary 拼接出“看起来像真的”结论。

## 3. Provenance 分层模型

### L1. Synthetic provider pipeline provenance

这一层只描述 provider seam 的来源状态与保守 metadata。

- 目标：保留 future provider-backed contract 的位置
- 当前事实：仍是 reserved / synthetic / provider-less 语义
- 风险：最容易被误读成真实 provider execution

### L2. Synthetic acceptance provenance

这一层只描述验收过程中的 provenance 记录。

- 目标：让验收记录可审计、可回溯、可解释
- 当前事实：可以披露 acceptance decision，但不能把 provenance 字段当成执行证据
- 风险：把 evidence 文本误认为 runtime pass 证据

### L3. Final report `metadata.provenanceSummary`

这一层只做最终报告的披露汇总。

- 目标：为读者提供 human-readable disclosure
- 当前事实：summary 只能反映来源状态和保守边界
- 风险：被误当成 transcript、capture、persistence 或 scoring 的证明

## 4. Field Contract Matrix

> 说明：下表中的“是否决策性”指该字段是否可直接参与 decision。

### 4.1 Synthetic provider pipeline

| 字段 | 语义 | allowed values | 是否决策性 |
|---|---|---|---|
| `metadata.executionSource` | 来源标签，标记当前链路属于哪种 provenance 态 | `provider-synthetic`, `provider-reserved`, `provider-less`, `unknown-reserved` | 是 |
| `providerMetadata.providerBacked` | 是否真实 provider-backed execution | `false` | 是 |
| `providerMetadata.executed` | 是否发生真实执行 | `false` | 是 |
| `providerMetadata.providerCall` | 是否真实发出 provider 请求 | `false` | 是 |
| `providerMetadata.providerEvidenceAvailable` | 是否存在可追溯 provider 证据 | `false` | 是 |
| `providerMetadata.executionId` | 执行标识，占位或 stub tuple 的一部分 | `null`, `<stub-string>` | 否 |
| `providerMetadata.providerRunId` | provider run/request 标识，占位或 stub tuple 的一部分 | `null`, `<stub-string>` | 否 |
| `providerMetadata.providerStatus` | provider 执行状态元数据槽位 | `null`, `<stub-status>` | 否 |
| `rawResponse.summary` | 摘要位，不是完整 payload capture | `null`, `string`, `object(summary-only)` | 否 |
| `rawResponse.handle` | raw-response reserved identity，不是 transcript/persistence handle | `null` | 否 |
| `transcriptRef.available` | transcript 是否可用 | `false`, `null` | 是 |
| `transcriptRef.providerManaged` | transcript 是否由 provider 管理 | `false`, `null` | 是 |
| `transcriptRef.providerTranscript` | 是否存在 provider transcript | `false`, `null` | 是 |
| `transcriptRef.persistence` | transcript persistence 槽位 | `false`, `null`, `none` | 是 |
| `transcriptRef.handle` | transcript 句柄占位 | `null` | 否 |

### 4.2 Synthetic acceptance provenance

| 字段 | 语义 | allowed values | 是否决策性 |
|---|---|---|---|
| `acceptance.decision` | 验收结论 | `accept`, `accept_with_risks`, `reject` | 是 |
| `acceptance.criteriaResults[].passed` | 单条验收标准是否通过 | `true`, `false` | 是 |
| `acceptance.criteriaResults[].evidence` | 证据描述或引用 | `string` | 否 |
| `acceptance.risks[]` | 风险披露列表 | `string[]` | 否 |
| `acceptance.provenanceSummary` | 验收侧的披露摘要 | `string`, `object(disclosure-only)` | 否 |

### 4.3 Final report provenanceSummary

| 字段 | 语义 | allowed values | 是否决策性 |
|---|---|---|---|
| `metadata.provenanceSummary` | final report 的来源披露摘要 | `string`, `object(disclosure-only)` | 否 |
| `cases[].status` | case 对外状态 | `blocked`, `error` | 是 |
| `cases[].observed.providerCall` | observed 归一化视图中的调用标记 | `false` | 是 |
| `metadata.providerBackedContract.currentState` | provider-backed contract 当前状态 | `reserved-unimplemented` | 是 |

## 5. 一致性约束 / 防误读

### 5.1 一致性约束

1. `metadata.executionSource` 只能描述来源态，不能替代执行态。
2. `providerMetadata.*` 里的 stub 字段只能保持 same-source 透传，不得升级解释。
3. `rawResponse.summary` 只允许 summary-only；`handle` 只允许 reserved-only / null。
4. `transcriptRef.*` 相关字段只允许 reserved seam 语义，不得宣称 transcript capture/persistence 已完成。
5. `cases[].status` 仍只允许 `blocked | error`，不得因为 summary 或 stub 字段而扩展成 passed / success。

### 5.2 防误读

- `provenanceSummary` 不是 transcript。
- `provenanceSummary` 不是 persistence。
- `provenanceSummary` 不是 scoring。
- `executionId` / `providerRunId` / `providerStatus` 不是真实 provider evidence。
- `available=false`、`handle=null`、`persistence=none` 不是“后续补一补就等于已实现”，它们是当前边界。
- 只要真实 provider 证据不存在，就禁止 mixed-source fallback。

### 5.3 决策隔离

以下字段一律不得直接参与 decision：

- `metadata.provenanceSummary`
- `acceptance.provenanceSummary`
- `acceptance.criteriaResults[].evidence`
- `rawResponse.summary`
- `providerMetadata.executionId`
- `providerMetadata.providerRunId`
- `providerMetadata.providerStatus`
- `transcriptRef.handle`

## 6. 文档回链

本文应回链并保持口径一致的现有文档：

- `docs/roadmap.md`
- `docs/phase-3-provider-backed-slot-contract-checklist.md`
- `docs/phase-3-runtime-report-runner-plan.md`
- `docs/phase-3-runtime-draft-cli-plan.md`
- `docs/runtime-replay-protocol-lightweight-design.md`
- `docs/preflight-contract-and-artifacts-design.md`
- `docs/acceptance-result.md`
- `docs/validator-contract.md`（如后续继续对齐 contract tests 术语）
- `docs/adr/ADR-phase3-synthetic-provenance-closeout.md`

## 7. 推荐摘要文案

> `metadata.provenanceSummary` 仅作 disclosure-only 的来源摘要，用于诚实描述 synthetic / reserved / provider-less 的 provenance 边界；它不代表真实 provider execution，不代表 transcript capture 或 persistence 已实现，也不参与 decision。当前任何 provider-backed 相关字段都必须保持 same-source、reserved-safe、no mixed-source fallback 的合同约束。

## 8. 变更提醒

- 若未来引入真实 provider execution，必须先更新本文的 allowed values 与 decision-bearing 规则。
- 若未来引入 transcript capture / persistence / scoring，也必须先区分新字段与现有 reserved 字段，不能复用当前 informational-only 字段充当证据。
- 若 roadmap 中的阶段边界变化，本文的“明确不代表什么”也要同步更新。
