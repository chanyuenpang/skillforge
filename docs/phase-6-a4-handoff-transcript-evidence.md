# Phase 6 A4: handoff-ready transcript / evidence minimal accounting slot

> **定位**：Phase 6 子计划 A4 的 execution handoff。A3 定好了 metadata 回填，A4 把"证据怎么记"的 slot 收死。
>
> **边界**：本文不是 runtime replay 已完成，不做任何代码实现，不扩 multi-case / scoring / sandbox / UI / publish。

## 1. 目标

在 A1-A3 已固定的前提下，定义 single fixture / single case 下 transcript / evidence 的最小记账 slot：记什么、不记什么、slot 与 truth payload 的边界在哪。

## 2. 输入

- A2 定义的数据流中 transcript/evidence capture slot 的节点位置
- A3 定义的 evidence linkage 字段
- 现有记账骨架：`docs/phase-3-transcript-evidence-minimal-accounting-slot.md`

## 3. 输出

### 3.1 最小应记录的内容

| 内容 | 类型 | 说明 |
|------|------|------|
| selection 引用 | reference | 指向 A1 选定的 fixture/case |
| execution 对齐引用 | reference | 指向 A3 execution identity |
| transcript available flag | boolean | A3 metadata 的 truth 值，不得设为 true 除非真有 transcript |
| transcript handle | handle|null | reserved seam，真实 transcript 接入前为 null |
| evidence reference | handle|null | 指向 evidence capture，暂无则为 null |
| report 对齐引用 | reference | 供 A5 report 消费 |
| 最小可复核 note | string | 人可读的一句话状态说明 |

### 3.2 三层边界

| 层 | 角色 | 规则 |
|----|------|------|
| execution metadata（A3） | 事实来源 | 为 transcript/evidence 提供身份与 lineage |
| observed truth | 事实本身 | 不是记账层能改的 |
| transcript/evidence slot（A4） | capture / reference | 只能引用上游 truth |
| replay report（A5） | 汇总展示 | 只能消费，不能反写 truth |

## 4. 禁止项

- 把 reference / handle 伪装成 truth payload 已完成
- 把 `available = false` 写成 `available = true`
- 把 reserved/null handle 写成有效 handle
- mixed-source 拼接
- 默认值伪装已记账
- 跨层逆向填充

## 5. handoff 准则

1. slot 字段集不可减
2. reference / handle / truth 三层不可混
3. `available` 由 A3 metadata 真值单向驱动
4. 不做进一步 docs 扩写

**A4 完成后**：立即进入 A5。

## 6. 禁止误宣称清单

- 本文不是 transcript persistence 已实现
- 本文不是 evidence body 设计完成
- 本文不声明任何"能力已通过"
