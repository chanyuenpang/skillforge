# Phase 6 A6: handoff-ready boundary audit

> **定位**：Phase 6 子计划 A6 的 execution handoff，也是第一轮 A1-A6 的最后一块。审计 A1-A5 是否仍严格保持 single fixture / single case，封口后交付执行面。
>
> **边界**：本文不是 runtime replay 已完成，不做任何代码实现，不扩 multi-case / scoring / sandbox / UI / publish。

## 1. 目标

在 A1-A5 全部 handoff-ready 后，逐项反查是否越界，并给出通过/不通过的判断。

## 2. 审计清单

| # | 审计项 | 基准 | 通过条件 |
|---|--------|------|---------|
| 1 | 是否仍为 single fixture？ | A1 target | fixture path 只指向一个 fixture |
| 2 | 是否仍为 single case？ | A1 target | case identity 只有一条 |
| 3 | 数据流是否多出节点？ | A2 flow | 节点数未增加 |
| 4 | metadata 是否引入新字段？ | A3 metadata | 字段集未扩展 |
| 5 | transcript 是否误标 available？ | A4 slot | available 仍由 truth 驱动，不硬编码 true |
| 6 | report 是否出现 passed / accepted / scored？ | A5 report | 这三个字段均未置 true |
| 7 | 是否误引 multi-case？ | 全链路 | 无任何 "cases[]" 多元素语义 |
| 8 | 是否偷渡 scoring？ | 全链路 | 无 scored / rubric / score 字段 |
| 9 | 是否偷渡 sandbox enforcement？ | 全链路 | 无 sandbox.enforced / sandbox.isolated |
| 10 | 是否偷渡 UI / publish / registry？ | 全链路 | 无 UI / publish / registry 相关引用 |

## 3. 通过 / 不通过准则

- **全部 10 项通过** → 审计通过，A1-A6 可交付执行面
- **任一项不通过** → 退回对应任务修正，修正后重新审计

## 4. 审计通过后应该做什么

- A1-A6 作为一个完整 handoff-ready 包交付
- 主计划 Phase 6 仍标记为 in_progress，不标 done
- 进入真实实现时，按 A1→A2→A3→A4→A5→A6 顺序推进
- A6 每完成一轮真实实现后重新执行一次审计

## 5. 审计通过后不应该做什么

- 把审计通过写成 runtime replay 已完成
- 把 A1-A6 handoff-ready 写成 Phase 6 milestone 已完成
- 在审计通过后继续扩写 docs

## 6. 禁止误宣称清单

- 本文不是 runtime replay 已完成
- 本文不是 Phase 6 里程碑已实现
- 本文不声明任何"能力已通过"
