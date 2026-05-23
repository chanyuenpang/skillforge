# Phase 5 Replay surface state-contract v0

## 1. 目标与边界

- **status**: frozen
- **scope**: Replay surface 的 state-contract
- **non-goals**: 不做真实 UI、runtime、persistence 或 publish 实现；不把 planning / placeholder / deferred 误写成实现态
- **depends-on**: `docs/phase-5-input-view-model-contract.md`、`docs/phase-5-generate-state-model-contract.md`、`docs/phase-5-validate-state-model-contract.md`、`docs/phase-5-review-state-model-contract.md`

本文件只冻结 **Replay surface 的 state-contract**，目标是把“回放意图、回放阶段、来源快照引用、守卫条件”说清楚，避免把 planning / placeholder / deferred 误写成真实 UI、runtime、persistence 或 publish 实现。

### 目标
- 定义 Replay 的最小 state 语义集合
- 明确 replay intent、source snapshot ref、guard conditions 的边界
- 冻结最小 action/event vocabulary 的 state 口径
- 为 view-model 提供单向映射依据，但不反向定义实现

### 明确不做
- 不做真实 UI 实现
- 不做真实 replay runtime 实现
- 不做 persistence / snapshot store / publish 实现
- 不把 contract-first 文档写成可运行产品
- 不把 pending / deferred 说成 ready / pass

## 2. Replay state model

Replay surface 的最小诚实状态集合为：`idle / loading / ready / error / deferred / pending`。

### phase / status
- `idle`: 尚未进入回放规划阶段
- `loading`: 正在汇聚回放所需材料、来源引用或守卫信息
- `ready`: 已形成可展示的回放状态轮廓，语义上可读
- `error`: 存在来源缺失、快照引用失效、守卫冲突或映射失败
- `deferred`: 当前有意不进入下一步，或有意不声明可执行
- `pending`: 仍缺乏足够证据，不能诚实宣称 ready

### source snapshot ref
Replay state 必须显式引用回放所依赖的来源快照，但这里只是**引用语义**，不是快照存储或恢复实现。

建议字段语义：
- `sourceSnapshotRef`: 指向被回放的来源快照或版本锚点
- `sourceSnapshotKind`: 说明引用的是输入、生成、校验、审核还是聚合快照
- `sourceSnapshotStatus`: 说明该引用是否可解析、是否失效、是否仅占位

### replay intent
Replay intent 只表示“准备回放什么、为什么回放、希望产生什么查看结果”，不表示真实执行已发生。

建议字段语义：
- `replayIntent`: 回放意图摘要
- `replayTargetRef`: 被回放的目标引用
- `replayMode`: `preview` / `inspect` / `compare` / `resume` / `audit`
- `requestedBy`: 请求来源
- `requestedAt`: 请求时间

### guard conditions
Replay 进入 `ready` 前必须满足最小守卫条件；任一守卫不满足时，只能落 `pending` / `deferred` / `error`，不能偷换成 ready。

最小守卫条件：
1. `sourceSnapshotRef` 可解析
2. 回放目标与来源类型一致或已明确转换规则
3. 回放意图没有与当前 phase 冲突
4. 没有未消化的 blocking error
5. 至少有一条可核对的 replay 说明或差异提示
6. 若为 compare / resume 类模式，必须存在对应的对照基准或续接锚点

### 允许的状态语义迁移
- `idle -> loading`
- `loading -> ready`
- `loading -> error`
- `loading -> deferred`
- `loading -> pending`
- `pending -> loading`
- `pending -> ready`
- `pending -> error`
- `pending -> deferred`
- `error -> loading`
- `deferred -> loading`
- `ready -> loading`

### 不允许的状态偷换
- `idle -> ready`：跳过材料对齐
- `loading -> pass`：`pass` 不是 state-contract 状态
- `pending -> pass`：证据不足不能直接宣称通过
- `deferred -> ready`：未重新开启就直接可用
- `error -> ready`：未修复或未重算直接通过
- 任何状态都不能暗示真实 replay 已执行完毕

## 3. 与 action/event 的最小约束

Replay state 只为最小 action/event vocabulary 提供语义落点，不定义真实事件总线或 runtime 分发。

### action 语义
- `request_replay`: 发起回放请求，进入材料汇聚或规划检查
- `confirm_replay_plan`: 确认当前回放计划可读、可核对
- `abort_replay_plan`: 终止当前回放计划，收口到 deferred 或 idle
- `retry_replay_plan`: 在修复后重新汇聚材料

### event 语义
- `replay_requested`: 已记录回放请求意图
- `replay_plan_confirmed`: 回放计划已被文档层确认可读
- `replay_plan_aborted`: 回放计划已被收口或终止
- `replay_plan_rejected`: 因守卫失败或冲突而拒绝
- `replay_plan_updated`: 来源快照、差异提示或守卫条件发生变化

### 最小化原则
- 只保留支撑 contract 说明所必需的动作/事件
- 不扩展成完整工作流编排词表
- 不把 action/event 说成已经接通 runtime

## 4. state-model 的手工核对清单

1. `status` 只允许在 `idle / loading / ready / error / deferred / pending` 中取值
2. `sourceSnapshotRef` 必须可追溯到明确来源
3. `replayIntent` 只能描述意图，不能描述已执行结果
4. 至少有一项 guard condition 可人工核对
5. `pending` 不能被文案描述为 `pass`
6. `deferred` 必须附带原因或边界说明
7. `error` 必须能定位到具体失败来源
8. `ready` 只能表示文档级结果可读，不等于 runtime complete
9. 任何 action/event 只能被描述为意图或记录，不可描述为真实系统链路已打通

## 5. 与 Input / Generate / Validate / Review 的契约关系

- **Input**：Replay 可引用 Input 的已冻结输入证据，但不能反向修改 Input 的 state 语义
- **Generate**：Replay 可引用 Generate 的规划结果或来源快照，但不能把 Generate 的 ready 直接当成 Replay 的 ready
- **Validate**：Replay 可消费 Validate 的通过 / 失败 / pending 证据，但不能把 Validate 的状态结论偷换成 replay 已执行
- **Review**：Replay 可引用 Review 的审核意见或变更锚点，但不能把 Review 的 approved / rejected 误写成 replay complete

### 交叉约束
- Replay 是“回放证据与查看语义”的 contract-first 层，不是执行层
- 上游 surface 的 ready，不自动等于 Replay 的 ready
- 任一上游的 deferred / pending / error，都可能使 Replay 只能停留在 pending / deferred / error

## 6. 误宣称红线

- 不把 planning 说成实现
- 不把 pending 说成 pass
- 不把 deferred 说成已可执行
- 不把 sourceSnapshotRef 说成真实恢复结果
- 不把 replayIntent 说成已完成回放
- 不把 compare / resume / audit 说成 runtime 已接通
- 不把 contract-check 说成真实 UI 已上线
- 不把文档中的 action/event 说成真实事件总线已经存在

## 7. 当前结论

Replay 的 state-contract 已把状态真相层封口：回放意图、来源快照引用、守卫条件和最小动作/事件词表都只停留在文档层。后续若进入实现，必须先补齐真实来源、真实快照语义与验证口径，再允许状态从 `pending` 或 `deferred` 进入 `ready`。
