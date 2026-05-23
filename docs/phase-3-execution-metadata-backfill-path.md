# Phase 3 execution metadata backfill path: single fixture / single case

> 这是 Phase 3 task 11 的 **T3 execution metadata 回填路径** 说明页，不是实现交付说明。
>
> 它只负责把 single fixture / single case runtime replay 里的 execution metadata 最小真值边界钉死：最小应包含哪些字段、这些字段分别从哪个上游 truth 节点来、哪些 fallback / mixed-source 行为必须禁止，以及它与 transcript / evidence / report 的关系和边界。
>
> 明确边界：本文**不**宣称 runtime replay 已完成，不进代码，不扩 multi-case，不做 scoring / sandbox / UI / publish，不把 metadata path 写成系统能力完成。

## 1. 这一步要解决的唯一问题

当前主计划在 T3 阶段要解决的是：

**把 single fixture / single case 的 execution metadata 回填路径画成一条诚实、单源、可复核的链路。**

重点不是“字段越多越好”，而是先定义：

- 最小 execution metadata 必须有哪些 identity；
- 每个字段必须从哪一个上游 truth 节点来；
- 哪些地方只能保守留白，不能 fallback 拼接；
- 与 transcript / evidence / report 的边界如何切开。

---

## 2. single fixture / single case 下 execution metadata 最小应包含哪些字段

T3 只收敛到**最小 execution metadata bundle**，不扩成完整 runtime profile。

### 2.1 必须具备的最小 identity

最小 execution metadata 应至少包含：

1. **fixture identity**
   - fixture id
   - fixture profile（如果上游已有）

2. **case identity**
   - case id
   - case locator / position（如果上游已有）

3. **selection lineage**
   - selected-by / selected-from lineage
   - selection decision note 的最小引用

4. **execution identity**
   - execution id / run id
   - runner id / runner path（若存在）
   - execution state

5. **observed execution status**
   - executed / blocked / reserved / unavailable 之一的诚实状态
   - 与当前单 case 同源的最小 observed truth

6. **evidence linkage**
   - transcript ref（若有）
   - evidence ref（若有）
   - provenance / lineage summary 的最小引用

### 2.2 允许保守留白但不允许伪补全的字段

以下信息可以保守留白，但不能用默认值假装已完成：

- provider run id
- provider status 详细枚举
- raw payload handle
- transcript persistence handle
- evidence body
- scoring / pass 结论

只要上游 truth 没有真实接通，这些字段就必须保持 reserved / null / unavailable，而不是被 fallback 填满。

---

## 3. 这些 metadata 分别从哪个上游 truth 节点来

T3 的硬要求是：每个 metadata 字段都要能回指到一个明确 truth 节点，不能混源拼接。

### 3.1 fixture / case identity 的上游 truth

来源必须是：

```text
selected fixture/case
  -> replay input normalization
```

要求：

- fixture id 只能来自已选 fixture；
- case id 只能来自已选 case；
- locator / position 只能来自同一个 selection lineage；
- 不允许从 report 反推 identity。

### 3.2 selection lineage 的上游 truth

来源必须是：

```text
selected fixture/case
  -> replay input normalization
```

要求：

- selection note 只能引用实际 selection 决策；
- selection reason 只能写最小 decision note；
- 不允许用后续 execution 结果倒填 selection reason。

### 3.3 execution identity 的上游 truth

来源必须是：

```text
runner / execution seam
  -> observed truth mapping
  -> execution metadata backfill
```

要求：

- execution id / run id 只能来自真实执行边界或受限 reserved seam；
- runner id / runner path 只能来自执行器本身；
- execution state 只能来自 observed truth mapping 的最小事实；
- 不允许从 report summary 推导 execution identity。

### 3.4 observed execution status 的上游 truth

来源必须是：

```text
runner / execution seam
  -> observed truth mapping
```

要求：

- observed status 只能反映当前实际看到的执行状态；
- 如果只是 reserved stub，就必须诚实保持 reserved / unavailable；
- 不允许把 stub 状态写成 executed / completed。

### 3.5 evidence linkage 的上游 truth

来源必须是：

```text
execution metadata backfill
  -> transcript/evidence capture slot
```

要求：

- transcript ref / evidence ref 只能来自真实 capture slot 或明确占位；
- 不允许 report 里临时编造 evidence linkage；
- 不允许把 summary-only 内容包装成可复核 evidence。

---

## 4. 哪些 fallback / mixed-source 行为必须禁止

T3 的边界和 T2 一样硬：**不允许 mixed-source，也不允许伪补全。**

### 4.1 禁止 mixed-source metadata 拼接

禁止把：

- fixture identity 来自 A；
- case identity 来自 B；
- execution id 来自 C；
- transcript ref 来自 D；

拼成一个“看似完整”的 metadata 对象。

### 4.2 禁止默认值伪装成真实 identity

禁止以下行为：

- 用 `unknown` / `default` / `0` 冒充真实 execution id；
- 用空字符串冒充 runner path；
- 用固定占位文本冒充 transcript / evidence ref；
- 用 metadata summary 反写不存在的 execution truth。

### 4.3 禁止跨层逆向填充

禁止先写 report，再从 report 反推 metadata。

report 只能消费上游已存在的 metadata，不能反向生成 metadata truth。

### 4.4 禁止把 reserved 当 completed

以下情况都不能被解释成完成：

- executionId / providerRunId 有 stub 值；
- rawResponse / transcript / evidence 只有 reserved attach-point；
- providerStatus 只是 metadata / execution seam 的保守标签；
- metadata summary 看起来“像真的”。

只要 source boundary 还没有真实接通，就不能宣称 execution metadata 已完成。

---

## 5. 它与 transcript / evidence / report 的关系与边界

T3 只定义 execution metadata 的回填路径，不扩成 transcript / evidence / report 的完整体系。

### 5.1 与 transcript 的关系

```text
execution metadata backfill -> transcript/evidence capture slot
```

- metadata 只负责给 transcript 留下可对齐的 execution identity；
- metadata 不负责生成 transcript 内容；
- transcript 是否真实存在，属于后续接缝问题，不在 metadata 回填里补写。

### 5.2 与 evidence 的关系

```text
execution metadata backfill -> transcript/evidence capture slot
```

- evidence 只能绑定到已存在的 execution identity；
- metadata 可以提供 evidence linkage，但不能伪造 evidence 本体；
- evidence 不能反向补齐 metadata 缺失。

### 5.3 与 report 的关系

```text
execution metadata backfill -> transcript/evidence capture slot -> replay report assembly
```

- report 只能消费已确认的 metadata；
- report 可以展示 metadata summary，但不能把 summary 当 truth source；
- report 不能用自己的展示层字段回填 metadata。

### 5.4 边界原则

- metadata 是 lineage 的事实层；
- transcript / evidence 是 capture / reference 层；
- report 是汇总 / 展示层；
- 三者不能互相越界补写 truth。

---

## 6. 非目标与禁止误宣称清单

### 6.1 明确非目标

本文不做以下事情：

- 不做真实 runtime implementation；
- 不做 provider-backed execution 完整接入；
- 不做 transcript persistence；
- 不做 evidence content 设计；
- 不做 scoring / rubric / pass threshold；
- 不做 sandbox 扩面；
- 不做 multi-case orchestration；
- 不做 UI / publish / registry；
- 不定义真实 provider integration 细节。

### 6.2 禁止误宣称

下面这些说法都不允许：

- “metadata 回填路径画出来了 = runtime replay 已完成”
- “executionId / providerRunId stub 透传 = 真实 provider execution 已接通”
- “transcript / evidence 有接缝 = 这些能力已经实现”
- “report 能展示 metadata = report 可以反写 truth”
- “single fixture / single case = 可以顺手扩成 multi-case”

### 6.3 必须诚实保留的边界

- 这是 execution metadata backfill path skeleton，不是 runtime result；
- 这是最小 lineage design，不是实现证据；
- 这是后续 transcript / evidence / report 子任务的接缝定义，不是全链路完成证明。

---

## 7. 结论

T3 最合适的落点，不是继续扩字段，也不是跳去实现，而是先把 single fixture / single case 的 execution metadata 回填路径钉成一条最小闭环：

- 从 selection 到 report，只允许一条同源 metadata 链路；
- execution identity、selection lineage、observed status、evidence linkage 都必须能回指上游 truth；
- 任何 mixed-source / fallback 伪补全都要禁止；
- transcript / evidence / report 只能在各自接缝上接入。

这一步最适合当前主计划，因为它把后续实现要依赖的 metadata 真值边界先固定住，避免下一步一动手就跑偏到扩面或补洞。