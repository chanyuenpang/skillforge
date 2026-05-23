# Phase 3 single-case boundary audit / boundary recheck: single fixture / single case runtime replay entry

> 这是 Phase 3 task 11 的 **T6 single-case 边界反查 / boundary audit** 说明页，不是实现交付说明。
>
> 它只负责把 T1-T5 的边界逐项反查一遍：确认是否仍严格保持 **single fixture / single case**，识别最容易偷偷扩成 multi-case / scoring / sandbox / provider-backed completed / UI / publish 的位置，列出最容易误宣称 runtime replay 已完成的表述，并给出最小审计清单与通过/不通过准则。
>
> 明确边界：本文**不**进代码，不扩 multi-case，不做 scoring / sandbox / UI / publish / registry，不把 audit 骨架写成能力完成。

## 1. 这一步的唯一目标

T6 不负责做新能力，只负责回答一个问题：

**T1-T5 这条 single fixture / single case runtime replay entry 线，是否仍然只是一条诚实的最小边界线，而没有偷偷变成更大系统。**

审计关注点只有四个：

- 是否仍然只是一条 single fixture / single case 链路；
- 是否仍然只表达最小 metadata / transcript / evidence / report 引用；
- 是否没有偷渡 multi-case、scoring、sandbox、UI / publish；
- 是否没有把“引用、摘要、保守状态”误写成“已完成真值”。

---

## 2. 对 T1-T5 的逐项反查

### 2.1 T1 固定承接对象

**要反查什么**
- 是否真的只选了一个 fixture / 一个 case。
- 是否没有借“示例扩展”“顺手补更多 case”把入口扩成 batch。
- 是否没有在对象选择里混入 UI / registry / publish 语义。

**通过标准**
- 承接对象仍然是单一 fixture + 单一 case。
- 选择决策只说明“谁来跑”，不引入额外 case 集合。
- 没有把对象选择写成 multi-case orchestration 的前置。

**不通过信号**
- 同时出现多个 case 作为“候选”或“默认集合”。
- 选择文档开始讨论聚合、批处理、并发、评分面。
- 选择对象被描述成“首批可运行集合”而不是单个承接点。

### 2.2 T2 最小 replay 数据流

**要反查什么**
- 数据流是否仍是 selection -> execution -> metadata -> transcript/evidence -> report 的单向链路。
- 是否偷偷加入 scoring 输入、sandbox 结果、UI 状态或 publish 回流。
- 是否出现多来源拼接成“完整结果”的倾向。

**通过标准**
- 数据流只覆盖 single case 最小字段。
- 每一段都是上游到下游的单向消费，不反向补写 truth。
- 不出现 multi-case 聚合输入，也不出现结果池。

**不通过信号**
- 把 scoring / sandbox / UI / publish 字段混进最小数据流。
- 允许从 report 反推 metadata 或 evidence truth。
- 数据流描述开始支持多个 case 的汇总视图。

### 2.3 T3 execution metadata 回填路径

**要反查什么**
- metadata 是否仍只是 execution identity / lineage / observed status 的最小回填。
- 是否开始借 metadata 语义伪装 provider-backed completed truth。
- 是否把 reserved / blocked / unavailable 写成真实 executed / passed。

**通过标准**
- metadata 只记录最小可确认事实。
- reserved / unavailable / blocked 状态保持诚实，不被补写成 completed。
- metadata 不承担 scoring、sandbox、UI、publish 语义。

**不通过信号**
- metadata 出现“已完成执行”但上游 truth 仍是 stub。
- metadata slot 被用来混装 transcript body 或 evidence body。
- provider-backed completion 被当成默认态。

### 2.4 T4 transcript / evidence 最小记账槽

**要反查什么**
- transcript / evidence 是否仍只是 reference / minimal record，而不是完整体系。
- 是否偷偷引入可复核全文、存储体系、检索体系或审计系统。
- 是否把引用或占位符说成真实内容已存在。

**通过标准**
- 只保留最小可复核记账槽。
- transcript/evidence 仍是 reference-first，不是 body-first。
- 没有扩成 persistence / retrieval / audit 平台。

**不通过信号**
- transcript / evidence 设计开始承诺完整持久化和回捞。
- handle、ref、summary 被写成“内容已在位”。
- 记账槽开始承载评分或发布状态。

### 2.5 T5 replay report 最小验收口径

**要反查什么**
- report 是否仍然只消费上游事实。
- 是否把 reference、summary、保守状态误写成 completed truth。
- 是否允许 mixed-source / fallback / 假 passed / 假 available / 假 accepted。

**通过标准**
- report 只表达 metadata reference、transcript reference、evidence reference 与最小 observed truth。
- report 不反向生成 truth，不补齐上游缺失内容。
- blocked / reserved / unavailable 仍然是诚实收口，而不是失败包装。

**不通过信号**
- report 文案开始等同于“已完成验证”。
- 有 ref / handle / summary 就被解释成真实可用。
- report 变成综合评分页、发布页或通过宣告页。

---

## 3. 最容易偷偷扩成更大系统的地方

### 3.1 最容易扩成 multi-case 的位置

- T1 的“承接对象”如果写成“候选集合”，就会滑。
- T2 的数据流如果开始允许 case 聚合，就会滑。
- T6 审计如果开始检查“批量结果”，就会滑到 multi-case 审核。

### 3.2 最容易扩成 scoring 的位置

- T4 一旦把 transcript/evidence 和评分依据绑死，就会引入 rubric。
- T5 一旦把 report 验收写成 pass/fail 综合分，就会滑向 scoring。
- T6 一旦要求“判定总体分数”，就不是 boundary audit 了。

### 3.3 最容易扩成 sandbox 的位置

- T2 如果加入环境隔离、资源限制、超时策略的实现细节，就会变成 sandbox 设计。
- T3 如果把执行元数据和隔离控制混写，就会让 metadata 变成 sandbox 控制面。
- T6 如果检查沙箱资源是否充足，也已经越界。

### 3.4 最容易扩成 provider-backed completed truth 的位置

- T3 最容易把 reserved stub 误写成 completed execution。
- T4 最容易把 transcript/evidence ref 误写成真实 payload。
- T5 最容易把“report 可展示”误写成“runtime replay 已完成”。

### 3.5 最容易扩成 UI / publish 的位置

- T5 如果开始考虑展示页、交互页、发布页口径，就会滑。
- T6 如果审计结果要求“给前端可用结构”，也会滑。
- 所有 UI / publish 诉求都应该退回到后续阶段，不应出现在本审计里。

---

## 4. 最容易误宣称 runtime replay 已完成的表述

以下表述最容易把边界说穿，审计时必须拦住：

- “有 report 了，所以 runtime replay 完成了”
- “有 metadata / transcript / evidence 引用，所以真实执行已经接通”
- “有 reserved / unavailable / blocked 状态，所以等于已经跑过”
- “single case 能跑通，就可以默认 multi-case 只是顺手扩展”
- “report 能展示 passed / accepted 样式，所以真实 passed / accepted 已成立”
- “selection、metadata、evidence、report 都有了，所以 scoring / sandbox 也该一起算完成”

审计时必须坚持：

**引用不是 truth，summary 不是 completed truth，保守状态不是完成态。**

---

## 5. 最小审计清单

### 5.1 文档级审计清单

- [ ] T1 仍然只对应一个 fixture / 一个 case。
- [ ] T2 仍然是单向数据流，没有 batch / 聚合 / scoring / sandbox / UI / publish。
- [ ] T3 仍然只回填最小 execution metadata，没有伪装 completed truth。
- [ ] T4 仍然只是最小 transcript / evidence 记账，没有扩成持久化/审计平台。
- [ ] T5 仍然只允许 reference / minimal observed truth，没有 fallback / mixed-source / 假 passed / 假 available / 假 accepted。
- [ ] T6 明确只做边界反查，不承担扩面、不承担评分、不承担 UI / publish。

### 5.2 审计观察点

- 单 fixture / single case 是否始终是唯一锚点。
- 有没有任何地方开始使用“集合”“批量”“聚合”“矩阵”语言。
- 有没有任何字段被解释成 completed truth 而非 reference / stub / reserved。
- 有没有任何一层开始提供 UI / publish / scoring / sandbox 的承诺。

### 5.3 审计证据要求

- 每个 T 都要能指出它的边界句。
- 每个可疑表述都要能回退到“仅引用 / 仅保守状态 / 仅最小记账”。
- 若无法明确说明上游 truth 来源，则默认不通过。

---

## 6. 通过 / 不通过 判断准则

### 6.1 通过

只有同时满足以下条件，T6 才算通过：

- T1-T5 全部仍保持 single fixture / single case。
- 没有 multi-case / scoring / sandbox / UI / publish 的语义偷渡。
- 没有把 reference / summary / reserved / blocked / unavailable 误宣称为 completed truth。
- 审计清单中所有关键边界都能明确指向对应文档句子。

### 6.2 不通过

任一条成立即不通过：

- 出现多 case、批量、聚合或矩阵语义。
- 出现 scoring / sandbox / UI / publish 的实质设计。
- 出现 completed truth 误宣称。
- 审计无法明确指出上游事实来源，只能靠文案猜。

### 6.3 不通过后的退回层级

- **T1 问题**：退回到 target selection，重新收紧承接对象。
- **T2 问题**：退回到 data flow，删掉多源拼接 / batch / scoring / sandbox / UI / publish 语义。
- **T3 问题**：退回到 metadata backfill，收紧 execution metadata 口径，禁止 completed truth 伪装。
- **T4 问题**：退回到 transcript / evidence 记账，维持 reference-first，不扩持久化/审计系统。
- **T5 问题**：退回到 report acceptance，重新禁止 mixed-source / fallback / 假 passed / 假 available / 假 accepted。
- **T6 问题**：如果只是审计文档本身不清晰，退回本页重写；如果审计揭示上游边界已滑出，则退回对应上游 T 文档修正。

---

## 7. 如果审计通过，task 11 docs-level subplan 如何诚实收口

若 T6 通过，task 11 的 docs-level subplan 可以诚实收口为：

- Phase 3 已完成一条 **single fixture / single case runtime replay entry** 的 docs-level 骨架；
- T1-T5 已分别固定 target selection、minimal data flow、metadata backfill、transcript/evidence accounting、replay report minimal acceptance；
- T6 已确认上述边界没有滑向 multi-case / scoring / sandbox / UI / publish；
- 当前仍只是在 **最小 runtime replay 承接入口的文档封口**，不是 runtime replay 已完成。

收口时必须继续保留：

- 真实 provider execution、transcript capture、persistence、scoring、sandbox、multi-case 仍为后续阶段；
- 任何 report / metadata / evidence ref 都不等于 completed truth；
- docs-level 完成不等于实现完成。

---

## 8. 如果审计不通过，应退回哪一层修正

若 T6 不通过，原则是**不在本页硬拗**，而是回退到最靠近问题源头的层级修正：

1. **问题出在对象范围** -> 回 T1
2. **问题出在流转语义** -> 回 T2
3. **问题出在 metadata truth 伪装** -> 回 T3
4. **问题出在 transcript / evidence 过拟合** -> 回 T4
5. **问题出在 report 口径偷换** -> 回 T5
6. **问题只是审计文档描述不够清楚** -> 直接修正本页 T6 审计骨架

核心原则很简单：

**哪一层偷跑，就退回哪一层，不要在更高层硬写“通过”。**

---

## 9. 非目标与禁止误宣称

### 9.1 非目标

- 不进代码
- 不扩 multi-case
- 不做 scoring
- 不做 sandbox
- 不做 UI
- 不做 publish / registry
- 不做真实 provider execution
- 不做 transcript persistence
- 不做最终验收发布

### 9.2 禁止误宣称

- “边界审计通过 = runtime replay 已完成”
- “T6 通过 = multi-case 也准备好了”
- “report 文档齐了 = 真值已经接通”
- “single case 可读 = 可以顺手做 UI / publish”

---

## 10. 结论

T6 是当前主计划里最合适的下一步边界动作：

- T1-T5 已把单点入口、数据流、metadata、证据、report 都收紧了；
- 现在最需要的是反查有没有偷偷扩面；
- 先把边界守住，后续实现才不会把“最小承接入口”写成“已经完成的 runtime 系统”。

这一步的价值不是多做功能，而是防止主计划在最关键的一刀上失焦。