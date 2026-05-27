# ADR-0046: SkillForge review event store 采用 append-only 事件状态机

## Status

accepted

## Context

SkillForge 的风险审查流程已经进入 `review / approval` 分层治理阶段，但早期实现如果只保留单条状态记录，会很容易把“发起审查”“批准”“拒绝”这些关键治理动作揉成一个可覆盖的当前态，导致审计链、幂等语义和非法迁移约束都变得脆弱。

这次实现补上了 review 事件骨架：`ReviewRequested`、`ReviewApproved`、`ReviewRejected` 三种事件类型，且所有状态变化都写入独立的 `review-events.jsonl`。这说明 review 层的正确长期形态不是可覆盖状态表，而是 append-only 事件回放机。

## Decision

决定将 SkillForge review 层固定为 **append-only event store + replayed state machine**：

1. `ReviewRequested` 只负责把一个已存在的 risk fact 拉入 `ready` 审查态。
2. `ReviewApproved` 只允许从 `ready` 进入 `approved` 终态，语义是 decision=approve。
3. `ReviewRejected` 只允许从 `ready` 进入 `rejected` 终态，语义是 decision=reject。
4. 所有 review 状态变化都必须追加写入 `review-events.jsonl`，不得覆盖旧事件。
5. 当前态应通过事件回放计算，而不是依赖可变单条记录。
6. review 命令必须保持幂等，并以 `fixtureId` + `idempotencyKey` 作为稳定去重边界。
7. 非法迁移必须显式抛错：不存在的 risk fact 不能发起 review，已终态 review 不能重复 approve/reject，非 `ready` 状态不能直接审批。
8. `reason`、`evidenceRefs`、`sourceLinks` 这类审计字段应随事件保留，供后续审批链路与排障追踪。

## Related Code

### 主锚点

- `src/skillforge/review-record.mjs`：review 事件类型、`createReviewEvent()`、`validateReviewEvent()` 的主实现。
- `src/skillforge/review-store.mjs`：`save/loadById/list` 旧 API 之上，新增 event-based 存储与状态回放。

### 关联锚点

| Path | Role |
| ---- | ---- |
| `scripts/test-review-event-store.mjs` | review 事件状态机与 append-only 行为的 18 条回归锚点。 |
| `adr/ADR-0045-skillforge-risk-review-approval-governance-pipeline.md` | 上层治理语义来源，定义 `validation → review → approval` 分层。 |
| `src/skillforge/registry-entry.mjs` | 后续 registry / publish 链路会消费 review 侧审计结果。 |

## Real Call Chain

1. `requestReview(fixtureId, options)`：校验 risk fact 存在后，写入 `ReviewRequested` 事件并把状态推进到 `ready`。
2. `approveReview(fixtureId, options)`：仅在 `ready` 上追加 `ReviewApproved`，形成 `approved` 终态。
3. `rejectReview(fixtureId, options)`：仅在 `ready` 上追加 `ReviewRejected`，形成 `rejected` 终态。
4. `getReviewState(fixtureId)`：通过事件回放计算当前状态。
5. `loadReviewEvents(fixtureId)`：读取全部审计事件，用于调试与追踪。
6. `review-events.jsonl`：作为 append-only 落盘面，保存每次治理动作的历史。

## Known Traps

- 不要把 review 结果写回成单条可覆盖状态，否则会丢失审计轨迹。
- 不要允许从非 `ready` 状态直接 approve/reject；这会破坏状态机约束。
- 不要把 `requestReview()` 理解成批准，它只是把风险 fact 拉入待审态。
- 不要把 `reason` / `evidenceRefs` / `sourceLinks` 当成可选装饰字段，它们是可追踪治理链的一部分。
- 不要混用旧 `review-store.jsonl` 与新的 `review-events.jsonl` 语义；新链路的核心是事件追加。

## Verification Criteria

后续修改这条链路时，至少要确认：

- 事件仍然是 append-only，不会覆盖历史。
- `ReviewRequested → ReviewApproved` 和 `ReviewRequested → ReviewRejected` 两条正常路径可回放得到正确终态。
- 所有非法状态迁移继续抛出明确 Error。
- `requestReview()` 的幂等边界仍然稳定。
- `getReviewState()` 与 `loadReviewEvents()` 的边界行为没有退化。

## Key Search Terms

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
