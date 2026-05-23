# Phase 5 Task / Queue / Detail surface contract outline v0

> 这是一份 **docs-only 原子 surface contract**。当前只冻结 **Detail** 这个剩余最小且最稳的单点 surface；Task / Queue 仍保留为后续同样按“一页一表面”推进的待补位，不在本页同时展开。它不实现 UI / runtime / persistence / publish，不新增脚本，也不把占位索引写成能力已完成。

## 1. 选择理由

先补 **Detail**，而不是 Task / Queue，原因是：Task 已被冻结，Queue 已被写成 frozen 且在 current-status 中形成了较强的编排边界；如果继续补 Queue，文档会更容易滑向编排/调度解释，反而扩散成实现说明。Detail 是当前唯一仍保留 draft、且可以只用“状态语义 + 禁止误宣称”就完成最小收口的单点 surface，因此它是剩余最小、最稳、最不容易扩写成产品说明的下一刀。

## 2. 目标与边界

### 目标
- 冻结 Detail 这个剩余最小原子的单点 contract 入口。
- 为后续按“一个 surface、一份 contract”继续补齐时提供最小导航锚点。
- 只记录 docs 层的存在性、状态语义与收口方向，不扩写能力定义。

### 边界
- 仅作为 Phase 5 Detail surface contract 的 docs-only 冻结入口。
- 不描述真实任务调度、真实队列、详情页交互、任务执行流或数据流。
- 不实现 runtime / UI / persistence / publish。
- 不修改 `src/`、`scripts/`、`package.json`。

## 3. Detail surface contract

### 3.1 目标
- 为 Detail surface 提供一个可从 index、current-status、checklist、review gate 追溯到的最小 contract 锚点。
- 只描述 Detail 作为 surface 的文档级语义，不声明任何可执行能力。

### 3.2 边界
- Detail 仅表示“待冻结的原子详情 surface 入口”，不表示详情系统、执行器或展示层已经存在。
- 不把 Detail 写成 Task 的实现延伸，也不把 Detail 写成 Queue 的展示代称。
- 不引入任何 runtime schema、API、存储结构或发布流程。

### 3.3 状态语义
- `draft`: 说明 Detail surface 仍处于 docs-first 冻结前阶段，尚未成为可执行产品能力。
- `frozen`: 只表示文档级 contract 已冻结，不表示 UI/runtime/persistence/publish 已完成。
- `placeholder`: 只允许出现在上游索引或导航语境中，不能被解读为已实现能力。
- `pending`: 仅用于表达后续仍待补位，不可写成接近完成。

### 3.4 引用关系
- 上游索引：[`phase-5-contract-index.md`](./phase-5-contract-index.md)
- 当前收口：[`phase-5-closeout-current-status.md`](./phase-5-closeout-current-status.md)
- docs 一致性巡检：[`phase-5-docs-consistency-lint-plan.md`](./phase-5-docs-consistency-lint-plan.md)
- contract consistency checklist：[`phase-5-contract-consistency-checklist-v0.md`](./phase-5-contract-consistency-checklist-v0.md)
- review gate template：[`phase-5-review-gate-template-v0.md`](./phase-5-review-gate-template-v0.md)
- 收口子计划结构：[`phase-5-subplan-closeout-structure-v2.md`](./phase-5-subplan-closeout-structure-v2.md)

## 4. 非目标

- 不做 UI 实现
- 不做 runtime 实现
- 不做 persistence 实现
- 不做 publish 实现
- 不做工具链或 lint 机制
- 不补 Task / Queue 的具体 contract
- 不把 Detail 的 docs-only 冻结误写成产品完成

## 5. 禁止误宣称清单

- 不把 Detail 的 `draft` 说成 `frozen`
- 不把 `placeholder` 说成已可用能力
- 不把 `pending` 说成“快完成了”
- 不把 contract 收口说成 runtime complete
- 不把 Detail 误写成任务执行或队列编排的实现
- 不把 docs-only 冻结写成 UI / runtime / persistence / publish 完成

## 6. Related

- 上游索引：[`phase-5-contract-index.md`](./phase-5-contract-index.md)
- 当前收口：[`phase-5-closeout-current-status.md`](./phase-5-closeout-current-status.md)
- docs 一致性巡检：[`phase-5-docs-consistency-lint-plan.md`](./phase-5-docs-consistency-lint-plan.md)
- contract consistency checklist：[`phase-5-contract-consistency-checklist-v0.md`](./phase-5-contract-consistency-checklist-v0.md)
- review gate template：[`phase-5-review-gate-template-v0.md`](./phase-5-review-gate-template-v0.md)
- 收口子计划结构：[`phase-5-subplan-closeout-structure-v2.md`](./phase-5-subplan-closeout-structure-v2.md)
