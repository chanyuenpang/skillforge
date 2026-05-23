# Phase 5 Review Gate Template v0

> 这是一份 **docs-only review gate 模板**。它只定义 Phase 5 收口前后，人工审阅时应使用的最小复用块；不实现 runtime / tooling / automation，不新增脚本，也不把审阅门槛写成自动门槛。

## 1. 目标与边界

### 目标
- 为 Phase 5 的单页 contract 收口提供一个可复用的 review gate 模板。
- 把“是否可以进入下一步”的人工判断拆成最小、可复核的几项。
- 让 checklist、current-status、contract-index 之间的审阅口径保持一致。

### 边界
- 仅覆盖 docs 层的人工审阅模板。
- 不实现 lint、CI、脚本、机器人审阅或任何自动化 gate。
- 不描述 UI / runtime / persistence / publish 实现。
- 不替代各 surface 的 contract 文档，只提供通用审阅块。

## 2. 模板块

每次做 Phase 5 docs 收口时，建议按以下最小块填写：

### 2.1 scope
- 本次审阅覆盖的文档范围。
- 只写明确的 docs 资产，不扩展到实现层。

### 2.2 boundary
- 明确本次不审阅的内容。
- 重点标出 runtime / UI / persistence / publish 等非目标。

### 2.3 artifacts
- 需要冻结或对齐的文档资产。
- 只列真实存在、当前相关的 docs。

### 2.4 gate
- 本次收口的完成判定条件。
- 只使用 contract / docs 语义，不写成 runtime complete。

### 2.5 next step
- 审阅通过后的唯一推荐下一步。
- 不写成“已经完成系统交付”。
- 优先对齐 `phase-5-subplan-closeout-structure-v2.md` 里的 `owner_handoff_continue` 继续推进语义，并用于 closeout review 包准备。

### 2.6 owner handoff
- 最后一个任务或接续责任人。
- 对 Phase 5 收口而言，必须与 `owner_handoff_continue` 的责任语义保持一致。
- 这里不允许被 cleanup / summary / polish 等泛化动作替代。

## 3. 推荐填写格式

```md
- scope: ...
- boundary: ...
- artifacts: ...
- gate: ...
- next step: ...
- owner handoff: ...
```

## 4. 复用规则

### Must
- `scope / boundary / artifacts / gate / next step / owner handoff` 六块应保持同名。
- gate 只能描述文档收口条件，不能写成 runtime 完成条件。
- owner handoff 不能被“总结 / 收尾 / cleanup”替代。
- next step 只能有一个主方向，避免多头分叉。

### Should
- 每次新增收口页，都优先复用这个模板块，避免每页自造结构。
- 相关 status / checklist / index 页应尽量引用此模板块。

## 5. 非目标

本页明确不做以下事情：
- 不实现 runtime
- 不实现 tooling
- 不实现 automation
- 不新增脚本或 CI
- 不改 `src/`、`scripts/`、`package.json`
- 不替代具体 surface 的 contract 文档
- 不扩展新的 product surface

## 6. Related

- 上游索引：[`phase-5-contract-index.md`](./phase-5-contract-index.md)
- 当前收口：[`phase-5-closeout-current-status.md`](./phase-5-closeout-current-status.md)
- docs 一致性巡检：[`phase-5-docs-consistency-lint-plan.md`](./phase-5-docs-consistency-lint-plan.md)
- contract consistency checklist：[`phase-5-contract-consistency-checklist-v0.md`](./phase-5-contract-consistency-checklist-v0.md)
- 收口子计划结构：[`phase-5-subplan-closeout-structure-v2.md`](./phase-5-subplan-closeout-structure-v2.md)

## 7. Minimal field alignment

- `next step` 与 `owner handoff` 不是同义重复：前者描述唯一推进方向，后者描述最后承接责任。
- `owner handoff` 的默认口径应落到 `owner_handoff_continue`，避免写成模糊的“后续跟进”。
- 当前 Phase 5 的 review gate 仍只做 docs-level 审阅块，适配 Task 已冻结、Queue / Detail 仍为 draft 的现状。
- 当 `phase-5-closeout-current-status.md` 已明确 `artifacts frozen / next phase entry defined / open risks triaged` 三项均通过时，这个模板可直接复用到 closeout review 包。
- 本模板仍只定义 docs-level 审阅块，不引入任何 runtime / tooling / automation 语义。
