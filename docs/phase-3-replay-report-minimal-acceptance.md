# Phase 3 replay report minimal acceptance / report boundary: single fixture / single case

> 这是 Phase 3 task 11 的 **T5 replay report 最小验收口径 / report boundary** 说明页，不是实现交付说明。
>
> 它只负责把 single fixture / single case runtime replay 的 **report 最小能说什么、不能说什么、只能引用什么** 钉死：report 允许表达哪些事实、哪些字段只能是 metadata / transcript reference / evidence reference、report 与 observed truth / execution metadata / transcript-evidence 的单向消费边界，以及哪些 fallback / mixed-source / 假 passed / 假 available / 假 accepted 行为必须禁止。
>
> 明确边界：本文**不**宣称 runtime replay 已完成，不进代码，不扩 multi-case，不做 scoring / sandbox / UI / publish / registry，不把 report 骨架写成系统能力完成。

## 1. 这一步要解决的唯一问题

当前主计划在 T5 阶段要解决的是：

**把 single fixture / single case 的 replay report 最小验收口径画成一条诚实、单源、不可伪装完成态的边界。**

重点不是“report 看起来完整”，而是先定义：

- report 最少必须表达哪些事实；
- 哪些字段只能反映 metadata / transcript reference / evidence reference，而不能伪装成 completed truth；
- report 只能消费什么，不能反向生成什么；
- 哪些 fallback / mixed-source / 假 passed / 假 available / 假 accepted 必须禁止。

---

## 2. single fixture / single case 下，最小 replay report 允许表达哪些事实

T5 只收敛到 **最小 replay report**，不扩成完整结果页、评分页或审计页。

### 2.1 report 允许表达的最小事实

最小 replay report 只能表达以下几类事实：

1. **本次 report 的对象是谁**
   - fixture id
   - case id
   - selection lineage 的最小引用

2. **本次 replay 的执行位置**
   - execution id / run id
   - runner / seam 的最小引用
   - 当前 execution 的诚实状态（executed / blocked / reserved / unavailable 之一）

3. **本次 replay 的最小 observed truth**
   - 观察到的 case 级结果
   - 观察到的最小状态
   - 明确未获得的内容必须保留为 reserved / unavailable

4. **与 report 对齐的引用**
   - transcript ref
   - evidence ref
   - provenance / lineage summary 的最小引用

5. **是否存在保守收口**
   - blocked / reserved / unavailable 的诚实标记
   - 仅允许描述“当前能确认到哪一层”，不允许把没确认的层写成完成

### 2.2 report 允许的最小语义

report 的最小语义只有三种：

- **说明已观察到的事实**
- **引用上游 metadata / transcript / evidence**
- **诚实保留未确认部分**

report 不允许新增 truth，只允许汇总 truth。

---

## 3. 哪些字段只能反映 metadata / transcript reference / evidence reference，而不能伪装成 completed truth

T5 的硬要求是：**引用不是完成，ref 不是 truth 本体，summary 也不是真实执行证明。**

### 3.1 只能作为 metadata reference 的字段

以下字段在 report 中最多只能作为 metadata reference 出现：

- fixture id / case id 的展示
- execution id / run id 的展示
- runner id / runner path 的展示
- selection lineage 的展示
- execution status 的展示

它们的职责只是“把 report 对齐到上游事实”，不是承载新的 truth。

### 3.2 只能作为 transcript reference 的字段

以下字段在 report 中最多只能作为 transcript reference 出现：

- transcript ref
- transcript handle
- transcript availability label
- transcript capture slot summary

这些字段只能说明“有一个可对齐位置”或“当前处于哪种引用状态”，不能冒充 transcript 本体已经存在。

### 3.3 只能作为 evidence reference 的字段

以下字段在 report 中最多只能作为 evidence reference 出现：

- evidence ref
- evidence handle
- evidence slot summary
- provenance note 的最小定位句

这些字段只能说明“有一个证据对齐点”，不能冒充 evidence body 已经存在、可复核或已完成。

### 3.4 不能伪装成 completed truth 的常见样式

以下写法都不允许在 report 里被解释成完成态：

- “有 ref = 内容已存在”
- “有 summary = 真实执行已完成”
- “有 handle = 可回捞原始 payload / transcript”
- “有 available label = 实际可用”
- “有 passed 字样 = 真实通过”

如果上游没有真实 truth，report 只能说“reserved / unavailable / blocked”，不能偷换成 completed。

---

## 4. report 与 observed truth / execution metadata / transcript-evidence 的单向消费边界

T5 只定义 report 的消费边界，不允许 report 反向改写上游 truth。

### 4.1 report 只能消费 observed truth

```text
runner / execution seam -> observed truth -> report
```

- report 只能消费已观察到的 execution 结果；
- report 不能生成 observed truth；
- report 不能把“未观察到”包装成“已观察到”。

### 4.2 report 只能消费 execution metadata

```text
execution metadata backfill -> report
```

- report 可以展示 execution metadata 的摘要；
- report 不能反写 metadata；
- report 不能从自身展示层字段推导出新的 execution identity。

### 4.3 report 只能消费 transcript / evidence 引用

```text
transcript/evidence capture slot -> report
```

- report 可以展示 transcript / evidence ref；
- report 只能把它们当作引用点；
- report 不能以展示文本代替 transcript / evidence 本体。

### 4.4 单向边界原则

- **observed truth 是来源层**
- **execution metadata 是 lineage 层**
- **transcript / evidence 是 capture / reference 层**
- **report 是汇总 / 展示层**

这四层只能单向消费，不能互相越界补写 truth。

---

## 5. 哪些 fallback / mixed-source / 假 passed / 假 available / 假 accepted 行为必须禁止

这一节是 T5 的硬边界。下面这些行为必须明确禁止。

### 5.1 禁止 mixed-source report 拼接

禁止把：

- fixture identity 来自 A；
- execution metadata 来自 B；
- transcript ref 来自 C；
- evidence note 来自 D；
- observed result 再来自 E；

拼成一个“看起来完整”的 report。

### 5.2 禁止 fallback 伪补全

禁止以下类型的补全：

- 用默认值伪装执行已完成；
- 用空壳 transcript/evidence ref 伪装可复核；
- 用 summary 文本伪装真实 truth 已接通；
- 用 report 自身的文案反推 metadata 或 evidence；
- 用占位字段伪装 accepted / available / passed。

### 5.3 禁止假 passed

以下情况都不能被解释成 passed：

- 只有 metadata stub，没有真实 observed truth；
- 只有 transcript/evidence ref，没有真实内容；
- 只有 summary 文案，没有可复核事实；
- 只有 reserved seam，没有真实 execution 接通。

只要 source boundary 还没有真实接通，就不能宣称 replay passed。

### 5.4 禁止假 available

以下情况都不能被当成真的可用：

- 只有 handle，没有 payload；
- 只有 reserve slot，没有真实内容；
- 只有 reference，没有 capture 事实；
- 只有展示层文本，没有上游 truth。

### 5.5 禁止假 accepted

以下情况都不能被解释成 accepted：

- report 看起来“够像”；
- report 有一组完整字段；
- report 能被静态解析；
- report 能展示 provenance summary。

accepted 必须依赖真实可复核的上游事实，不许靠外观冒充。

### 5.6 禁止跨层逆向填充

禁止先写 report，再从 report 反推 execution / transcript / evidence truth。

report 只能消费上游 truth，不能反向生成 truth。

---

## 6. 非目标与禁止误宣称清单

### 6.1 明确非目标

本文不做以下事情：

- 不做完整 replay scoring；
- 不做综合 pass / fail 评价体系；
- 不做 sandbox 扩面；
- 不做 UI / publish / registry；
- 不做 multi-case orchestration；
- 不做真实 provider integration 细节；
- 不做 transcript persistence 实现；
- 不做 evidence body 设计；
- 不定义 runtime 产品发布流程。

### 6.2 禁止误宣称

下面这些说法都不允许：

- “report 骨架有了 = runtime replay 已完成”
- “有 metadata / transcript / evidence ref = 这些能力已实现”
- “report 能展示 accepted = 真实 accepted 已成立”
- “summary 看起来像 truth = 可以当 completed truth”
- “single fixture / single case = 可以顺手扩成 multi-case”

### 6.3 必须诚实保留的边界

- 这是 replay report minimal acceptance skeleton，不是实现结果；
- 这是 reference / summary / truth 的边界说明，不是完成证明；
- 这是后续实现接缝的验收口径，不是全链路完成证明。

---

## 7. 结论

T5 最合适的落点，不是继续扩 report 字段，也不是跳去实现，而是先把 single fixture / single case 的 replay report 最小验收口径钉成一条最小闭环：

- report 只允许表达已确认的最小事实；
- metadata / transcript / evidence 在 report 中只能作为 reference，不许伪装成 completed truth；
- 所有 mixed-source / fallback / 假 passed / 假 available / 假 accepted 都要禁止；
- report 只能单向消费上游 truth，不能越界补写 truth。

这一步最适合当前主计划，因为它把后续实现最容易漂移的“看起来验收了”先封住，避免下一步一动手就把未接通的链路写成已完成。