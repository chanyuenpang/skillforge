# Phase 6 A5: handoff-ready replay report minimal acceptance

> **定位**：Phase 6 子计划 A5 的 execution handoff。A1-A4 已固定对象、数据流、metadata、记账，A5 收住 report 侧"能说什么、不能说什么"。
>
> **边界**：本文不是 runtime replay 已完成，不做任何代码实现，不扩 multi-case / scoring / sandbox / UI / publish。

## 1. 目标

定义 single fixture / single case 下 replay report 允许表达的最小事实集，以及禁止伪装成完成态的表述边界。

## 2. 输入

- A1 的 target object
- A2 的数据流末端节点
- A3 的 metadata 字段集
- A4 的 transcript/evidence slot

## 3. 输出

### 3.1 report 最小允许表达

| 字段 | 来源 | 说明 |
|------|------|------|
| `fixture` | A1 target | 可引用 |
| `status` | A2 truth mapping | 如实反映 observed status |
| `summary` | A2 truth mapping + A3 metadata | 聚合事实 |
| `cases` | A1 target + A2 truth mapping | 单 case |
| `checks` | A2 truth mapping | 如实反映 |
| `metadata` | A3 | 全量透传 |
| `pendingCapabilities` | A3+A4 | 诚实录 reserved/unimplemented |

### 3.2 report 禁止表达

| 禁止 | 原因 |
|------|------|
| `passed = true` | 未开放 passed 路径 |
| `accepted = true` | acceptance 仍是 reserved |
| `transcriptAvailable = true` | 无真实 transcript |
| `rawResponseAvailable = true` | 无真实 provider payload |
| `scored = true` | scoring 仍是 reserved stub |
| `sandbox.enforced = true` | sandbox 仍是 declaration-only |

### 3.3 单向消费边界

report 只能消费以下来源，不能反向生成：

- observed truth（A2）
- execution metadata（A3）
- transcript/evidence reference（A4）

**禁止**：report 内部生成任何上述来源不存在的值。

## 4. 禁止项

- 把 reference 写成事实
- 把 reserved 写成 available
- 把 blocked / not-executed 写成 passed
- 用 default 值覆盖上游 truth
- mixed-source 组装 report 字段

## 5. handoff 准则

1. report 字段集不可增加
2. 禁止项清单不可减
3. report 只能单向消费，不能反向写入
4. 不做进一步 docs 扩写

**A5 完成后**：立即进入 A6（boundary audit）。

## 6. 禁止误宣称清单

- 本文不是 report 系统已实现
- 本文不是 runtime replay 已完成
- 本文不声明任何"能力已通过"
