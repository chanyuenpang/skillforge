# Phase 5 Replay surface view-model contract v0

## 1. 目标与边界

本文件只冻结 **Replay surface** 的文档级 view-model contract，目标是把“回放入口、步骤映射、差异提示、不可执行占位”说清楚，不把任何规划文档误写成真实 UI、真实 replay runtime 或 persistence 实现。

> 对应的状态真相层已独立冻结在 `docs/phase-5-replay-state-contract.md`，本文件只做 view-model 投影，不反向定义状态语义。

### 目标
- 定义 Replay surface 的最小 contract 边界
- 明确入口、步骤、差异、占位的字段语义
- 冻结 loading / empty / error / deferred / pending 的文档口径
- 建立与 state-contract 的逐项映射，保证 contract-first 闭环

### 明确不做
- 不做真实 UI 实现
- 不做真实 replay runtime 实现
- 不做 persistence / snapshot store / publish 实现
- 不把 planning / skeleton / placeholder 说成 runtime complete
- 不把 pending 说成 pass

## 2. Replay surface 的定位

Replay surface 负责承接“回放查看与回放规划”的展示与契约校验入口。它展示的是**回放意图、来源快照、步骤映射、差异提示**的可见轮廓，不是回放执行本身。

### 适用范围
- 回放入口与跳转说明
- 回放步骤的可视化映射
- 差异提示、对照提示、来源提示
- 不可执行占位与边界说明

### 不适用范围
- 真实回放执行
- 真实快照恢复
- 实际数据重放或事件回播
- 发布动作
- 后端运行时编排

## 3. view-model contract 字段清单

以下字段仅是文档级约定，不代表实现已存在。

```ts
type ReplaySurfaceViewModel = {
  // input props
  surfaceId: string
  title: string
  sourceSnapshotRef?: string
  replayIntent?: string
  replayMode?: 'preview' | 'inspect' | 'compare' | 'resume' | 'audit'
  entryRef?: string
  stepRefs?: string[]
  compareBaselineRef?: string
  diffHintRefs?: string[]
  guardRef?: string

  // derived state
  status: 'idle' | 'loading' | 'ready' | 'error' | 'deferred' | 'pending'
  stage?: 'not-started' | 'collecting' | 'assembling' | 'validated' | 'blocked'
  summary?: string
  emptyState?: boolean
  loadingState?: boolean
  errorState?: boolean
  deferredReason?: string
  pendingReason?: string
  stepMap?: Array<{ source: string; target: string; note?: string }>
  diffSummary?: string
  unavailableReason?: string
  sourceSnapshotStatus?: 'resolved' | 'missing' | 'stale' | 'placeholder'
  stateModelRef?: string
  invariantRefs?: string[]
  riskNotes?: string[]
  outOfScope?: string[]

  // output intents
  onOpenReplayEntry?: () => void
  onRefresh?: () => void
  onRetry?: () => void
  onInspectDiff?: () => void
  onAbortReplayPlan?: () => void
}
```

### 字段口径
- `surfaceId` / `title`: 用于唯一识别与标题展示
- `sourceSnapshotRef`: 仅引用来源快照，不表示恢复已完成
- `replayIntent`: 仅说明回放意图，不表示真实执行
- `replayMode`: 仅区分 preview / inspect / compare / resume / audit 的文档口径
- `entryRef`: 入口引用，表示从哪里进入回放视图
- `stepRefs`: 回放步骤引用，仅用于步骤映射
- `compareBaselineRef`: 对照基准引用，仅对 compare 类模式有意义
- `diffHintRefs`: 差异提示引用，显示可核对差异
- `guardRef`: 守卫条件引用，指向可人工核对的 contract 条目
- `status`: 只描述当前 contract / planning 语义，不代表功能完成度
- `stage`: 只描述回放链路所处的文档级阶段
- `emptyState`: 表示没有可展示的回放轮廓
- `loadingState`: 表示仍在等待材料汇聚或 contract 对齐
- `errorState`: 表示来源缺失、映射失败或守卫冲突
- `deferredReason`: 说明为何被延后
- `pendingReason`: 说明为何仍是 pending，而不是 pass
- `stepMap`: 回放步骤与来源/目标之间的文档级映射
- `diffSummary`: 差异摘要，只是文档视图，不是自动比对结果
- `unavailableReason`: 不可执行或不可展示的原因
- `sourceSnapshotStatus`: 说明引用是否可解析、失效、过期或仅占位
- `stateModelRef`: 指向对应 state-contract 条目
- `invariantRefs`: 指向手工可核对的 contract invariant
- `riskNotes`: 明确风险与未完成点
- `outOfScope`: 明确禁止宣称的能力
- 输出 intents 仅表示交互意图，不表示真实动作已经接通

## 4. 状态枚举与语义

Replay surface 采用最小状态集合：`idle / loading / ready / error / deferred / pending`。

### idle
- 还未进入任何可展示的回放轮廓阶段
- 适合显示占位提示或进入前引导
- 不能被解释为已完成

### loading
- 正在汇聚来源快照、步骤引用或守卫材料
- 适合展示加载中提示
- 不能被解释为回放已经开始或已经完成

### ready
- 已形成可展示的回放轮廓
- 只表示 contract 视图可读，不代表 runtime 完成
- 仍可能带有风险提示或未决项

### error
- 存在来源缺失、守卫冲突、映射失败或 contract 失败
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
- 表示没有可展示的 Replay 产物轮廓
- 应明确告诉用户：不是失败，只是没有可呈现内容
- 不能伪装成 ready

### 加载态
- 表示来源快照、步骤引用或守卫条件仍在汇聚
- 应展示“等待中 / 汇集中 / 对齐中”类语义
- 不能暗示真实回放已经成功

### 错误态
- 表示来源缺失、守卫条件冲突、步骤映射失败或状态语义冲突
- 应尽量定位到具体字段或具体映射项
- 不能把 error 说成 deferred，也不能说成 pass

## 6. ReplayState -> ReplayViewModel 的逐项映射（文档级）

以下为 Replay surface 的文档级映射，不写实现细节，只写语义对应关系。

| view-model 项 | state-contract 对应项 | 文档语义 |
|---|---|---|
| `surfaceId` | `surface.id` | 唯一标识同一 surface |
| `title` | `surface.name` | 展示标题 |
| `sourceSnapshotRef` | `state.sourceSnapshotRef` | 来源快照引用 |
| `replayIntent` | `state.replayIntent` | 回放意图摘要 |
| `replayMode` | `state.replayMode` | 回放模式口径 |
| `entryRef` | `state.entryRef` | 进入回放入口的引用 |
| `stepRefs` | `state.stepRefs[]` | 步骤引用 |
| `compareBaselineRef` | `state.compareBaselineRef` | 对照基准引用 |
| `diffHintRefs` | `state.diffHints[]` | 差异提示引用 |
| `guardRef` | `state.guardRefs[]` | 守卫条件引用 |
| `status=idle` | `state.phase=not-started` | 尚未进入回放轮廓 |
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
| `stepMap` | `state.stepMap[]` | 回放步骤映射 |
| `diffSummary` | `state.diffSummary` | 差异摘要 |
| `unavailableReason` | `state.unavailableReason` | 不可执行原因 |
| `sourceSnapshotStatus` | `state.sourceSnapshotStatus` | 来源解析状态 |
| `stateModelRef` | `state-model.id` | 直接映射引用 |
| `invariantRefs` | `state-model.invariants[]` | 约束核对点 |
| `onOpenReplayEntry` | `action.openReplayEntry` | 打开回放入口意图 |
| `onRefresh` | `action.refresh` | 重新拉取/重算意图 |
| `onRetry` | `action.retry` | 错误后重试意图 |
| `onInspectDiff` | `action.inspectDiff` | 检查差异意图 |
| `onAbortReplayPlan` | `action.abortReplayPlan` | 终止回放计划意图 |

### 映射原则
- 一条 view-model 字段应能追溯到一个明确的 state-contract 语义
- `pending` 不是 `pass`
- `deferred` 不是 `ready`
- `idle` 不是“已经开始但没展示”
- `error` 必须能指出失败位置

## 7. 与 Input / Generate / Validate / Review 的契约关系

- **Input**：Replay 可引用 Input 的已冻结输入证据，但不能反向修改 Input 的状态语义
- **Generate**：Replay 可引用 Generate 的规划结果或来源快照，但不能把 Generate 的 ready 直接当成 Replay 的 ready
- **Validate**：Replay 可消费 Validate 的通过 / 失败 / pending 证据，但不能把 Validate 的状态结论偷换成 replay 已执行
- **Review**：Replay 可引用 Review 的审核意见或变更锚点，但不能把 Review 的 approved / rejected 误写成 replay complete

### 交接边界
- Replay 的 `ready` 只能表示回放轮廓可读
- Validate 的 `ready` 不能自动提升 Replay 的执行可用性
- `entryRef` / `guardRef` / `stepMap` 只是引用与映射，不是 runtime 通道
- 不能把 `sourceSnapshotStatus=resolved` 直接解释为真实恢复成功

## 8. 禁止误宣称清单

- 不把 planning 说成实现
- 不把 pending 说成 pass
- 不把 static / skeleton 说成 runtime complete
- 不把 deferred 说成已排期完成
- 不把空态说成失败态
- 不把加载态说成成功态
- 不把 contract-check 说成真实 UI 已上线
- 不把文档中的 output intents 说成真实交互链路已打通
- 不把 Replay 的 ready 说成 replay 已执行
- 不把 sourceSnapshotRef 说成真实恢复结果

## 9. 手工可核对 checklist

实现前或 review 时可按以下 invariant 人工核对：

1. `status` 只允许在 `idle / loading / ready / error / deferred / pending` 中取值
2. `pending` 不能被任何文案描述为 `pass`
3. `deferred` 必须附带原因或边界说明
4. `error` 必须能定位到具体失败来源
5. `loading` 必须明确是材料汇聚或对齐中，而不是功能完成
6. `emptyState=true` 时不得同时宣称有可用结果
7. `ready` 只能表示文档级结果可读，不等于 runtime complete
8. `stateModelRef` 必须能在 state-contract 文档中找到对应条目
9. `onRetry`、`onRefresh`、`onOpenReplayEntry`、`onInspectDiff`、`onAbortReplayPlan` 只能被描述为意图，不可描述为已接通实现
10. 任何 `skeleton`、`placeholder`、`contract-check` 都不得被写成正式上线功能

## 10. 当前结论

Replay surface 的最小 contract 闭环已经在文档层封口：回放入口、步骤映射、差异提示、不可执行占位、状态语义、state-contract 映射和误宣称边界都已明确。后续若进入实现，必须先对齐真实快照语义与守卫条件，再允许状态从 `pending` 或 `deferred` 进入 `ready`。
