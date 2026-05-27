# ADR: E6-A 回写合规真实执行

## Status

accepted

## Context

E6-A 的目标是在阻断项解除后，对回写候选做真实合规判级，避免把不该回写的残留、旧调用兼容说明和边界说明误写进主结论。

本次计划把候选条目分成 `可写`、`挂账` 与风险说明三类，并明确：`transcript anchor-only` 回归防线已补齐、`Retro guard` 口径已统一、`reconcile.traceable=false` 在旧调用下属于设计预期；但未明确可直接回写的残留项、旧调用兼容性说明、边界条件说明和历史行为说明仍要保持挂账。

## Decision

E6-A 采用“分层回写、挂账不误写”的合规策略：只有已形成稳定结论且有证据锚点的条目才能进入可写回写卡，其余条目继续挂账，不得提前写死。

具体规则是：

- 先按 `可写` / `挂账` / 风险说明 分层判级，再决定是否进入后续阶段。
- `transcript anchor-only` 防线、`Retro guard` 统一口径，以及旧调用下 `reconcile.traceable=false` 的设计预期，可作为可写结论。
- 未明确可直接回写的残留项、旧调用兼容性说明、边界条件说明、历史行为说明，必须保留挂账，不能误回写为已解决事实。
- 进入后续 E6-B 的前提，是继续保持挂账边界不被突破。

## Alternatives Considered

- 把所有剩余项一并写入主回写结论：被拒绝，因为会把未收敛的兼容说明和边界说明误写死。
- 继续把所有条目都挂账不推进：被拒绝，因为 `transcript anchor-only`、`Retro guard` 与旧调用兼容预期已经形成稳定结论，可进入可写层。

## Related Code

| Path | Role |
| ---- | ---- |
| `plans/subplan-15-subplan-e6-a-回写合规真实执行.json` | 本次回写合规判级与阶段推进的源计划记录 |
| `transcript-store` | `transcript anchor-only` 回归防线锚点 |
| `Retro guard` | Retro 口径统一的约束锚点 |
| `reconcile.traceable` | 旧调用兼容预期的设计锚点 |
| `E6-B` | 后续推进阶段的边界锚点 |

## Consequences

- 回写结论不会吞掉未收敛的兼容说明和边界说明。
- 可写项与挂账项的边界被明确，后续回写更可控。
- E6-B 必须延续挂账边界，否则容易把历史行为误写成当前事实。

## Search Terms

- `transcript anchor-only`
- `Retro guard`
- `reconcile.traceable`
- `E6-A`
- `E6-B`
