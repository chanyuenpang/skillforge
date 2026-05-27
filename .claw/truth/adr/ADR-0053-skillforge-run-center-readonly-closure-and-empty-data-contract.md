# ADR-0053: SkillForge 运行中心第一刀采用只读聚合端点与真实空数据闭环

## Status

accepted

## Context

在进入运行中心产品化第一刀时，当前环境里的 `execution-log` 仍然为空，但产品目标不是先伪造数据，而是先证明运行中心可以在真实空仓条件下形成可用闭环。

这次计划明确了一个稳定结论：运行中心必须先以只读方式落地，入口页、列表页、详情页都要接上真实后端聚合端点；其中可用性验证的关键不是“有没有数据”，而是“没有数据时是否仍然是非占位页，并且空态、404 和加载态都被真实承接”。

## Decision

决定将 SkillForge 运行中心第一刀固定为**只读聚合端点 + 真实空数据闭环**的实现方式：

1. **后端先提供 3 个只读聚合端点**  
   在 `web-server.mjs` 落地 `/api/run-center/summary`、`/api/run-center/runs`、`/api/run-center/runs/:runId`，作为运行中心的唯一真实数据入口。

2. **前端只通过统一 API 封装消费运行中心数据**  
   `web/src/api.js` 补齐 run-center API 封装，页面不直接拼接后端路径，也不绕过适配层读取原始响应。

3. **路由按运行中心壳层固定收口**  
   `web/src/App.jsx` 挂载 `/run-center`、`/run-center/runs`、`/run-center/runs/:runId`，并保留旧 `/run*` 兼容跳转，确保旧入口可迁移但新路径成为主路径。

4. **页面必须接真实端点而不是占位骨架**  
   概览、列表、详情三页都要接入真实 `api/run-center/*`，并具备加载、错误与空态，不允许只停留在壳层导航。

5. **空数据必须是受控真实结果，不靠假数据演示**  
   当 `execution-log` 为空时，允许返回真实空结果与受控 404；这被视为有效闭环，而不是失败。

## Alternatives Considered

- 先伪造一批运行数据再做页面：拒绝。会掩盖真实空仓事实，后续容易把假闭环当成真产品。
- 先只做前端壳层，不接后端聚合端点：拒绝。页面会继续停留在占位态，不能证明产品能力。
- 把运行中心和其他新域并行推进：拒绝。会增加 `web/` 与 `web-server.mjs` 的耦合改动面，首刀不稳定。

## Related Code

| Path | Role |
| ---- | ---- |
| `web-server.mjs` | 运行中心 3 个只读聚合端点的服务端承载层。 |
| `web/src/api.js` | 运行中心 API 封装与统一前端协议入口。 |
| `web/src/App.jsx` | `/run-center` 路由挂载与旧路径兼容跳转。 |
| `web/src/components/` | 概览、列表、详情页面的真实数据接线落点。 |
| `tasks/skillforge-运行中心第一刀子实现/plan.json` | 本次第一刀计划记录，包含已完成任务与验收结论。 |

## Consequences

- 正向：运行中心不再是占位入口，而是有真实后端端点和真实前端路由的产品页。
- 正向：空数据环境也能形成可验证闭环，避免把“没数据”误判成“没产品”。
- 正向：后续补入真实 `execution-log` 后，只需继续验证 summary、list、detail 字段完整性。
- 取舍：当前只验证了真实空数据闭环，尚未覆盖有数据时的 happy path。
- 风险：旧 `/run/*` 兼容跳转若长期保留，后续还需要统一为更直接的新路径。
- 验证锚点：`/api/run-center/summary`、`/api/run-center/runs`、`/api/run-center/runs/:runId` 三个只读端点真实存在，且前端三条路由真实挂载。

## 已验证行为（联调确认）

以下行为已通过联调验证，是运行中心只读闭环的稳定契约：

### API 端点真实响应形状

```
GET /api/run-center/summary → 200
{ ok: true, data: { total: 0, succeeded: 0, failed: 0, avgDurationMs: 0,
    latestRunAt: null, bySource: {}, byStatus: {} } }
```
空数据时返回合理结构，不报错。

```
GET /api/run-center/runs → 200
{ ok: true, data: { items: [], total: 0, offset: 0, limit: 20 } }
```
空列表正常返回。

```
GET /api/run-center/runs/nonexistent → 200
{ ok: false, error: { code: "NOT_FOUND", message: "Run not found: nonexistent" } }
```
404 使用 `{ ok: false, error: { code, message } }` 格式，HTTP 状态码仍为 200。

### 路由共存确认

在 `web-server.mjs` 中，运行中心端点与已有审批闭环、知识资产闭环**无路由冲突**，响应风格一致。路由匹配顺序为：`/api/knowledge-assets` → `/api/approvals/*` → `/api/run-center/*`。

### 已知旧路径陷阱

- `RunCenterList.jsx` L46 使用 `<Link to="/run/...">`（旧路径），当前靠 Navigate 补偿跳转到 `/run-center/runs/`。
- `RunCenterOverview.jsx` L43 引用 `/run/list`，同上靠 Navigate 补偿。

后续修改应优先直接使用新路径 `/run-center/runs/`，减少对兼容跳转的依赖。

## Search Terms

- `run-center`
- `/api/run-center/summary`
- `/api/run-center/runs`
- `/api/run-center/runs/:runId`
- `web-server.mjs`
- `web/src/api.js`
- `execution-log`
- `真实空数据闭环`
