# Phase 3 single fixture / single case target selection

> 这是 Phase 3 的**承接对象选择决策页**，不是实现说明。
>
> 它只负责把 task 11 里的 T1 再压一层：从“single fixture / single case runtime replay entry”缩到**到底选哪个 fixture / case 作为最小真实实现承接对象**。
>
> 明确边界：本文**不**宣称 runtime replay 已完成，不进入代码实现，不扩 multi-case，不做 scoring / sandbox / UI / publish，也不把 selection 决策写成能力完成。

## 1. 选择目标

当前阶段要解决的唯一问题是：

**选出一个最小、最稳、最不容易扩散的 single fixture / single case，作为 Phase 3 runtime replay 的首个真实承接对象。**

这不是在选“最强 case”，而是在选“最适合做第一刀的 case”。

---

## 2. 候选 fixture / case 的选择标准

### 2.1 必须满足的硬条件

候选对象必须同时满足：

1. **single fixture / single case**
   - 只能是一个 fixture 内的一条 case。
   - 不能天然依赖 case batch、multi-case orchestration 或跨 fixture 聚合。

2. **边界最窄**
   - 不要求 UI。
   - 不要求 publish / registry。
   - 不要求 scoring 引擎。
   - 不要求 sandbox 扩面。

3. **数据链路最短**
   - 从 selection 到 execution 到 metadata / transcript / evidence / report 的链路要最少分叉。
   - 能用最小字段闭环，而不是一开始就带出很多旁支。

4. **可复核性高**
   - 结果一眼能看出对不对。
   - 失败原因容易定位。
   - 不依赖复杂外部上下文。

5. **不容易误扩面**
   - 选它不会自然把任务拖向 multi-case、评分体系、UI 或发布链路。

### 2.2 优先级标准

在满足硬条件的前提下，优先选：

- fixture 结构最稳定的
- case 语义最直白的
- 观察结果最容易写成最小 report 的
- 与现有 contract / readiness 结论对齐最顺的
- 最不需要额外解释就能承接 runtime replay 的

---

## 3. 推荐选择

### 3.1 推荐结论

**推荐把“最小、最稳定、最容易复核”的单 fixture / 单 case，作为第一个真实承接对象；如果当前仓库里已有 provider-less draft transcript evidence / single-case runtime draft skeleton 对应的那条 case，可优先选它作为 T1 承接对象。**

### 3.2 为什么是这个方向

这个选择的价值不在于它“功能最完整”，而在于它具备三个特性：

- **最小**：只承接一条最窄链路，不把 runtime 一次性拉成系统工程；
- **最稳**：已有 contract / readiness / draft artifact 语义铺垫，不需要重新发明对象；
- **最不容易扩散**：天然更适合把 metadata、transcript、evidence、report 先闭环在单 case 上，而不是把复杂度提前外溢。

### 3.3 选它的实际好处

- 方便验证真实 replay 入口是否真的能接通；
- 方便观察 execution metadata 是否能回填；
- 方便确认 transcript / evidence 是否能形成最小记账；
- 方便把 report 的边界写诚实；
- 方便后续扩面时有一个可复核基线。

---

## 4. 为什么它比其它候选更稳、更不容易扩散

和其它更“野”的候选相比，推荐对象更稳，主要因为：

### 4.1 不会天然带出多 case

有些 case 一开始就和 batch / aggregate / sibling cases 绑定，第一刀很容易滑向 multi-case。
推荐对象必须避免这种天然扩面倾向。

### 4.2 不会天然带出评分系统

有些 case 一选就会诱导团队开始讨论 rubric、score、pass threshold。
这会把 T1 从“选承接对象”拖成“先做一套评估体系”。
推荐对象应尽量让“先跑通最小执行链路”成为唯一焦点。

### 4.3 不会天然带出 UI / publish

如果一个 case 的价值必须靠可视化、发布或 registry 才能证明，那它就不适合作为第一刀。
第一承接对象应该靠 report 和 evidence 本身就能讲清楚。

### 4.4 不会天然带出 sandbox 扩面

若候选对象必须先定义复杂 sandbox policy 才能运行，那它的边界就已经太重了。
T1 需要的是最窄承接面，不是最重执行面。

---

## 5. 与 execution metadata / transcript / evidence / report 的关系

这个选择页要特别说明：**T1 不是只选 case 名字，而是选一条最小 truth lineage 的承接点。**

### 5.1 execution metadata

承接对象必须能稳定对应到最小 execution metadata 回填路径：

- 选中了谁；
- 是否真的执行；
- 执行标识如何回填；
- provider / runner 侧最小状态如何落回 report。

### 5.2 transcript

承接对象必须允许最小 transcript 记账落点存在：

- 有无 transcript；
- transcript 是 provider-managed 还是 provider-less draft evidence；
- transcript 只是证据引用，还是持久化实体。

### 5.3 evidence

承接对象必须能留下最小可复核 evidence：

- 证据要能对上 case；
- 证据要能对上 execution；
- 证据要能对上 report；
- 证据不等于完整体系，但必须诚实。

### 5.4 report

承接对象最终要落到最小 replay report：

- report 里能看出 case 被怎么处理；
- 哪些字段是事实；
- 哪些字段仍是保留位；
- 哪些状态仍然不能被误读成 runtime 已完成。

---

## 6. 非目标与禁止误宣称清单

### 6.1 明确非目标

本文不做以下事情：

- 不做真实 runtime 实现；
- 不扩 multi-case；
- 不做 scoring；
- 不做 sandbox；
- 不做 UI；
- 不做 publish / registry；
- 不做完整 validation gate 改造；
- 不把 selection note 写成 execution completion。

### 6.2 禁止误宣称

以下说法都不允许：

- “选好了承接对象 = runtime replay 已完成”
- “单 case 选定 = provider-backed execution 已接通”
- “有 transcript / evidence = scoring / pass 已完成”
- “选中最小 case = multi-case 可以顺手一起开”
- “本页就是实现计划”

### 6.3 必须诚实保留的边界

- 这是 selection decision，不是 implementation result；
- 这是最小承接对象，不是系统能力完成；
- 这是第一刀，不是终局。

---

## 7. 结论

当前主计划在 task 11 上最合适的下一步，不是扩面，也不是开做多 case，而是先把 **T1 的承接对象**钉死：

- 选一个最小、最稳、最容易复核的 single fixture / single case；
- 让它成为 execution metadata、transcript、evidence、report 的第一承接点；
- 让后续实现都围着这条最窄链路展开。

这一步的意义很明确：**先把第一刀落在不会跑偏的地方。**
