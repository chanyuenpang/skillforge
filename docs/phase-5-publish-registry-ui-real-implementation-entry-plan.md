# Phase 5 publish / registry / team collaboration / UI real-implementation entry plan

> 这是一份 **docs-first 承接入口**。它只负责把 Phase 5 从 contract-first / planning skeleton 收口，推进到**真实实现的最小切口**评估，不实现 publish / registry / team collaboration / UI，也不把 docs-first closeout 误写成产品完成。

## 1. 结论

**可以进入 Phase 5 的真实实现承接，但只能从最小 implementation 切口开始。**

当前 Phase 5 已经有足够的 docs-first / contract-first 基线，可以把“要做什么、不能做什么、边界在哪里”说清楚；但 publish / registry / team collaboration / UI 的真实链路仍然缺失，不能把当前状态理解为 Phase 5 产品完成。

因此，这一步最合适的定位是：**从 docs-only contract 收口，进入一个受控的、单点切入的真实实现子任务**，先把最小可验证链路跑通，再逐步外扩。

## 2. 当前已具备的 facts

Phase 5 现在已经具备的，不是实现，而是足够稳定的 contract / planning 事实：

- `docs/phase-5-contract-index.md` 已建立 frozen contract 导航。
- `docs/phase-5-closeout-current-status.md` 已明确 Phase 5 当前收口事实、未完成项与非目标。
- `docs/phase-5-product-surface-ui-planning-skeleton-v0.md` 已把 Product Surface & UI 的规划骨架冻结为 docs-level contract。
- `docs/phase-5-*state-model-contract.md` 与 `docs/phase-5-*view-model-contract.md` 已分别冻结 Input / Generate / Validate / Review / Replay / History 的 state-model 与 view-model 语义。
- `docs/phase-5-review-gate-template-v0.md`、`docs/phase-5-contract-consistency-checklist-v0.md`、`docs/phase-5-docs-consistency-lint-plan.md` 已把收口、巡检与一致性约束说清。
- `docs/roadmap.md` 的 Phase 5 描述已经把目标定义为发布、registry、团队协作与 UI 的远期方向，但同时仍保持非实现态表述。

这些事实意味着：Phase 5 已经不是“目标模糊”的阶段，而是“contract 已清楚、实现待承接”的阶段。

## 3. 仍未达成的真实实现目标

以下目标目前仍未达成，不能写成已完成：

- 真实 publish 流程：版本发布、发布状态、发布记录、回滚。
- 真实 registry：本地/团队/远程索引、安装/更新/分发、版本追溯。
- 真实 team collaboration：owner / reviewer / approval / risk waiver / audit trail 的执行链路。
- 真实 UI：输入、生成、验证、回放、评审、发布、历史版本的可操作界面。
- 真实联动闭环：UI → contract / state → publish / registry → audit / rollback 的端到端串联。

换句话说，现在有的是“可冻结的文档契约”，还没有“可交付的协作与发布产品面”。

## 4. 是否适合现在进入真实实现承接

**适合。**

理由很直接：

1. contract 已经冻结到足够细的粒度，不需要再继续加一层 docs-only 收口才能开始实现。
2. 继续写 planning 文档的边际收益已经很低，下一步真正需要的是最小实现证据。
3. Phase 5 的边界风险很高，若不采用最小切口，很容易一口气滑进 UI / registry / publish 全链路大坑。
4. 当前最需要的是把“合同很完整”转成“一个最小面真的能跑”。

但这个“适合”有明确前提：**只允许最小 implementation 切口，不允许把 publish / registry / UI / team collaboration 一次性全做。**

## 5. 推荐的最小 implementation 切口

最合适的切口是：**先做一个单一 surface 的 publish-prep / registry-entry / review handoff 最小闭环**，只覆盖最基础的真实数据流，不扩展完整产品面。

建议优先顺序如下：

### 切口 A：publish-prep 入口
- 从既有 contract / state / view-model 中，挑一个最小 surface。
- 只做“发布前准备态”的真实数据承接。
- 输出最小可追踪的 publish draft / handoff 记录。

### 切口 B：registry entry 入口
- 只做一个最小 registry 元数据写入或索引登记。
- 只验证版本、来源、引用是否可追溯。
- 不做完整安装/更新/分发。

### 切口 C：review / approval 入口
- 只接一个最小 reviewer/approval 语义。
- 验证 decision、risk、blockingReasons 的真实流转。
- 不做完整团队权限体系。

### 切口 D：UI 最小 surface 入口
- 只把一个 surface 做成可见、可读、可提交的最小界面骨架。
- 仅承接一个真实动作链路，不扩到完整产品导航。

**综合来看，最小且最稳的实现切口优先建议是：`review/approval -> publish-prep -> registry-entry` 的单点链路。**

这样能把协作、发布和索引三个核心概念串起来，但仍然保留 UI 为后续承接点，而不是一开始就把产品面做大。

## 6. 如果暂不进入，还需要先补什么

如果团队判断当前还不适合进入真实实现，那么最少还需要补以下承接条件：

- 明确一个唯一的 Phase 5 实现优先 surface，而不是同时开多个 surface。
- 为该 surface 补齐最小的 data contract 与 acceptance condition。
- 明确 publish / registry 的写入边界、权限边界和回滚边界。
- 明确 UI 是否只是展示层，还是会包含交互提交；如果包含提交，必须先定义最小动作闭环。
- 补一份真实实现任务拆分，使后续任务可以按单点切口推进，而不是继续停留在规划抽象层。

这些补充都属于“承接前置条件”，不是新的产品实现。

## 7. 这为什么是当前主计划最合适的下一步

因为主计划现在最需要的不是再证明“Phase 5 很重要”，而是把它从 docs-first 收口推进到**可执行的最小真实实现入口**。

- Phase 4 之前已经证明了“contract-first / static-only 可以收口”。
- Phase 5 现在已经把协作、发布、UI 的 contract 说清了。
- 下一步最合理的节奏，不是直接做全链路，而是先把一个最小 implementation 切口立住。

这能保证：

- 不会把 docs-first closeout 误写成产品完成；
- 不会把 registry / UI / publish 一锅端；
- 能让后续任务有真实落点，而不是继续停在规划层。

## 8. 任务承接建议

建议将下一步主任务定义为：

> **Phase 5 real-implementation entry: build the minimal review/approval → publish-prep → registry-entry handoff**

如果必须更保守一点，也可以先只做：

> **Phase 5 minimal implementation entry: single-surface publish-prep contract wiring**

两者里，前者更能体现 Phase 5 的核心价值；后者更适合作为真正的第一刀。
