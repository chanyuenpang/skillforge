# ADR: SkillForge Retro Structured Finalized 三分法与证据锚点治理

## Status

accepted

## Context

这次收口的核心，不是单纯把 Retro 做成可用存储，而是把 Retro 的最小真实结构化完成链路固定下来：`draft -> finalized`、三分法 decision、证据锚点守卫，以及 loader 暴露。若不把这条链路沉淀为长期约束，后续很容易再次把“结构化完成”退化成文档说明，或把 `coverageScope` / `nonCoverageScope` / `evidenceAnchors` 的边界写散。

## Decision

决定将 Retro 的结构化完成规则固定为：

1. Retro 只承认 `draft` 和 `finalized` 两个状态，完成态必须通过 `finalizeRetro()` 进入 `finalized`。
2. Retro 的决策必须使用三分法：`backfill_allowed`、`backfill_deferred`、`evidence_required`。
3. `evidenceAnchors`、`coverageScope`、`nonCoverageScope` 是最小边界字段，必须受守卫约束，不能无边界落库。
4. `loader.mjs` 必须暴露 Retro 的构造与查询能力，保证上层可以直接消费真实结构化链路。
5. Retro 的完成态以最小真实调用样本验证为准，核心验证链路是 `createRetro -> finalizeRetro -> history/state`，而不是单靠文档描述。

## Alternatives Considered

- 继续把 Retro 只作为文档层总结：被拒绝，因为这会让完成态缺乏可执行结构。
- 把决策二分化成“可回沉 / 不可回沉”两类：被拒绝，因为计划已经明确需要 `backfill_allowed`、`backfill_deferred`、`evidence_required` 三分法来保留证据缺口状态。
- 不要求 `loader.mjs` 暴露：被拒绝，因为上层无法稳定接入真实链路。

## Related Code

| Path | Role |
| --- | --- |
| `src/skillforge/retro-record.mjs` | Retro 记录对象与结构化字段入口 |
| `src/skillforge/retro-store.mjs` | Retro 状态转移、三分法与守卫逻辑 |
| `src/skillforge/loader.mjs` | Retro 能力暴露入口 |
| `plans/subplan-5-subplan-e1-e-retro结构化完成真实执行.json` | 本次完成记录、任务 done 事实与验证锚点 |

## Consequences

- 正向：Retro 的最小真实结构化链路被固定，后续可以直接接续真实样本与回沉治理。
- 正向：`draft -> finalized`、三分法与证据锚点守卫成为长期约束，减少回归成纯文本记录的风险。
- 正向：上层通过 `loader.mjs` 可以稳定消费 Retro 能力。
- 取舍：本 ADR 只固定最小结构化闭环，不承诺更大范围的 Skeleton 回沉执行。
- 风险：如果后续把三分法理解成一般分类标签，而不是带证据缺口语义的决策门槛，会削弱治理价值。
- 验证锚点：最小真实调用样本已验证 `createRetro = draft`、非法 `finalize` 被拒、合法 `finalize = finalized`、重复 `finalize` 被拒、history 为 `draft -> finalized`。

## Search Terms

- `createRetro`
- `finalizeRetro`
- `getRetroState`
- `listRecentRetros`
- `listRetroHistory`
- `backfill_allowed`
- `backfill_deferred`
- `evidence_required`
- `evidenceAnchors`
- `coverageScope`
- `nonCoverageScope`
