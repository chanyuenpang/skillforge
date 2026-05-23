# Phase 3 provider-backed reserved slot：implementation checklist + reserved field matrix

> 状态：implementation-prep draft  
> 目的：在真实 provider 子计划开始前，先把 provider-backed reserved slot 必须补齐的字段、路径、保留约束与接线顺序钉死。  
> 重要边界：本文不是 provider integration 实现说明；不代表真实 provider、transcript persistence、sandbox enforcement、passed path、tests、默认 validate 链路或文档全量同步已完成。
>
> 当前文档同步口径补充：provider adapter output 现在只是**更真实的中间 truth payload**，用于把单一 adapter result 同源透传到 runtime draft artifact 的 `cases[].observed`、`rawResponse`、`providerExecution`、`transcriptAvailability` 等槽位；这里的 `rawResponse` 也只是**最小 skeleton / truth payload slot**，不是完整 provider payload capture，不是 transcript，不是 persistence handle。这仍然只是 reserved/unimplemented 的 provider-backed contract 准备面，不代表真实 provider call、provider transcript、transcript persistence、scoring 或正式 gate 已完成。

## 1. 使用方式

这份清单只服务于后续 **真实 provider-backed runtime** 子计划，作用是三件事：

1. 明确当前哪些字段必须继续保持 `false/null/reserved`；
2. 明确接入 provider 后哪些字段必须被真实填充；
3. 明确这些字段分别应从哪一层进入、在哪一层透传、在哪一层最终落进 runtime artifact。

一句话：

```text
后续子计划不要再猜 contract，按这张表补就行。
```

## 2. 当前 contract 前提

当前仓库已经在 contract 层冻结了下面这些事实：

- `provider-backed` slot 仍是 `reserved-unimplemented`；
- 当前 runtime draft/report 对外可见的 case status 仍限定在：
  - `blocked`
  - `error`
- 其中 provider-backed reserved seam 下当前只允许：
  - `blocked`
  - `error`
- `blocked` 绑定 `preflight-blocked` 语义；
- provider-backed `error` 绑定 reserved slot 语义，用于保留 orchestration/runtime skeleton 内部错误报告位，不代表真实 provider execution failure taxonomy；
- 当前不允许开放真实 `passed` path；
- 当前不允许伪造 provider transcript、provider evidence、provider persistence；
- 当前不接真实 provider，不做真实 transcript persistence，不做 scoring。

因此，后续任何 provider-backed 实装，都必须先满足本文 checklist 与 matrix，再去碰真实 adapter/runner/provider 逻辑。

## 3. Implementation checklist

### 3.1 Provider selection

> 当前 Phase 3 已完成的只是 **selection wiring tightening**：provider-backed selection lineage 现在被收紧为内部单一路径 `adapter -> runner -> observed mapper -> report`。这表示 selection truth source 已统一，**不表示** provider-backed execution 已开放。
>
> 当前 CLI 仍只开放 `dry-run | null-runner`；provider-backed mode 仍是 internal reserved seam，默认 validate 链路也仍不接 runtime/provider 路线。

- [x] 明确 `providerMetadata.providerKey`
- [x] 明确 `providerMetadata.providerSlot`
- [x] 明确 runner/input 到 provider adapter 的 provider selection 传递路径
- [ ] 明确 builtin / external provider 的识别规则
- [ ] 保持 `providerBacked=true` 只在真实 provider call 接通后出现
- [x] 在 provider 未实际接通前，禁止把 selection placeholder 写成 executed/provider-backed success

**最低落地要求**

- provider 选择必须至少能稳定回答：
  - 选中了哪个 provider key
  - 落在哪个 reserved slot / implementation slot
  - 是 builtin adapter 还是后续外接 provider

---

### 3.2 Raw response capture

> 当前收紧后的口径：`rawResponse` 只是 runtime draft/report contract 中的**最小 skeleton / truth payload slot**，用于承载单一 adapter result 的同源最小真值位；它不是完整 provider payload dump，不是 transcript，也不是 persistence / retrieval handle。
>
> `rawResponse.summary` 若存在，也只应被解释为摘要位；不能把摘要位写成完整 provider payload capture 已存在。
>
> 同时，`rawResponse` 与 transcript handle 现在不再允许混源 fallback：不能再用 transcript ref 冒充 raw response handle，也不能用 raw response slot 冒充 transcript/persistence 句柄。

- [ ] 定义 provider 原始响应的最小捕获对象
- [ ] 明确原始响应在当前阶段只允许表现为 report 内最小 skeleton/summary reserved seam，而不是外部持久化句柄
- [ ] 明确 `providerMetadata.providerEvidenceAvailable` 的置真条件
- [ ] 未捕获 raw response 时，不得把 evidence 写成可用
- [ ] raw response capture 与 transcript capture 必须区分，不得混为同一字段
- [x] 明确 `rawResponse.summary` 只是摘要位，不代表完整 provider payload
- [x] 明确 raw response handle 不是 transcript/persistence handle，且不再与 transcript handle 混源 fallback
- [x] 明确当前 `rawResponse.summary / handle` 只是 summary-only / reserved-only contract，不代表真实 provider payload capture/retrieval
- [x] 明确 non-provider-backed 路径继续要求 `rawResponse` unavailable/null fallback，不得从 transcript stub、execution metadata stub 或其他 mixed source 拼装

**最低落地要求**

- 至少要有一个稳定承载位能说明：
  - provider 返回过什么最小 skeleton / truth payload
  - 是否真的可追溯
  - 该证据只是摘要、还是可回捞实体
  - 它是否与 transcript / persistence 明确分槽而非共用句柄

---

### 3.3 Observed mapping

- [ ] 把 provider 原始响应映射到 `cases[].observed`
- [ ] 明确 observed 是 provider-normalized view，不是 raw payload 原样转储
- [ ] 明确 `observed.providerCall=true` 的置真条件
- [ ] 明确 `observed.providerEvidenceAvailable=true` 的置真条件
- [ ] 明确 observed 与 scoring/rubric 解耦，后续评分不要反向污染 observed 合同

**最低落地要求**

- observed 至少要稳定表达：
  - 是否真的调用了 provider
  - 归一化后的结果摘要
  - 是否存在可追溯 provider evidence

---

### 3.4 Provider transcript handle

> 当前文档边界要求：transcript handle 是 transcript 侧引用位，不是 raw response slot；raw response handle 也不是 transcript/persistence handle。二者当前不再允许混源 fallback。
>
> 当前真实状态再收紧一层：`transcriptRef.handle` / `providerManaged` / `providerTranscript` / `persistence` 现在都只是 **reserved-only contract seam**。它们表达的是“未来若接入真实 provider transcript capture / retrieval / persistence，应落在哪些槽位、沿哪条 same-source 链路传播”，**不是**当前已经存在 provider transcript capture、provider transcript retrieval、provider-managed transcript handle、或 transcript persistence。
>
> 当前 provider-less transcript stub 若存在，也只允许被解释为 draft artifact 内的 provider-less evidence ref；它不能升级解释成 provider transcript，也不能成为 provider-managed handle 的替身。

- [ ] 明确 transcript handle 的生成时机
- [ ] 明确 `transcriptRef.available=true` 的置真条件
- [ ] 明确 `transcriptRef.providerManaged=true` / `providerTranscript=true` 的含义边界
- [ ] 明确 `transcriptRef.handle` 的稳定格式或最小 identity 规则
- [ ] 明确 transcript handle 与 raw response handle 是否允许复用；若复用必须显式声明
- [ ] 未有真实 transcript 时，不得保留 draft-only transcript ref 语义冒充 provider transcript
- [ ] 未有真实 transcript 时，不得把 rawResponse slot / handle fallback 成 transcript handle
- [ ] non-provider-backed 路径继续要求 `available=false`、`providerManaged=false`、`providerTranscript=false`、`handle=null`、`persistence="none"`

**最低落地要求**

- transcript ref 必须至少让后续链路能回答：
  - transcript 在不在
  - 谁管理
  - 用哪个 handle 可追踪
- 但在当前阶段，上述问题的诚实答案仍然应当大多落在 reserved / false / null / none，而不是伪造成“已有 provider transcript”

---

### 3.4.1 Transcript capture reserved skeleton

> 已完成：transcript capture reserved skeleton 的三个核心导出物已冻结——`captureProviderTranscriptStub`、`assertTranscriptCaptureStubContract`、`TRANSCRIPT_CAPTURE_MODES`。
>
> 真实边界：这不是真实 transcript capture，只是 reserved seam。`captured` 在当前阶段永远为 `false`；`captureMode` 只有两个值：`"none"` 和 `"reserved-provider-captured"`。当前不存在真实 provider transcript capture、transcript retrieval 或 transcript persistence。

- [x] TRANSCRIPT_CAPTURE_MODES frozen — 只允许 `"none"` 和 `"reserved-provider-captured"` 两个值
- [x] captureProviderTranscriptStub contract frozen — `captured` 永远为 `false`，`captureMode` 落在合法枚举内
- [x] assertTranscriptCaptureStubContract guard — 验证 stub 对象符合 reserved skeleton 合同
- ⚠️ NOT real provider transcript capture — 当前不接真实 provider，不做真实 transcript capture
- ⚠️ NOT transcript capture/retrieval/persistence — 当前不存在可回捞、可持久化或可检索的 transcript

---

### 3.4.2 Scoring reserved stub

> 已完成：scoring reserved stub 的四个核心导出物已冻结——`buildScoringStub`、`buildScoringStubProviderReserved`、`assertScoringStubContract`、`SCORING_MODES`。
>
> 真实边界：这不是真实 scoring / rubric engine，只是 reserved seam。`scored` 在当前阶段永远为 `false`；`scoringMode` 只有两个值：`"none"` 和 `"reserved-pending"`。当前不存在真实评分、评分引擎、评分 rubric 或评分 persistence。当前不开放 `passed` 状态。

- [x] SCORING_MODES frozen — 只允许 `"none"` 和 `"reserved-pending"` 两个值
- [x] buildScoringStub contract frozen — `scored` 永远为 `false`，`scoringMode` 落在合法枚举内
- [x] buildScoringStubProviderReserved reserved seam — 为未来真实 provider-backed scoring 预留接口
- [x] assertScoringStubContract guard — 验证 stub 对象符合 reserved skeleton 合同；`scored=true` 在当前阶段会被拒绝
- ⚠️ NOT real scoring / rubric engine — 当前不接真实评分引擎，不做真实评分
- ⚠️ NOT passed status opening — 当前不开放 `passed` 状态，评分 stub 不等于通过

---

### 3.4.3 Sandbox enforcement reserved stub

> 已完成：sandbox enforcement reserved stub 的四个核心导出物已冻结——`buildSandboxStub`、`buildSandboxStubProviderReserved`、`assertSandboxStubContract`、`SANDBOX_MODES`。
>
> 真实边界：这不是真实 sandbox isolation / timeout / resource limits，只是 reserved seam。`enforced` 在当前阶段永远为 `false`；`sandboxMode` 只有两个值：`"none"` 和 `"reserved-pending"`。当前不存在真实 sandbox enforcement、sandbox isolation、timeout enforcement 或 resource limit enforcement。

- [x] SANDBOX_MODES frozen — 只允许 `"none"` 和 `"reserved-pending"` 两个值
- [x] buildSandboxStub contract frozen — `enforced` 永远为 `false`，`sandboxMode` 落在合法枚举内
- [x] buildSandboxStubProviderReserved reserved seam — 为未来真实 provider-backed sandbox enforcement 预留接口
- [x] assertSandboxStubContract guard — 验证 stub 对象符合 reserved skeleton 合同；`enforced=true` 在当前阶段会被拒绝
- ⚠️ NOT real sandbox isolation / timeout / resource limits — 当前不做真实 sandbox 执行隔离
- ⚠️ NOT sandbox enforcement activation — 当前 sandbox enforcement 仅为 reserved stub，不构成真实执行证据

---

### 3.4.4 Multi-case orchestration reserved stub

> 已完成：multi-case orchestration reserved stub 的四个核心导出物已冻结——`buildMultiCaseStub`、`buildMultiCaseStubProviderReserved`、`assertMultiCaseStubContract`、`CASE_MODES`。
>
> 真实边界：这不是真实 multi-case parallel/batch execution，只是 reserved seam。`caseMode` 在当前阶段永远为 `single`；`CASE_MODES` 只有两个值：`"single"` 和 `"reserved-multi"`。当前不存在真实 multi-case parallel execution、multi-case batch execution、或 case dependency orchestration。

- [x] CASE_MODES frozen — 只允许 `"single"` 和 `"reserved-multi"` 两个值
- [x] buildMultiCaseStub contract frozen — `caseMode` 永远为 `single`，落在合法枚举内
- [x] buildMultiCaseStubProviderReserved reserved seam — 为未来真实 provider-backed multi-case orchestration 预留接口
- [x] assertMultiCaseStubContract guard — 验证 stub 对象符合 reserved skeleton 合同；无效 `caseMode` 在当前阶段会被拒绝
- ⚠️ NOT real multi-case parallel/batch execution — 当前不接真实 multi-case 并行/批量执行
- ⚠️ NOT case dependency orchestration — 当前不存在 case 间依赖编排能力

### 3.4.5 Synthetic provider pipeline reserved stub

> 已完成：synthetic provider pipeline 的三项边界已写回 contract 文档——`runtime-provider-synthetic.mjs`、adapter provider-backed synthetic branch、contract guard synthetic whitelist。
>
> 真实边界：这不是 real provider call；synthetic results 只是 deterministic mock，不是 real execution evidence。

- [x] runtime-provider-synthetic.mjs created
- [x] adapter provider-backed synthetic branch wired
- [x] contract guard synthetic whitelist
- ⚠️ NOT real provider call
- ⚠️ synthetic results are deterministic mock, not real execution evidence

---

### 3.5 Persistence handle

> 当前真实边界：`providerMetadata.transcriptPersistence`、`providerMetadata.persistence`、`transcriptRef.persistence` 现在都只是 **reserved attach-point contract**。它们表达的是“未来若接入真实 transcript/raw-response persistence，应落在哪些槽位、如何沿 same-source 链路传播”，**不是**当前已经存在 transcript persistence、payload persistence、artifact retrieval、或 persistence-backed evidence availability。
>
> 同时必须明确区分：
> - availability ≠ persistence
> - persistence ≠ evidence availability
> - provider-managed ≠ 已可 retrieval
> - in-report draft transcript ref ≠ persisted transcript
>
> 当前 non-provider-backed 路径仍要求 `transcriptPersistence=false`、`persistence="none"`、相关 handle/location `null` 或 absent，不能从 transcript stub、rawResponse seam、execution metadata stub tuple 或其他 mixed source 反推/补造 persistence 状态。

- [ ] 明确 transcript / raw response / observed evidence 各自的 persistence 策略
- [ ] 明确 `providerMetadata.transcriptPersistence` 的取值语义
- [ ] 明确 `providerMetadata.persistence` 与 `transcriptRef.persistence` 的关系
- [ ] 明确是否存在单独的 persistence handle / artifact id / location
- [ ] 未真正持久化前，禁止把 persistence 写成可恢复状态

**最低落地要求**

- 至少要能稳定区分：
  - `none`
  - in-report only
  - provider-managed / external persisted
- 但在当前阶段，诚实答案仍然应优先停留在 `false/null/none/reserved`，而不是把 attach-point seam 说成 persistence 已落地

---

### 3.6 Failure taxonomy

> 当前已完成的是 provider-backed reserved seam 的 failure taxonomy tightening，不是完整 provider execution failure taxonomy。
>
> 当前真实边界：provider-backed reserved seam 只允许 `blocked | error`。其中：
> - `blocked` 只绑定 `preflight-blocked` / guard-blocked 语义；
> - provider-backed `error` 只绑定 reserved slot 语义，用于保留未来 orchestration/runtime skeleton/adapter 内部错误传播位；
> - `adapter-error` 只是 internal semantic alias，对外仍必须序列化为 `error`；
> - `report.failureReason` 与 case-level failure reason 当前要求 same-source，同一个 adapter/runner truth source 直出，不允许 mixed-source fallback。
>
> 这些收紧只是为了防止把 reserved slot 误读成真实 provider failure taxonomy，**不表示** provider request failure、provider execution failure、provider transcript failure、persistence failure、或 passed path 已经实现。

- [x] 明确 provider-backed reserved seam 当前只允许 `blocked | error`
- [x] 明确 `blocked` 绑定 `preflight-blocked` / guard-blocked 语义
- [x] 明确 provider-backed `error` 绑定 reserved slot 语义
- [x] 明确 `adapter-error` 只是 internal semantic alias，对外仍序列化为 `error`
- [x] 明确 report / failureReason 当前要求 same-source，不允许 mixed-source fallback
- [ ] 明确 provider selection failure
- [ ] 明确 provider request failure
- [ ] 明确 provider response parse / mapping failure
- [ ] 明确 transcript capture failure
- [ ] 明确 persistence failure
- [ ] 明确 sandbox / side-effect guard 阻断 failure
- [ ] 明确哪些 future provider failures 只影响 metadata，哪些会落成 `cases[].status=error|blocked`

**最低落地要求**

- 当前阶段 failure taxonomy 至少要诚实表达：
  - preflight / guard 阻断时落 `blocked`
  - reserved seam 内部错误传播位对外统一落 `error`
  - `adapter-error` 不得作为新的对外 status 暴露
  - failure reason 必须 same-source，不能混 adapter / runner / report 多源 fallback

- 以下能力故意留给后续真实 provider 子计划：
  - 没选中 provider
  - 选中了但没发出 call
  - call 发出但结果不可用
  - transcript / persistence 后处理失败
  - 真实 provider execution / transcript / persistence failure taxonomy

---

### 3.7 Runtime pass path

- [ ] 明确什么条件下才允许 `cases[].status=passed`
- [ ] 明确 `result.status=passed` 与 `summary.passed=true` 的联动条件
- [ ] 明确 passed path 是否必须同时要求：providerCall、providerEvidence、transcript、persistence 至少其中哪些为真
- [ ] 明确 preflight passed 与 runtime passed 仍然是两层语义
- [ ] 在正式打开 passed path 前，保留默认 reserved contract，不得半开状态

**最低落地要求**

- `passed` 只能在真实 provider-backed execution evidence 完整满足 contract 后解锁；
- 禁止因为 dry/null runner 或只打通 adapter seam 就提前开放 passed。

---

### 3.8 Runtime pass path / runner propagation

> 本轮已完成的真实范围：selection lineage 已被收紧为 `adapter -> runner -> observed mapper -> report` 的内部单一路径；adapter result 作为同源 truth payload 透传到 draft artifact 的 observed/providerExecution/transcriptAvailability/rawResponse 视图。这里的“同源透传”只是在收紧 contract，**不是**真实 provider execution、provider transcript、transcript persistence、scoring 或 passed path 已完成。

- [x] 明确 provider adapter result 到 runner result 的字段透传规则
- [x] 明确 runner metadata 中哪些字段与 provider metadata 一一对应
- [x] 明确 runtime replay report metadata 是否保留 execution lineage
- [x] 明确 report 顶层 status 与 case status 的映射规则
- [ ] 明确 blocked/error/dry-run/not-executed 到 provider-backed 实装后的兼容迁移规则

**最低落地要求**

- 后续 provider 子计划必须能从 adapter result 一路稳定落到 runtime report，不能在 runner 层重新发明字段。

---

### 3.9 Side-effects / sandbox interaction placeholder

- [ ] 明确 provider call 前需要读取哪些 sandbox / boundary summary 字段
- [ ] 明确哪些 side-effects 只是声明占位，哪些会阻断 provider call
- [ ] 明确 external messaging / network / filesystem 与 provider-backed execution 的关系
- [ ] 明确 side-effect guard 失败时是 `blocked` 还是 `error`
- [ ] 在真实 sandbox enforcement 未落地前，保持 declaration-only 语义，不得伪装成 enforced

**最低落地要求**

- provider 子计划至少要知道：
  - 执行前该看哪些 boundary 字段
  - 这些字段现在只是声明，还是已经 enforce

## 4. Reserved field matrix

| Area | Contract path | Current state | Future provider-backed requirement | Source / owner |
| --- | --- | --- | --- | --- |
| provider selection | `provider.providerKey` | may exist as selector input; not proof of execution | must resolve to actual selected provider identity | adapter input |
| provider selection | `provider.providerSlot` | reserved slot only | must point to concrete implementation slot used by execution | adapter input |
| provider selection | `providerMetadata.providerKey` | `null` unless true provider-backed execution | required | adapter result |
| provider selection | `providerMetadata.providerSlot` | `null` unless true provider-backed execution | required | adapter result |
| execution identity | `providerMetadata.executionId` | provider-backed reserved seam may now carry a same-source stub value; non-provider-backed must still be `null` | required stable execution identifier only after true provider-backed execution lands; current stub is conservative metadata only and not proof of execution | adapter result |
| provider run identity | `providerMetadata.providerRunId` | provider-backed reserved seam may now carry a same-source stub value; non-provider-backed must still be `null` | required when provider exposes run/request identity; current stub is conservative metadata only and not proof of a real provider run/request | adapter result |
| provider state | `providerMetadata.providerStatus` | provider-backed reserved seam may now carry a same-source stub value; non-provider-backed must still be `null` | required normalized provider execution status after real provider execution exists; current stub status is conservative metadata only | adapter result |
| provider-backed toggle | `providerMetadata.providerBacked` | `false` | must be `true` only after real provider-backed execution | adapter result |
| executed toggle | `providerMetadata.executed` | `false` | must be `true` for real provider execution | adapter result |
| provider call flag | `providerMetadata.providerCall` | `false` | must be `true` when provider request actually sent | adapter result |
| provider evidence flag | `providerMetadata.providerEvidenceAvailable` | `false` | must be `true` only when evidence can be traced | adapter result |
| transcript captured flag | `providerMetadata.transcriptCaptured` | `false`; reserved-only, not proof of provider transcript capture | must be `true` only when a real provider transcript exists | adapter result |
| transcript persistence flag | `providerMetadata.transcriptPersistence` | `false`; reserved-only attach-point bit, not proof of persistence, retrieval, or evidence availability | must express actual persistence availability/state only after real persistence lands | adapter result |
| persistence mode | `providerMetadata.persistence` | `"none"`; non-provider-backed and reserved-only paths must keep this fallback; current value is attach-point contract only | must declare real persistence mode only after actual persistence contract lands | adapter result |
| raw response slot | `rawResponse` | same-source minimal skeleton/truth payload slot only; not full payload, transcript, persistence handle, or payload retrieval proof | may expand only after true provider/raw payload capture contract lands | adapter/runner/report case |
| raw response summary | `rawResponse.summary` | summary-only when present; summary-only / reserved-only contract today | must remain summary-only unless explicit raw payload capture contract exists | adapter/runner/report case |
| raw response handle semantics | `rawResponse.handle` / equivalent raw-response identity slot | unavailable / reserved unless future contract adds one; current semantics are reserved-only | must not be treated as transcript handle, persistence handle, or payload retrieval handle | adapter/runner/report case |
| transcript availability | `transcriptRef.available` | `false` unless provider-less draft transcript stub exists; current truth slot is reserved-only and not proof of provider transcript availability, persistence, or retrieval | provider-backed transcript requires `true` only after real provider transcript capture/retrieval exists | adapter/report case |
| transcript ownership | `transcriptRef.providerManaged` | `false`; current field is reserved-only and must not imply provider-managed transcript retrieval or persisted ownership | required `true` for a real provider-managed transcript handle | adapter/report case |
| transcript handle | `transcriptRef.handle` | `null`; current field is reserved-only and must not fallback from rawResponse slot or provider-less draft stub | required stable transcript handle only after real provider transcript identity exists | adapter/report case |
| transcript provider bit | `transcriptRef.providerTranscript` | `false`; provider-less draft transcript stub must not flip it | required `true` only for real provider transcript | runner/report case |
| transcript ref persistence | `transcriptRef.persistence` | `"none"` or reserved fallback only; not proof of persisted transcript or recoverable artifact | required truthful persistence mode only after actual transcript persistence contract lands | runner/report case |
| observed provider call | `cases[].observed.providerCall` | `false` | must be `true` only on real provider call | runtime report case |
| observed evidence flag | `cases[].observed.providerEvidenceAvailable` | reserved/implicit false today | must be explicit and truthful after mapping | runtime report case |
| runtime case status | `cases[].status` | provider-backed reserved seam currently allows only `blocked|error`; `blocked` = preflight/guard blocked, `error` = reserved slot only | `passed` may open only after full provider-backed path | runtime report case |
| runner provider execution flag | `runnerMetadata.providerBacked` | default false | must match adapter/provider-backed truth | runner result |
| runner provider call flag | `runnerMetadata.providerCall` | false | must reflect actual provider call | runner result |
| runner transcript captured | `runnerMetadata.transcriptCaptured` | false | must reflect actual transcript capture | runner result |
| runner persistence | `runnerMetadata.transcriptPersistence` | `"none"` | must reflect actual persistence mode/state | runner result |
| runner evidence flag | `runnerMetadata.evidenceProduced` | false | must be true only with real execution evidence | runner result |
| runner pass reservation | `runnerMetadata.passedReserved` | `true` | may relax only when provider-backed pass path implemented | runner result |
| runner future-required list | `runnerMetadata.futureProviderRequiredFields` | reserved checklist field | should be reduced or versioned once real provider path lands | runner result |
| runtime metadata execution id | `metadata.providerExecution.executionId` | provider-backed reserved seam may now surface the same-source stub identity; otherwise reserved/null or absent | required in final report metadata once true provider execution exists; current value is only stub metadata | runtime replay report |
| runtime metadata provider status | `metadata.providerExecution.providerStatus` | provider-backed reserved seam may now surface the same-source stub status; otherwise reserved/null or absent | required normalized execution status once true provider execution exists; current value is only stub metadata | runtime replay report |
| runtime metadata contract state | `metadata.providerBackedContract.currentState` | `reserved-unimplemented` | must move to implemented state only when end-to-end path is real | runtime replay report |
| side-effect boundary | `metadata.sandbox` / runner sandbox contract lineage | declaration-only | must document whether provider path is merely declared or enforced | runner/report metadata |

补充同步本轮已完成边界：

- provider-backed reserved seam 下，`executionId / providerRunId / providerStatus` 现在可以作为 **same-source stub tuple** 出现；
- 这个 tuple 只表示“给未来真实 provider execution contract 预留的保守 execution metadata 槽位已经接通透传”，不表示真实 provider request 已发出，也不表示真实 provider run/request identity 已存在；
- 它**不等于** `providerBacked=true` 的能力升级结论，也**不等于** `executed=true`、`providerCall=true`、`providerEvidenceAvailable=true`；
- 它也**不代表** transcript、provider transcript handle/retrieval、raw payload capture、payload retrieval、persistence、scoring 或 passed path 已完成；
- 其中 `providerStatus` 当前只允许停留在 metadata / providerExecution seam，不能泄漏成新的 public case status，也不能被用来改写 CLI 对外 status 集合；
- `rawResponse.summary / handle` 当前同样只是在 reserved seam 上占位：summary 只是摘要位，handle 只是 raw-response identity reserved seam，不能从它们反推为“已有 provider payload capture/retrieval”；
- `transcriptAvailability` / `transcriptRef.handle / providerManaged / providerTranscript / persistence` / `providerMetadata.transcriptPersistence` 当前同样只是在 reserved seam 上占位，不能从这个 stub tuple、provider-less transcript stub、availability bit、或 rawResponse seam 反推为“已有 provider transcript”或“已有 transcript persistence”；
- non-provider-backed 路径仍要求 `executionId/providerRunId/providerStatus` 统一回落 `null`，`rawResponse` 继续统一回落 unavailable/null，而 transcript / persistence 相关位继续统一回落 `false/null/none`，不能做 mixed-source fallback 或 partial tuple 拼装。

## 5. Recommended implementation order for the next provider-backed subplan

1. **selection wiring**  
   先把 provider key / slot / mode 的输入来源稳定下来。

2. **adapter result truthfulness**  
   再让 adapter result 真正产出 execution id / provider status / provider call truth。

3. **observed + transcript mapping**  
   然后补 observed normalized mapping 与 transcript handle。

4. **persistence handle**  
   再定义 persistence mode / handle / location。

5. **runner propagation**  
   再把 adapter truth 透传到 runner metadata / runtime report metadata。

6. **failure taxonomy**  
   当前只先收紧 reserved seam：`blocked` 绑定 preflight/guard blocked，provider-backed `error` 绑定 reserved slot，`adapter-error` 仅作 internal alias；更细粒度 provider execution failure taxonomy 留到真实 provider 子计划。

7. **passed path unlock**  
   全部前置就绪后，才讨论开放 `passed`。

## 6. 明确故意留给后续任务的内容

以下内容本次故意不做，留给后续子计划：

- 真实 provider integration
- 真实 provider execution / request dispatch
- provider transcript capture / persistence
- rawResponse persistence / evidence retrieval
- scoring reserved stub 已冻结（`buildScoringStub`、`buildScoringStubProviderReserved`、`assertScoringStubContract`、`SCORING_MODES`）；`scored` 永远为 `false`，`scoringMode` 只允许 `"none"` 和 `"reserved-pending"`——这不是真实 scoring / rubric engine
- 真实 scoring / rubric
- passed path 解锁
- 真实 provider execution failure taxonomy 统一扩展
- 状态机小修
- tests / contract tests 扩展
- validate* 默认链路接入
- fixtures 变更
- 文档全量同步
- git 提交 / 推送
- 运行验证

## 7. 结论

当前 contract 层已经把 provider-backed slot 钉成了“先保留、后兑现”。下一步真实 provider 子计划不该再猜字段，而是应直接按上面的 checklist 和 matrix 补齐：

```text
selection
-> raw response
-> observed mapping
-> transcript handle
-> persistence handle
-> runner/report propagation
-> failure taxonomy
-> passed path
```

别抢跑，先把每个字段讲真话，后面接 provider 才不会一地龙虾壳。
