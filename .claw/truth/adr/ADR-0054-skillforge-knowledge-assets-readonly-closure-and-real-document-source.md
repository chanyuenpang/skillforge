# ADR: SkillForge 知识资产第一刀采用只读闭环与真实文档源

## Status

accepted

## Context

在 SkillForge 第一阶段产品化里，知识资产不是先做写入、不是先做索引，也不是先做模板化骨架，而是先证明它能在真实文档来源上形成可用的只读闭环。

这次计划给出的稳定结论很清楚：知识资产首刀必须限定在 `web/` 与 `web-server.mjs`，先把知识资产列表与详情页面做成非占位页，再在后端提供对应的只读资产端点。数据来源也不能靠假数据或临时 fixture，而应优先来自真实可读文档目录扫描，确保 list→detail 链路反映真实资产，而不是产品壳层演示。

## Decision

决定将 SkillForge 知识资产第一刀固定为**只读闭环 + 真实文档源**的实现方式：

1. **后端先提供知识资产只读端点**  
   在 `web-server.mjs` 落地 `/api/knowledge-assets` 与 `/api/knowledge-assets/:assetId`，作为知识资产的唯一真实数据入口。

2. **前端统一通过 API 适配层消费知识资产数据**  
   `web/src/api.js` 需要补齐 knowledge-assets API 封装，页面不直接拼接后端路径，也不绕过适配层读取原始响应。

3. **路由与导航先收口，再接页面**  
   `App.jsx` / `Layout.jsx` 需要挂载知识资产导航与 `/knowledge-assets`、`/knowledge-assets/:assetId` 路由骨架，保证入口可达，但页面必须继续接真实数据，不能停留在占位页。

4. **数据源优先真实文档目录扫描**  
   列表与详情的资产内容应优先从真实可读文档目录生成；允许受控空结果，但不允许靠伪造资产数据完成展示。

5. **验证目标是非占位闭环**  
   必须能完成 `list → detail` 的真实数据链路，并证明 `/knowledge-assets` 与 `/knowledge-assets/:assetId` 都接到了真实 API 或受控空结果。

## Alternatives Considered

- 先做写入或索引再做只读页：拒绝。会把首刀复杂度抬高，且与当前阶段“先可见、再扩展”的目标不符。
- 先伪造一批知识资产再接页面：拒绝。会掩盖真实文档源是否可读，后续容易把假闭环当成真产品。
- 只做前端壳层不做后端端点：拒绝。页面会继续停留在占位态，不能证明知识资产是可用产品页。

## Related Code

| Path | Role |
| ---- | ---- |
| `web-server.mjs` | 知识资产 2 个只读端点的服务端承载层。 |
| `web/src/api.js` | 知识资产 API 封装与统一前端协议入口。 |
| `web/src/App.jsx` | `/knowledge-assets` 路由挂载。 |
| `web/src/Layout.jsx` | 知识资产导航入口与壳层导航承载。 |
| `web/` | 网页端产品壳层与知识资产页面落点。 |
| `plan.json` | 本次知识资产第一刀计划记录，包含执行顺序与验收目标。 |

## Consequences

- 正向：知识资产不再只是壳层概念，而是有真实后端端点和真实前端路由的产品页。
- 正向：真实文档目录能直接成为知识资产来源，降低假数据对产品判断的干扰。
- 正向：先做只读闭环后，后续再扩展写入、索引或更深层模型时更容易控制风险。
- 取舍：当前只覆盖只读第一刀，尚未进入写入、异步索引或向量检索。
- 风险：如果文档源白名单定义不清，后续仍可能暴露目录扫描边界问题。
- 验证锚点：`/api/knowledge-assets`、`/api/knowledge-assets/:assetId` 两个只读端点真实存在，且前端两条路由真实挂载并完成 `list → detail` 链路。

## 已验证行为（联调确认）

以下行为已通过联调验证，是知识资产只读闭环的稳定契约：

### 数据来源分解

知识资产数据来源于真实文件系统扫描，共 **93 条记录**：

- `docs/*.md`：79 条文档资产
- `fixtures/*/`（各 skill-fixture）：14 条资产

### API 端点真实响应形状

```
GET /api/knowledge-assets → 200
{ ok: true, data: { items: [93 items...] } }
```
返回完整资产列表，含 docs/ 和 fixtures/ 两个来源的混合数据。

```
GET /api/knowledge-assets/:assetId（存在）→ 200
```
返回完整详情（含 `content`/`contentPreview`/`files`/`metadata`）。

```
GET /api/knowledge-assets/nonexistent-id → 200
{ ok: false, error: { code: "NOT_FOUND", message: "Knowledge asset not found: ..." } }
```
404 使用 `{ ok: false, error: { code, message } }` 格式，HTTP 状态码仍为 200。

### SPA 路由确认

```
GET /knowledge-assets → 200（SPA 接管）
GET /knowledge-assets/:assetId → 200（SPA 接管）
GET /knowledge → 200（SPA Navigate → /knowledge-assets）
```

所有路由返回 200，旧路径 `/knowledge` 通过前端 Navigate 平滑迁移。

## Search Terms

- `knowledge-assets`
- `/api/knowledge-assets`
- `/api/knowledge-assets/:assetId`
- `web-server.mjs`
- `web/src/api.js`
- `web/src/App.jsx`
- `web/src/Layout.jsx`
- `真实文档目录扫描`
- `只读闭环`
