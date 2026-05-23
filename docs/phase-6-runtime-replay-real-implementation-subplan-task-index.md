# Phase 6 runtime replay real implementation: first atomic task index

> 这是 Phase 6 子计划内部的**第一层导航 / 原子执行清单索引**，不是 runtime replay 已完成说明。
>
> 它只做一件事：把当前 Phase 6 语境里已经存在的 implementation docs 收敛成**可按顺序执行的第一批原子任务**，并标清哪些可并行、哪些必须串行、哪一项应作为第一个真正的 execution handoff。
>
> 明确边界：本文**不**扩 multi-case，不做 scoring / sandbox / UI / publish，不进代码，只做 docs-level 的执行骨架收束。

## 1. 这份索引的定位

Phase 6 已经有正式入口 hub：`docs/phase-6-runtime-replay-real-implementation-entry-hub.md`。

本页是它下面的**第一批原子执行清单**：

- 把已有 implementation docs 排成一个稳定顺序；
- 说明哪些是前置、哪些可并行；
- 指定第一个真正该交给执行面的 handoff；
- 维持“仍在 subplan 内部”的语义，不把它写成 runtime replay 完成。

## 2. 第一批原子任务列表（按顺序）

### A1. 固定首个承接对象 ← 第一个 execution handoff

**对应现有 docs**
- `docs/phase-6-a1-handoff-target-object.md` ← handoff-ready 执行页
- `docs/phase-3-single-fixture-single-case-target-selection.md`
- `docs/phase-3-implementation-subplan-single-fixture-single-case-runtime-replay-entry.md`

**任务内容**
- 选定一个最小、最稳、最容易复核的 single fixture / single case 承接对象。
- 把“谁来跑”先钉死。

**性质**
- 这是 Phase 6 第一刀的前置锚点。
- 没有它，后面的数据流、metadata、report 都会漂。

---

### A2. 固定最小 replay 数据流 ← 第二个 execution handoff

**对应现有 docs**
- `docs/phase-6-a2-handoff-minimal-data-flow.md` ← handoff-ready 执行页
- `docs/phase-3-minimal-replay-data-flow.md`
- `docs/phase-3-implementation-checklist-single-fixture-single-case-runtime-replay-entry.md`

**任务内容**
- 固定 selection → execution → metadata → transcript/evidence → report 的最小字段与顺序。
- 只收最小必需字段，不扩到评分矩阵或并发调度。

**性质**
- 这是执行口径固化，不是实现扩面。

---

### A3. 固定 execution metadata 回填边界 ← 第三个 execution handoff

**对应现有 docs**
- `docs/phase-6-a3-handoff-execution-metadata.md` ← handoff-ready 执行页
- `docs/phase-3-execution-metadata-backfill-path.md`

**任务内容**
- 明确最小 execution identity、selection lineage、observed status、evidence linkage 的回填规则。
- 区分 truth payload、reserved/stub、不可混源部分。

**性质**
- 这一步是让 report 不再只剩占位语义的关键环节。

---

### A4. 固定 transcript / evidence 最小记账 ← 第四个 execution handoff

**对应现有 docs**
- `docs/phase-6-a4-handoff-transcript-evidence.md` ← handoff-ready 执行页
- `docs/phase-3-transcript-evidence-minimal-accounting-slot.md`

**任务内容**
- 定义最小可复核 transcript / evidence 结构。
- 只要求留下可检视的记录，不做完整审计系统。

**性质**
- 这一步负责“有证据”，不是“证据体系完整”。

---

### A5. 固定 replay report 的最小验收口径 ← 第五个 execution handoff

**对应现有 docs**
- `docs/phase-6-a5-handoff-replay-report-acceptance.md` ← handoff-ready 执行页
- `docs/phase-3-replay-report-minimal-acceptance.md`

**任务内容**
- 明确 report 里必须出现什么、可以保守留白什么、不能伪装成什么。
- 定义最小可接受的 replay 结果口径。

**性质**
- 这是后续执行是否真正闭环的门槛。

---

### A6. 做 single-case boundary audit ← 第六个 execution handoff

**对应现有 docs**
- `docs/phase-6-a6-handoff-boundary-audit.md` ← handoff-ready 执行页
- `docs/phase-3-single-case-boundary-audit.md`

**任务内容**
- 反查 A1-A5 有没有滑向 multi-case、scoring、sandbox、UI、publish。
- 一旦越线，立刻收回。

**性质**
- 这是防止计划失焦的最后闸门。

## 3. 串行 / 并行关系

### 必须严格串行

1. **A1 → A2**
   - 没有固定对象，就无法稳定定义数据流。

2. **A2 → A3 / A4**
   - 数据流不清，metadata 与 evidence 的边界都无法落地。

3. **A3 / A4 → A5**
   - report 验收口径依赖 metadata 与 evidence 的最小定义。

4. **A5 → A6**
   - 先把口径定住，才能做边界反查。

### 可以并行

- **A3 与 A4 可以并行**
  - 前提：A2 已经固定最小数据流。
  - 原因：一个聚焦 metadata，一个聚焦 transcript / evidence。

- **A1 的候选对象复核** 可与已有文档对照并行
  - 但最终定案必须先于 A2。

### 不可并行的点

- 不能在 A1 未完成时同时展开 A3/A4 的具体设计。
- 不能一边改 A5，一边还在改 A2 的输入输出定义。
- 不能把 A6 当作扩面入口。

## 4. 第一个真正的 execution handoff 是什么

**第一个真正的 execution handoff 应该是 A1：固定首个承接对象。**

原因很简单：

- 它是后续所有执行定义的唯一锚点；
- 它决定后续 metadata、transcript、report 的对象边界；
- 它是从“文档说得通”切到“执行能落点”的第一个动作。

换句话说：

- **A1 是第一个真正交给执行面的 handoff**；
- A2-A6 都是围绕 A1 展开的顺序化落实。

## 5. 哪些任务是严格串行，哪些可并行

### 严格串行任务
- A1 固定首个承接对象
- A2 固定最小 replay 数据流
- A5 固定 report 最小验收口径
- A6 boundary audit

### 可并行任务
- A3 execution metadata 回填边界
- A4 transcript / evidence 最小记账

前提是：A2 已经完成。

## 6. 这仍然只是 subplan 内部执行骨架

本文是 Phase 6 subplan 的内部骨架，不是 runtime replay 已完成。

这里的“完成”只表示：

- 有了唯一入口 hub；
- 有了第一批原子任务顺序；
- 有了串行/并行边界；
- 有了第一个 execution handoff；
- 但还**没有**把 runtime replay 说成已实现完成。

## 7. 不进入主计划的内容

以下内容不再回灌到主计划层：

- Phase 3 contract closeout 的重复回放
- multi-case / scoring / sandbox / UI / publish 的扩面路线
- 真实 runtime 已完成的误宣称
- 把 subplan index 误写成产品里程碑结论

## 8. 结论

当前最合适的下一步，不是继续扩入口，也不是把主计划往回堆 follow-up，而是把 Phase 6 的实施顺序先钉成一页能直接执行的 index。

这页的价值是：

- 把现有 implementation docs 排成真正可推进的顺序；
- 明确第一刀从哪儿交出去；
- 明确哪些可以并行，哪些必须串行；
- 保持 Phase 6 仍然是“准备进入真实实施”，而不是“已经完成实施”。
