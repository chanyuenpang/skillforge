# Phase 6 A2: handoff-ready minimal replay data flow

> **定位**：Phase 6 子计划 A2 的 execution handoff。A1 已固定"谁跑"，A2 固定"怎么流"。
>
> **边界**：本文不是 runtime replay 已完成，不做任何代码实现，不扩 multi-case / scoring / sandbox / UI / publish。

## 1. 目标

在 A1 选定的 single fixture / single case 下，固定 selection → execution → metadata → transcript/evidence → report 的最小数据流节点、字段集与同源规则。

## 2. 输入

- A1 的 target object decision（fixture path + case identity）
- Provider adapter seam：`src/skillforge/runtime-provider-adapter-contract.mjs`
- Observed mapper seam：`src/skillforge/runtime-observed-mapper.mjs`
- Runner contract：`src/skillforge/runtime-runner-contract.mjs`

## 3. 输出

一份可直接用于 execution 的最小数据流定义：

### 3.1 节点顺序

```
selected fixture/case
  → replay input normalization
  → runner / execution seam
  → observed truth mapping
  → execution metadata backfill
  → transcript/evidence capture slot
  → replay report assembly
```

### 3.2 每个节点必须输出哪些字段

| 节点 | 最小必出字段 |
|------|------------|
| replay input normalization | fixture path, case identity, selection lineage, profile/mode |
| runner / execution seam | execution identity, observed execution status, statusSet enumeration |
| observed truth mapping | observed payload, same-source identity guard |
| execution metadata backfill | fixture identity, case identity, selection lineage, execution identity, observed status, evidence linkage |
| transcript/evidence capture slot | transcript available flag, transcript handle, evidence reference |
| replay report assembly | fixture, status, summary, cases, checks, metadata, pendingCapabilities |

## 4. 同源传播规则

以下字段必须在整条链路上保持 **same-source**，不得混源：

| 字段 | 源头 | 禁止行为 |
|------|------|---------|
| fixture/case identity | input normalization | 下游不得自行生成 |
| selection lineage | input normalization | 下游不得推断或补造 |
| execution identity | runner seam | metadata/report 不得 fallback 伪造 |
| observed status | observed truth mapping | report 不得用 default 值覆盖 |
| evidence linkage | metadata backfill → capture slot | 各层不得跨层反向填充 |

## 5. 禁止项

- 任何节点使用 **mixed-source** 拼接字段
- 任何节点使用 **fallback 默认值** 伪装真实数据
- 任何节点进行 **跨层逆向填充**（如 report 把 reserved 改写成 available）
- 把 **reserved / stub / blocked** 写成 **completed / available / passed**

## 6. 与后续任务衔接

| 后续任务 | A2 提供什么 |
|---------|-----------|
| A3 metadata | 节点顺序 + 同源规则，metadata 回填定位不再漂 |
| A4 transcript/evidence | capture slot 的位置与入口字段已锁 |
| A5 report | report 的输入来源与禁止项已锁 |
| A6 boundary audit | 数据流各节点是否越界的审计基准 |

## 7. handoff 准则

A2 产出是"一份可被 A3-A6 直接引用的最小数据流定义"：

1. 节点顺序不可变
2. 每节点最小必出字段不可减
3. 同源规则必须强制执行
4. 不做进一步 docs 扩写

**A2 完成后的正确动作**：立即进入 A3，不做任何 docs 扩写。

## 8. 禁止误宣称清单

- 本文不是 runtime replay 已完成
- 本文不是数据流已实现
- 本文不声明任何"能力已通过"
- 本文不把 flow 定义写成 execution evidence
