# Phase 5 Input surface view-model contract v0

## 1. 目标与边界

- **status**: frozen
- **scope**: Input surface 的文档级 view-model contract
- **non-goals**: 不做真实 UI、runtime、persistence 或 publish 实现；不把 planning / contract 态写成实现态
- **depends-on**: `docs/phase-5-input-state-contract.md`（state 真相层，若未存在则仅作为预期依赖，不反向定义语义）

本文件只冻结 **Input surface** 的文档级 view-model contract，目标是把输入展示层的字段、派生状态、错误态与后续 Generate surface 的 handoff 关系说清楚，不把任何草案误写成真实 UI、runtime、persistence 或 publish 实现。

> 对应的状态真相层已独立冻结在 `docs/phase-5-input-state-contract.md`，本文件只做 view-model 投影，不反向定义状态语义。

### 目标
- 定义 Input surface 的最小 contract 边界
- 明确 input / derived / output intent 的字段语义
- 冻结 loading / empty / error / deferred / pending 的文档口径
- 建立与 Input state 的逐项映射，保证 contract-first 闭环
- 说明与 Generate view-model 的 handoff / 引用关系

### 明确不做
- 不做真实 UI 实现
- 不做真实运行时实现
- 不做真实 persistence 实现
- 不做真实 publish / dispatch 实现
- 不把 input placeholder / contract sketch 说成已接通的数据采集链路
- 不把 pending 说成 pass
- 不把 deferred 说成完成

## 2. Input surface 的定位

Input surface 负责承接“输入材料与需求意图”的展示与契约校验入口。它展示的是**输入轮廓与状态轮廓**，不是输入管线本身。

### 适用范围
- 需求标题 / 来源 / 说明的展示
- 输入材料的存在性与完整性提示
- 待补字段、错误字段、引用缺失提示
- 传递给 Generate surface 的引用与 handoff 意图

### 不适用范围
- 真实文件上传 / 同步 / 摄取
- 真实消息队列 / storage / persistence
- 实际生成执行
- 发布动作
- 后端运行时编排

## 3. view-model contract 字段清单

以下字段仅是文档级约定，不代表实现已存在。

```ts
type InputSurfaceViewModel = {
  // input props
  surfaceId: string
  title: string
  sourceType?: 'manual' | 'file' | 'link' | 'message' | 'mixed'
  requestText?: string
  sourceRefs?: string[]
  attachmentRefs?: string[]
  fieldRefs?: string[]
  handoffTarget?: 'Generate'
  handoffRef?: string

  // derived state
  status: 'idle' | 'loading' | 'ready' | 'error' | 'deferred' | 'pending'
  stage?: 'not-started' | 'collecting' | 'assembling' | 'validated' | 'blocked'
  summary?: string
  emptyState?: boolean
  loadingState?: boolean
  errorState?: boolean
  deferredReason?: string
  pendingReason?: string
  missingFieldRefs?: string[]
  invalidFieldRefs?: string[]
  stateModelRef?: string
  invariantRefs?: string[]
  riskNotes?: string[]
  outOfScope?: string[]

  // output intent
  onRefresh?: () => void
  onRetry?: () => void
  onEditInput?: () => void
  onInspectHandoff?: () => void
  onMarkReady?: () => void
}
```

### 字段口径
- `surfaceId` / `title`: 用于唯一识别与标题展示
- `sourceType`: 仅说明输入来源类型，不表示数据管线已经接通
- `requestText`: 输入需求或说明的文档级摘要
- `sourceRefs` / `attachmentRefs` / `fieldRefs`: 只引用材料与字段，不表示已完成处理
- `handoffTarget` / `handoffRef`: 仅表达会交给 Generate surface 的引用意图，不表示已完成传递
- `status`: 只描述当前 contract / planning 语义，不代表功能完成度
- `stage`: 只描述输入链路所处的文档级阶段
- `emptyState`: 表示没有可展示的输入轮廓
- `loadingState`: 表示仍在等待材料汇聚或 contract 对齐
- `errorState`: 表示字段缺失、引用冲突或映射失败
- `deferredReason`: 说明为何被延后
- `pendingReason`: 说明为何仍是 pending，而不是 pass
- `missingFieldRefs` / `invalidFieldRefs`: 明确缺失或无效字段，便于手工核对
- `stateModelRef`: 指向对应 state-model 条目
- `invariantRefs`: 指向手工可核对的 contract invariant
- `riskNotes`: 明确风险与未完成点
- `outOfScope`: 明确禁止宣称的能力
- 输出 intent 仅表示交互意图，不表示真实动作已经接通

## 4. 状态枚举与语义

Input surface 采用最小状态集合：`idle / loading / ready / error / deferred / pending`。

### idle
- 还未进入任何可展示的输入轮廓阶段
- 适合显示占位提示或进入前引导
- 不能被解释为已完成

### loading
- 正在汇聚输入材料、字段或引用
- 适合展示加载中提示
- 不能被解释为输入已经可用或已经传递给 Generate

### ready
- 已形成可展示的输入轮廓
- 只表示 contract 视图可读，不代表 runtime 完成
- 仍可能带有风险提示或未决项

### error
- 存在字段缺失、引用缺失、映射冲突或 contract 失败
- 必须附带明确原因
- 不能降级包装成 warning

### deferred
- 当前有意不进入实现或不进入下一步
- 代表边界收口，不代表能力可用
- 不能被理解为“以后自动补齐”

### pending
- 当前仍在规划中或证据不足
- 适用于尚未能证明 pass 的情形
- 不能被展示为 ready 或 pass

## 5. 空态 / 错误态 / 加载态 的显示语义

### 空态
- 表示没有可展示的 Input 产物轮廓
- 应明确告诉用户：不是失败，只是没有可呈现内容
- 不能伪装成 ready

### 加载态
- 表示输入材料、引用或字段仍在汇聚
- 应展示“等待中 / 汇集中 / 对齐中”类语义
- 不能暗示数据摄取已经成功

### 错误态
- 表示字段缺失、引用缺失、映射冲突或状态语义冲突
- 应尽量定位到具体字段或具体映射项
- 不能把 error 说成 deferred，也不能说成 pass

## 6. InputState -> InputViewModel 的逐项映射（文档级）

以下为 Input surface 的文档级映射，不写实现细节，只写语义对应关系。

| view-model 项 | state-model 对应项 | 文档语义 |
|---|---|---|
| `surfaceId` | `surface.id` | 唯一标识同一 surface |
| `title` | `surface.name` | 展示标题 |
| `sourceType` | `state.source.type` | 输入来源类型 |
| `requestText` | `state.request.text` | 输入说明 / 需求摘要 |
| `sourceRefs` | `state.sources[]` | 输入来源引用 |
| `attachmentRefs` | `state.attachments[]` | 附件引用 |
| `fieldRefs` | `state.fields[]` | 输入字段引用 |
| `handoffTarget` | `state.handoff.target` | 目标 surface 归属 |
| `handoffRef` | `state.handoff.ref` | 交接引用 |
| `status=idle` | `state.phase=not-started` | 尚未进入输入轮廓 |
| `status=loading` | `state.phase=collecting` | 材料汇聚中 |
| `status=ready` | `state.phase=validated` | 文档级结果可读 |
| `status=error` | `state.phase=blocked` | 发生阻塞或冲突 |
| `status=deferred` | `state.defer=true` | 明确延后 |
| `status=pending` | `state.validation='pending'` | 仍缺乏足够证据 |
| `emptyState` | `state.outputCount=0` | 无可展示产物 |
| `loadingState` | `state.phase in ['collecting','assembling']` | 加载语义 |
| `errorState` | `state.errors.length > 0` | 错误语义 |
| `deferredReason` | `state.deferReason` | 延后原因 |
| `pendingReason` | `state.pendingReason` | 待决原因 |
| `missingFieldRefs` | `state.missingFields[]` | 缺失字段引用 |
| `invalidFieldRefs` | `state.invalidFields[]` | 无效字段引用 |
| `stateModelRef` | `state-model.id` | 直接映射引用 |
| `invariantRefs` | `state-model.invariants[]` | 约束核对点 |
| `onRefresh` | `action.refresh` | 重新拉取/重算意图 |
| `onRetry` | `action.retry` | 错误后重试意图 |
| `onEditInput` | `action.editInput` | 编辑输入意图 |
| `onInspectHandoff` | `action.inspectHandoff` | 检查交接意图 |
| `onMarkReady` | `action.markReady` | 标记输入准备完毕意图 |

### 映射原则
- 一条 view-model 字段应能追溯到一个明确的 state-model 语义
- `pending` 不是 `pass`
- `deferred` 不是 `ready`
- `idle` 不是“已经开始但没展示”
- `error` 必须能指出失败位置

## 7. 与 Generate view-model 的 handoff / 引用关系

Input surface 不是 Generate surface 的实现前置，而是其**输入证据源**之一。

### handoff 规则
- `handoffTarget` 只能指向 `Generate`
- `handoffRef` 只表示引用地址，不表示生成已执行
- Input 允许描述“准备交给 Generate 的材料”，但不能宣称“Generate 已可用”
- Generate surface 若引用 Input 的内容，只能引用 `sourceRefs` / `attachmentRefs` / `fieldRefs` / `requestText` 这些文档级证据

### 引用闭环
- Input state 冻结输入材料的状态真相
- Input view-model 负责把这些材料整理成可读轮廓
- Generate view-model 只允许把 Input 的已冻结字段视为上游引用，不允许反向修改 Input 的状态语义
- 两者的关系是“引用与承接”，不是“共享 runtime”

### 交接边界
- Input 的 `ready` 只能表示输入轮廓可读
- Generate 的 `loading` 只能表示生成材料汇聚中
- 不能把 Input 的 `ready` 直接解释为 Generate 的 `ready`
- 不能把 handoffRef 解释为真实执行结果

## 8. 禁止误宣称清单

- 不把 planning 说成实现
- 不把 pending 说成 pass
- 不把 static / skeleton 说成 runtime complete
- 不把 deferred 说成已排期完成
- 不把空态说成失败态
- 不把加载态说成成功态
- 不把 contract-check 说成真实 UI 已上线
- 不把文档中的 output intent 说成真实交互链路已打通
- 不把 Input 的 ready 说成 Generate 的 ready
- 不把 handoffRef 说成已经完成传递

## 9. 手工可核对 checklist

实现前或 review 时可按以下 invariant 人工核对：

1. `status` 只允许在 `idle / loading / ready / error / deferred / pending` 中取值
2. `pending` 不能被任何文案描述为 `pass`
3. `deferred` 必须附带原因或边界说明
4. `error` 必须能定位到具体失败来源
5. `loading` 必须明确是材料汇聚或对齐中，而不是功能完成
6. `emptyState=true` 时不得同时宣称有可用结果
7. `ready` 只能表示文档级结果可读，不等于 runtime complete
8. `stateModelRef` 必须能在 state-model 文档中找到对应条目
9. `handoffRef` 只能作为引用，不可描述为已完成交接
10. `onRetry`、`onRefresh`、`onEditInput`、`onInspectHandoff`、`onMarkReady` 只能被描述为意图，不可描述为已接通实现
11. 任何 `skeleton`、`placeholder`、`contract-check` 都不得被写成正式上线功能

## 10. 当前结论

Input surface 的最小 contract 闭环已经在文档层封口：输入字段、派生状态、输出意图、状态语义、state-model 映射、与 Generate 的 handoff 关系以及误宣称边界都已明确。后续若进入实现，必须先对齐真实输入源与真实状态流，再允许状态从 `pending` 或 `deferred` 进入 `ready`。
