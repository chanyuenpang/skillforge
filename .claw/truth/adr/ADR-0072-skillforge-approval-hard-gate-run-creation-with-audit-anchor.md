# ADR-0072: Run Creation Must Freeze Versioned Snapshot References and Audit Anchors

## Status

accepted

## Context

E1-C 子计划把 Run 创建从“只做审批门禁”推进到“真实固化执行快照”。在 `E1-A` 已稳定暴露对象链锚点字段、`E1-B` 已完成审批硬门禁真实落地的基础上，Run 在门禁放行后必须把当次获批版本真实绑定下来，否则后续的 PromptDraft / StepPlan / Approval 变更会漂移已有 Run 的语义。

此前 Run 记录只要能创建成功就够了，但这会留下一个隐患：创建当下看到的是某个获批版本，之后版本继续演进时，已有 Run 记录如果没有固定版本引用，就无法证明它当时到底消费了哪一版输入。对于需要审计、回放和复盘的执行链来说，这种漂移是不可接受的。

## Decision

决定将 Run 创建时的版本绑定规则固定为标准实现范式：

**快照字段**：Run 在审批门禁放行后，必须真实落盘 `consumedPlanRef`、`consumedPromptRef`、`approvalRef` 三个版本引用字段，作为该次 Run 的冻结快照。

**落盘位置**：这些字段必须写入 `execution-log.jsonl`，而不是只存在于 API 响应回显或内存态对象中。

**读取语义**：`run list` 与 `run detail` 必须能够读取并暴露这三个字段，使 Run 记录在后续版本演进后仍可被审计、回看和复盘。

**持久化模型**：`execution-log-store` 采用 append-only JSONL 持久化，天然形成快照语义；Run 创建记录一旦写入，不应被后续版本覆盖掉已有绑定。

**治理约束**：Run 的版本绑定必须以获批版本为准，确保 Run 不受后续版本变更影响，形成防漂移的基础约束。

## Alternatives Considered

- 只在 API 返回里带版本引用：被拒绝，因为响应回显不能作为持久化证据，无法支撑后续审计与回放。
- 只记录 Run 成功状态，不记录输入版本引用：被拒绝，因为会丢失执行消费依据，后续无法解释 Run 对应哪一版输入。
- 让 Run 记录可被后续写回覆盖：被拒绝，因为这会破坏审计锚点和快照语义，导致历史 Run 漂移。

## Related Code

| Path | Role |
| --- | --- |
| `web-server.mjs` | `runCenterRunCreate` 分支，门禁放行后写入版本绑定快照 |
| `execution-log-store` | append-only JSONL 持久化底座，承载 Run 快照记录 |
| `execution-log.jsonl` | Run 版本绑定与审计锚点的真实落盘文件 |

## Consequences

- 正向：Run 创建后即固定 `consumedPlanRef` / `consumedPromptRef` / `approvalRef`，后续版本演进不会污染历史 Run。
- 正向：`execution-log.jsonl` 成为真实审计锚点，Run 记录可被 list/detail 重新读取。
- 正向：append-only 持久化天然匹配快照语义，便于回放与追溯。
- 取舍：版本绑定一旦落盘就不应再被覆盖，后续修正必须以新 Run 或新记录方式表达。
- 验证锚点：`run list`、`run detail` 与 `execution-log.jsonl` 三处都能看到 `consumedPlanRef`、`consumedPromptRef`、`approvalRef`。

## Search Terms

- `runCenterRunCreate`
- `consumedPlanRef`
- `consumedPromptRef`
- `approvalRef`
- `execution-log-store`
- `execution-log.jsonl`
- `run list`
- `run detail`
- `append-only`
- `防漂移`
