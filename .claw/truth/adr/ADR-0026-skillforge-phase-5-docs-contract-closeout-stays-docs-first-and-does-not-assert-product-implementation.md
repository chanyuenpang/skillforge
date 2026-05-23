# ADR: SkillForge Phase 5 docs/contract closeout 仅表示文档与契约收口，不代表产品实现完成

## Status

accepted

## Context

Phase 5 的主子计划已经完成收口，但它收口的是 `docs-first / contract-first` 资产，而不是 `UI/runtime/persistence/publish/tooling` 的产品实现。该计划明确把职责限制在正式 master subplan、surface 冻结顺序、closeout gate、review 包与 owner handoff 规则上，并且反复强调 `done` 只表示对应文档 contract 或 planning skeleton 收口，不表示产品能力已实现。

来源计划记录固定了以下事实：

- Phase 5 的目标是把分散的 `docs/contract-first` 资产收敛为一个正式主子计划，提供唯一执行骨架。
- 本子计划只推进 docs-first / contract-first 收口，不进入 `UI/runtime/persistence/publish/tooling` 实现。
- 每次只允许推进一个原子 surface 或一个最小模板约束。
- 最终 closeout 只能表示 Phase 5 docs/contract 收口完成，不能表述为 `UI/runtime/persistence/publish` 已完成。
- retrospective 明确要求，后续如果要推进真正的实现，应新开后续计划，不复用本次 docs-first closeout 子计划口径。

这条决策需要沉淀，因为它避免未来把 Phase 5 的收口结果误读成产品交付完成，也为后续真正的实现计划划清边界。

## Decision

决定将 SkillForge Phase 5 的 closeout 语义固定为“`docs/contract` 收口完成”，而不是“产品实现完成”。

具体规则如下：

- Phase 5 的 `done` 与 `end.completed` 只表示对应文档 contract、planning skeleton、review gate、closeout 包或 owner handoff 已收口。
- 不得把 Phase 5 closeout 解释为 `UI/runtime/persistence/publish/tooling` 已实现。
- 本阶段的唯一执行骨架是正式 master subplan；后续推进必须继续挂在同一收口语义下，避免混写多个 surface。
- 如果后续要继续推进真实的产品实现，应新开后续计划，不复用本次 docs-first closeout 的语义边界。

## Alternatives Considered

- 将 Phase 5 closeout 表述为产品实现完成：拒绝。计划明确未进入实现层，且 closeout 语义必须保持在 docs/contract 范围内。
- 将 closeout 和实现混为一个口径：拒绝。这样会破坏 contract-first 收口约束，也会让后续计划无法准确区分“文档已冻结”和“能力已交付”。
- 继续停留在分散文档状态，不形成正式 master subplan：拒绝。计划已经通过 master subplan 把分散资产收拢到统一骨架中。

## Related Code

| Path | Role |
| --- | --- |
| `tasks/skillforge-roadmap-master-plan/plans/subplan-6-subplan-phase-5-product-surface-master-closeout-v1.json` | 来源计划记录，包含完成态、tasks、rules 与 retrospective 结论。 |
| `docs/phase-5-product-surface-ui-planning-skeleton-v0.md` | Phase 5 总体 planning skeleton 与 surface 范围矩阵。 |
| `docs/phase-5-closeout-current-status.md` | Phase 5 closeout 基线与主入口。 |
| `docs/phase-5-contract-index.md` | Phase 5 统一索引入口。 |
| `docs/phase-5-subplan-closeout-structure-v2.md` | 收口子计划结构与 completion gate 约束。 |
| `docs/phase-5-review-gate-template-v0.md` | review gate 模板与 handoff 字段约束。 |

## Consequences

- 正向：后续引用 Phase 5 时，可以清楚区分“文档契约已冻结”与“产品能力已实现”。
- 正向：避免把 docs-first 收口误写成 UI/runtime/persistence/publish 已完成，降低 truth 污染风险。
- 正向：后续真正的实现计划可以在清晰边界上重新起步，不会被本次 closeout 语义绑死。
- 取舍：Phase 5 的收口结果不能被当作产品交付证据，必须另外建立实现计划与验证链路。
- 验证锚点：来源计划的 `rules`、`tasks` 与 `retrospective` 一致强调仅做 docs/contract 收口，不进入实现层。

## Search Terms

- `docs-first`
- `contract-first`
- `closeout-ready`
- `owner handoff`
- `retrospective`
- `UI/runtime/persistence/publish/tooling`
- `planning skeleton`
