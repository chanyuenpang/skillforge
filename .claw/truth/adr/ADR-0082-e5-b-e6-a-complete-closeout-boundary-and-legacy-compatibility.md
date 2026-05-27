# ADR: E5-B 到 E6-A 完整收尾边界与旧调用兼容说明

## Status

accepted

## Context

P10 之后的收尾主线不是回头重做功能，而是把已经确认的残留说明、边界说明和历史行为说明收束成可复核的最终收官包，避免把挂账误当完成态。

这条主线的事实基础已经在计划里闭环：五个里程碑均为 `done`，最终裁决给出“已达到完整落地标准”。其中最关键的稳定事实是：

- `reconcile.traceable=false` 在旧调用下是设计预期，需要固定为兼容性说明，而不是缺陷回归。
- `fetchRun*` 旧别名保留为透明转发兼容层，属于历史行为分层中的保留兼容项。
- `transcript anchor-only`、`Retro finalized guard`、`generation traceability` 属于边界条件说明，必须保留为长期约束。
- “完整落地”需要最终收官包裁决，不能仅凭主链已收口就宣布结束。

## Decision

收尾阶段采用“先定义边界、再判定完整落地”的方式，并把历史行为分成三类：保留兼容、已替代、继续挂账。

- `reconcile.traceable=false` 的旧调用行为按兼容性说明处理，稳定保留，不再按缺陷口径追责。
- `fetchRun*` 旧别名作为透明转发兼容层继续保留，但仅作为 deprecated 兼容路径，不承诺长期 API。
- `transcript anchor-only`、`Retro finalized guard` 和 `generation traceability` 作为边界条件长期固化，后续实现不得突破这些约束。
- “完整落地”必须以最终收官包为准；只有当已完成项、未完成项与挂账项的边界都可复核时，才能给出最终裁决。
- 对于仍然只是说明型尾项的内容，先进入收官说明，不把它们误写成新功能或已解决实现。

## Alternatives Considered

- 直接把主链收口视为完整落地：被拒绝，因为仍有兼容说明与边界说明需要固定。
- 把 `reconcile.traceable=false` 重新按缺陷处理：被拒绝，因为计划已明确它是旧调用下的设计预期。
- 把所有尾项都当成实现任务推进：被拒绝，因为这次主线目标是收尾说明与最终裁决，不是新增能力。
- 把 `fetchRun*` 旧别名直接删除：被拒绝，因为计划已经确认它是透明转发兼容层，删除会破坏历史调用。

## Related Code

| Path | Role |
| ---- | ---- |
| `plans/subplan-p10-aftercare-完整落地收尾主线.json` | 本次收尾主线的源计划记录 |
| `web/src/api.js` | `fetchRun*` 旧别名透明转发兼容层锚点 |
| `reconcile.traceable` | 旧调用兼容性说明锚点 |
| `transcript-store` | `transcript anchor-only` 说明锚点 |
| `validateRetroRecord` | `Retro finalized guard` 相关校验锚点 |
| `finalizeRetro` | `Retro finalized guard` 相关完成链路锚点 |
| `generation traceability` | 生成可追溯性边界说明锚点 |

## Consequences

- 旧调用兼容性不再被误判为缺陷，减少重复回归讨论。
- 历史行为被明确分层，保留兼容项与已替代项不再混淆。
- 边界条件被固定成长期约束，后续实现和文档不会越界外推。
- 最终收官必须通过收官包裁决，避免把“主链已完成”误说成“整体已完整落地”。

## Search Terms

- `reconcile.traceable`
- `fetchRun*`
- `transcript anchor-only`
- `Retro finalized guard`
- `generation traceability`
- `完整落地`
- `最终收官包`