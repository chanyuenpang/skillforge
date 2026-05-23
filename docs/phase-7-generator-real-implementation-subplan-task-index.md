# Phase 7 generator real implementation: first atomic task index

> 这是 Phase 7 子计划内部的**第一层导航 / 原子执行清单索引**，不是 generator 已完成说明。
>
> 它只做一件事：把当前 Phase 7 语境里已经存在的 implementation docs 收敛成**可按顺序执行的第一批原子任务**，并标清哪些可并行、哪些必须串行、哪一项应作为第一个真正的 implementation handoff。
>
> 明确边界：本文**不**扩 multi-skill，不做 multi-profile / UI / publish / registry / runtime，不进代码，只做 docs-level 的执行骨架收束。

## 1. 这份索引的定位

Phase 7 已经有正式入口 hub：`docs/phase-7-generator-real-implementation-entry-hub.md`。

本页是它下面的**第一批原子执行清单**：

- 把已有 implementation docs 排成一个稳定顺序；
- 说明哪些是前置、哪些可并行；
- 指定第一个真正该交给执行面的 handoff；
- 维持“仍在 subplan 内部”的语义，不把它写成 generator 完成。

## 2. 第一批原子任务列表（按顺序）

### G1. 固定首个承接对象 ← 第一个 implementation handoff

**对应现有 docs**
- `docs/phase-7-a1-handoff-source-selection.md` ← handoff-ready 执行页
- `docs/phase-4-generator-real-implementation-entry-plan.md`
- `docs/phase-4-generator-minimal-executable-chain-entry.md`

**任务内容**
- 选定一个最小、最稳、最容易复核的 workflow/spec 输入样本，作为 generator 首刀承接对象。
- 把“谁来生成”先钉死。

**性质**
- 这是 Phase 7 第一刀的前置锚点。
- 没有它，后面的 spec、manifest、SKILL.md 都会漂。

---

### G2. 固定最小 workflow/spec → SkillSpec 映射 ← 第二个 implementation handoff

**对应现有 docs**
- `docs/phase-7-a2-handoff-minimal-spec-mapping.md` ← handoff-ready 执行页
- `docs/phase-4-workflow-spec-input-contract.md`
- `docs/phase-4-generator-implementation-task-breakdown.md`

**任务内容**
- 固定 workflow/spec 进入 SkillSpec 的最小字段与顺序。
- 只收最小必需字段，不扩到通用抽取器或多 profile 分流。

**性质**
- 这是生成口径固化，不是实现扩面。

---

### G3. 固定最小 SkillSpec → SkillManifest 映射 ← 第三个 implementation handoff

**对应现有 docs**
- `docs/phase-7-a3-handoff-manifest-mapping.md` ← handoff-ready 执行页
- `docs/phase-4-generator-minimal-executable-chain-entry.md`

**任务内容**
- 明确 manifest 的最小字段集：entry / files / dependencies / permissions / compatibility。
- 只承接最小 manifest 骨架，不扩附属资源生成。

**性质**
- 这一步是让 generator 输出不再只剩 spec 的关键环节。

---

### G4. 固定最小 SKILL.md skeleton ← 第四个 implementation handoff

**对应现有 docs**
- `docs/phase-7-a4-handoff-skill-md-skeleton.md` ← handoff-ready 执行页
- `docs/phase-4-generator-implementation-task-breakdown.md`

**任务内容**
- 定义最小 frontmatter、description、边界、检查清单与流程骨架。
- 只要求骨架，不要求完整正文生成。

**性质**
- 这是 generator 的可见产物锚点，但仍是 skeleton，不是完整 skill 成品。

---

### G5. 固定最小 static validation + generation run record ← 第五个 implementation handoff

**对应现有 docs**
- `docs/phase-7-a5-handoff-static-validation-and-run-record.md` ← handoff-ready 执行页
- `docs/phase-4-closeout.md`

**任务内容**
- 明确生成结果如何回写静态验证结论、版本信息与路径信息。
- 形成最小 generation run record，但不进入 runtime 或 review 流程。

**性质**
- 这是后续执行是否真正闭环的门槛。

---

### G6. 做 single-skill boundary audit ← 第六个 implementation handoff

**对应现有 docs**
- `docs/phase-7-a6-handoff-boundary-audit.md` ← handoff-ready 执行页
- `docs/phase-4-generator-real-implementation-entry-plan.md`

**任务内容**
- 反查 G1-G5 有没有滑向 multi-skill、multi-profile、UI、publish、registry、runtime。
- 一旦越线，立刻收回。

**性质**
- 这是防止计划失焦的最后闸门。

## 3. 串行 / 并行关系

### 必须严格串行

1. **G1 → G2**
   - 没有固定对象，就无法稳定定义映射。

2. **G2 → G3 / G4**
   - 输入映射不清，manifest 与 SKILL.md 的边界都无法落地。

3. **G3 / G4 → G5**
   - 验证与 run record 依赖前两步的最小定义。

4. **G5 → G6**
   - 先把口径定住，才能做边界反查。

### 可以并行

- **G3 与 G4 可以并行**
  - 前提：G2 已经固定最小输入映射。
  - 原因：一个聚焦 manifest，一个聚焦 SKILL.md。

- **G1 的候选对象复核** 可与已有文档对照并行
  - 但最终定案必须先于 G2。

### 不可并行的点

- 不能在 G1 未完成时同时展开 G3/G4 的具体设计。
- 不能一边改 G5，一边还在改 G2 的输入输出定义。
- 不能把 G6 当作扩面入口。

## 4. 第一个真正的 implementation handoff 是什么

**第一个真正的 implementation handoff 应该是 G1：固定首个承接对象。**

原因很简单：

- 它是后续所有执行定义的唯一锚点；
- 它决定后续 spec、manifest、SKILL.md 的对象边界；
- 它是从“文档说得通”切到“执行能落点”的第一个动作。

换句话说：

- **G1 是第一个真正交给执行面的 handoff**；
- G2-G6 都是围绕 G1 展开的顺序化落实。

## 5. 哪些任务是严格串行，哪些可并行

### 严格串行任务
- G1 固定首个承接对象
- G2 固定最小 workflow/spec → SkillSpec 映射
- G5 固定 static validation + generation run record
- G6 boundary audit

### 可并行任务
- G3 manifest mapping
- G4 SKILL.md skeleton

前提是：G2 已经完成。

## 6. 这仍然只是 subplan 内部执行骨架

本文是 Phase 7 subplan 的内部骨架，不是 generator 已完成。

这里的“完成”只表示：

- 有了唯一入口 hub；
- 有了第一批原子任务顺序；
- 有了串行/并行边界；
- 有了第一个 implementation handoff；
- 但还**没有**把 generator 说成已实现完成。

## 7. 不进入主计划的内容

以下内容不再回灌到主计划层：

- Phase 4 closeout 的重复回放
- multi-skill / multi-profile / UI / publish / registry / runtime 的扩面路线
- 真实 generator 已完成的误宣称
- 把 subplan index 误写成产品里程碑结论

## 8. 结论

当前最合适的下一步，不是继续扩入口，也不是把主计划往回堆 follow-up，而是把 Phase 7 的实施顺序先钉成一页能直接执行的 index。

这页的价值是：

- 把现有 implementation docs 排成真正可推进的顺序；
- 明确第一刀从哪儿交出去；
- 明确哪些可以并行，哪些必须串行；
- 保持 Phase 7 仍然是“准备进入真实实施”，而不是“已经完成实施”。
