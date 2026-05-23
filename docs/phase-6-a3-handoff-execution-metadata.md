# Phase 6 A3: handoff-ready execution metadata backfill

> **定位**：Phase 6 子计划 A3 的 execution handoff。A1 定了对象，A2 定了数据流，A3 把"跑完之后哪些字段必须回填"收死。
>
> **边界**：本文不是 runtime replay 已完成，不做任何代码实现，不扩 multi-case / scoring / sandbox / UI / publish。

## 1. 目标

在 A1 选定的对象和 A2 定义的数据流下，固定 execution metadata 最小应包含哪些字段、各字段从哪个上游 truth 节点来、以及哪些行为必须禁止。

## 2. 输入

- A1 的 target object decision
- A2 的最小 replay 数据流定义
- 现有 metadata 骨架：`docs/phase-3-execution-metadata-backfill-path.md`

## 3. 输出

### 3.1 最小 metadata 字段集

| 字段 | 来源节点 | 类型 | 不可空 |
|------|---------|------|--------|
| `fixture.path` | input normalization | string | ✓ |
| `fixture.profile` | input normalization | string | ✓ |
| `case.id` | input normalization | string | ✓ |
| `selection.lineage` | input normalization | object | ✓ |
| `execution.id` | runner seam | string | ✓ |
| `execution.status` | observed truth mapping | enum | ✓ |
| `execution.statusSet` | runner seam | string[] | ✓ |
| `execution.mode` | runner seam | enum | ✓ |
| `provider.backed` | adapter seam | boolean | ✓ |
| `evidence.linkage` | metadata backfill → capture slot | string|null | — |

### 3.2 各字段的来源与同源约束

| 字段 | 唯一来源 | 禁止 |
|------|---------|------|
| fixture / case identity | A1 target decision → input normalization | 下游不得自行生成 |
| selection lineage | input normalization | 下游不得推断 |
| execution identity | runner seam adapter→mapper | metadata/report 不得 fallback 伪造 |
| execution status | observed truth mapping | report 不得用默认值覆盖 |
| provider.backed | adapter seam 真值 | 下游不得反推或重判 |

## 4. 禁止项

- 把 reserved / stub 写成 completed
- 用默认值伪装真实 identity
- 跨层逆向填充（report → metadata，或 capture → execution）
- mixed-source 拼接（从两个源头凑一个字段）
- 把 provider-backed=false 的路径填上 provider metadata

## 5. 与后续任务衔接

| 后续任务 | A3 提供什么 |
|---------|-----------|
| A4 transcript/evidence | metadata.evidence.linkage 是 capture slot 的入口 |
| A5 report | metadata 全部字段是 report 的事实输入源 |
| A6 boundary audit | 每个字段是否保持同源、是否越界 |

## 6. handoff 准则

A3 的产出是"一份可直接作为 metadata 回填实现规格的字段集"：

1. 字段不可减
2. 来源不可改写
3. 同源约束不可绕过
4. 不做进一步 docs 扩写

**A3 完成后**：立即进入 A4，不逗留。

## 7. 禁止误宣称清单

- 本文不是 metadata 已实现
- 本文不是 execution evidence
- 本文不声明任何"能力已通过"
