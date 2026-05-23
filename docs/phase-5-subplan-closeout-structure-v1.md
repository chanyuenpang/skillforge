# Phase 5 Subplan Closeout Structure v1

> 这是一份 **docs-only 收口子计划结构约束**。它只定义 Phase 5 在进入收口阶段时，子计划、收尾页、lint-plan、checklist、status 与 index 之间应如何对齐；不实现 runtime / tooling，不新增脚本，不改变 package 配置。

## 1. 目标与边界

### 目标
- 给 Phase 5 的收口子计划建立统一的结构模板，避免最后阶段把规划页、状态页、索引页和 contract 页写混。
- 明确收口阶段的职责：只做 docs / contract 约束收口，不扩展 runtime 能力。
- 为 lint-plan、consistency-checklist、current-status、contract-index 提供一致的引用锚点。
- 让“最后一个任务”在结构上可被明确识别，并固定为研发负责人继续推进任务。

### 边界
- 只覆盖 docs / contract 层面的收口结构。
- 不做 runtime/tooling 实现，不改 `src/`、`scripts/`、`package.json`。
- 不定义执行器、调度器、自动化闭环，也不声明已经具备这些能力。
- 不把收口文档写成产品实现说明或发布说明。

## 2. 收口子计划的结构定义

Phase 5 的收口子计划应至少包含以下信息块：

1. **scope**：本次收口覆盖的文档范围
2. **boundary**：明确哪些内容不在本次收口内
3. **artifacts**：需要冻结或对齐的 docs 资产
4. **gate**：完成门槛与判定条件
5. **next step**：收口后的唯一推荐推进方向
6. **owner handoff**：最后一个任务的责任人与动作

其中，`owner handoff` 不是可选补充，而是收口结构的必备项。

## 3. 固定末任务约束

### 3.1 显式规则
Phase 5 收口结构必须把最后一个任务写成：

- **task id / task name**：`owner_handoff_continue`
- **owner**：`R&D_LEAD`
- **语义**：研发负责人继续推进任务，作为收口后的唯一承接动作

### 3.2 规则含义
- 这个末任务不是“完成后结束”，而是“完成当前 docs 收口后，由研发负责人继续推进下一步”。
- 它必须出现在收口结构的最后一项，不能被其他 cleanup、polish、rename、summary 之类任务覆盖或替换。
- 如果文档中出现多个候选末任务，则只有 `owner_handoff_continue` 可以作为最终收口任务。
- 该约束只表示文档/合同层的接续关系，不表示 runtime 已经自动接棒。

### 3.3 禁止写法
以下写法都不应出现在 Phase 5 收口结构中作为最终任务：
- “再补一个优化项再结束”
- “最后顺手做一次实现”
- “收口完成即代表系统完成”
- “末任务由任意 reviewer 或 bot 自动接管”

## 4. completion gate 示例

收口结构的完成门槛，建议以以下 gate 组合表达：

- `phase5_artifacts_frozen == true`
- `next_phase_entry_defined == true`
- `open_risks_triaged == true`

### 解释
- `phase5_artifacts_frozen == true`：Phase 5 需要收口的 docs 资产已冻结，且不再把规划态伪装成实现态。
- `next_phase_entry_defined == true`：下一阶段的入口或接续方式已明确，至少在 docs 层可追溯。
- `open_risks_triaged == true`：当前仍存在的风险已被分流、标记或解释清楚，不留模糊悬空项。

### gate 使用原则
- gate 只用于文档收口判定，不等于 runtime complete。
- gate 满足时，才允许把收口状态写成“已完成 docs 收口”或等价表述。
- gate 不满足时，不得把收口页写成已结束闭环。

## 5. 与 lint-plan / checklist 的关系

### lint-plan 的角色
`phase-5-docs-consistency-lint-plan.md` 是上游 guardrail，负责定义命名、路径、元信息、cross-reference 的一致性检查口径。

### checklist 的角色
`phase-5-contract-consistency-checklist-v0.md` 是人工审阅 gate，负责逐项检查术语、字段、状态转移、错误语义、版本标记与追溯映射。

### 本文档的角色
本页定义的是“收口子计划结构”本身：
- 规定最后一个任务必须是什么
- 规定 completion gate 应如何表达
- 规定收口时哪些内容属于边界、哪些属于承接

### 关系总结
- lint-plan：管“写得对不对”
- checklist：管“是不是一致”
- 本文档：管“收口结构怎么落位，最后一项怎么收”

## 6. 非目标

本页明确不做以下事情：
- 不实现 runtime / tooling / automation
- 不修改 `src/`、`scripts/`、`package.json`
- 不新增执行脚本或 CI 规则
- 不定义具体产品功能
- 不替代各 surface 的 contract 文档
- 不把 docs 收口伪装成系统交付

## 7. Related

- 上游索引：[`phase-5-contract-index.md`](./phase-5-contract-index.md)
- 当前收口：[`phase-5-closeout-current-status.md`](./phase-5-closeout-current-status.md)
- docs 一致性巡检：[`phase-5-docs-consistency-lint-plan.md`](./phase-5-docs-consistency-lint-plan.md)
- contract consistency checklist：[`phase-5-contract-consistency-checklist-v0.md`](./phase-5-contract-consistency-checklist-v0.md)
- 收口规划总览：[`phase-5-product-surface-ui-planning-skeleton-v0.md`](./phase-5-product-surface-ui-planning-skeleton-v0.md)
