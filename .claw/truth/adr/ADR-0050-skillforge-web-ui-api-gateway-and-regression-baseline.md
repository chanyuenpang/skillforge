# ADR-0050: SkillForge Web UI 以 API 网关收口与回归基线固化为推进方式

## Status

accepted

## Context

SkillForge 风险审批网页端已经推进到可用形态，但如果继续沿用“组件各自理解后端响应”的方式，后续新增历史页、批量审批、异常态、网关边界和 smoke 测试时，会重新把协议、错误处理和页面逻辑拆散，导致前端再次回到局部可用、整体靠人工兜底的状态。

这次设计收敛出的长期结论是：网页端的关键不是再加一个页面，而是把 **API 协议收口、页面可观察行为和回归基线** 固化下来，让未来改动优先影响适配层和服务端边界，而不是扩散到每个组件。

## Decision

决定将 SkillForge Web UI 的长期推进方式固定为以下约束：

1. **`web/src/api.js` 作为唯一协议入口 + 共享防御层**
   所有页面组件只消费解包后的稳定 view model，不直接处理 `{ ok, data, error }` 信封。

   后期演进增加了共享防御工具 `isObject` / `asObject` / `asArray`，统一对所有 API 响应做数据形状防御：
   - 预期是对象却收到 `null` / `undefined` / 非对象时返回 `{}`
   - 预期是数组却收到 `null` / `undefined` / 非数组时返回 `[]`
   - `items` / `events` 等 list 字段全部走 `asArray` 包裹
   这样单个页面不再需要各自做防御性判空，数据形状异常时默认降级为空数据而非白屏。

2. **页面职责严格分离**
   `ApprovalQueue` 负责待审批与批量操作，`ApprovalDetail` 负责单条审批与冲突刷新，`ApprovalHistory` 负责筛选与历史联动，`Timeline` / `StatusBadge` 仅做展示。

3. **网关边界要显式化**
   `web-server.mjs` 必须继续承担方法白名单、body 限制、请求超时、`X-Request-Id` 与结构化错误输出，不能把这些规则下沉到页面组件。

4. **冲突与网络错误使用结构化判断**
   `STATE_CONFLICT`、`NETWORK_ERROR`、`status === 0/409` 必须通过标准化错误对象判断，不能靠消息文本匹配。

5. **回归基线先于扩展**
   后续新增或改造 UI 时，至少要有页面 smoke、接口契约与构建检查作为回归门；否则不应把改动视为“完成”。

## Alternatives Considered

- 继续让页面组件各自兼容后端细节：拒绝。后续维护会越来越碎。
- 只补 UI，不固化 API 适配层：拒绝。协议会继续漂移，页面会被迫反复改动。
- 只加强后端，不补页面 smoke：拒绝。可用性无法稳定验证。
- 把网关边界写进页面逻辑：拒绝。职责会错位，错误处理会扩散。

## Related Code

| Path | Role |
| ---- | ---- |
| `web-server.mjs` | Web API 网关与静态服务入口，承载路由、错误码和超时边界。 |
| `web/src/api.js` | 前端唯一协议适配层 + 共享防御工具（`isObject`/`asObject`/`asArray`）。 |
| `web/src/components/ApprovalQueue.jsx` | 队列页，批量操作与跳转入口。 |
| `web/src/components/ApprovalDetail.jsx` | 详情页，单条审批与冲突刷新。 |
| `web/src/components/ApprovalHistory.jsx` | 历史页，筛选和详情联动。 |
| `web/src/components/Timeline.jsx` | 时间线展示。 |
| `web/src/components/StatusBadge.jsx` | 状态展示。 |
| `web/src/App.jsx` | 路由组织。 |
| `vite.config.js` | 开发代理与前端服务配置。 |

## Consequences

- 正向：未来改后端响应格式时，主要影响面集中在 `web/src/api.js`。
- 正向：共享防御工具 `asArray`/`asObject` 将判空逻辑收敛到适配层，避免各页面各自散落防御代码。

- 正向：页面职责更清晰，队列、详情、历史不会互相串味。
- 正向：`STATE_CONFLICT` 与 `NETWORK_ERROR` 的处理会稳定、可回归。
- 正向：页面 smoke、接口契约和构建检查可以作为持续回归基线。
- 取舍：前期会增加适配层和网关边界的维护成本，但能减少后续扩散式改动。
- 取舍：若以后增加新页面，必须先定义 view model 再接入组件，不能直接消费原始信封。

## Search Terms

- `web/src/api.js`
- `isObject` / `asObject` / `asArray`
- `{ ok, data, error }`
- `ApprovalQueue`
- `ApprovalDetail`
- `ApprovalHistory`
- `STATE_CONFLICT`
- `NETWORK_ERROR`
- `X-Request-Id`
- `METHOD_NOT_ALLOWED`
- `PAYLOAD_TOO_LARGE`
- `REQUEST_TIMEOUT`
- `smoke`
- `view model`