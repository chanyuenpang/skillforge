# Phase 5 Validate view-model contract v0

## 1. 目标与边界

本阶段冻结的是 **Validate 的 view-model contract**。它负责把 **state-model** 投影到展示层可读的 view-model，但不包含真实 UI、runtime、persistence 或 publish 实现。

### 目标
- 冻结 Validate surface 的最小展示层合同
- 明确 `state -> view` 的投影规则
- 让 Validate 从 state-model 走到展示层形成闭环
- 保持对 static validator evidence 的诚实表达
- 防止把 static pass 误宣称为 runtime complete

### 明确边界
- 这是 **view-model contract**，不是 UI 实现
- 只消费 Validate 的 state-model 结果，不反向定义 state 语义
- 不做 runtime / persistence / publish / replay 实现
- 不扩展 Validate 主链路业务逻辑
- 不引入新的校验引擎或新的证据来源

## 2. state -> view 映射表

Validate 的 view-model 只接受 state-model 的三态：`pass / fail / pending`。

| state-model | view-model.status | view-model.visualTone | 推荐文案 | 展示语义 |
|---|---|---|---|---|
| `pass` | `pass` | success | `Validated` / `静态校验通过` | 仅表示 static validator evidence 通过，不表示 runtime complete |
| `fail` | `fail` | danger | `Validation failed` / `静态校验失败` | 表示存在可追溯的阻塞失败证据 |
| `pending` | `pending` | neutral | `Validation pending` / `校验待定` | 表示 evidence 不足、未完成或尚不能诚实收敛为 pass/fail |

### 补充字段映射

| state-model 字段 / 证据 | view-model 字段 | 规则 |
|---|---|---|
| `state.status` | `status` | 原样映射为 `pass / fail / pending` |
| `state.summary` | `summary` | 只展示摘要，不新增判定 |
| `state.checks` | `checks` | 只展示已存在的检查项与结果 |
| `state.errors` | `errors` | 作为错误/警告/失败的展示依据 |
| `state.blockingFailures` | `blockingFailures` | 直接映射到 fail 证据区 |
| `state.updatedAt` | `updatedAt` | 仅用于显示最近更新时间 |

### 视图层补充规则
- `pass` 的视图必须避免“已完成全部流程”的暗示
- `pending` 的视图必须显式保守，不得染成绿色成功态
- `fail` 的视图必须能指向具体证据，而不是抽象失败感

## 3. 错误 / 警告 / pending 的呈现语义

### error
- 代表存在影响判定或阻断展示理解的错误证据
- 若错误可追溯且足以否定通过，应展示为 `fail`
- 若错误仅是非阻塞信息，可展示为独立错误提示，但不得覆盖主状态

### warning
- 代表存在风险、缺失信息或需人工留意的非阻塞问题
- warning 不得自动升级为 `pass`
- warning 也不得替代 fail 的阻塞证据
- 若 warning 已足以影响诚实判定，应回到 `pending` 或 `fail` 的主状态逻辑

### pending
- 代表当前证据不足、未完成、或尚未收敛
- pending 是保守态，不是半通过
- pending 不能通过 UI 装饰伪装成 pass
- 当 state-model 无法诚实收敛时，view 必须继续显示 pending

### 显示优先级
1. `fail` 证据优先
2. `pending` 次之
3. `pass` 仅在证据充分时展示
4. warning 只能作为辅助信息，不可压过主状态

## 4. 最小交互事件

Validate view-model 只定义最小交互事件，不定义真实实现。

| 事件 | 含义 | 约束 |
|---|---|---|
| `onOpenDetails` | 打开 Validate 详情面板 | 只读取已有 view-model，不触发新校验 |
| `onInspectEvidence` | 查看检查项 / 错误证据 | 仅展示已存在 evidence |
| `onRefreshSummary` | 刷新视图摘要 | 不等于重新执行 validator |
| `onFilterChecks` | 过滤检查项 | 仅是展示过滤，不改变 state |
| `onDismissWarning` | 关闭警告提示 | 只影响本地视图，不修改 state-model |

### 事件边界
- 事件不得隐含 runtime 重新执行
- 事件不得引入 persistence 写入
- 事件不得把 view-model 变成控制面板实现
- 事件不得改变 Validate 的 state-model 真相层

## 5. 与 Input / Generate / Review 的边界

### 与 Input 的边界
- Input 负责接收用户输入与基础材料
- Validate 不定义 Input 的字段结构，也不反推 Input 的采集逻辑
- Validate 只消费已经形成的证据，不负责输入采集

### 与 Generate 的边界
- Generate 负责规划或生成产物的展示/状态
- Validate 只校验来自上游的静态证据
- Validate 不承担生成器实现，也不接管 Generate 的 view-model

### 与 Review 的边界
- Review 负责人工审核与意见表达
- Validate 只提供静态校验结果，不提供审核决策
- Review 的人工结论不能直接改写 Validate 的 state 语义
- Validate 的 `pass` 不等于 Review 的 `approved`

## 6. 误宣称红线

以下说法都不能出现：
- 把 static pass 说成 runtime complete
- 把 view-model 说成真实 UI 已实现
- 把 pending 说成 pass
- 把 warning 说成 pass
- 把 error / blocking failure 忽略后仍宣称通过
- 把 Validate 的展示层合同说成 validate 主链路实现
- 把 Validate 的 view-model 误写成 publish / replay / persistence 实现

## 7. 手工 checklist

- [ ] `state -> view` 映射表完整，且仅使用 `pass / fail / pending`
- [ ] `pass` 没有被写成 runtime complete
- [ ] `pending` 没有被染成成功态
- [ ] `fail` 有可追溯证据展示
- [ ] warning 没有覆盖主状态
- [ ] 交互事件不触发真实校验或持久化
- [ ] 与 Input / Generate / Review 的边界清晰
- [ ] 没有引入真实 UI / runtime / persistence / publish 实现

## 8. 当前结论

Validate 在本阶段补齐的是 **view-model contract**：它将 state-model 的 `pass / fail / pending` 诚实投影到展示层，并通过最小交互事件形成展示闭环。这里仍然不表示真实 UI 已实现，也不表示 static pass 已升级为 runtime complete。