# ADR: SkillForge Retro Finalized 证据锚点守卫与重复 finalize 拒绝

## Status

accepted

## Context

这次 E4-A 的关键，不只是 Retro 能从 `draft` 进入 `finalized`，而是把最小合法 finalize 路径的守卫固定下来：`evidenceAnchors` 不能为空、`finalized` 之后不能再次 `finalize`，并且最终记录必须保留最小可追溯的 evidence anchor。若不把这套约束沉淀成 ADR，后续很容易把“完成态”误写成纯状态切换，而丢掉追溯性和幂等边界。

## Decision

决定将 Retro 的完成规则补充并固定为：

1. `createRetro()` 进入 `draft` 仍是唯一起点，`finalizeRetro()` 是进入 `finalized` 的唯一完成路径。
2. `finalizeRetro()` 必须携带非空 `evidenceAnchors`，空 `evidenceAnchors` 必须被拒绝。
3. 已经处于 `finalized` 的 Retro 不允许再次 `finalize`，重复 finalize 必须被拒绝。
4. `finalized` 记录必须保留最小可追溯的 evidence anchor，并与 `run` / `evidence` 绑定的真实样本验证保持一致。
5. `decision=backfill_deferred`、`coverageScope`、`nonCoverageScope` 仍作为合法 finalize 语义的一部分存在，但它们不能替代证据锚点守卫。

## Alternatives Considered

- 允许空 `evidenceAnchors` 通过：被拒绝，因为这会让 `finalized` 丧失最小追溯能力。
- 允许 `finalized` 记录再次 `finalize`：被拒绝，因为会破坏完成态幂等边界。
- 只记录 `decision`，不要求证据锚点：被拒绝，因为计划已明确需要最小可追溯锚点。

## Related Code

| Path | Role |
| --- | --- |
| `src/skillforge/retro-store.mjs` | `createRetro()` / `finalizeRetro()` 的状态守卫与 finalize 拒绝逻辑 |
| `src/skillforge/retro-record.mjs` | Retro 最小记录结构与 evidence anchor 承载点 |
| `src/skillforge/loader.mjs` | 上层消费 Retro 结构化结果的入口 |
| `plans/subplan-11-subplan-e4a-retro-finalized真实执行.json` | 本次完成记录、任务 done 事实与验证锚点 |

## Consequences

- 正向：`draft -> finalized` 的合法路径被收紧为最小可追溯闭环。
- 正向：空证据锚点、重复 finalize 这两类回归会被明确挡住。
- 正向：后续真实样本可以直接复用这条最小合法路径，不用重新定义完成语义。
- 取舍：完成态不再允许“先标记完成、后补追溯锚点”的松散做法。
- 风险：如果调用方没有先准备好 evidence anchor，就会在 finalize 阶段失败，需要提前组织输入。
- 验证锚点：本次真实验证已确认 `createRetro` 成功进入 `draft`、`finalizeRetro` 在非空 `evidenceAnchors` 下成功进入 `finalized`、空 `evidenceAnchors` 被拒绝、已 `finalized` 再次 `finalize` 被拒绝。

## Search Terms

- `createRetro`
- `finalizeRetro`
- `evidenceAnchors`
- `backfill_deferred`
- `coverageScope`
- `nonCoverageScope`
- `draft`
- `finalized`
