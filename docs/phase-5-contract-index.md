# Phase 5 frozen contract index

## 1. 作用

本页只做 Phase 5 已冻结 contract 的导航与边界索引，不新增任何 surface，不补实现，不把 planning / contract 态写成实现态。

### 适用范围
- Input
- Generate
- Validate
- Review
- Replay

### 边界说明
- **frozen**：已冻结的 contract / state-model 语义，只允许做文档级收口与引用
- **draft**：仍在规划或待完善，不能冒充已冻结结论
- **placeholder**：仅占位，不代表能力可用，也不代表接口已存在

## 2. 总导航

| Surface | Contract 文档 | Status | 说明 |
|---|---|---|---|
| Input | [phase-5-input-view-model-contract.md](./phase-5-input-view-model-contract.md) | frozen | 输入展示层的文档级 view-model contract，承接 Input state 真相层 |
| Generate | [phase-5-generate-state-model-contract.md](./phase-5-generate-state-model-contract.md) / [phase-5-generate-view-model-contract.md](./phase-5-generate-view-model-contract.md) | frozen | 先冻结 state-model 真相层，再做 view-model 投影，均为文档级约束 |
| Validate | [phase-5-validate-state-model-contract.md](./phase-5-validate-state-model-contract.md) / [phase-5-validate-view-model-contract.md](./phase-5-validate-view-model-contract.md) | frozen | 只承接 static validator evidence；state-model-only 不等于 runtime complete |
| Review | [phase-5-review-state-model-contract.md](./phase-5-review-state-model-contract.md) / [phase-5-review-view-model-contract.md](./phase-5-review-view-model-contract.md) | frozen | 只承接已冻结的 Generate / Validate 产物，不等于 publish / replay / runtime 完成 |
| Replay | [phase-5-replay-state-contract.md](./phase-5-replay-state-contract.md) / [phase-5-replay-view-model-contract.md](./phase-5-replay-view-model-contract.md) | frozen | 只定义回放意图、来源快照引用与守卫条件，不等于真实 replay 已执行 |
| History | [phase-5-history-state-model-contract.md](./phase-5-history-state-model-contract.md) / [phase-5-history-view-model-contract.md](./phase-5-history-view-model-contract.md) | frozen | History surface 的 state-model v0 + view-model contract v0，先冻结最小真相层与投影层，再决定后续 runtime / persistence / publish 收口；view-model 已显式对齐 review gate / checklist / lint-plan / subplan / current-status 入口 |
| Task | [phase-5-task-queue-detail-contract-outline-v0.md](./phase-5-task-queue-detail-contract-outline-v0.md) | draft | 仅保留后续待补位，不在索引页预支实现结论 |
| Queue | [phase-5-task-queue-detail-contract-outline-v0.md](./phase-5-task-queue-detail-contract-outline-v0.md) | draft | 仅保留后续待补位，不在索引页预支实现结论 |
| Detail | [phase-5-task-queue-detail-contract-outline-v0.md](./phase-5-task-queue-detail-contract-outline-v0.md) | frozen | 当前仅冻结 Detail 这个更小、更稳的单点 surface，Task / Queue 仍保留为后续待补位，不在索引页预支实现结论 |
| Contract Consistency Checklist v0 | [phase-5-contract-consistency-checklist-v0.md](./phase-5-contract-consistency-checklist-v0.md) | frozen | docs-only 一致性巡检入口，覆盖六个 surface + Task 冻结入口的术语 / 字段 / 状态 / 错误语义 / 版本 / 追溯映射 |
| Review Gate Template v0 | [phase-5-review-gate-template-v0.md](./phase-5-review-gate-template-v0.md) | frozen | docs-only 人工审阅模板块，提供 scope / boundary / artifacts / gate / next step / owner handoff 的复用结构；与收口子计划结构对齐 `owner_handoff_continue` 责任语义 |
| Subplan Closeout Structure v2 | [phase-5-subplan-closeout-structure-v2.md](./phase-5-subplan-closeout-structure-v2.md) | frozen | 收口子计划结构约束，显式固定最后任务为 `owner_handoff_continue` / `R&D_LEAD`，并定义 completion gate；可作为 closeout review 包主入口之一 |
| Closeout Current Status | [phase-5-closeout-current-status.md](./phase-5-closeout-current-status.md) | frozen | closeout review 包的主事实入口，汇总 artifacts frozen / next phase entry defined / open risks triaged 三项判断；明确仅代表 docs / contract 收口，不代表实现完成 |

## 3. 收口原则

1. 只允许引用已冻结 contract；draft / placeholder 只能标注，不得升格为实现态。
2. 各 surface 之间只做单向引用与双向导航，不在索引页补写新的能力定义。
3. 任何 `ready / pass / approved` 都只表示对应 contract 语义收口，不表示 runtime complete。
4. 任何 `pending / deferred / blocked` 都是边界说明，不是“快完成了”。
5. 索引页只负责导航与边界，不负责功能说明的扩写。

## 4. Related

- 上层总览：[`phase-5-product-surface-ui-planning-skeleton-v0.md`](./phase-5-product-surface-ui-planning-skeleton-v0.md)
- 当前收口：[`phase-5-closeout-current-status.md`](./phase-5-closeout-current-status.md)
- docs 一致性巡检方案：[`phase-5-docs-consistency-lint-plan.md`](./phase-5-docs-consistency-lint-plan.md)
- contract consistency checklist：[`phase-5-contract-consistency-checklist-v0.md`](./phase-5-contract-consistency-checklist-v0.md)
- review gate template：[`phase-5-review-gate-template-v0.md`](./phase-5-review-gate-template-v0.md)
- 收口子计划结构：[`phase-5-subplan-closeout-structure-v2.md`](./phase-5-subplan-closeout-structure-v2.md)
- 相关收口：[`phase-4-closeout.md`](./phase-4-closeout.md)
- 配套约束：[`validator-contract.md`](./validator-contract.md)

## 5. 说明

后续若要扩展 History / Publish，应另起独立文档与边界，不在本索引中预支实现结论。