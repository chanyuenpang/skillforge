# Phase 3 implementation subplan: single fixture / single case runtime replay entry

> 这是 Phase 3 的**实施子计划入口**,不是实现完成说明。它只负责把当前主计划中"runtime replay 真实承接"的第一刀切清楚:从已完成的 contract-first / readiness 复评,进入 **single fixture / single case** 的最小真实实现入口评估与拆分。
>
> 明确边界:本文**不**宣称 runtime replay 已完成,不把 contract closeout 误写成真实执行完成,也不把 multi-case、全 scoring、全 sandbox、UI / publish / registry 的后续工作混进来。

## 1. 当前要推进的最小实现切口

本 subplan 的最小切口是:

**单 fixture + 单 case 的 runtime replay entry**

也就是只承接一条最窄的真实链路:

```text
single fixture
  -> single case selection
  -> runtime replay execution
  -> execution metadata 回填
  -> 最小 transcript / evidence 记账
  -> replay report
```

这里的"最小真实实现"重点不是扩面,而是验证:

- 真实 replay 入口是否真的能被单 case 驱动;
- provider-backed / reserved seam 的真实回填路径是否能落到 report;
- transcript / evidence 是否能形成最小可复核记账;
- runtime replay 是否开始从"合同描述"转为"可执行证据"。

## 2. 为什么必须保持 single fixture / single case

必须保持 single fixture / single case,原因有四个:

1. **避免把边界一次性放大**
   runtime replay 还处在承接入口阶段,先单 case 可以避免一开始就把 multi-case orchestration、并发调度、聚合判定一起拖进来。

2. **便于验证真实接通点**
   当前最关键的不是跑多,而是确认"真实 provider / execution / transcript / report"这条最窄链路有没有真的接上。单 case 最容易看清链路是否通了。

3. **防止误把合同收口写成能力完成**
   如果一开始就做多 case,很容易把某个静态或半静态结果误读成 runtime 已完成。single case 可以强制把证据粒度压到最低。

4. **给后续扩面留稳定锚点**
   单 case 跑通后,后续的 multi-case、scoring、sandbox、cross-model 才有可扩展的最小基线,不会在未验证的抽象上横跳。

## 3. 本 subplan 打算覆盖哪些真实实现目标

本 subplan 只覆盖与"最小 runtime replay 承接"直接相关的真实目标:

- 单 fixture / 单 case runtime replay 真实入口
- execution metadata 的真实回填路径
- transcript 记账 / 持久化的最小落点
- replay report 的最小 evidence 结构
- 真实执行与 report 之间的 lineage 可追溯性

如果实现过程中需要更保守一点,优先目标可以收缩为:

- 先让单 case 真的跑起来
- 再让 metadata / transcript / report 真正闭环
- 最后才考虑是否进入下一层扩展

## 4. 明确排除的范围

本 subplan 明确排除以下内容,不纳入当前切口:

- **multi-case**:不做多 case orchestration,不做 case batch 聚合
- **全 scoring**:不做完整 rubric / score engine,不做全面评估体系
- **全 sandbox**:不做完整沙箱执行面,不扩到全隔离 / 全安全策略
- **UI**:不做可视化界面,不做交互编排
- **publish / registry**:不做发布链路、不做 registry 写入、不做分发
- **完整跨平台 / 跨模型矩阵**:不在本刀里追求系统级矩阵覆盖
- **正式 validate 主链路接入**:不把当前切口直接写成已并入完整门禁

换句话说:本 subplan 只负责把 Phase 3 的 runtime replay 从"文档可说"推进到"单点真实可跑",而不是把整个 runtime 体系一口气做完。

## 5. 推荐的第一个可执行子任务列表

建议把第一轮执行拆成下面这几个最小子任务:

1. **固定 single fixture / single case 的承接对象**
   选择一个最小、最稳定的 fixture / case 作为 runtime replay 的首个承接点,避免同时开多个入口。对应的选择决策页已单独收束在 `docs/phase-3-single-fixture-single-case-target-selection.md`。

2. **确认最小 replay 入口的数据流**
   明确从 selection 到 execution 再到 report 的输入输出字段，先把数据流画死，再动实现。对应的 T2 数据流骨架已单独收束在 `docs/phase-3-minimal-replay-data-flow.md`。

3. **确认 execution metadata 回填路径**
   先把最小 execution identity、selection lineage、observed status、evidence linkage 的回填边界钉死，再谈真实执行接通。对应的 T3 说明页已单独收束在 `docs/phase-3-execution-metadata-backfill-path.md`。

4. **补最小 transcript / evidence 记账**
   只要求形成可复核的最小记录,不要求完整 transcript 体系。

5. **固化 replay report 的最小验收口径**
   明确哪些字段必须出现、哪些字段仍可保守留白、哪些状态仍必须诚实收口。对应的 T5 说明已单独收束在 `docs/phase-3-replay-report-minimal-acceptance.md`。

6. **做 single-case 边界反查**
   反查 T1-T5 有没有悄悄滑向 multi-case、scoring、sandbox、UI / publish / provider-backed completed truth；一旦滑出,立刻收回。对应的 T6 审计说明建议单独收束。

## 6. 与已有 Phase 3 文档的关系

本 subplan 继承以下已有文档的结论,但不重复宣称它们是实现完成:

- `docs/phase-3-followup-runtime-replay-readiness-reassessment.md`
- `docs/phase-3-provenance-contract.md`
- `docs/phase-3-provider-backed-slot-contract-checklist.md`
- `docs/runtime-replay-protocol-lightweight-design.md`
- `docs/preflight-contract-and-artifacts-design.md`
- `docs/phase-3-runtime-draft-cli-plan.md`
- `docs/phase-3-runtime-report-runner-plan.md`
- `docs/validator-contract.md`
- `docs/roadmap.md`

这些文档已经把 contract / boundary / readiness 说清了;本页只负责把**实施入口**收束到 single fixture / single case。

## 7. 结论

当前主计划在 Phase 3 上最合适的下一步,不是扩大 runtime 面,也不是转去 UI / publish,而是先把 **single fixture / single case runtime replay entry** 立住。

这一步的价值是:

- 把 readiness 复评变成真实实现入口;
- 把 runtime replay 的第一刀压到最窄;
- 为后续 multi-case、scoring、sandbox、正式门禁接入提供可复核基线。

如果这一步没有先立住,后面任何扩面都容易变成"看起来在推进,实际上还在合同层打转"。
