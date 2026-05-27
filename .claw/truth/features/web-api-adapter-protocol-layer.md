# Web API 适配层 —— 前端唯一协议入口

## 结论

`web/src/api.js` 是前端唯一的 API 协议适配层，统一负责后端 `{ ok, data, error }` 信封解包与错误标准化。所有页面组件只消费此层输出的稳定 view model，不直接解析原始响应字段或匹配错误文本。

## 长期行为 / 规则

1. **单一适配点原则**：`api.js` 是前端与后端之间的唯一协议边界。后端接口变化（信封结构、错误格式）只改 `api.js`，页面组件零改动。
2. **信封解包**：后端统一响应格式为 `{ ok: bool, data: any, error: { code, message, retryable, details } | null }`。`unwrap()` 在 `res.ok === false || body.ok === false` 时抛出标准化错误，否则返回 `body.data`。
3. **标准化错误模型**：所有错误（包括网络异常）统一携带 **`status / code / retryable / message / details`**：
   - `createApiError(res, body)`：优先使用后端结构化 `error` 对象，回退到 HTTP 状态语义。
   - `networkError()`：`{ code: 'NETWORK_ERROR', retryable: true }`，fetch 失败时抛出。
4. **页面组件协议**：组件通过结构化属性判断错误（`err.status === 409`、`err.code === 'STATE_CONFLICT'`），**禁止**匹配错误消息文本（`err.message.includes(...)`）。
5. **API 函数导出约定**：每个 API 函数返回 `unwrap()` 解包后的 `data` 对象。调用方按字段名消费，不关心底层信封形状。

| 导出函数 | 返回的 `data` 形状 |
| -------- | ------------------ |
| `fetchApprovalQueue()` | `{ items: [...] }` |
| `fetchApprovalDetail(fixtureId)` | `{ fixtureId, risk, review, approval, events, conflict }` |
| `grantApproval(fixtureId, opts)` | `{ requestId, status, decision, eventId }` |
| `denyApproval(fixtureId, opts)` | `{ requestId, status, decision, eventId }` |
| `fetchFixtureSummary(fixtureId)` | `{ requestId, riskType, riskLevel, status }` |
| `fetchHistoryList(filters)` | `{ items: [...] }` |
| `fetchHistoryDetail(fixtureId)` | `{ fixtureId, risk, review, approval, events, history, conflict }` |

## 关联代码

### 主锚点

- `web/src/api.js`：前端唯一协议适配层，`unwrap()` / `createApiError()` / `networkError()` 核心逻辑所在。

### 关联锚点

| 路径 | 作用 |
| ---- | ---- |
| `web/src/components/ApprovalQueue.jsx` | 审批队列页面组件，消费 `{ items }` |
| `web/src/components/ApprovalDetail.jsx` | 审批详情页面组件，消费详情 view model |
| `web/src/components/ApprovalHistory.jsx` | 历史页面组件，消费 `{ items }` 和详情 view model |
| `web-server.mjs` | 后端入口，返回 `{ ok, data, error }` 信封 |

## 真实调用链路

1. **`web-server.mjs`** — 后端路由处理，构造 `{ ok, data, error }` 响应。
2. **`api.js`** — fetch 请求、`unwrap()` 解包信封、错误标准化、对外导出稳定接口。
3. **页面组件**（`ApprovalQueue` / `ApprovalDetail` / `ApprovalHistory`）— 只消费解包后的 view model，不做字段匹配或文本匹配。

## 已知陷阱

- **新增 API 端点**：只改 `api.js` + 后端路由。页面组件不应碰原始信封。
- **后端信封变更**：影响范围应局限在 `api.js`，不允许透传到页面组件。
- **错误处理**：禁止 `err.message.includes('STATE_CONFLICT')` 这种文本匹配；必须用 `err.code === 'STATE_CONFLICT'`。
- `networkError()` 的 `status` 为 0（fetch 失败时无 HTTP 状态），组件判断时需注意 `status === 0` 不代表后端错误。
- **状态冲突判断**：使用 `err.status === 409 || err.code === 'STATE_CONFLICT'` 双保险（后端可能只填 code 不填 status）。

## 验证标准

- 运行 `cd web && npm run build` 确认构建通过。
- curl 验证后端返回 `{ ok, data, error }` 信封后，前端页面正常渲染。
- 模拟网络断开时应抛出 `NETWORK_ERROR` 且 `retryable: true`。
- 后端返回 `{ ok: false, error: { code: 'STATE_CONFLICT' } }` 时组件应正确捕获 `err.code === 'STATE_CONFLICT'`。

## 关键检索词

- `unwrap`
- `createApiError`
- `networkError`
- `fetchApprovalQueue`
- `fetchApprovalDetail`
- `grantApproval`
- `denyApproval`
- `fetchHistoryList`
- `fetchHistoryDetail`
- `{ ok, data, error }`
- `NETWORK_ERROR`
- `STATE_CONFLICT`
- `web/src/api.js`
