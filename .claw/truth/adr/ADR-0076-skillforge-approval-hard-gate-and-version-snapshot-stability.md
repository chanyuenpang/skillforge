# ADR-0076: 审批硬门禁与版本快照稳定性

## Status

accepted

## Context

E3-A 需要把两件事一起收口：一是未批准的 Run 必须被硬门禁挡住，二是 Run 一旦创建，就必须把当次消费的版本引用固定下来，不能被后续输入漂移覆盖。否则即使审批链路可用，历史 Run 也无法证明自己到底消费了哪一版 `plan` / `prompt` / `approval`。

干净实例上的真实验证已经补齐了这条链路的证据：门禁负例返回 `409` 并带审批状态锚点；门禁正例返回 `202` 并携带 `gate=passed` 与版本引用；随后同一 fixture 的后续新版本输入不会回写或污染先前 Run 的 `consumedPlanRef` / `consumedPromptRef` / `approvalRef`。

## Decision

决定将 Run 创建的长期约束固定为两条：

1. **未批准不可 Run**：`POST /api/run-center/runs` 必须在审批门禁未通过时直接阻断，返回 `409`，并携带可审计的审批状态锚点，例如 `approvalStatus`、`lastEventId`。
2. **已批准可 Run，且版本快照冻结**：当门禁通过后，Run 必须落盘 `consumedPlanRef`、`consumedPromptRef`、`approvalRef` 作为冻结快照；这些引用写入 `execution-log.jsonl` 后，不得被后续输入漂移覆盖。

这意味着 Run 的正确性不只取决于“能不能创建”，还取决于“创建时消费的是哪一版输入”，并且该证据必须可从持久化记录中重新读取。

## Alternatives Considered

- 只检查审批状态，不记录版本引用：被拒绝，因为历史 Run 无法解释消费依据。
- 只记录版本引用，不做硬门禁：被拒绝，因为未批准的 Run 会绕过治理边界。
- 允许后续写回覆盖已有 Run 的引用：被拒绝，因为这会破坏审计锚点与防漂移语义。

## Related Code

| Path | Role |
| --- | --- |
| `src/web-server.mjs` | `POST /api/run-center/runs` 的门禁与创建入口 |
| `src/approval-store.mjs` | 审批状态真源与 `approvalStatus` / `lastEventId` 锚点 |
| `src/execution-log-store.mjs` | `execution-log.jsonl` 的 append-only 持久化底座 |
| `src/execution-log.jsonl` | Run 快照与审计证据落盘文件 |

## Consequences

- 正向：未批准的 Run 被稳定阻断，减少越权执行。
- 正向：已批准的 Run 会冻结版本引用，后续版本演进不会污染历史证据。
- 正向：`409`、`202`、`gate=passed`、`consumedPlanRef`、`consumedPromptRef`、`approvalRef` 形成明确验证锚点。
- 取舍：一旦快照写入，就不能靠覆盖历史记录来修正，只能用新 Run 或新记录表达变化。
- 风险：如果查询面只展示状态而不展示快照字段，审计价值会下降。

## Search Terms

- `POST /api/run-center/runs`
- `approvalStatus`
- `lastEventId`
- `409`
- `202`
- `gate=passed`
- `consumedPlanRef`
- `consumedPromptRef`
- `approvalRef`
- `execution-log.jsonl`
- `防漂移`
