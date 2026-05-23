# Phase 5 Generate surface view-model contract v0

## 1. 目标与边界

本文件只冻结 **Generate surface** 的文档级 view-model contract，目标是把“规划态 / 占位态 / 依赖态”说清楚，不把任何规划文档误写成真实 UI 或真实生成器实现。

> 对应的状态真相层已独立冻结在 `docs/phase-5-generate-state-model-contract.md`，本文件只做 view-model 投影，不反向定义状态语义。
> 其中输入引用只允许来自 `docs/phase-5-input-state-contract.md` / `docs/phase-5-input-view-model-contract.md` 已冻结的字段，不允许反向改写 Input 的状态语义。

### 目标
- 定义 Generate surface 的最小 contract 边界
- 明确输入、派生状态、输出事件的字段语义
- 冻结 loading / empty / error / deferred / pending 的文档口径
- 建立与 state-model 的逐项映射，保证 contract-first 闭环

### 明确不做
- 不做真实 UI 实现
- 不做真实生成器实现
- 不做 registry / publish 实现
- 不把 planning / skeleton / placeholder 说成 runtime complete
- 不把 pending 说成 pass

## 2. Generate surface 的定位

Generate surface 负责承接“生成规划结果”的展示与契约校验入口。它展示的是**规划产物的可见轮廓**，不是生成算法本身。

### 适用范围
- 规划结果摘要
- 生成状态摘要
- 生成依赖与约束提示
- 失败原因与待办边界

### 不适用范围
- 真实生成执行
- 实际数据编排
- 发布动作
- 后端运行时编排

## 3. view-model contract 字段清单

以下字段仅是文档级约定，不代表实现已存在。

```ts
type GenerateSurfaceViewModel = {
  // input props
  surfaceId: string
  title: string
  inputRefs?: string[]
  sourceRefs?: string[]
  dependencyRefs?: string[]
  requestedBy?: string
  requestedAt?: string
  planningMode?: 'skeleton' | 'contract-check' | 'review-only'

  // derived state
  status: 'idle' | 'loading' | 'ready' | 'error' | 'deferred' | 'pending'
  stage?: 'not-started' | 'collecting' | 'assembling' | 'validated' | 'blocked'
  summary?: string
  emptyState?: boolean
  loadingState?: boolean
  errorState?: boolean
  deferredReason?: string
  pendingReason?: string
  stateModelRef?: string
  invariantRefs?: string[]
  riskNotes?: string[]
  outOfScope?: string[]

  // output events
  onRefresh?: () => void
  onRetry?: () => void
  onInspectContract?: () => void
  onAcknowledgeDeferred?: () => void
}
```

### 字段口径
- `surfaceId` / `title`: 用于唯一识别与标题展示
- `inputRefs` / `sourceRefs`: 仅引用输入与来源，不表示已完成处理
- `dependencyRefs`: 仅列出 contract 依赖，不表示依赖已满足
- `planningMode`: 用于标记当前是 skeleton、contract-check 还是 review-only
- `status`: 只描述当前 contract / planning 语义，不代表功能完成度
- `stage`: 只描述生成链路所处的文档级阶段
- `emptyState`: 表示没有可展示的生成结果轮廓
- `loadingState`: 表示仍在等待材料汇聚或 contract 对齐
- `errorState`: 表示 contract 校验或依赖映射失败
- `deferredReason`: 说明为何被延后
- `pendingReason`: 说明为何仍是 pending，而不是 pass
- `stateModelRef`: 指向对应 state-model 条目
- `invariantRefs`: 指向手工可核对的 contract invariant
- `riskNotes`: 明确风险与未完成点
- `outOfScope`: 明确禁止宣称的能力
- 输出事件仅表示交互意图，不表示真实动作已经接通

## 4. 状态枚举与语义

Generate surface 采用最小状态集合：`idle / loading / ready / error / deferred / pending`。

### idle
- 还未进入任何可展示的生成规划阶段
- 适合显示占位提示或进入前引导
- 不能被解释为已完成

### loading
- 正在汇聚输入、来源或 contract 依赖
- 适合展示加载中提示
- 不能被解释为生成已开始或已完成

### ready
- 已形成可展示的规划结果轮廓
- 只表示 contract 视图可读，不代表 runtime 完成
- 仍可能带有风险提示或未决项

### error
- 存在 contract 失败、依赖缺失或映射冲突
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
- 表示没有可展示的 Generate 产物轮廓
- 应明确告诉用户：不是失败，只是没有可呈现内容
- 不能伪装成 ready

### 加载态
- 表示输入材料、来源引用或 state-model 对齐仍在汇聚
- 应展示“等待中 / 汇集中 / 对齐中”类语义
- 不能暗示生成已经成功

### 错误态
- 表示 contract 校验失败、依赖缺失、字段映射冲突或状态语义冲突
- 应尽量定位到具体字段或具体映射项
- 不能把 error 说成 deferred，也不能说成 pass

## 6. 与 state-model 的逐项映射（文档级）

以下为 Generate surface 的文档级映射，不写实现细节，只写语义对应关系。

| view-model 项 | state-model 对应项 | 文档语义 |
|---|---|---|
| `surfaceId` | `surface.id` | 唯一标识同一 surface |
| `title` | `surface.name` | 展示标题 |
| `inputRefs` | `state.inputs[]` / `state.sources[]` | 输入与来源引用 |
| `dependencyRefs` | `state.dependencies[]` | 依赖引用 |
| `planningMode` | `state.mode` | 当前规划口径 |
| `status=idle` | `state.phase=not-started` | 尚未进入生成轮廓 |
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
| `stateModelRef` | `state-model.id` | 直接映射引用 |
| `invariantRefs` | `state-model.invariants[]` | 约束核对点 |
| `onRefresh` | `action.refresh` | 重新拉取/重算意图 |
| `onRetry` | `action.retry` | 错误后重试意图 |
| `onInspectContract` | `action.inspectContract` | 打开 contract 说明意图 |
| `onAcknowledgeDeferred` | `action.ackDeferred` | 确认延后意图 |

### 映射原则
- 一条 view-model 字段应能追溯到一个明确的 state-model 语义
- `pending` 不是 `pass`
- `deferred` 不是 `ready`
- `idle` 不是“已经开始但没展示”
- `error` 必须能指出失败位置

## 7. 禁止误宣称清单

- 不把 planning 说成实现
- 不把 pending 说成 pass
- 不把 static / generator skeleton 说成 runtime complete
- 不把 deferred 说成已排期完成
- 不把空态说成失败态
- 不把加载态说成成功态
- 不把 contract-check 说成真实 UI 已上线
- 不把文档中的 output event 说成真实交互链路已打通

## 8. 手工可核对 checklist

实现前或 review 时可按以下 invariant 人工核对：

1. `status` 只允许在 `idle / loading / ready / error / deferred / pending` 中取值
2. `pending` 不能被任何文案描述为 `pass`
3. `deferred` 必须附带原因或边界说明
4. `error` 必须能定位到具体失败来源
5. `loading` 必须明确是材料汇聚或对齐中，而不是功能完成
6. `emptyState=true` 时不得同时宣称有可用结果
7. `ready` 只能表示文档级结果可读，不等于 runtime complete
8. `stateModelRef` 必须能在 state-model 文档中找到对应条目
9. `onRetry`、`onRefresh`、`onInspectContract` 只能被描述为意图，不可描述为已接通实现
10. 任何 `skeleton`、`placeholder`、`contract-check` 都不得被写成正式上线功能

## 9. 当前结论

Generate surface 的最小 contract 闭环已经在文档层封口：输入、派生状态、输出事件、状态语义、state-model 映射和误宣称边界都已明确。后续若进入实现，必须先对齐真实数据源与真实状态流，再允许状态从 `pending` 或 `deferred` 进入 `ready`。
