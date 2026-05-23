# Phase 3 transcript / evidence minimal accounting slot: single fixture / single case

> 这是 Phase 3 task 11 的 **T4 transcript / evidence 最小记账落点** 说明页,不是实现交付说明。
>
> 它只负责把 single fixture / single case runtime replay 里 transcript / evidence 的最小记账边界钉死:最小应记录哪些东西、哪些只是 reference / handle 而不是 truth payload、它们与 execution metadata / observed truth / report 的边界是什么,以及哪些 fallback / mixed-source / 假 available 行为必须禁止。
>
> 明确边界:本文**不**宣称 runtime replay 已完成,不进代码,不扩 multi-case,不做 scoring / sandbox / UI / publish,不把 capture slot 写成系统能力完成。

## 1. 这一步要解决的唯一问题

当前主计划在 T4 阶段要解决的是:

**把 single fixture / single case 的 transcript / evidence 最小记账落点画成一条诚实、可复核、不可伪补全的边界。**

重点不是“记得越多越好”,而是先定义:

- 最小 transcript / evidence 必须记录哪些东西;
- 哪些内容只是 reference / handle,不能被当成 truth payload;
- 哪些字段只能引用上游 truth,不能反向生成;
- 与 execution metadata / observed truth / report 的边界如何切开。

---

## 2. single fixture / single case 下 transcript / evidence 最小应记录哪些东西

T4 只收敛到**最小 transcript / evidence accounting slot**,不扩成完整 persistence 体系。

### 2.1 最小应记录的内容

最小 transcript / evidence 记账应至少覆盖以下几类:

1. **selection 引用**
   - fixture id / case id 的引用
   - selection lineage 的最小引用
   - 仅用于对齐,不作为新的 truth source

2. **execution 对齐引用**
   - execution id / run id 的引用
   - runner / seam 的最小引用
   - execution metadata 的最小 linkage

3. **capture slot 信息**
   - transcript slot 是否存在
   - evidence slot 是否存在
   - 记录状态是 reserved / attached / unavailable 之一的诚实标记

4. **最小可复核记录**
   - 简短的 evidence note / provenance note
   - 仅足以让 report 对齐,不要求完整正文
   - 只记录“谁/何时/基于什么 seam”之类的最小事实

5. **报告对齐引用**
   - 可供 report 消费的 transcript/evidence ref
   - 仅作为链接点,不是内容本体

### 2.2 可保守留白但不能伪补全的内容

以下内容可以暂时保守留白,但不能用默认值假装已经存在:

- 完整 transcript 正文
- 完整 evidence body
- raw payload 内容
- provider 原始响应全文
- 多段附件 / 多级引用树
- scoring 相关证明材料

只要上游 truth 没有真实接通,这些内容就必须保持 reserved / unavailable / null,而不是被 fallback 拼接出来。

---

## 3. 哪些是 reference / handle,哪些不是 truth payload

T4 的硬要求是:先区分“引用”与“真值”,不能把 handle 当事实。

### 3.1 只能是 reference / handle 的东西

以下内容只允许作为 reference / handle 存在:

- fixture id / case id 的指针
- execution id / run id 的指针
- transcript ref / evidence ref
- provenance note 的最小定位句
- capture slot 的位置标记

这些字段的职责只是“把位置钉住”,不是承载全部 truth。

### 3.2 不能当 truth payload 的东西

以下内容不能因为出现在 transcript / evidence 层,就被当成 truth:

- 任何 placeholder 文本
- 任何固定占位 path / uri
- 任何空对象 / 默认对象
- 任何“看起来像真的” summary 字段
- 任何由 report 反推的说明性内容

如果它只是链接、槽位、占位或摘要,就不是 truth payload。

### 3.3 truth payload 只能来自哪里

truth payload 只能来自已确认的上游事实,例如:

- selection 决策事实
- execution seam 的 observed truth
- 明确接通的 capture 事实

不能从 report、UI 文本、或后续汇总说明里倒填回来。

---

## 4. 它与 execution metadata / observed truth / report 的边界

T4 只定义 transcript / evidence 的记账边界,不扩成三层互写。

### 4.1 与 execution metadata 的关系

```text
execution metadata backfill -> transcript/evidence capture slot
```

- metadata 提供 execution identity 与 lineage 对齐点;
- transcript / evidence 只消费 metadata,不生成 metadata;
- transcript / evidence 不能补写 metadata 缺失的 truth。

### 4.2 与 observed truth 的关系

```text
runner / execution seam -> observed truth -> transcript/evidence capture slot
```

- observed truth 是来源,不是装饰;
- transcript / evidence 只能记录 observed truth 的最小可复核边界;
- 不允许把未观察到的内容写成“已记录”。

### 4.3 与 report 的关系

```text
transcript/evidence capture slot -> replay report assembly
```

- report 只能消费已有的 transcript / evidence ref;
- report 可以展示 capture status,但不能把展示文本当 truth source;
- report 不能反向生成 transcript / evidence 本体。

### 4.4 边界原则

- execution metadata 是身份 / lineage 层;
- transcript / evidence 是记账 / 参考层;
- observed truth 是可复核事实层;
- report 是汇总 / 展示层;
- 这四层不能互相越界补写 truth。

---

## 5. 哪些 fallback / mixed-source / 假 available 行为必须禁止

T4 的边界是硬的:不允许 mixed-source,也不允许伪可用。

### 5.1 禁止 mixed-source 记账拼接

禁止把:

- selection 引用来自 A;
- execution 引用来自 B;
- transcript ref 来自 C;
- evidence note 来自 D;

拼成一个“看起来完整”的记账对象。

### 5.2 禁止默认值伪装成已记账

禁止以下行为:

- 用固定占位路径冒充 transcript ref;
- 用空字符串冒充 evidence ref;
- 用默认 summary 冒充 evidence note;
- 用 `available` 冒充实际 attached;
- 用 `attached` 冒充实际存在的 body。

### 5.3 禁止假 available

以下情况都不能被当成真的可用:

- 只有 reserve slot,没有真实内容;
- 只有 handle,没有 payload;
- 只有 metadata summary,没有 capture 事实;
- 只有 report 文本,没有可复核记录。

只要 capture 还没真实接通,就不能宣称 transcript / evidence 已可用。

### 5.4 禁止跨层逆向填充

禁止先写 report,再从 report 反推 transcript / evidence。

report 只能消费上游已存在的记账结果,不能反向生成 truth。

---

## 6. 非目标与禁止误宣称清单

### 6.1 明确非目标

本文不做以下事情:

- 不做完整 transcript persistence;
- 不做 evidence body 设计;
- 不做 provider 原始响应存储方案;
- 不做 scoring / rubric / pass threshold;
- 不做 sandbox 扩面;
- 不做 multi-case orchestration;
- 不做 UI / publish / registry;
- 不定义真实 provider integration 细节。

### 6.2 禁止误宣称

下面这些说法都不允许:

- “有了 capture slot = transcript / evidence 已实现”
- “handle 能对齐 = payload 已存在”
- “report 能展示 ref = evidence 已可复核”
- “reserved slot = available content”
- “single fixture / single case = 可以顺手扩成 multi-case”

### 6.3 必须诚实保留的边界

- 这是 transcript / evidence minimal accounting slot skeleton,不是实现结果;
- 这是 reference / handle / payload 的边界说明,不是持久化完成证明;
- 这是后续 replay report 最小验收口径的接缝定义,不是全链路完成证明。

---

## 7. 结论

T4 最合适的落点,不是继续扩 transcript 内容,也不是跳去实现存储,而是先把 single fixture / single case 的 transcript / evidence 最小记账落点钉成一条最小闭环:

- 只记录足以对齐 report 的最小引用与事实;
- 明确 reference / handle 与 truth payload 的边界;
- 所有 mixed-source / fallback / 假 available 都要禁止;
- transcript / evidence 只能在 capture slot 上接入,不能越界补写 truth。

这一步最适合当前主计划,因为它把后续实现要依赖的记账边界先固定住,避免下一步一动手就跑偏到伪可用或补洞。