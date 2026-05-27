# ADR: SkillForge ApprovalDetail 真实链路与首屏人类语言优先

## Status

proposed

## Context

此前网页端的收口已经明确：用户打开页面时，主叙事应优先呈现人类可读内容，而不是内部 ID 或技术字段。与此同时，这次计划记录又确认，用户真实查看的页面不是 run-center，而是 `/risk/approval/:id` 这条 `ApprovalDetail` 链路。

在实屏核查中，`ApprovalDetail` 当前请求的是 `/api/approvals/:id`，而样本直接返回 404。结果就是页面既拿不到有效数据，也不会出现 `HumanSummaryBlock` 或人类语言内容。也就是说，问题不只是展示排版，而是真实接口链路和首屏叙事都没有接通。

## Decision

决定将 `ApprovalDetail` 的长期收口规则固定为：

1. **以 `/risk/approval/:id` 为真实战场**
   以后排查和修复审批详情问题时，必须以用户实际访问的 `ApprovalDetail` 页面为准，不能再拿 `run-center` 的修复结果代替。

2. **先确认真实接口与数据源，再改展示层**
   `ApprovalDetail` 必须先跑通 `/api/approvals/:id` 这条链路，确认是旧 bundle、路由错误、接口缺数据，还是数据源未写入，再决定修复哪一层。

3. **首屏优先呈现人类语言主叙事**
   `ApprovalDetail` 的第一屏必须优先展示人类语言输入/输出/失败信息；加载态、空白态、技术字段只能作为次级内容。

4. **不要让技术字段遮蔽正文**
   页面不得因为接口 404、空数据或字段映射不全，退化成只剩技术字段或空壳。即使需要兜底，也应优先保住可理解的自然语言叙事。

## Alternatives Considered

- **继续把 run-center 的修复当作审批详情的修复**：拒绝。用户实际看的不是同一条链路。
- **先改前端文案和排版，不查接口**：拒绝。404 说明根因可能在链路层，不先定位会把问题掩盖掉。
- **让空态/加载态顶替正文**：拒绝。会让详情页失去业务信息承载能力。

## Related Code

| Path | Role |
| ---- | ---- |
| `ApprovalDetail` | 审批详情页主入口与首屏叙事承载点。 |
| `/risk/approval/:id` | 用户真实访问的审批详情页面路由。 |
| `/api/approvals/:id` | 当前样本命中的详情接口链路。 |
| `HumanSummaryBlock` | 目标中的人类语言摘要展示块。 |

## Consequences

- 正向：后续排障会聚焦到真实用户路径，不再误把相邻页面结果当成结论。
- 正向：一旦 `/api/approvals/:id` 链路修通，首屏可直接承载人类语言内容。
- 取舍：需要同时检查前端路由、接口、数据源和旧 bundle 的可能性，排查面更完整。
- 风险：如果后续有人绕过真实链路直接改展示，`ApprovalDetail` 仍可能回退成空白或技术态。
- 验证锚点：当前计划已明确把 `ApprovalDetail` 的 404 根因定位和首屏人类语言闭环作为后续任务。

## Search Terms

- `ApprovalDetail`
- `/risk/approval/:id`
- `/api/approvals/:id`
- `HumanSummaryBlock`
- `404`
- `人类语言`
- `首屏`
