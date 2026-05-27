# ADR: SkillForge review 事件层保持 append-only，并通过回放计算当前态

## Status

accepted

## Context

SkillForge 的 review 流程已经进入 `review / approval` 分层治理阶段。如果只保留单条可覆盖状态，就会把“发起审查”“批准”“拒绝”等关键治理动作揉成一个当前态，审计链、幂等语义和非法迁移约束都会变脆。

这次实现补上了 review 事件骨架：`ReviewRequested`、`ReviewApproved`、`ReviewRejected`。计划和实现共同指向一个稳定结论：review 层的长期形态不是可覆盖状态表，而是 append-only 事件回放机。

## Decision

决定将 SkillForge review 层固定为 **append-only event store + replayed state machine**：

1. `ReviewRequested` 只负责把一个已存在的 risk fact 拉入 `ready` 审查态。
2. `ReviewApproved` 只允许从 `ready` 进入 `approved` 终态，语义是 `decision=approve`。
3. `ReviewRejected` 只允许从 `ready` 进入 `rejected` 终态，语义是 `decision=reject`。
4. 所有 review 状态变化都必须追加写入 `review-events.jsonl`，不得覆盖旧事件。
5. 当前态必须通过事件回放计算，而不是依赖可变单条记录。
6. review 命令必须保持幂等，并以 `fixtureId` + `idempotencyKey` 作为稳定去重边界。
7. 非法迁移必须显式报错：不存在的 risk fact 不能发起 review，已终态 review 不能重复 approve/reject，非 `ready` 状态不能直接审批。
8. `reason`、`evidenceRefs`、`sourceLinks` 这类审计字段应随事件保留，供后续审批链路与排障追踪。

## Alternatives Considered

- 采用单条可覆盖状态表：拒绝。会丢失审计轨迹。
- 允许从非 `ready` 状态直接审批：拒绝。会破坏状态机约束。
- 把 `requestReview()` 理解成批准：拒绝。它只是把风险 fact 拉入待审态。
- 混用旧 `review-store.jsonl` 与新的 `review-events.jsonl`：拒绝。新链路的核心是事件追加。

## Related Code

| Path | Role |
| ---- | ---- |
| `src/skillforge/review-record.mjs` | review 事件类型、`createReviewEvent()`、`validateReviewEvent()` 的主实现锚点。 |
| `src/skillforge/review-store.mjs` | event-based 存储与状态回放入口。 |
| `scripts/test-review-event-store.mjs` | review 事件状态机与 append-only 行为的回归锚点。 |
| `adr/ADR-0045-skillforge-risk-review-approval-governance-pipeline.md` | 上层治理语义来源。 |
| `adr/ADR-0047-skillforge-risk-fact-review-approval-gating-contract-and-audit-boundary.md` | 风险事实、review、approval、gating 与 audit 的分层边界。 |

## Consequences

- 正向：审计轨迹完整保留，后续可追踪每次治理动作。
- 正向：幂等与非法迁移约束更稳定，回放即可恢复当前态。
- 正向：`requestReview()`、`approveReview()`、`rejectReview()` 的职责边界更清晰。
- 取舍：实现比单条状态表更复杂，但换来可追溯性与可验证性。
- 验证锚点：`review-events.jsonl`、`getReviewState()`、`loadReviewEvents()` 及回归脚本是后续变更的稳定检查点。

## Search Terms

- `ReviewRequested`
- `ReviewApproved`
- `ReviewRejected`
- `review-events.jsonl`
- `requestReview(fixtureId, options)`
- `approveReview(fixtureId, options)`
- `rejectReview(fixtureId, options)`
- `getReviewState(fixtureId)`
- `loadReviewEvents(fixtureId)`
- `idempotencyKey`
- `append-only`
