# Phase 3 implementation checklist: single fixture / single case runtime replay entry

> 这是 Phase 3 的**执行清单/任务骨架**，不是实现完成说明。
>
> 它只负责把当前主计划中“runtime replay 真实承接”的第一刀压成可执行顺序：从已完成的 contract-first / readiness 复评，进入 **single fixture / single case** 的最小真实实现入口。
>
> 明确边界：本文**不**宣称 runtime replay 已完成，不把 contract closeout 误写成真实执行完成，也不把 multi-case、全 scoring、全 sandbox、UI / publish / registry 的后续工作混进来。

## 0. 结论先行

当前阶段最合适的推进方式，不是扩面，而是先把 **single fixture / single case runtime replay entry** 拆成一条严格串行、局部可并行的执行链。

**第一个真正的 implementation subplan 应该是：**

**固定 single fixture / single case 的承接对象**

因为这一步决定后续所有输入、边界、校验和报告口径；如果对象不固定，后面的 metadata、transcript、report 都会漂。

## 1. 第一批可执行子任务列表（按顺序）

### T1. 固定 single fixture / single case 的承接对象

**目标**
- 选定一个最小、最稳定、最容易复核的 fixture / case 作为 runtime replay 首个承接点。
- 把“谁来跑”先钉死。

**边界**
- 只选一个 fixture / 一个 case。
- 不扩展到 case batch、multi-case orchestration。
- 不引入 UI、publish、registry、sandbox 全链路。

**依赖**
- 已有的 contract / readiness 复评文档。
- 已知的最小 replay 入口设想。

**说明**
- 这是整个 implementation subplan 的起点，也是后续所有任务的前置条件。

---

### T2. 锁定最小 replay 数据流

**目标**
- 明确从 selection 到 execution 再到 report 的最小输入输出字段。
- 把数据流画死，避免实现过程中反复改口径。

**边界**
- 只覆盖 single fixture / single case。
- 只定义最小必需字段与流转顺序。
- 不讨论完整评分体系、并发调度、跨模型矩阵。

**依赖**
- T1 固定的承接对象。
- 现有 contract 结论。

**说明**
- 这一步是执行口径固化，不是实现。

---

### T3. 设计最小 execution metadata 回填路径

**目标**
- 确认真实执行信息如何回到 report。
- 让 execution metadata 不再停留在 reserved / stub 语义。

**边界**
- 只做最小 metadata 回填。
- 不做完整 execution tracing 平台。
- 不扩展到多 case 归集。

**依赖**
- T2 的最小数据流定义。
- T1 的固定对象。

**说明**
- 如果 metadata 回填不清楚，后面的 report 只能是空壳。

---

### T4. 设计最小 transcript / evidence 记账落点

**目标**
- 定义最小可复核的 transcript / evidence 结构。
- 让 replay 至少留下可以被检视的真实记录。

**边界**
- 只要求最小记账。
- 不要求完整 transcript 体系。
- 不扩成审计/取证系统。

**依赖**
- T2 的数据流。
- T3 的 metadata 回填路径。

**说明**
- 这一步主要保证“有证据”，不是“证据体系完整”。

---

### T5. 固化 replay report 的最小验收口径

**目标**
- 明确 report 里哪些字段必须出现、哪些字段可以保守留白。
- 定义最小可接受的 replay 结果。

**边界**
- 只定义单 case 的最小验收。
- 不做完整评分，不做综合判定。
- 不把 static closeout 误写成 runtime 已完成。

**依赖**
- T3 的 metadata 回填。
- T4 的 evidence 记账。

**说明**
- 这是后续实现能否“看起来对”的门槛口径。

---

### T6. 反查是否仍保持 single case

**目标**
- 检查前述设计/实现入口有没有悄悄滑向 multi-case、scoring、UI 依赖。
- 一旦滑出边界，立刻收回。

**边界**
- 不是扩面任务。
- 只是边界审计。

**依赖**
- T1-T5 的全部成果。

**说明**
- 这是防止计划失焦的最后一道闸。

## 2. 串行 / 并行关系

### 必须串行

以下任务必须严格串行：

1. **T1 → T2**
   - 没有固定对象，就无法稳定定义数据流。

2. **T2 → T3 / T4**
   - 数据流不清，metadata 和 evidence 口径都无从落地。

3. **T3 / T4 → T5**
   - report 验收口径依赖 metadata 与 evidence 的最小定义。

4. **T5 → T6**
   - 先把口径定住，才能做边界反查。

### 可以并行

以下任务可以在前置条件满足后并行推进：

- **T3 与 T4** 可以并行
  - 前提：T2 已明确最小数据流。
  - 原因：一个聚焦 execution metadata，一个聚焦 transcript / evidence。

- **T1 的候选对象筛选** 可与既有文档复核并行
  - 但最终定案必须串行落地。

### 不能并行的点

- 不能在 T1 未完成时同时展开 T3/T4 的具体设计。
- 不能一边做 T5，一边还在改 T2 的输入输出定义。
- 不能把 T6 当成扩面入口。

## 3. 每个子任务的依赖图（简版）

```text
T1 固定承接对象
  -> T2 锁定最小数据流
     -> T3 metadata 回填
     -> T4 transcript/evidence 记账
        -> T5 report 最小验收口径
           -> T6 边界反查
```

并行分支：

```text
T2
 ├─> T3
 └─> T4
```

## 4. 当前不做什么

本 checklist 明确不做以下内容：

- multi-case
- 全 scoring
- 全 sandbox
- UI
- publish / registry
- 完整跨平台 / 跨模型矩阵
- 正式 validate 主链路接入

换句话说：这里仍然只是 Phase 3 的 **single fixture / single case runtime replay entry** 骨架，不是 runtime replay 已完成。

## 5. 这份清单和现有 Phase 3 文档的关系

本页继承并收束以下已有结论，但不重复宣称它们是实现完成：

- `docs/phase-3-followup-runtime-replay-readiness-reassessment.md`
- `docs/phase-3-provenance-contract.md`
- `docs/phase-3-provider-backed-slot-contract-checklist.md`
- `docs/runtime-replay-protocol-lightweight-design.md`
- `docs/preflight-contract-and-artifacts-design.md`
- `docs/phase-3-runtime-draft-cli-plan.md`
- `docs/phase-3-runtime-report-runner-plan.md`
- `docs/validator-contract.md`
- `docs/phase-3-implementation-subplan-single-fixture-single-case-runtime-replay-entry.md`
- `docs/roadmap.md`

其中，`docs/phase-3-implementation-subplan-single-fixture-single-case-runtime-replay-entry.md` 负责说明“为什么要这么切”，本页负责说明“先做什么、怎么排、哪里能并行”。

## 6. 结论

当前主计划在 Phase 3 上最合适的下一步，不是扩大 runtime 面，也不是转去 UI / publish，而是先按上述顺序把 **single fixture / single case runtime replay entry** 拆成可执行清单。

这一步的价值是：

- 把 readiness 复评推进到真正可执行的骨架；
- 把 runtime replay 的第一刀压到最窄；
- 为后续真正 implementation subplan 提供明确顺序与边界。

如果这一步不先落稳，后面任何扩面都容易变成“看起来在推进，实际上还在合同层打转”。
