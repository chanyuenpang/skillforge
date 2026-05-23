# Phase 5 Validate state-model contract v0

## 1. 目标与边界

- **status**: frozen
- **scope**: Validate 的 state-model-only contract
- **non-goals**: 不做 view-model，不碰 validate 主链路；不把 static pass 说成 runtime complete
- **depends-on**: `docs/validator-contract.md`、`docs/phase-5-validate-view-model-contract.md`

本阶段冻结的是 **Validate 的 state-model-only contract**，只定义状态如何从静态 validator evidence 映射出来，不做 view-model，不碰 validate 主链路。

> 对应的展示层投影合同见 `docs/phase-5-validate-view-model-contract.md`。这里仍然只负责 state 真相层，不定义 view 字段或交互。

### 目标
- 冻结 Validate surface 的最小状态模型
- 只承接 static validator evidence 的诚实结果
- 给后续 UI / planning 使用一个稳定的 state 语义入口
- 防止把静态校验结果误宣称为 runtime complete

### 明确边界
- 这是 **state-model-only contract**，不是 view-model contract
- 来源只允许是 **static validator evidence**
- 不代表 runtime complete
- 不引入 validate 主链路实现
- 不扩展任何运行时、回放、发布或修复语义

## 2. 状态集合

Validate 采用最小诚实集合：

| 状态 | 语义 |
|---|---|
| `pass` | 静态 validator evidence 显示通过，且没有阻塞失败证据 |
| `fail` | 静态 validator evidence 显示失败，且失败可追溯到阻塞证据 |
| `pending` | 当前只有未完成、未确认、或尚不足以判定为 pass/fail 的证据 |

### 设计原则
- 只保留最小集合，不额外扩展 `deferred` / `blocked` / `complete`
- `pending` 代表“尚未足够诚实地转成 pass”，不是半通过
- `pass` 只能表示 static pass，不能隐含 runtime complete

## 3. 来源映射

Validate state 只允许从 `validator report` 的以下字段映射：

| validator report 字段 | 作用 | 映射到 validate state 的方式 |
|---|---|---|
| `report.status` | 总体报告状态 | `passed -> pass`；`failed -> fail`；其他未完成/非确定状态 -> `pending` |
| `summary` | 汇总通过/失败情况 | `summary.passed === true` 时可支持 `pass`；存在阻塞失败时支持 `fail` |
| `checks` | 逐项静态检查证据 | 检查结果里有 blocking failure 时，支持 `fail`；无阻塞且整体通过时，支持 `pass` |
| `errors` | 非规则错误或 fallback 错误 | 只要存在会影响判定的 errors，就不得映射为 `pass`；通常落入 `fail` 或保守 `pending`，取决于上游是否给出明确失败证据 |

### 映射说明
- `report.status` 是最终外层信号，但不能单独覆盖证据缺失
- `summary` 负责表达整体是否可通过
- `checks` 负责提供可追溯的规则级证据
- `errors` 负责表达非规则层面的阻塞或异常

## 4. invariants

### 必须满足
- static pass 不得说成 runtime complete
- `pending` 不得映射为 `pass`
- `fail` 必须可追溯到 `blockingFailures`、`errors`、或 `check-level` 证据

### 解释
- `pass` 只代表静态验证通过
- `pending` 只代表证据不足或状态未收敛
- `fail` 不能是“感觉不对”，必须能回到具体 validator evidence

## 5. 允许 / 禁止状态迁移（文档级）

### 允许
- `pending -> pass`：当后续获得足够的 static validator evidence，且整体通过
- `pending -> fail`：当后续获得明确阻塞失败证据
- `pass -> fail`：当新的静态证据推翻了原先通过结论
- `fail -> pass`：当重新验证后阻塞证据被消除，且新的 evidence 通过

### 禁止
- `pass -> pending`
- `fail -> pending`
- `pending -> pass` 但没有任何静态证据变化
- 任意状态迁移直接声称 runtime complete

## 6. 误宣称红线

以下说法都不能出现：
- 把 static pass 说成 runtime complete
- 把 validator report 的 `pending` 说成 `pass`
- 把 `summary.passed=true` 说成 runtime 已验证
- 把 `errors` 或 `blockingFailures` 忽略掉后仍宣称通过
- 把 state-model contract 说成 view-model contract
- 把这里的状态直接当成 validate 主链路实现完成

## 7. 与 docs/validator-contract.md 的最小字段对照表

| validator-contract 最小字段 | 作用 | Validate state-model 取值/用法 |
|---|---|---|
| `report.status` | 报告总状态 | 作为最外层状态信号之一，映射为 `pass / fail / pending` |
| `summary.passed` | 整体是否通过 | `true` 可支持 `pass`，`false` 不可直接视为 `pass` |
| `summary.blockingFailures` | 阻塞失败数 | `> 0` 时应支持 `fail` |
| `summary.errors` | 错误数 | `> 0` 时不得映射为 `pass` |
| `checks[].status` | 单项检查结果 | `fail` / `error` 可作为 `fail` 证据来源 |
| `checks[].severity` | 检查严重级别 | `P0` / `P1` 的失败优先作为阻塞证据 |
| `errors[]` | 非规则错误 | 作为 `fail` 或保守 `pending` 的证据来源 |

## 8. 与 view-model contract 的边界

- state-model 只定义 `pass / fail / pending`
- state-model 不定义颜色、文案、按钮、交互事件
- state-model 不定义 warning 展示策略
- state-model 不定义详情面板、过滤、刷新等 view 语义
- view-model contract 只能消费这里的状态，不可反向改写这里的状态真相

## 9. 手工核对 checklist

- [ ] 只用 static validator evidence，不混入 runtime 语义
- [ ] 只保留 `pass / fail / pending` 三态
- [ ] `pending` 没有被偷换成 `pass`
- [ ] `fail` 能追溯到 `blockingFailures / errors / checks`
- [ ] 没有把 static pass 说成 runtime complete
- [ ] 没有引入 view-model 字段或 schema
- [ ] 没有碰 validate 主链路实现
- [ ] 与 `docs/validator-contract.md` 的字段对照清楚可核对

## 10. 当前结论

Validate 在本阶段冻结的是 **state-model-only** 语义：它只接受 static validator evidence，并将结果收敛为 `pass / fail / pending`。任何更强的 runtime、complete、或 view-model 说法，都不在这个 contract 范围内。