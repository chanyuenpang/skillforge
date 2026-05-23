# Phase 3 minimal replay data flow: single fixture / single case

> 这是 Phase 3 task 11 的 **T2 数据流骨架**，不是实现交付说明。
>
> 它只负责把 single fixture / single case runtime replay 的**最小 replay 数据流**锁死：哪些节点必须经过、哪些 truth 必须同源传播、哪些 mixed-source / fallback 行为必须禁止，以及这条链路如何衔接后续 metadata / transcript / evidence / report 子任务。
>
> 明确边界：本文**不**宣称 runtime replay 已完成，不进代码，不扩 multi-case，不做 scoring / sandbox / UI / publish，不把数据流骨架写成系统能力完成。

## 1. 这一步要解决的唯一问题

当前主计划在 T2 阶段要解决的是：

**把 single fixture / single case 的最小 replay 数据流画成一条诚实、单源、可复核的链路。**

这里的重点不是“把所有字段都接上”，而是先定义：

- 哪些节点必须存在；
- 哪些字段必须同源传递；
- 哪些地方只能保守留白，不能混源拼接；
- 后续 metadata / transcript / evidence / report 分别接在哪一段。

---

## 2. 最小 replay 数据流经过哪些节点

单 fixture / 单 case 的最小 replay 数据流按下面顺序闭环：

```text
selected fixture/case
  -> replay input normalization
  -> runner / execution seam
  -> observed truth mapping
  -> execution metadata backfill
  -> transcript/evidence capture slot
  -> replay report assembly
```

### 2.1 selected fixture/case

最上游输入只应是：

- 已选定的 single fixture；
- fixture 内的 single case；
- 与该 case 同源的最小选择信息。

这里不允许再从其它 fixture、其它 case 或 batch 聚合层拿补充 truth。

### 2.2 replay input normalization

这一层只做最小规范化：

- 把 selection 结果整理成 runner 可消费输入；
- 保持 case identity 不变；
- 保持 fixture identity 不变；
- 保持来源可追踪。

这一层不能偷偷引入新来源的默认值来“补齐”字段。

### 2.3 runner / execution seam

这里是最窄的执行边界：

- 接收单 case 输入；
- 产生单次执行结果或受限的 reserved stub result；
- 不扩展成多 case orchestration；
- 不在这里做评分决策。

### 2.4 observed truth mapping

这一层只负责把执行侧 truth 映射回报告侧最小事实集合：

- case 是否被执行；
- execution identity 是什么；
- 观察到的最小状态是什么；
- 哪些字段仍然是 reserved / unavailable。

### 2.5 execution metadata backfill

这里把 execution 相关元数据回填到 report 可见层：

- executionId / run identity；
- provider / runner side 的最小状态；
- 选择来源与执行结果之间的 lineage。

### 2.6 transcript / evidence capture slot

这一层只定义最小 transcript / evidence 落点：

- 能否有 transcript；
- transcript 是引用、stub 还是持久化实体；
- evidence 如何与 case / execution 对齐。

### 2.7 replay report assembly

最终只在 report assembly 汇总：

- case 级结果；
- execution metadata；
- transcript / evidence 指针；
- 保留字段与 blocked / pending 状态。

---

## 3. 哪些字段 / truth 需要同源传播

这条数据流必须坚持**同源传播**，不能混源拼接。

### 3.1 必须同源传播的核心 truth

以下信息必须来自同一条 lineage：

1. **fixture / case identity**
   - selected fixture id
   - selected case id
   - case position / locator（如果存在）

2. **selection lineage**
   - 是谁被选中
   - 为什么被选中（仅限最小 decision note）
   - selection 是否发生过变更

3. **execution lineage**
   - execution id / run id
   - runner path
   - execution state
   - 观察结果对应的 case identity

4. **truth payload / observed result**
   - cases[].observed
   - reserved / unavailable 状态
   - replay summary 的最小事实

5. **evidence linkage**
   - evidence ref
   - evidence 与 case / execution 的绑定关系
   - evidence 是否真实存在，还是仅占位

### 3.2 同源传播的基本原则

- selection 不能来自 A，execution 不能来自 B，report 再从 C 补写；
- execution metadata 不能从另一个 case 借壳；
- transcript / evidence 不能在 report 里“顺手编一个看起来完整的”；
- 任何不能证明同源的字段，都必须保持 reserved / null / unavailable。

---

## 4. 哪些 fallback / mixed-source 行为必须禁止

这一节是 T2 的硬边界。下面这些行为必须明确禁止。

### 4.1 禁止 mixed-source case truth

禁止把：

- 选中 case 的 identity；
- 另一个 case 的 observed 状态；
- 第三个来源的 transcript / evidence；

拼成一个“看似完整”的 report。

### 4.2 禁止 fallback 伪补全

禁止以下类型的补全：

- 用默认值伪装 execution metadata 已存在；
- 用空壳 transcriptRef 伪装 transcript 已捕获；
- 用 generic evidence note 伪装 evidence 已可复核；
- 用 report summary 推导不存在的 execution truth。

### 4.3 禁止跨层逆向填充

禁止先写 report，再从 report 反推 execution 或 transcript 的真值。

report 只能消费上游已存在的 truth，不能反向生成 truth。

### 4.4 禁止把 reserved 当 completed

以下情况都不能被解释成完成：

- reserved slot 有值；
- stub tuple 能透传；
- transcriptRef 存在占位字段；
- summary 里出现了看似正常的描述。

只要 source boundary 还没有真实接通，就不能宣称 runtime replay 已完成。

---

## 5. 这条数据流如何衔接后续子任务

T2 的作用，是给后续 metadata / transcript / evidence / report 子任务提供**固定接缝**。

### 5.1 metadata 子任务接在哪

metadata 子任务接在：

```text
runner / execution seam -> observed truth mapping -> execution metadata backfill
```

它只负责把 execution lineage 写实，不负责 transcript 细节。

### 5.2 transcript 子任务接在哪

transcript 子任务接在：

```text
execution metadata backfill -> transcript/evidence capture slot
```

它只负责说明 transcript 是引用、stub 还是持久化实体，不负责扩大 execution 范围。

### 5.3 evidence 子任务接在哪

evidence 子任务与 transcript 同层，重点是：

- evidence 是否和 case / execution 对得上；
- evidence 的最小可复核形式是什么；
- evidence 是否只是引用，而不是完整体系。

### 5.4 report 子任务接在哪

report 子任务接在最后：

```text
transcript/evidence capture slot -> replay report assembly
```

它只汇总已确认的 truth，不补写不存在的 truth。

---

## 6. 非目标与禁止误宣称清单

### 6.1 明确非目标

本文不做以下事情：

- 不做真实 runtime implementation；
- 不扩 multi-case；
- 不做 scoring / rubric / pass threshold；
- 不做 sandbox 扩面；
- 不做 UI / publish / registry；
- 不做跨平台 / 跨模型矩阵；
- 不做完整 validation gate 改造；
- 不定义真实 provider integration 细节。

### 6.2 禁止误宣称

下面这些说法都不允许：

- “数据流画出来了 = runtime replay 已完成”
- “最小 replay 链路确定 = 真实 provider call 已接通”
- “metadata / transcript / evidence 有接缝 = 这些能力已经实现”
- “reserved truth 能透传 = 可以把 fallback 当完成”
- “single fixture / single case = 可以顺手扩成 multi-case”

### 6.3 必须诚实保留的边界

- 这是 data flow skeleton，不是 runtime result；
- 这是最小 lineage design，不是实现证据；
- 这是后续子任务的接缝定义，不是全链路完成证明。

---

## 7. 结论

T2 的最合适落点，不是继续扩任务清单，也不是跳去实现，而是先把 single fixture / single case 的 replay 数据流钉成一条最小闭环：

- 从 selection 到 report，只有一条同源链路；
- 任何 mixed-source / fallback 伪补全都要禁止；
- metadata / transcript / evidence / report 都只在各自接缝上接入。

这一步最适合当前主计划，因为它把后续实现要依赖的“真值边界”先固定住，避免下一步一动手就跑偏到扩面或补洞。