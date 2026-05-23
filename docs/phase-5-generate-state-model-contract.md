# Phase 5 Generate surface state-model-only contract v0

## 1. 目标与边界

- **status**: frozen
- **scope**: Generate surface 的 state-model-only contract
- **non-goals**: 不做真实 UI、generator、runtime、registry 或 publish 实现；不把 planning / skeleton / placeholder 说成实现态
- **depends-on**: `docs/phase-5-input-state-contract.md`（上游输入真相层，仅作引用，不反向定义）

本文件只冻结 **Generate surface 的 state-model-only contract**，目的是把“状态语义真相层”单独拎出来，避免把规划态、占位态、延后态误写成真实 UI、真实 generator 或真实 runtime。

### 目标
- 定义 Generate 的最小状态语义集合
- 明确状态转换允许与禁止的边界
- 冻结 invariant，防止把 pending / deferred 误宣称为 pass / ready
- 为 view-model 提供单向映射依据，但不反向定义实现

### 明确不做
- 不做真实 UI 实现
- 不做真实生成器实现
- 不做 runtime / registry / publish 实现
- 不把 state-model 写成可运行前端 schema
- 不把 planning / skeleton / placeholder 说成功能完成

## 2. 状态集合

Generate surface 的最小诚实状态集合为：`idle / loading / ready / error / deferred / pending`。

### idle
- 尚未进入可展示的 Generate 规划阶段
- 只表示“还没开始形成状态语义轮廓”
- 不能被解释为已完成、已验证或可执行

### loading
- 正在汇聚输入、来源、依赖或契约材料
- 只表示材料对齐中
- 不能被解释为生成已开始、更不能被解释为生成已完成

### ready
- 已形成可展示的状态轮廓，并且语义上已可读
- 只表示 state-model 结果可读，不代表真实 UI、真实 generator 或 runtime 完成
- 仍允许存在风险提示，但不得包含未消化的状态冲突

### error
- 存在状态语义冲突、依赖缺失、映射失败或契约校验失败
- 必须附带明确原因
- 不能降级包装成 warning、pending 或 deferred

### deferred
- 当前有意不进入下一步，或有意不声明可执行
- 表示边界收口
- 不能被理解为“稍后自动可用”或“只是还没点亮”

### pending
- 当前仍缺乏足够证据来宣称 ready
- 适用于规划中、验证中、材料不足、尚未收口的场景
- 不能被展示为 pass 或 ready

## 3. 状态转换约束

### 允许的转换
- `idle -> loading`
- `loading -> ready`
- `loading -> error`
- `loading -> deferred`
- `loading -> pending`
- `pending -> loading`（补齐证据后继续汇聚）
- `pending -> ready`（证据补齐且冲突消除）
- `pending -> error`（补齐后发现冲突）
- `pending -> deferred`（确认当前不继续）
- `error -> loading`（修复后重试）
- `deferred -> loading`（明确重新开启）
- `ready -> loading`（输入或依赖变化后重新计算）

### 不允许的转换
- `deferred -> pass`：`pass` 不是 state-model 状态
- `pending -> pass`：`pending` 不能直接被宣称为通过
- `idle -> ready`：跳过必要材料对齐
- `ready -> pass`：语义偷换
- `error -> ready`：未重算或未修复直接通过
- `deferred -> ready`：未重新开启就直接可用
- `loading -> pass`：加载态不能直接变成通过态

## 4. invariants

1. `pending` 不能显示为 `pass`
2. `deferred` 不能暗示已可执行
3. `ready` 只能表示状态语义已可读，不能表示 runtime complete
4. `error` 必须可以追溯到明确失败来源
5. `loading` 只能表示材料汇聚或对齐中，不能表示功能完成
6. `idle` 不能被解释为“已经开始但没展示”
7. 状态变化必须能被解释为一次清晰的语义迁移，不能同时暗含多个互相冲突的结论
8. 任何状态都不能偷偷承诺未来实现已经存在

## 5. 与 view-model 的单向映射规则

本文件只定义 **state-model -> view-model** 的单向语义映射，不允许 view-model 反向改写 state-model 真相。

### 单向映射原则
- state-model 是语义真相层，view-model 只是展示投影
- view-model 可以压缩、聚合、重命名，但不能提升语义等级
- view-model 不能把 `pending` 映射成 `pass`
- view-model 不能把 `deferred` 映射成 `ready`
- view-model 不能把 `error` 包装成成功态
- view-model 不能补写 state-model 没有声明的能力

### 推荐映射
| state-model | view-model | 语义 |
|---|---|---|
| `idle` | `idle` / `not-started` | 尚未开始 |
| `loading` | `loading` | 材料对齐中 |
| `ready` | `ready` | 结果可读 |
| `error` | `error` | 失败需处理 |
| `deferred` | `deferred` | 有意延后 |
| `pending` | `pending` | 证据不足 |

### 映射约束
- 每个 view-model 状态都必须能追溯回一个 state-model 语义
- 允许 view-model 更细，但不允许更乐观
- 允许 view-model 更保守，但不允许偷换结论

## 6. 误宣称红线

以下内容一律禁止写入 Generate 的 state-model 结论中：

- 不把 `pending` 说成 `pass`
- 不把 `deferred` 说成“已可执行”
- 不把 `ready` 说成 `runtime complete`
- 不把 `loading` 说成“已经生成成功”
- 不把 `idle` 说成“已开始但没显示”
- 不把 planning / skeleton / placeholder 说成真实实现
- 不把 state-model 里的“可读”偷换成“可运行”
- 不把未验证的状态语义包装成已验证

## 7. 手工核对 checklist

1. 当前状态是否只落在 `idle / loading / ready / error / deferred / pending` 内
2. 是否存在把 `pending` 说成 `pass` 的措辞
3. 是否存在把 `deferred` 说成已可执行的措辞
4. 是否存在把 `ready` 说成 runtime complete 的措辞
5. `error` 是否有明确失败来源
6. `loading` 是否只表示材料对齐中
7. `idle` 是否被误写成已开始
8. 任何 view-model 语义是否都能单向追溯回 state-model
9. 是否有任何文字暗示未来实现已经存在
10. 是否把 planning 态写成了实现态

## 8. 当前结论

Generate 的 state-model-only contract 已经把状态真相层封口：后续任何 view-model 或 UI 文档都只能做单向投影，不能反向抬高状态等级。若出现 `pending`、`deferred` 或 `error`，必须先补证据或收口语义，再允许进入 `ready`。
