# SkillForge 阶段一轻量回归基线

## 1. 回归基线覆盖清单

本基线覆盖阶段一已落地产品面的最小可重复验证集：

### 服务可用性
- `node web-server.mjs` 可正常启动且不立即报错退出
- 单进程承载多产品面时无启动后崩溃

### 运行中心
- 页面路由 200：`/run-center`、`/run-center/runs`、`/run-center/runs/:nonExistentRunId`
- API 零态/错误态：summary 零态、runs 空列表、不存在返回 NOT_FOUND

### 知识资产
- 页面路由 200：`/knowledge-assets`、`/knowledge-assets/:realAssetId`、`/knowledge-assets/:nonExistentAssetId`
- API happy path/错误态：items 非空、doc 详情返回内容字段、skill-fixture 详情返回文件/元信息字段、不存在返回 NOT_FOUND

### 兼容跳转
- `/run` 返回 200（前端 Navigate 至 `/run-center`）
- `/knowledge` 返回 200（前端 Navigate 至 `/knowledge-assets`）

## 2. 执行命令与预期

约定：项目根 `/home/yankeeting/.openclaw/projects/workflow-kit`，默认 `http://127.0.0.1:3000`

### 2.0 启动服务
```bash
cd /home/yankeeting/.openclaw/projects/workflow-kit && node web-server.mjs
```
预期：进程持续运行，无启动级 crash。

### 2.1 运行中心
```bash
BASE=http://127.0.0.1:3000
# 路由
curl -s -o /dev/null -w "%{http_code}\n" "$BASE/run-center"
curl -s -o /dev/null -w "%{http_code}\n" "$BASE/run-center/runs"
# API
curl -s "$BASE/api/run-center/summary" | jq .
curl -s "$BASE/api/run-center/runs" | jq .
curl -s -i "$BASE/api/run-center/runs/nonexistent"
```
预期：路由均 200；summary 零态、runs 空列表、不存在 NOT_FOUND。

### 2.2 知识资产
```bash
BASE=http://127.0.0.1:3000
REAL_ASSET_ID=$(curl -s "$BASE/api/knowledge-assets" | jq -r '.items[0].id')
# 路由
curl -s -o /dev/null -w "%{http_code}\n" "$BASE/knowledge-assets"
curl -s -o /dev/null -w "%{http_code}\n" "$BASE/knowledge-assets/$REAL_ASSET_ID"
# API doc
curl -s "$BASE/api/knowledge-assets/$REAL_ASSET_ID" | jq .
# API skill-fixture
FIXTURE_ID=$(curl -s "$BASE/api/knowledge-assets" | jq -r '.items[] | select(.type=="skill-fixture") | .id' | head -n1)
curl -s "$BASE/api/knowledge-assets/$FIXTURE_ID" | jq .
# NOT_FOUND
curl -s -i "$BASE/api/knowledge-assets/nonexistent"
```
预期：路由均 200；列表非空；doc 详情返回内容字段；skill-fixture 详情返回文件/元信息字段；不存在 NOT_FOUND。

### 2.3 兼容跳转
```bash
curl -s -o /dev/null -w "%{http_code}\n" "$BASE/run"
curl -s -o /dev/null -w "%{http_code}\n" "$BASE/knowledge"
```
预期：均为 200。

## 3. 回归要求

- **执行时机**：路由/聚合 API/导航兼容改动后、演示前、高风险合并前
- **执行频率**：手工触发，不要求 CI 常驻
- **判定标准**：覆盖清单全部通过才视为阶段一能力未回退

## 4. 不纳入本基线的说明

- 运行中心非空样本复杂业务流

- 知识资产深层字段完整性逐字段断言
- 风险审批业务规则细粒度校验
- UI 视觉回归、跨浏览器兼容、性能压测、并发稳定性压测
- 自动化 CI 集成
