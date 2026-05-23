# Phase 7 generator real implementation entry hub

> 这是 Phase 7 的**正式实施入口 / index / hub**，不是 generator 已实现完成的说明。
>
> 它只负责把当前主计划中“generator real implementation”的第一刀收束成一个唯一入口：把 Phase 4 时代已经拆开的 generator 相关实施文档，归位到新的 Phase 7 milestone 语境中，形成清晰、可继续拆分的 subplan hub。
>
> 明确边界：本文**不**宣称 generator 已完成，不把 Phase 4 的 planning/static-only closeout 误写成 generator 实现完成，也不把 UI、publish、registry、runtime、multi-skill、multi-profile、全量 workflow 混进来。

## 1. Phase 7 要解决什么

Phase 7 的目标不是“把 generator 讲清楚”，而是把 **generator 真正进入实施态** 的最小入口钉住。

这意味着：

- 从 Phase 4 的 planning/static-only / closeout 承接过来；
- 把“单个 simple skill 的真实生成”作为第一刀；
- 先完成最小可执行闭环的实施规划，而不是继续扩展生成协议草案；
- 形成后续原子实施任务的唯一索引点。

## 2. Phase 7 的边界

### 2.1 只收一个实现方向

Phase 7 只承接以下范围：

- single workflow/spec input
- single simple skill generation
- 最小 SkillSpec / SkillManifest / SKILL.md 产物链路
- 最小静态验证回写
- 最小 generation run record
- 真实实施前的边界审计与收口

### 2.2 明确不进入的范围

Phase 7 明确不做、也不提前展开：

- multi-skill orchestration
- multi-profile 批处理
- UI / surface / visualization
- publish / registry / distribution
- runtime replay 全链路
- cross-platform matrix
- cross-model matrix
- full validate 主链路接入
- generator 之外的产品化外扩

### 2.3 不把旧文档语境误当当前状态

Phase 4 已经把 generator 的 planning/static-only 语境说清了，但那是**承接前的收口**，不是实现完成。

Phase 7 接住的是：

- Phase 4 的 closeout 结论；
- Phase 4 的 minimal executable chain 入口判断；
- Phase 4 的 workflow/spec、manifest、SKILL.md、validation、run record 的最小拆解。

它们在 Phase 7 里是**引用与承接关系**，不是重复定义，更不是状态回滚。

## 3. Phase 7 的完成标准

Phase 7 只有在下面这些条件都被明确后，才算进入“可实施推进”的状态；但注意，这仍然**不等于 generator 已实现完成**。

### 3.1 必须明确的完成标准

1. **首个实施对象固定**
   - 选定一个最小、最稳、最容易复核的 workflow/spec 输入样本作为 Phase 7 的首个承接对象。

2. **最小 generator 数据流固定**
   - 明确 workflow/spec → SkillSpec → SkillManifest → SKILL.md skeleton → static validation → generation run record 的顺序与字段边界。

3. **最小生成输出边界固定**
   - 清楚哪些是必须生成的核心产物，哪些是 deliberate omission，哪些不允许混源。

4. **最小验证与回写边界固定**
   - 明确静态验证结果、生成版本、产物路径如何回写。

5. **边界审计通过**
   - 证明这条线没有偷渡到 UI / publish / registry / runtime / multi-skill / multi-profile。

### 3.2 Phase 7 仍然不是“已完成”

即便以上边界都定住，Phase 7 也只是：

- 进入真实实施切口；
- 具备原子任务分解入口；
- 还没有等于 generator 已经跑通。

## 4. Phase 7 的文档索引与顺序

下面是当前 Phase 7 相关文档的唯一索引顺序。建议后续所有 Phase 7 原子任务都以此为入口，不再把主计划往回污染成零散 follow-up。

### 4.1 唯一入口

1. **本页**：`docs/phase-7-generator-real-implementation-entry-hub.md`
   - Phase 7 的总入口、总索引、总边界说明。

2. `docs/phase-7-generator-real-implementation-subplan-task-index.md`
   - Phase 7 子计划内部的第一层导航：第一批原子任务顺序、串行/并行关系、首个 implementation handoff。

3. `docs/phase-7-a1-handoff-source-selection.md`
   - Phase 7 第一个真正的 execution handoff 文档。A1 的输入/输出/边界/禁止项已在此压成可执行页。

4. `docs/phase-7-a2-handoff-minimal-spec-mapping.md`
   - A2 handoff 文档。固定 workflow/spec → SkillSpec 的最小映射与字段边界。

5. `docs/phase-7-a3-handoff-manifest-mapping.md`
   - A3 handoff 文档。固定 SkillSpec → SkillManifest 的最小字段集、来源与边界约束。

6. `docs/phase-7-a4-handoff-skill-md-skeleton.md`
   - A4 handoff 文档。固定 SKILL.md skeleton 的最小内容、留白位与禁止项。

7. `docs/phase-7-a5-handoff-static-validation-and-run-record.md`
   - A5 handoff 文档。固定最小验证回写与 generation run record 的事实承载。

8. `docs/phase-7-a6-handoff-boundary-audit.md`
   - A6 handoff 文档。Phase 7 第一轮 boundary audit，A1-A6 封口后交付执行面。

### 4.2 承接自 Phase 4 的基础语境

3. `docs/phase-4-generator-real-implementation-entry-plan.md`
   - 说明为什么要把 generator 第一刀压到 minimal executable chain。
   - 这是实施入口说明，不是任务清单。

4. `docs/phase-4-generator-minimal-executable-chain-entry.md`
   - 说明最小可执行链路应如何收束，强调 simple skill / 最小产物 / 最小验证 / 最小审计。

5. `docs/phase-4-generator-implementation-task-breakdown.md`
   - 说明第一批可执行子任务的顺序、并行/串行关系、边界。
   - 这份清单在 Phase 7 语境下仍可复用，但语义上已属于 Phase 7 的前身材料。

6. `docs/phase-4-closeout.md`
   - 负责 Phase 4 contract-first / static-only 的收口结论。
   - 这是 Phase 7 的前置复盘语境，不是实现交付。

7. `docs/phase-4-planning-skeleton-v0.md`
   - 负责 Phase 4 的 planning skeleton 里程碑与边界。

8. `docs/phase-4-workflow-spec-input-contract.md`
   - 负责 workflow/spec 输入侧的最小契约。

### 4.3 相关但不纳入 Phase 7 主线的旧合同文档

以下文档仍然相关，但属于 Phase 4/前置合同背景，不再作为 Phase 7 的主线拆解入口：

- `docs/acceptance.md`
- `docs/data-structure.md`
- `docs/workflow.md`
- `docs/validator-contract.md`
- `docs/roadmap.md`

它们提供 contract / process / boundary 依据，但不再承担 Phase 7 的入口索引职责。

## 5. 哪些属于 subplan 内部拆解，哪些不再进入主计划

### 5.1 仍属于 Phase 7 subplan 内部拆解的内容

以下内容可以继续在 Phase 7 内部分解成原子子任务：

- 首个 workflow/spec 承接对象选择
- workflow/spec → SkillSpec 的最小字段定义
- SkillSpec → SkillManifest 的最小字段定义
- SKILL.md skeleton 的最小内容与保留位
- static validation 回写与 generation run record 的最小事实集
- 边界审计与误扩面回收

### 5.2 不再进入主计划的内容

以下内容即使在 Phase 7 讨论，也不应重新塞回主计划：

- Phase 4 planning/static-only closeout 的重复回放
- 把 generator planning skeleton 继续扩成更大协议文档
- multi-skill / multi-profile / UI / publish / registry / runtime 的扩面路线
- 任何“顺手把 SkillForge 产品面做全”的叙述
- 任何将 static / contract / draft 口径误写成 generator completed 的表述

## 6. 与旧 Phase 4 docs / closeout 的关系

Phase 7 不是推翻 Phase 4。

更准确地说：

- **Phase 4** 负责把 generator 的 planning / static-only 收口；
- **Phase 7** 负责把这个收口承接成真实实施入口；
- Phase 4 相关文档是前置依据；
- Phase 7 相关文档是实施入口与分解索引。

因此，旧 Phase 4 docs 的正确用法是：

- 作为边界依据引用；
- 作为术语与 contract 语境引用；
- 作为“为什么只能先单 workflow / 单 skill”的背景引用。

不是：

- 再次把 Phase 4 收口写一遍；
- 把 Phase 4 文档当作 Phase 7 的实现结果；
- 把 contract closeout 误读为 generator 完成。

## 7. 主计划里的定位

在当前主计划语境下，Phase 7 是最合适的下一步，因为它做的是：

- 把 generator 从“已收口的规划阶段”推进到“可执行实施阶段”；
- 把零散的 Phase 4 implementation 痕迹收束成一个唯一 hub；
- 保持 docs-only，避免污染代码与实现面；
- 给后续原子 subtask 提供统一入口，减少主计划碎片化。

## 8. 结论

Phase 7 现在最需要的不是再补一堆 follow-up，而是先有一个**正式、唯一、可索引**的实施入口。

这份 hub 的作用就是把现有 Phase 4 implementation docs 重新编排进 Phase 7 语境：

- 承接合同收口；
- 固定第一刀；
- 明确顺序；
- 明确边界；
- 明确仍未完成。

这不是 generator 已实现，只是它终于开始进入“该怎么真正做”的阶段。
