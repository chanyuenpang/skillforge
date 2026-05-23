# Phase 5 History view-model contract v0

> 这是 History surface 的 **view-model contract v0**。它只定义 History 的文档级投影层：如何把已冻结的 state-model 语义映射到可读、可审阅、可导航的展示契约。**不含 UI / runtime / persistence / publish 实现**，也不把 planning / placeholder / deferred 写成已完成能力。

> 对应的状态真相层已独立冻结在 `docs/phase-5-history-state-model-contract.md`；本文件只做 view-model 投影，不反向定义 state-model。

## 1. 目标与边界

### 目标
- 冻结 History surface 的最小 view-model contract。
- 把 state-model 的时间线、条目、游标、筛选、回放锚点等语义，投影成可展示、可核对的文档字段。
- 统一 `status / empty / loading / error / deferred / pending` 的呈现语义。
- 提供 `stateModelRef / invariantRefs` 等可追溯字段，保证 contract-first 闭环。
- 复用 Phase 5 的收口模板块，把 `scope / boundary / artifacts / gate / next step / owner handoff` 显式映射为 view-model 可审阅字段。

### 边界
- 这是 **History 的 view-model contract v0**，不是实现说明。
- 不描述 UI 结构、不描述 runtime 调度、不描述 persistence schema、不描述 publish 流程。
- 不把 view-model 反写成 state-model，不新增超出 state-model 的能力承诺。
- 不声明 history / audit / replay 已完成联动或可运行。

## 2. History state-model -> view-model 映射规则

### 映射原则
1. **一一追溯**：每个 view-model 字段都应能追溯到一个明确的 state-model 语义或文档约束。
2. **只做投影**：view-model 只负责展示/审阅所需的投影，不补充 runtime 事实。
3. **不越级承诺**：state-model 未声明的能力，view-model 不能擅自升格。
4. **保留边界词**：`deferred / pending / placeholder` 等边界词必须原样保留，不得美化为完成态。
5. **显示不等于完成**：`ready` 仅表示文档级结果可读，不表示 UI / runtime / persistence / publish 完成。

### 最小映射表

| view-model 字段 | state-model 对应项 | 文档语义 |
|---|---|---|
| `surfaceId` | `surface.id` | History surface 的唯一标识 |
| `title` | `surface.name` | 展示标题 |
| `summary` | `timeline / entries / cursor / filters / replayAnchor` 的组合摘要 | History 轮廓摘要，仅用于阅读 |
| `timelineRef` | `state.timeline` | 时间线容器引用 |
| `entryRefs` | `state.entries[]` | 条目集合引用 |
| `cursorRef` | `state.cursor` | 当前定位引用 |
| `filterRefs` | `state.filters[]` | 筛选条件引用 |
| `replayAnchorRef` | `state.replayAnchor` | 回放锚点引用 |
| `status` | `state.phase / state.validation / state.defer` 的投影 | 文档级状态，不等于产品完成度 |
| `emptyState` | `state.entries.length === 0` 或无可展示条目 | 无可展示历史内容 |
| `loadingState` | `state.phase` 表示仍在汇聚/对齐 | 材料未齐，不表示完成 |
| `errorState` | `state.errors.length > 0` 或映射冲突 | 明确错误或冲突 |
| `deferredReason` | `state.deferReason` | 为什么当前有意延后 |
| `pendingReason` | `state.pendingReason` | 为什么仍停留在 pending |
| `stateModelRef` | `phase-5-history-state-model-contract.md` 中对应条目 | 指向真相层基线 |
| `invariantRefs` | state-model 中的不变量条目 | 指向可手工核对的约束 |
| `riskNotes` | 文档级风险说明 | 未完成点与审阅风险 |
| `outOfScope` | 明确禁止宣称项 | 防止误把规划写成实现 |
| `reviewGateRef` | `phase-5-review-gate-template-v0.md` | 引用通用审阅块 |
| `checklistRef` | `phase-5-contract-consistency-checklist-v0.md` | 引用人工一致性巡检入口 |
| `lintPlanRef` | `phase-5-docs-consistency-lint-plan.md` | 引用 docs 一致性 guardrail |
| `subplanRef` | `phase-5-subplan-closeout-structure-v2.md` | 引用收口子计划结构 |
| `currentStatusRef` | `phase-5-closeout-current-status.md` | 引用当前收口事实页 |

### 字段口径补充
- `timelineRef`：只引用时间线容器，不表示真实存储介质。
- `entryRefs`：只引用条目集合，不表示条目已被持久化或发布。
- `cursorRef`：只描述逻辑定位，不描述实际渲染位置算法。
- `filterRefs`：只描述筛选条件引用，不描述筛选引擎实现。
- `replayAnchorRef`：只描述回放边界锚点，不表示真实 replay 已执行。
- `stateModelRef`：必须能回到 state-model 基线文件与对应条目。
- `invariantRefs`：必须能回到 state-model 的 append-only、cursor 单调性、replay 边界等约束。

## 3. status、empty/loading/error/deferred/pending 的呈现语义

### status
`status` 只表示 History 文档级语义，不表示实现完成度。

建议枚举：`idle / loading / ready / error / deferred / pending`

- `idle`：尚未进入可展示的 History 轮廓
- `loading`：时间线材料、条目、游标或筛选语义仍在汇聚
- `ready`：文档级 History 轮廓可读、可核对
- `error`：映射失败、字段冲突、或明确 contract 失败
- `deferred`：有意延后，不进入当前实现路线
- `pending`：证据不足或仍在规划中，不能冒充完成

### empty
- `emptyState=true` 表示当前没有可展示的历史条目或轮廓。
- 这是“无内容可展示”，不是“功能失败”。
- 不能把 empty 说成 error，也不能把 empty 说成 ready。

### loading
- `loadingState=true` 表示时间线、条目、游标或筛选条件仍在汇聚/对齐。
- 这是材料准备中，不是功能完成。
- 不能把 loading 说成结果已可用。

### error
- `errorState=true` 表示存在明确错误、缺失或映射冲突。
- 应尽量定位到具体字段或具体条目。
- 不能把 error 包装成 warning，也不能偷换成 pending。

### deferred
- 表示该 History 视图或某个投影项被有意推迟。
- 必须有明确边界说明或原因字段。
- 不能被解释成“快完成了”。

### pending
- 表示当前仍为规划中、证据不足或尚未形成可核对结论。
- 不能被展示为 ready。
- 不能被解释为 pass。

## 4. 文档级 view-model 字段清单

以下字段仅为文档级约定，不代表实现已存在。

```ts
type HistoryViewModel = {
  surfaceId: string
  title: string
  summary?: string

  timelineRef?: string
  entryRefs?: string[]
  cursorRef?: string
  filterRefs?: string[]
  replayAnchorRef?: string[]

  status: 'idle' | 'loading' | 'ready' | 'error' | 'deferred' | 'pending'
  emptyState?: boolean
  loadingState?: boolean
  errorState?: boolean
  deferredReason?: string
  pendingReason?: string

  stateModelRef?: string
  invariantRefs?: string[]
  riskNotes?: string[]
  outOfScope?: string[]

  reviewGateRef?: string
  checklistRef?: string
  lintPlanRef?: string
  subplanRef?: string
  currentStatusRef?: string
}
```

### 字段口径
- `surfaceId` / `title`：用于唯一识别与标题展示。
- `summary`：History 轮廓摘要，只做阅读，不做执行承诺。
- `timelineRef` / `entryRefs` / `cursorRef` / `filterRefs` / `replayAnchorRef`：只做投影引用。
- `status`：只反映 contract / planning 状态，不反映产品完成度幻觉。
- `emptyState`：表示没有可展示内容，不等于失败。
- `loadingState`：表示材料仍在汇聚，不等于完成。
- `errorState`：表示映射或 contract 出错，必须可定位原因。
- `deferredReason`：解释为何延后。
- `pendingReason`：解释为何仍是 pending，而不是 ready。
- `stateModelRef`：必须回指 state-model 真相层文件。
- `invariantRefs`：必须回指可核对的不变量条目。
- `riskNotes`：明确风险与未完成点。
- `outOfScope`：显式列出禁止宣称的能力。
- `reviewGateRef` / `checklistRef` / `lintPlanRef` / `subplanRef` / `currentStatusRef`：用于把 History view-model 与收口模板、巡检与当前状态页对齐，避免孤立成页。

## 5. stateModelRef / invariantRefs 等文档字段

### stateModelRef
- 必须指向 `docs/phase-5-history-state-model-contract.md` 或其中可定位的对应条目。
- 作用是保证 view-model 永远可回溯到真相层。
- 不能用于暗示实现已存在。

### invariantRefs
建议至少覆盖以下不变量引用：
- append-only 语义
- cursor 单调性
- replay 边界
- 不随意覆盖/重排/隐式删除条目

这些引用只用于人工核对，不是自动化校验。

### riskNotes
- 应记录映射歧义、材料不足、边界未收口等风险。
- 不应把“尚未实现”包装成“已接近完成”。

### outOfScope
- 应明确禁止宣称 UI / runtime / persistence / publish 已完成。
- 应明确禁止把 view-model 口径误写成真实执行链路。
- 应明确禁止把 deferred / pending 解释为 ready。

## 6. 禁止误宣称清单

- 不把 `pending` 展示为 `ready` 或 `pass`
- 不把 `deferred` 解释成已排期完成
- 不把 `empty` 说成失败态
- 不把 `loading` 说成已完成
- 不把 view-model 说成实现已存在
- 不把 `stateModelRef` 说成真实数据源已接通
- 不把 `invariantRefs` 说成自动化校验已完成
- 不把 History 的展示轮廓说成真实 history / audit / replay 已上线
- 不把 planning / skeleton / placeholder 伪装成可交付功能

## 7. 手工 checklist

新增或修改 History 相关文档时，手工检查以下项：

1. 标题是否明确标注 History view-model contract v0。
2. 是否只描述 contract，不混入 UI / runtime / persistence / publish 实现。
3. 是否明确从 state-model 进行投影，而不是反向定义 state-model。
4. 是否包含 `status / emptyState / loadingState / errorState / deferredReason / pendingReason` 的语义。
5. 是否包含 `stateModelRef / invariantRefs` 的追溯口径。
6. 是否没有把 pending、deferred、placeholder 误写成 ready 或 pass。
7. 是否没有把展示层草案写成真实产品实现。
8. 是否没有误写成 runtime complete 或已可执行。

## 8. Related

- 上游索引：[`phase-5-contract-index.md`](./phase-5-contract-index.md)
- 当前收口：[`phase-5-closeout-current-status.md`](./phase-5-closeout-current-status.md)
- 合规巡检：[`phase-5-contract-consistency-checklist-v0.md`](./phase-5-contract-consistency-checklist-v0.md)
- History state-model：[`phase-5-history-state-model-contract.md`](./phase-5-history-state-model-contract.md)
- docs 一致性巡检：[`phase-5-docs-consistency-lint-plan.md`](./phase-5-docs-consistency-lint-plan.md)

## 9. 说明

如果后续需要扩展 History 的 UI / runtime / persistence / publish，请另起独立文档继续收口，不要在本页补写实现态。