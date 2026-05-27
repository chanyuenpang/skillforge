# ADR: E5-A 最终裁决真实执行

## Status

accepted

## Context

E5-A 需要基于 E1~E4 已完成的真实验证卡与代码实现，给出最终裁决：哪些能力已经真实覆盖，哪些问题仍需挂账，以及是否可以进入 E5-B。

此前的风险点主要集中在：`transcript` 相关引用/计数仍为空、`validateRetroRecord` 与 `finalizeRetro` 的前置 guard 在 `coverageScope` / `nonCoverageScope` 口径上不完全一致，以及旧调用路径下 `reconcile.traceable=false` 的兼容说明尚未完全固化。

## Decision

E5-A 的最终裁决采用“保留通过”策略：主链路判定为通过，但不把残留问题视为已消除，而是统一进入 E5-B 挂账清单继续处理。

具体约束是：

- E1~E4 已完成的真实执行/验证结果可以作为事实基础直接采信，不再重新回读源代码或测试来复证。
- 主链路是否可继续推进，以“真实执行证据已闭环”为准；只要核心链路成立，即允许进入下一阶段准备。
- 对于尚未收口的边界问题，统一作为挂账项保留，不在 E5-A 中强行消解。

## Alternatives Considered

- 全通过并直接关闭残留问题：被拒绝，因为 `transcript` 空缺和 guard 口径不一致仍会影响后续阶段的稳定性。
- 判定为不通过并阻断进入后续阶段：被拒绝，因为 E1~E4 主链路已经形成真实执行/验证闭环，整体能力已足以继续推进。

## Related Code

| Path | Role |
| ---- | ---- |
| `plans/subplan-13-subplan-e5-a-最终裁决真实执行.json` | 本次裁决的源计划记录与最终结论锚点 |
| `transcript-store` | 残留问题涉及的证据存储边界 |
| `validateRetroRecord` | 口径一致性检查的相关守卫锚点 |
| `finalizeRetro` | 复盘完成链路的前置守卫锚点 |
| `reconcile.traceable` | 旧调用兼容说明的约束锚点 |

## Consequences

- 主链路可继续进入 E5-B，而不是被残留问题卡死。
- 残留项必须以挂账清单方式持续跟踪，不能在后续阶段被默认遗忘。
- 后续若要收紧规则，需要统一 `coverageScope` / `nonCoverageScope` 的守卫口径，并补齐 `transcript` 相关证据闭环。

## Search Terms

- `E5-A`
- `transcript`
- `validateRetroRecord`
- `finalizeRetro`
- `coverageScope`
- `nonCoverageScope`
- `reconcile.traceable`
