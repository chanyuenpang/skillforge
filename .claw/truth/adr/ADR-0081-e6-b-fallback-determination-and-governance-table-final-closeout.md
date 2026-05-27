# ADR: E6-B 回退判定与治理总表最终收口

## Status

accepted

## Context

E6-B 的目标不是继续补实现，而是把回写合规卡与挂账清单收敛成最终治理总表，明确回退触发器、条目级回退判定和是否可以让 P10 整体收口。

本次计划的最终结果表明：`transcript anchor-only` 口径修复、`Retro guard` 统一、以及 `anchor-only transcript` 回归防线都已达到可回写状态；而 `reconcile.traceable=false` 的旧调用兼容性说明、边界条件说明和历史行为说明仍需挂账，但不再构成新的禁写阻断。

## Decision

E6-B 采用“最终治理总表先行、回退只针对未收敛项、P10 可整体收口”的收尾策略。

具体规则是：

- 将条目划分为 `可写`、`挂账`、`禁写` 和 `回退` 四类后再做最终判定，不再把挂账项误写成主结论。
- `transcript anchor-only` 口径修复、`Retro guard` 统一和 `anchor-only transcript` 回归防线，确认进入可写结论。
- `reconcile.traceable=false` 的旧调用兼容性说明、边界条件说明和历史行为说明，继续保留为挂账项，不回退到 E5-B 之前状态。
- 只要没有新增禁写项，E6-B 就可以作为 P10 的整体收口依据。

## Alternatives Considered

- 继续把所有剩余项都留在挂账，不出最终治理总表：被拒绝，因为已具备足够稳定的可写结论，无法再用“未完成”拖住收口。
- 把 `reconcile.traceable=false` 相关说明直接写死为已解决：被拒绝，因为它们属于兼容性和历史行为说明，不应伪装成已消除的事实。
- 回退到 E5-B 之前的阻断状态：被拒绝，因为当前没有新增禁写项，且可写链路已收敛。

## Related Code

| Path | Role |
| ---- | ---- |
| `plans/subplan-16-subplan-e6-b-回退判定与治理总表真实执行.json` | 本次最终治理总表与回退判定的源计划记录 |
| `transcript-store` | `transcript anchor-only` 回归防线锚点 |
| `Retro guard` | Retro 口径统一锚点 |
| `reconcile.traceable` | 旧调用兼容性说明锚点 |
| `P10` | 主计划整体收口锚点 |

## Consequences

- E6-B 不再只是一个临时治理步骤，而是 P10 收口的正式依据。
- 可写、挂账、禁写、回退四类边界被固定，后续不会再混写。
- 旧调用兼容性与历史行为说明继续挂账，避免把说明性内容误当成已彻底消除的缺陷。

## Search Terms

- `E6-B`
- `transcript anchor-only`
- `Retro guard`
- `anchor-only transcript`
- `reconcile.traceable`
- `P10`
