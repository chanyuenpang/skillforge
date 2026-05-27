# ADR: Run Detail 的 transcript 锚点可回看但内容为空时仍保留链路可达性

## Status

accepted

## Context

E3-B 的真实验证表明，run → approval → history 的对象链连续性已经成立，`evidence.transcript` 锚点也存在且可回看；但当前 transcript 引用数为 `0`，`refs=[]`。这说明问题不在链路断裂，而在证据内容尚未形成。

如果把这种状态直接当成“链路失败”处理，会误伤已经建立好的回看路径；如果把它当成“证据已完整”，又会掩盖真实的空引用状态，给后续 `E3-C` 结论收口制造假象。

## Decision

决定将 run detail 的 transcript 证据状态区分为两层：

1. **链路可达性**：`evidence.transcript` 锚点存在，说明 run 侧可以回看 transcript 入口。
2. **内容完整性**：`count` 与 `refs` 反映实际引用内容是否已落入证据层。

当 `anchorType` 可用、锚点可回看，但 `count=0` 且 `refs=[]` 时，结论应标记为“链路通过、内容为空”，而不是“断链”。

## Alternatives Considered

- 直接把 `count=0` 视为断链：被拒绝，因为锚点已经存在，断链与空内容不是同一问题。
- 直接把锚点存在视为证据完整：被拒绝，因为会掩盖 `refs=[]` 的真实空状态。
- 只在 E3-C 再统一判断：被拒绝，因为 E3-B 已经给出了稳定的空引用事实，应提前沉淀为长期判定规则。

## Related Code

| Path | Role |
| --- | --- |
| `plans/subplan-9-subplan-e3-b-证据回看与对象链连续性真实验证.json` | 本次真实验证记录，包含 `run→approval→history` 连续性与 `evidence.transcript` 空引用事实 |
| `web-server.mjs` | `buildRunDetail()` / transcript evidence 展示入口 |

## Consequences

- 正向：后续验收可以明确区分“链路可达”与“证据内容完整”，避免把空内容误判为断链。
- 正向：`E3-C` 可以在已有链路成立的前提下，专注做综合 verdict 收口，而不是重复追查已成立的对象链。
- 取舍：当 transcript 仍为空时，系统会保留一个“半成功”状态，需要在报告里更精细地表述。
- 验证锚点：`evidence.transcript` 存在、`count=0`、`refs=[]` 仍应被解释为“有链但内容为空”。

## Search Terms

- `evidence.transcript`
- `anchorType`
- `count`
- `refs`
- `run→approval→history`
- `断链`
- `空引用`
- `对象链连续性`
