# ADR: E3-C 综合 verdict 真实执行：E3 带保留通过并进入 E4-A 的条件

## Status

accepted

## Context

E3-C 的职责不是继续做功能实现，而是把 E3-A 与 E3-B 的真实验证结果收口成一个可长期引用的综合判断。当前需要明确的不是“是否有进展”，而是：E3 是否整体通过、哪些能力已被真实验证、哪些缺口仍需保留、以及是否可以进入 E4-A。

本次收口中，门禁、对象链和版本快照稳定性已经达到通过要求；但 `evidence.transcript` 侧虽然已有锚点，`refs` 和 `count` 仍为空，说明证据链定位已建立，内容层还没有真正补齐。

## Decision

决定将 E3 的综合结论固定为：**E3 整体通过，但属于带保留通过；可以进入 E4-A，但必须持续跟踪 `evidence.transcript` 为空这一已知缺口。**

具体约束如下：

1. E3 的综合 verdict 以真实验证结果为准，不再把它当作待办清单或临时观察笔记。
2. 门禁负例、门禁正例、快照防漂移、`run -> approval -> history` 对象链连续性，均视为已通过的长期事实。
3. `evidence.transcript` 的锚点存在可以作为证据链入口，但在 `refs` / `count` 为空时，不能把它解释为完整证据闭环。
4. 进入 E4-A 是允许的，但后续必须保留 `transcript` 空缺的风险备注，不能默认该缺口已经消失。

## Alternatives Considered

- 将 E3 判定为完全通过：被拒绝，因为 `evidence.transcript` 仍为空，证据内容层未完全闭合。
- 将 E3 判定为失败：被拒绝，因为门禁、对象链和快照稳定性已真实达标，整体不应否定。
- 延迟到 `transcript` 完整后再进入 E4-A：被拒绝，因为当前已满足进入下一阶段的主干条件，但需要保留缺口风险。

## Related Code

| Path | Role |
| --- | --- |
| `plans/subplan-10-subplan-e3-c综合verdict真实执行.json` | 本次综合 verdict 的来源计划，包含 `done` 任务事实与 retrospective 结论 |
| `web-server.mjs` | `run -> approval -> history` 对象链与 run detail 证据锚点的消费入口 |
| `src/skillforge/transcript-store.mjs` | `evidence.transcript` 证据内容侧的持久化与回看基础 |

## Consequences

- 正向：E3 的真实收口结论被固定下来，后续可以直接作为阶段切换依据。
- 正向：门禁、对象链、版本快照稳定性成为已确认事实，不需要在后续重复争论。
- 取舍：E3 不是无条件满分通过，`evidence.transcript` 空缺必须继续带着走。
- 风险：如果后续忽略 `refs/count` 为空这一缺口，可能误判证据闭环已完成。
- 验证锚点：综合 verdict 已确认 E3 整体通过，但属于带保留通过；可进入 E4-A。

## Search Terms

- `E3`
- `E3-A`
- `E3-B`
- `E4-A`
- `evidence.transcript`
- `refs`
- `count`
- `带保留通过`
- `run -> approval -> history`
