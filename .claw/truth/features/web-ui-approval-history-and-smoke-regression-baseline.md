# Web UI 审批队列、详情、历史页与 smoke 回归基线

## 结论

SkillForge 风险审批网页端已经收敛为三页 SPA：`/` 审批队列、`/approval/:fixtureId` 审批详情、`/history` 历史与审计。前端页面只消费 `web/src/api.js` 提供的稳定 view model；队列批量操作、详情单条操作、历史筛选与详情联动都属于长期行为，不应再把错误文本解析或原始信封解包散落到各个组件里。

## 长期行为 / 规则

- 审批队列页负责待审批列表、批量同意 / 批量驳回、空态、错误态、刷新、行跳转详情。
- 审批详情页负责单条审批的加载、404、错误重试、通过 / 拒绝、状态冲突自动刷新、终态展示。
- 历史页负责 `status / skill / since / until` 四维筛选、列表-详情左右分栏、首条默认选中、选中项失效后的重置。
- `ApprovalDetail` 的驳回必须先填原因；`grant` 的备注可选。
- 批量操作一次最多处理 20 项；空选、超上限、批量驳回空原因都应给出明确提示。
- `STATE_CONFLICT` 应通过结构化错误字段判断，不应靠消息文本匹配。
- `networkError()` 的 `status === 0` 代表网络异常，不是后端 HTTP 错误。
- 历史详情与审批详情都使用同一条时间线视图，差别在于数据来源与面板布局。

## 关联代码

### 主锚点

| 路径 | 作用 |
| ---- | ---- |
| `web/src/components/ApprovalQueue.jsx` | 队列页，负责加载、空态、错误态、批量操作、行跳转与滚动恢复。 |
| `web/src/components/ApprovalDetail.jsx` | 详情页，负责单条审批、404 / 409 / 终态处理与时间线展示。 |
| `web/src/components/ApprovalHistory.jsx` | 历史页，负责筛选、列表-详情联动、详情跳转。 |
| `web/src/components/Timeline.jsx` | 时间线渲染与事件类型文案映射。 |
| `web/src/components/StatusBadge.jsx` | 状态与严重程度 badge 的统一展示。 |
| `web/src/App.jsx` | 三页 SPA 路由入口。 |
| `web/src/api.js` | 前端唯一协议入口，所有页面都依赖这里的稳定 view model。 |
| `web-server.mjs` | 后端 API 与静态资源入口，决定页面可观察到的数据形状。 |

## 真实调用链路

1. `web-server.mjs` 统一返回 `{ ok, data, error }`。
2. `web/src/api.js` 负责解包、标准化错误与向页面输出稳定 view model。
3. `ApprovalQueue` / `ApprovalDetail` / `ApprovalHistory` 只消费解包后的字段，不直接接触后端信封。
4. 页面交互触发 `grantApproval()` / `denyApproval()` / `fetchHistoryList()` / `fetchHistoryDetail()`。
5. `ApprovalDetail` 在 `409 STATE_CONFLICT` 时自动重载详情，以最新状态为准。

## 不要改错的位置

- `ApprovalQueue.jsx` 不是后端契约层，不要把信封解包逻辑搬回组件里。
- `ApprovalDetail.jsx` 不是冲突判定的唯一入口，`STATE_CONFLICT` 必须由 `api.js` 的标准化错误支撑。
- `ApprovalHistory.jsx` 不是只读表格，它同时承载筛选、首条选中与详情联动。
- `Timeline.jsx` 只是渲染层，不应包含业务状态机逻辑。

## 已知陷阱

- `ApprovalHistory` 会在过滤后把当前选中项重置为第一条，后续排障时别误以为是列表抖动。
- `ApprovalQueue` 的批量操作只处理当前仍为 `pending` 的项，非 `pending` 项应视为不可选或跳过。
- `ApprovalDetail` 的 `404` 分支与普通加载失败分支文案不同，排查时要先看 `error.status`。
- `fetchHistoryDetail()` 与 `fetchApprovalDetail()` 返回的字段结构相近，但语义不同；不要把历史详情当作审批详情的别名。
- `X-Request-Id`、`405 METHOD_NOT_ALLOWED`、`413 PAYLOAD_TOO_LARGE`、`408 REQUEST_TIMEOUT` 属于网关边界，不应在页面组件里重写。

## 验证标准

- `/`、`/approval/:fixtureId`、`/history` 三页都能正常加载并完成各自主流程。
- 批量同意 / 批量驳回能稳定给出成功摘要或校验提示。
- 详情页遇到 `409 STATE_CONFLICT` 时会提示状态已变化并自动刷新。
- 历史页筛选后仍能保持列表-详情联动，且空结果有明确空态。
- 组件层验证应覆盖加载、空态、错误态、终态、冲突态与跳转链路。

## 关键检索词

- `ApprovalQueue`
- `ApprovalDetail`
- `ApprovalHistory`
- `Timeline`
- `StatusBadge`
- `STATE_CONFLICT`
- `NETWORK_ERROR`
- `batchReason`
- `selectedId`
- `history page`
- `approval/:fixtureId`
- `X-Request-Id`