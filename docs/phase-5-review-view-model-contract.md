# Phase 5 Review view-model contract v0

## 1. 目标与边界

本文件冻结 **Review 的 view-model contract**。它只描述 Review 在展示层如何投影已冻结的 state-model 语义，不做 runtime / publish / persistence / replay 实现。

### 目标
- 为 Review 的 state-model 提供展示层投影闭环
- 冻结 Review 在 UI / planning skeleton 中可见的字段语义
- 明确 `idle / ready / blocked / approved / rejected` 在展示层的投影方式
- 保持对 publish / replay / runtime 的严格隔离

### 明确不做
- 不做真实 UI 实现
- 不做 runtime 实现
- 不做 publish 实现
- 不做 persistence / storage 实现
- 不做 replay 实现
- 不把 view-model 当成状态真相层
- 不把 approved 误写成 publish complete

## 2. 字段清单

以下字段为文档级 contract，不代表代码已实现。

```ts
type ReviewViewModel = {
  id: string
  title?: string
  state: 'idle' | 'ready' | 'blocked' | 'approved' | 'rejected'
  statusLabel: string
  summary?: string
  inputRefs?: string[]
  derivedNotes?: string[]
  blockingReasons?: string[]
  decision?: 'approve' | 'reject' | 'hold'
  decisionLabel?: string
  outputIntent?: string
  evidenceRefs?: string[]
  lastUpdated?: string
  outOfScope?: string[]
}
```

### 字段分组

#### input
- `id`: Review 项的稳定标识
- `title`: Review 对象的展示标题
- `inputRefs`: 指向已冻结的 Generate / Validate 输入证据
- `evidenceRefs`: 指向可被展示引用的文档级证据
- `lastUpdated`: 展示层最近更新时间

#### derived
- `state`: 从 state-model 单向投影得到的展示态
- `statusLabel`: 面向人类的状态标签
- `summary`: 对当前 Review 语义的简短摘要
- `derivedNotes`: 由已冻结 state-model 推导出的解释性备注
- `blockingReasons`: 从 state-model 的阻塞原因投影而来
- `decisionLabel`: 对 `decision` 的展示文案

#### output intent
- `decision`: Review 的文档级结论意图
- `outputIntent`: 展示 Review 当前意图，但不代表发布结果
- `outOfScope`: 明确列出不能从该 view-model 推导出的能力

## 3. 状态映射

Review 的 state-model 与 view-model 采用单向映射：**state-model -> view-model**。

### idle
- 投影为：待收口 / 未形成可审阅输入
- `statusLabel` 建议表达为“待输入”或“未就绪”
- `summary` 只可说明尚无足够审阅材料
- 不能显示为通过、完成或发布

### ready
- 投影为：可审阅
- `statusLabel` 建议表达为“可审阅”
- `summary` 可说明输入已冻结、可进入人工审阅
- 不能显示为 publish complete

### blocked
- 投影为：被证据阻塞
- `statusLabel` 建议表达为“阻塞中”
- `summary` 可说明缺少哪个 gate / evidence
- `blockingReasons` 必须可见，且要能被人看懂阻塞点

### approved
- 投影为：审阅通过
- `statusLabel` 建议表达为“已通过审阅”
- `summary` 可说明 Review 结论已收口为通过
- 不能显示为 publish complete，也不能暗示 runtime complete

### rejected
- 投影为：审阅拒绝
- `statusLabel` 建议表达为“已拒绝”
- `summary` 可说明 Review 结论为拒绝或需回退
- 不能包装成“只是暂缓”或“稍后自动完成”

## 4. blockingReasons 与 decision 的展示语义

### blockingReasons
- 只展示“为什么当前 Review 不能诚实收口”
- 应直接对应 state-model 中的阻塞原因
- 适合用短句、标签或列表呈现
- 不能被美化成模糊的风险提示

推荐展示口径：
- `missing_generate_evidence`
- `missing_validate_evidence`
- `generate_not_frozen`
- `validate_not_frozen`
- `conflicting_evidence`
- `insufficient_review_input`

### decision
- 只展示 Review 的文档级结论意图
- `approve`：审阅通过
- `reject`：审阅拒绝
- `hold`：暂不收口，但不是通过

### 语义红线
- `decision=approve` 不等于 publish complete
- `decision=hold` 不等于通过前夜
- `blockingReasons` 不能缺席在 blocked 状态里
- 不能把 decision 当成 runtime / publish / replay 结果

## 5. 与 state-model 的单向映射规则

1. view-model 只能由已冻结的 state-model 投影产生
2. view-model 不得反向补写 state-model 没有声明的事实
3. `blockingReasons` 必须来自 state-model，不能新增展示层自创原因
4. `decision` 只能来自 state-model 的审阅结论语义
5. `derivedNotes` 只能做解释，不得引入新真相
6. `outputIntent` 只能描述意图，不得暗示已发布、已运行或已回放
7. 当 state-model 与展示需要冲突时，以 state-model 为准，view-model 只能降级表达

## 6. 误宣称红线

以下说法一律禁止写入 Review 的 view-model 文案、字段说明或示例中：
- 把 `approved` 写成 `publish complete`
- 把 `blocked` 写成“马上就能自动通过”
- 把 `ready` 写成“已发布 / 已运行 / 已回放”
- 把 `rejected` 写成“其实已经过了，只是没刷新”
- 把 `decision=approve` 写成发布成功
- 把 `blockingReasons` 省略掉还声称已经阻塞可解释

## 7. 手工 checklist

1. 当前 view-model 是否只由已冻结 state-model 单向投影
2. `state` 是否只落在 `idle / ready / blocked / approved / rejected`
3. `blockingReasons` 是否只展示来自 state-model 的阻塞原因
4. `decision` 是否只表示审阅意图，不表示发布结果
5. 是否存在把 `approved` 说成 `publish complete` 的措辞
6. 是否存在把 `ready` 说成已发布或已运行的措辞
7. 是否存在自创展示层 truth，反向污染 state-model
8. 是否把 planning / placeholder 伪装成实现态

## 8. 当前结论

Review 的 view-model contract 在本阶段只负责把已冻结的 state-model 语义安全投影到展示层：它承认 `idle / ready / blocked / approved / rejected` 的展示映射，保留 `blockingReasons` 与 `decision` 的可读语义，但不触碰 publish / replay / runtime / persistence 实现。