# Phase 6 runtime replay real implementation entry hub

> 这是 Phase 6 的**正式实施入口 / index / hub**，不是实现完成说明。
>
> 它只负责把当前主计划中“runtime replay real implementation”的第一刀收束成一个唯一入口：把 Phase 3 时代已经拆开的 single fixture / single case replay 相关实施文档，归位到新的 Phase 6 milestone 语境中，形成清晰、可继续拆分的 subplan hub。
>
> 明确边界：本文**不**宣称 runtime replay 已完成，不把 Phase 3 contract closeout 误写成 runtime 已落地，也不把 multi-case、scoring、sandbox、UI、publish、registry、cross-platform、cross-model 混进来。

## 1. Phase 6 要解决什么

Phase 6 的目标不是“把 runtime replay 讲清楚”，而是把 **runtime replay 真正进入实施态** 的最小入口钉住。

这意味着：

- 从 Phase 3 的 contract-first / readiness closeout 承接过来；
- 把“单 fixture / 单 case 的真实 replay”作为第一刀；
- 先完成最小可执行闭环的实施规划，而不是继续扩展协议草案；
- 形成后续原子实施任务的唯一索引点。

## 2. Phase 6 的边界

### 2.1 只收一个实现方向

Phase 6 只承接以下范围：

- single fixture
- single case runtime replay
- 最小 execution metadata 回填
- 最小 transcript / evidence 记账
- 最小 replay report 事实承载
- 真实实施前的边界审计与收口

### 2.2 明确不进入的范围

Phase 6 明确不做、也不提前展开：

- multi-case orchestration
- scoring / rubric engine
- sandbox isolation / enforcement
- UI / surface / visualization
- publish / registry / distribution
- cross-platform matrix
- cross-model matrix
- full validate 主链路接入
- runtime replay 之外的产品化外扩

### 2.3 不把旧文档语境误当当前状态

Phase 3 已经把 runtime replay 的 contract / boundary / readiness 说清了，但那是**承接前的收口**，不是实现完成。

Phase 6 接住的是：

- Phase 3 的 contract closeout 结论；
- Phase 3 的 single-fixture / single-case 入口判断；
- Phase 3 的 replay 数据流、metadata、transcript、report、boundary audit 的最小拆解。

它们在 Phase 6 里是**引用与承接关系**，不是重复定义，更不是状态回滚。

## 3. Phase 6 的完成标准

Phase 6 只有在下面这些条件都被明确后，才算进入“可实施推进”的状态；但注意，这仍然**不等于 runtime replay 已经实现完成**。

### 3.1 必须明确的完成标准

1. **首个实施对象固定**
   - 选定一个最小、最稳、最容易复核的 fixture / case 作为 Phase 6 的首个承接对象。

2. **最小 replay 数据流固定**
   - 明确 selection → execution → metadata → transcript/evidence → report 的顺序与字段边界。

3. **最小 execution metadata 回填边界固定**
   - 清楚哪些是 truth payload，哪些只是 reserved / stub，哪些不允许混源。

4. **最小 transcript / evidence 记账边界固定**
   - 明确哪些内容必须能被检视，哪些只是引用位。

5. **最小 replay report 验收口径固定**
   - 明确报告能表达什么，不能伪装成什么。

6. **边界审计通过**
   - 证明这条线没有偷渡到 multi-case / scoring / sandbox / UI / publish。

### 3.2 Phase 6 仍然不是“已完成”

即便以上边界都定住，Phase 6 也只是：

- 进入真实实施切口；
- 具备原子任务分解入口；
- 还没有等于 runtime replay 已经跑通。

## 4. Phase 6 的文档索引与顺序

下面是当前 Phase 6 相关文档的唯一索引顺序。建议后续所有 Phase 6 原子任务都以此为入口，不再把主计划往回污染成零散 follow-up。

### 4.1 唯一入口

1. **本页**：`docs/phase-6-runtime-replay-real-implementation-entry-hub.md`
   - Phase 6 的总入口、总索引、总边界说明。

2. `docs/phase-6-runtime-replay-real-implementation-subplan-task-index.md`
   - Phase 6 子计划内部的第一层导航：第一批原子任务顺序、串行/并行关系、首个 execution handoff。

3. `docs/phase-6-a1-handoff-target-object.md`
   - Phase 6 第一个真正的 execution handoff 文档。A1 的输入/输出/边界/禁止项已在此压成可执行页。

4. `docs/phase-6-a2-handoff-minimal-data-flow.md`
   - A2 handoff 文档。固定 selection → execution → metadata → transcript/evidence → report 的最小数据流与同源规则。

5. `docs/phase-6-a3-handoff-execution-metadata.md`
   - A3 handoff 文档。固定 execution metadata 最小字段集、来源与同源约束。

6. `docs/phase-6-a4-handoff-transcript-evidence.md`
   - A4 handoff 文档。固定 transcript / evidence 最小记账 slot 与 truth 边界。

7. `docs/phase-6-a5-handoff-replay-report-acceptance.md`
   - A5 handoff 文档。固定 replay report 最小允许表达与单向消费边界。

8. `docs/phase-6-a6-handoff-boundary-audit.md`
   - A6 handoff 文档。Phase 6 第一轮 boundary audit，A1-A6 封口后交付执行面。

### 4.2 承接自 Phase 3 的基础语境

3. `docs/phase-3-followup-runtime-replay-readiness-reassessment.md`
   - 说明 Phase 3 contract closeout 之后，是否已经具备真实 runtime replay 承接入口。
   - 这是 Phase 6 的前置复盘语境，不是实现交付。

4. `docs/phase-3-implementation-subplan-single-fixture-single-case-runtime-replay-entry.md`
   - 说明为什么要把 runtime replay 第一刀压到 single fixture / single case。
   - 这是实施入口说明，不是任务清单。

5. `docs/phase-3-implementation-checklist-single-fixture-single-case-runtime-replay-entry.md`
   - 说明第一批可执行子任务的顺序、并行/串行关系、边界。
   - 这份清单在 Phase 6 语境下仍可复用，但语义上已属于 Phase 6 的前身材料。

6. `docs/phase-3-single-fixture-single-case-target-selection.md`
   - 负责首个承接对象的选择决策。

7. `docs/phase-3-minimal-replay-data-flow.md`
   - 负责最小 replay 数据流的边界。

8. `docs/phase-3-execution-metadata-backfill-path.md`
   - 负责 execution metadata 回填路径。

9. `docs/phase-3-transcript-evidence-minimal-accounting-slot.md`
   - 负责 transcript / evidence 最小记账边界。

10. `docs/phase-3-replay-report-minimal-acceptance.md`
   - 负责 replay report 的最小验收口径。

11. `docs/phase-3-single-case-boundary-audit.md`
   - 负责单 case 边界反查与误扩面审计。

### 4.3 相关但不纳入 Phase 6 主线的旧合同文档

以下文档仍然相关，但属于 Phase 3/前置合同背景，不再作为 Phase 6 的主线拆解入口：

- `docs/runtime-replay-protocol-lightweight-design.md`
- `docs/preflight-contract-and-artifacts-design.md`
- `docs/phase-3-runtime-draft-cli-plan.md`
- `docs/phase-3-runtime-report-runner-plan.md`
- `docs/phase-3-provider-backed-slot-contract-checklist.md`
- `docs/phase-3-provenance-contract.md`
- `docs/validator-contract.md`
- `docs/roadmap.md`

它们提供 contract / protocol / guard 依据，但不再承担 Phase 6 的入口索引职责。

## 5. 哪些属于 subplan 内部拆解，哪些不再进入主计划

### 5.1 仍属于 Phase 6 subplan 内部拆解的内容

以下内容可以继续在 Phase 6 内部分解成原子子任务：

- 首个 fixture / case 的承接对象选择
- selection / execution / report 的最小字段定义
- execution metadata 的最小回填规则
- transcript / evidence 的最小记账规则
- replay report 的最小事实集与拒绝伪装规则
- 边界审计与误扩面回收

### 5.2 不再进入主计划的内容

以下内容即使在 Phase 6 讨论，也不应重新塞回主计划：

- Phase 3 的 contract closeout 细节回放
- 把 replay protocol 草案继续扩成更大协议文档
- multi-case / scoring / sandbox / UI / publish / registry 的扩面路线
- 任何“顺手把 runtime 体系做全”的叙述
- 任何将 static / contract / draft 口径误写成 runtime completed 的表述

## 6. 与旧 Phase 3 docs / contract closeout 的关系

Phase 6 不是推翻 Phase 3。

更准确地说：

- **Phase 3** 负责把 contract / boundary / readiness 收口；
- **Phase 6** 负责把这个收口承接成真实实施入口；
- Phase 3 相关文档是前置依据；
- Phase 6 相关文档是实施入口与分解索引。

因此，旧 Phase 3 docs 的正确用法是：

- 作为边界依据引用；
- 作为术语与 contract 语境引用；
- 作为“为什么只能先单 fixture / 单 case”的背景引用。

不是：

- 再次把 Phase 3 收口写一遍；
- 把 Phase 3 文档当作 Phase 6 的实施结果；
- 把 contract closeout 误读为 runtime replay 完成。

## 7. 主计划里的定位

在当前主计划语境下，Phase 6 是最合适的下一步，因为它做的是：

- 把 runtime replay 从“已收口的合同阶段”推进到“可执行实施阶段”；
- 把零散的 Phase 3 implementation 痕迹收束成一个唯一 hub；
- 保持 docs-only，避免污染代码与实现面；
- 给后续原子 subtask 提供统一入口，减少主计划碎片化。

## 8. 结论

Phase 6 现在最需要的不是再补一堆 follow-up，而是先有一个**正式、唯一、可索引**的实施入口。

这份 hub 的作用就是把现有 Phase 3 implementation docs 重新编排进 Phase 6 语境：

- 承接合同收口；
- 固定第一刀；
- 明确顺序；
- 明确边界；
- 明确仍未完成。

这不是 runtime replay 已实现，只是它终于开始进入“该怎么真正做”的阶段。