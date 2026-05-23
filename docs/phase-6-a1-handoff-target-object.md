# Phase 6 A1: handoff-ready target object selection

> **定位**：Phase 6 子计划第一个真正的 execution handoff。从这里开始不再继续铺 docs，而是把第一刀交给执行面。
>
> **边界**：本文不是 runtime replay 已实现完成，不做任何代码实现，不扩 multi-case / scoring / sandbox / UI / publish。

## 1. 目标

选出一个最小、最稳、最容易复核的 single fixture / single case，作为 Phase 6 runtime replay 的首个真实承接对象。

## 2. 输入

- 仓库已存在 provider-less draft transcript evidence / single-case runtime draft skeleton
- 已有 selection contract：`src/skillforge/runtime-provider-adapter-contract.mjs`
- 已有 target selection 决策页：`docs/phase-3-single-fixture-single-case-target-selection.md`

## 3. 输出

一份明确的 target object decision：

- **fixture path**：哪个 fixture
- **case identity**：fixture 内哪条 case
- **为什么选它**：满足硬条件 + 优先级标准的判断依据
- **它在现有链路里的位置**：selection → execution → metadata → transcript/evidence → report

## 4. 为什么 A1 必须先于后续任务

| 后续任务 | 依赖 A1 的什么 |
|---------|--------------|
| A2 数据流 | 必须先知道"谁在流"，才能定义"怎么流" |
| A3 metadata | identity / lineage 的源头是 A1 选的对象 |
| A4 transcript/evidence | capture slot 必须指向具体 case |
| A5 report | report 的 fixture/case 引用来自 A1 |
| A6 boundary audit | 反查的起点就是 A1 对象是否越界 |

A1 不稳，下游全漂。

## 5. 现有 docs 关系

| 文档 | 关系 |
|------|------|
| `docs/phase-3-single-fixture-single-case-target-selection.md` | A1 的前置决策依据，已给出选择标准与推荐方向 |
| `docs/phase-3-implementation-subplan-single-fixture-single-case-runtime-replay-entry.md` | 整体入口，A1 是它的第一个执行切入口 |
| `docs/phase-3-minimal-replay-data-flow.md` | T2 数据流骨架，A1 是它的起点 |
| `docs/phase-3-execution-metadata-backfill-path.md` | T3 metadata 骨架，A1 给 identity 喂数据 |
| `docs/phase-6-runtime-replay-real-implementation-entry-hub.md` | Phase 6 总入口 |
| `docs/phase-6-runtime-replay-real-implementation-subplan-task-index.md` | subplan 任务索引，A1 排第一 |

## 6. 执行时最容易跑偏成什么

| 跑偏方向 | 禁止原因 |
|---------|---------|
| 同时选多个 case | A1 是**单 case 锚点**，多选直接失锚 |
| 选 provider-backed case | 当前 provider 链路仍是 reserved/unimplemented |
| 选依赖 UI / publish 的 case | A1 是 runtime-only 承接 |
| 选 scoring 相关 case | scoring 仍是 reserved stub |
| 把选对象写成"已执行" | A1 是 handoff，不是实现完成 |

## 7. handoff 准则

A1 的产出是"一个能被下游直接引用的 target object decision"：

1. fixture path + case identity 是明确的字符串
2. 选择理由是可复核的硬条件判断
3. 不预支后续任务的输出
4. 不做进一步 docs 展开

**A1 完成后的正确动作**：立即进入 A2，不做任何 docs 扩写。

## 8. 禁止误宣称清单

- 本文不是 runtime replay 已完成
- 本文不是 Phase 6 milestone 已实现
- 本文不声明任何"能力已通过"
- 本文不把 selection 决策写成 execution evidence
