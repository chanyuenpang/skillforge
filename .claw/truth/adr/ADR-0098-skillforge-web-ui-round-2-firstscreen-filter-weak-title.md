# ADR-0098: SkillForge Web UI 第二轮精修：首屏注意力／筛选语义／知识资产弱标题兜底

## Status

accepted

## Context

第一轮 Web UI 精修（ADR-0096）已把 `overview`、`list`、`detail` 三页从工程面板推进到统一产品级观感，人类可读优先的基调也已通过 ADR-0093/0094/0095/0097 固定下来。但实屏核查发现三个关键体验缺口：

1. **首屏注意力**：`ApprovalDetail`（路由 `/risk/approval/:fixtureId`）仍然是工程面板风格，打开页面第一眼看到的是 `fixtureId`、`riskType`、`severity` 等技术字段，缺少人类可读摘要，用户看不懂"这个审批发生了什么"。
2. **筛选语义**：`RunCenterList` 的关键词搜索范围 (`haystack`) 只覆盖了 `_runId`、`_source`、`_status`、`title`、`workflowName` 等技术字段，没有包含用户实际看到的 `_humanTitle` 和 `_humanSubtitle`，导致"搜不到自己看到的东西"。
3. **知识资产弱标题兜底**：`KnowledgeAssetsPage` 的 `getDisplayTitle()` 已实现 `title → name → id` 回退链，但未检测"弱标题"——当 `title` 存在但值为空白字符串、`-`、`untitled` 等无意义内容时，仍然当作有效标题展示，用户看到的是无意义的空壳标题。

这三个问题不是新功能需求，而是已有规则的收口深化。

## Decision

本轮里程碑不做新能力扩展，只做三个已有规则边界的收口：

### 1. 首屏注意力：ApprovalDetail 人类语言化

- `ApprovalDetail` 卡片顶部（Summary Card）应在标题区下方增加人类可读摘要块，使用已有的 `risk.summary` / `detail.description` / 审批语义拼接作为人类可读叙事。
- `fixtureId` 退到次级信息区（参考 `RunCenterDetail` 的 `MetaBar` 模式）。
- 保持现有审批操作区不动，不引入新的 `HumanSummaryBlock` 组件依赖（复用已有字段即可）。

### 2. 筛选语义：RunCenterList 搜索范围扩展

- 关键词搜索的 `haystack` 必须包含 `_humanTitle` 和 `_humanSubtitle`，使用户搜索能命中实际展示的人类可读内容。
- 不做全文搜索引擎，不做模糊匹配，仅扩展现有 `includes` 匹配范围。
- 保持现有筛选栏 UI 不变。

### 3. 知识资产弱标题兜底

- 新增 `isWeakTitle(value)` 检测函数，将以下情况判定为弱标题：空白字符串、`-`、`untitled`、`unnamed`、`n/a`、`none`、`null`（字符串形式）、纯符号（如 `--`、`...`）。
- `getDisplayTitle()` 在检测到弱标题时跳过该字段，继续尝试下一候选字段。
- `getSecondaryLabel()` 同步适配，避免弱标题在次级标签中重复展示。

## Alternatives Considered

- **ApprovalDetail 上 HumanSummaryBlock 全套组件**：拒绝。复用已有字段即可达成人类可读化，不引入新复杂度。
- **RunCenterList 上全文搜索引擎**：拒绝。范围过大，现有问题只需扩展匹配字段即可解决。
- **知识资产弱标题靠后端清洗**：拒绝。弱标题是展示层问题，前端兜底更轻量且即时生效。
- **本轮做更多页面改动**：拒绝。当前聚焦三点的边界收口，不扩展范围。

## Related Code

| Path | Role |
| ---- | ---- |
| `web/src/components/ApprovalDetail.jsx` | 首屏人类可读化改造点 |
| `web/src/components/RunCenterList.jsx` | 关键词搜索 haystack 扩展点 |
| `web/src/components/KnowledgeAssetsPage.jsx` | 弱标题检测与兜底逻辑收口点 |

## Consequences

- 正向：`ApprovalDetail` 打开不再是机器字段主导，用户第一眼能看懂审批内容。
- 正向：`RunCenterList` 搜索能命中屏幕上实际显示的人类可读内容，搜索体验闭环。
- 正向：知识资产列表不再展示无意义的空壳标题。
- 取舍：弱标题检测需要维护一个判定词列表，后续可能需要扩展。
- 取舍：ApprovalDetail 的人类可读化仅依赖已有字段，若数据源长期缺摘要字段则需另开后端任务。
- 验证锚点：本轮改造均为前端层，`build` 通过即为基本验证；产品验证需在浏览器实跑确认三页体验。

## Search Terms

- `ApprovalDetail`
- `RunCenterList`
- `KnowledgeAssetsPage`
- `haystack`
- `getDisplayTitle`
- `isWeakTitle`
- `humanTitle`
- `humanSubtitle`
- `首屏`
- `筛选`
- `弱标题`
- `兜底`
