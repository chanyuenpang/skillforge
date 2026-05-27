# SkillForge review 重审闭环与轮次追溯

## 结论

`review` 流程不只是 `request → approve/reject` 的单次闭环；**一旦进入 `rejected`，允许通过 `resubmitReview()` 开启新一轮审查**。新一轮必须以 `round` 递增方式标识，并通过 `previousRound` 连接前一轮，保证旧轮次事件保留、当前轮次可回放、审计链可追溯。

这条规则的关键点是：**只有 `rejected` 状态允许重提**。`ready`、`approved`、`idle` 都不能直接重审；重审不是“重置状态”，而是追加一条 `ReviewResubmitted` 事件，把同一 fixture 的审查链推进到下一轮。

## 长期行为 / 规则

- `resubmitReview(fixtureId, options)` 只允许在当前 review 状态为 `rejected` 时调用。
- 非 `rejected` 状态重提必须显式拒绝，错误语义要保留“only `rejected` allows resubmission”这一检索词。
- `ReviewResubmitted` 是 review 事件族的新成员，仍然写入 `review-events.jsonl`，不得覆盖旧事件。
- `round` 是当前轮次标识；`ReviewRequested` 默认携带 `round: 1`，后续重提事件按 `round: 2/3/...` 递增。
- `previousRound` 只在 `ReviewResubmitted` 上携带，用于把新轮次和旧轮次明确串起来。
- `getReviewState(fixtureId)` 必须回溯最近一个携带 `round` 的事件，正确返回当前轮次；不能因为最后一条是 `ReviewApproved` / `ReviewRejected` 就丢失轮次信息。
- 同一 `idempotencyKey` 的重复 `resubmitReview()` 必须返回 `duplicate: true`，且不追加新事件。
- 重审之后的新轮次仍然遵守原有 `ready → approve/reject` 状态机约束。
- 旧轮次的 `ReviewRejected`、新轮次的 `ReviewResubmitted`、后续 `ReviewApproved` / `ReviewRejected` 必须共存于同一事件流中。

## 关联代码

### 主锚点

| 路径 | 作用 |
| ---- | ---- |
| `src/skillforge/review-store.mjs` | `resubmitReview()`、`getReviewState()` 的轮次计算与重提入口主逻辑。 |
| `src/skillforge/review-record.mjs` | `ReviewResubmitted` 事件类型，以及 `round` / `previousRound` 透传。 |

### 关联锚点

| 路径 | 作用 |
| ---- | ---- |
| `scripts/test-resubmit-review.mjs` | S4 重审闭环回归测试，覆盖 14 条用例。 |
| `features/skillforge-review-event-append-only-state-machine.md` | review 事件 append-only 与回放状态机的基础约束。 |
| `features/skillforge-review-approval-idempotency-and-version-conflict.md` | `idempotencyKey` / `VERSION_CONFLICT` 的写入层保护背景。 |
| `adr/ADR-0045-skillforge-risk-review-approval-governance-pipeline.md` | `validation → review → approval` 治理分层的上层语义来源。 |
| `adr/ADR-0046-skillforge-review-event-store-append-only-state-machine.md` | review 事件状态机主决策；本文件补充重审轮次这一扩展语义。 |

## 真实调用链路

1. `requestReview(fixtureId, options)`：首次把风险事实拉入 `ready`，并固定为 `round: 1`。
2. `rejectReview(fixtureId, options)`：在当前轮次完成驳回，状态进入 `rejected`。
3. `resubmitReview(fixtureId, options)`：仅在 `rejected` 状态下允许调用，写入 `ReviewResubmitted`，把状态推进到下一轮的 `ready`。
4. `approveReview(fixtureId, options)` / `rejectReview(fixtureId, options)`：继续作用于当前轮次，不会清掉历史轮次事件。
5. `getReviewState(fixtureId)`：通过事件回放读取当前状态，同时从最近携带 `round` 的事件恢复当前轮次。
6. `loadReviewEvents(fixtureId)`：保留全量事件流，用于区分旧轮次与新轮次。

## 不要改错的位置

- `resubmitReview()` 不是“再发一次 `ReviewRequested`”，而是独立的 `ReviewResubmitted` 事件。
- 不要把 `round` 做成可覆盖的全局当前态；它必须跟随事件流追加。
- 不要允许 `approved` 或 `ready` 直接重提，否则会破坏“只有驳回后才能进入新轮次”的治理约束。
- 不要在 `ReviewApproved` / `ReviewRejected` 上丢失 `round` 追溯能力；当前轮次应可从最近带 `round` 的事件恢复。
- 不要把重审误当成状态重置；历史驳回记录必须保留，方便审计与排障。

## 已知陷阱

- `getReviewState()` 如果只看最后一条事件，很容易在 `approve` 之后丢失 `round`；正确做法是向前回溯最近的 `round` 事件。
- `resubmitReview()` 的幂等去重边界仍然是 `idempotencyKey`，不要和轮次号混用。
- 多轮重审时，`ReviewRequested(r1)`、`ReviewResubmitted(r2)`、`ReviewResubmitted(r3)` 都应该保留，不能被后续终态覆盖。
- 测试里对 `round` 的断言是长期行为锚点，后续改动必须维持。

## 验证标准

- `rejected → resubmit → ready` 可以正常进入下一轮。
- 非 `rejected` 状态调用 `resubmitReview()` 必须拒绝。
- 多次重审后，`round` 应依次递增，且历史轮次事件仍可在 `loadReviewEvents()` 中看到。
- `getReviewState()` 在 `approved`、`ready`、`rejected` 等不同终态下都能返回正确 `round`。
- 同一 `idempotencyKey` 重复重提时，事件数量不增加。

## 关键检索词

- `resubmitReview(fixtureId, options)`
- `ReviewResubmitted`
- `round`
- `previousRound`
- `only "rejected" allows resubmission`
- `getReviewState(fixtureId)`
- `loadReviewEvents(fixtureId)`
- `ReviewRequested`
- `ReviewApproved`
- `ReviewRejected`
