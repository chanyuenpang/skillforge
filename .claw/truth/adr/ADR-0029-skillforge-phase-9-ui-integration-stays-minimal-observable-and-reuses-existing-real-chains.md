# ADR: SkillForge Phase 9 UI & Integration 保持最小可观察面并复用既有真实链路

## Status

accepted

## Context

Phase 9 的计划记录已经把目标收得很窄：在 Runtime Replay、Generator、Product Surface 三条最小真实链路都已落地的底座上，推进最小 UI surface 与跨阶段集成。计划明确要求只收窄到“可观察/可验证”的集成面，不扩成 full UI application、full dashboard 或 full platform。

来源计划还固定了关键边界：

- UI 只做最小可观察面，不做完整应用或全功能 dashboard。
- 跨阶段集成只串已有的三条真实链路：`Runtime Replay` / `Generator` / `Product Surface`。
- 已经落地的东西被视为底座，Phase 9 只负责让它可被看见、可被验证。
- 不碰 `full collaboration`、`real-time sync`、`auth`、`multi-tenancy`。

这条决策值得沉淀，因为它会长期约束 Phase 9 以后所有 UI 与集成实现，防止“为了可见性”滑向完整产品壳层，也防止凭空发明新的集成链路。

## Decision

决定将 Phase 9 的 UI & Integration 固定为“最小可观察面 + 既有真实链路复用”的实现边界。

具体规则如下：

- UI 只允许实现最小可观察面，用于展示和验证既有底座能力，不得扩展为完整应用、完整 dashboard 或平台级壳层。
- 跨阶段集成只能串联 `Runtime Replay`、`Generator`、`Product Surface` 三条已经落地的真实链路，不得发明新的链路或新的抽象中间层。
- Phase 9 的职责是让底座“可被看见/可被验证”，而不是重新定义底座本身。
- 不引入 `full collaboration`、`real-time sync`、`auth`、`multi-tenancy` 这类超出当前阶段目标的能力边界。

## Alternatives Considered

- 直接做 full UI application：拒绝。计划明确只要求最小可观察面，完整应用会越界。
- 直接做 full dashboard / platform：拒绝。这会把 Phase 9 从集成可视化层扩成产品平台层，偏离计划目标。
- 发明新的集成链路：拒绝。计划要求只串已有的三条真实链路，不能新造路径。
- 提前加入 `auth`、`multi-tenancy`、`real-time sync`：拒绝。计划明确不碰这些边界。

## Related Code

| Path | Role |
| ---- | ---- |
| `tasks/skillforge-roadmap-master-plan/plans/subplan-10-phase-9-ui-integration/plan.json` | 来源计划记录，包含目标、rules、references 与当前任务边界。 |
| `docs/roadmap.md` | Phase 9 的路线骨架与里程碑定位。 |
| `docs/phase-5-product-surface-ui-planning-skeleton-v0.md` | UI planning skeleton 的历史边界参考。 |
| `docs/phase-5-contract-index.md` | 相关 contract 索引参考。 |

## Consequences

- 正向：后续 Phase 9 的 UI 实现范围会稳定在“可观察/可验证”层，不会漂移成完整产品壳。
- 正向：跨阶段集成只复用已有真实链路，避免新链路带来的不确定性和 truth 污染。
- 正向：`Runtime Replay`、`Generator`、`Product Surface` 的底座关系保持清晰，便于后续逐步扩展。
- 取舍：短期内不会获得 full dashboard、平台壳层、协作能力或多租户能力。
- 取舍：任何超出最小可观察面的需求，都必须另起计划或显式更新边界。
- 验证锚点：来源计划的 `rules` 与 `goal` 一致强调“最窄可观察/可验证的集成面”，且明确排除 `full collaboration`、`real-time sync`、`auth`、`multi-tenancy`。

## Search Terms

- `Runtime Replay`
- `Generator`
- `Product Surface`
- `full UI application`
- `full dashboard`
- `full platform`
- `real-time sync`
- `auth`
- `multi-tenancy`
