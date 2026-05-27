# SkillForge review / approval 的幂等与版本冲突控制

## 结论

`review-store` 与 `approval-store` 的审查/审批写入已经形成稳定的双保护：**有 `idempotencyKey` 时做幂等重放，无 `idempotencyKey` 时保持原有非法状态迁移报错；有 `expectedLastEventId` 时做乐观并发校验，版本不一致直接返回 `VERSION_CONFLICT`，且不覆盖状态、不追加事件**。

这意味着后续不应把幂等与并发校验做成“只能二选一”的一次性修补，而要把它当成 review / approval 写入路径的长期约束来维护。

## 长期行为 / 规则

- `approveReview()` / `rejectReview()` / `grantApproval()` / `denyApproval()` 都支持显式 `idempotencyKey`。
- 同一个 `idempotencyKey` 的重复提交应返回 `{ ok: true, duplicate: true }`，并且**不追加新事件**。
- 当未提供 `idempotencyKey` 时，仍沿用原先的 throw-on-illegal-transition 行为，保持向后兼容。
- 四个写入口都支持 `expectedLastEventId`。
- `expectedLastEventId` 与当前状态不匹配时，返回 `{ ok: false, code: "VERSION_CONFLICT" }`，不会写入事件，也不会覆盖当前状态。
- 幂等与版本冲突两类保护要对 manual/API 双入口保持一致语义，避免同一 gating decision 在不同通道出现分叉。
- 非法输入在双通道中应保持 `INVALID_INPUT` 语义一致。

## 关联代码

### 主锚点

| 路径 | 作用 |
| ---- | ---- |
| `src/skillforge/review-store.mjs` | `approveReview()` / `rejectReview()` 的 review 事件写入、幂等与版本冲突主逻辑。 |
| `src/skillforge/approval-store.mjs` | `grantApproval()` / `denyApproval()` 的 approval 事件写入、幂等与版本冲突主逻辑。 |

### 关联锚点

| 路径 | 作用 |
| ---- | ---- |
| `scripts/test-idempotency-conflict.mjs` | S2 幂等与并发冲突的回归测试锚点，覆盖 16 条用例。 |
| `adr/ADR-0045-skillforge-risk-review-approval-governance-pipeline.md` | review / approval 分层治理的上层决策背景。 |
| `adr/ADR-0046-skillforge-review-event-store-append-only-state-machine.md` | review 事件层 append-only 状态机与 `idempotencyKey` 的基础约束。 |

## 真实调用链路

1. `review-store.mjs` / `approval-store.mjs` 负责把写入请求转成事件。
2. 在进入事件追加前先检查 `idempotencyKey`，命中则直接返回 duplicate 结果。
3. 再检查 `expectedLastEventId`，不匹配则返回 `VERSION_CONFLICT`。
4. 只有通过上述两道门，才会落盘追加事件并推进当前态。

## 已知陷阱

- 不要把 `idempotencyKey` 误解成替代 `expectedLastEventId`；一个解决重复提交，一个解决乐观并发冲突，两者不是同一层问题。
- 没有 `idempotencyKey` 的旧调用仍要保留 throw-on-illegal-transition 语义，不能为了“统一返回值”而悄悄改掉旧行为。
- `VERSION_CONFLICT` 应只用于版本不匹配，不要和 `INVALID_INPUT`、非法迁移、重复提交混用。
- 这类保护是写入层规则，不是测试脚本里的临时补丁。

## 验证标准

- 重复提交同一 `idempotencyKey` 时，事件数量不增加，返回 `duplicate: true`。
- `expectedLastEventId` 不匹配时，状态保持不变，返回 `VERSION_CONFLICT`。
- 不带 `idempotencyKey` 的非法迁移仍按原有路径报错。
- manual/API 两个入口对幂等、版本冲突与非法输入的语义一致。

## 关键检索词

- `approveReview()`
- `rejectReview()`
- `grantApproval()`
- `denyApproval()`
- `idempotencyKey`
- `expectedLastEventId`
- `VERSION_CONFLICT`
- `INVALID_INPUT`
- `throw-on-illegal-transition`
