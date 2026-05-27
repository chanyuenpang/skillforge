# ADR: SkillForge 审批请求入口与状态回流闭环

## Status

accepted

## Context

本次 E2-B 收口的关键，不是单纯把审批存储补齐，而是把审批请求入口和状态回流链路固定成真实可用的 HTTP 闭环。先前状态虽然已经能在 `approval-store.mjs` 中表达 `requested` / `granted` / `denied`，但如果 `web-server.mjs` 没有把 `POST /api/approvals/request` 接到路由和 handler，上层就只能看到半截能力：状态源存在，入口缺失，查询面也无法稳定回流。

干净实例端口 `4317` 的实测说明，这条链路必须被当成长期约束，而不是一次性修补：`request -> queue/detail -> grant/deny -> history` 才能证明审批请求真的进入了系统，并且状态变化能回到查询面。

## Decision

决定将审批最小闭环固定为以下规则：

1. `web-server.mjs` 必须提供 `POST /api/approvals/request` 入口，并完成 `requestApproval` 的 import、route 注册与 handler 接线。
2. 审批状态真源由 `approval-store.mjs` 统一维护，`requestedAt`、`grantedAt`、`deniedAt` 等回流字段必须可被查询面读取。
3. `queue`、`detail`、`history` 这些查询面必须能反映同一条审批对象从 `requested` 到 `granted` / `denied` 的状态变化。
4. 对外验证以真实 HTTP 闭环为准：先发起 `POST /api/approvals/request`，再检查 `queue/detail/history`，不能只验证 store 层或单点返回。
5. 需要通过干净实例做最小实测，避免在线实例与工作区代码不同步造成假阴性。

## Alternatives Considered

- 只修 `approval-store.mjs`，不接 HTTP 入口：被拒绝，因为状态源再完整也无法形成真实提交链路。
- 只在 `web-server.mjs` 暴露请求接口，不强调查询面回流：被拒绝，因为审批如果无法在 `queue/detail/history` 中回读，就不能算闭环。
- 依赖在线实例直接判定完成：被拒绝，因为在线实例可能滞后于工作区代码，容易误判。

## Related Code

| Path | Role |
| --- | --- |
| `src/approval-store.mjs` | 审批状态真源与 `requested` / `granted` / `denied` 回流字段 |
| `src/web-server.mjs` | `POST /api/approvals/request` 路由、handler 与查询面接线 |
| `plans/subplan-6-subplan-e2-b-提交审批与状态回流真实执行.json` | 本次完成记录、done 事实与 HTTP 闭环证据 |

## Consequences

- 正向：审批请求不再只是存储能力，而是可从 HTTP 入口进入、可在查询面回读的真实闭环。
- 正向：`queue/detail/history` 成为审批状态回流的长期验证锚点，后续修复不容易只改到一半。
- 正向：干净实例实测被固定为验证方式，可降低在线实例不同步导致的假阴性。
- 取舍：这条 ADR 只约束最小审批闭环，不扩展到 Run、Evidence、Retro 等更大链路。
- 风险：如果后续新增审批形态但不复用同一状态回流语义，查询面可能出现分叉。
- 验证锚点：端口 `4317` 干净实例实测已证明 `POST /api/approvals/request` 返回 `pending`，`queue` 从 `pending` 回流到 `granted`，`detail` 中 `approval.status`、`lastEventType`、`eventCount` 会随状态变化同步更新，`history` 可见 `RiskFactObserved -> ReviewRequested -> ReviewApproved -> ApprovalRequested -> ApprovalGranted`。

## Search Terms

- `POST /api/approvals/request`
- `requestApproval`
- `approval-store.mjs`
- `web-server.mjs`
- `queue`
- `detail`
- `history`
- `requestedAt`
- `grantedAt`
- `deniedAt`
- `ApprovalRequested`
- `ApprovalGranted`
