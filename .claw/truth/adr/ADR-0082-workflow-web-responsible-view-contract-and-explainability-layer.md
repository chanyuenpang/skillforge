# ADR: Workflow Web 负责人视图契约与解释层收口

## Status

accepted

## Context

阶段 M 的目标不是再堆字段，而是让网页端真正回答负责人关心的六个问题：这是什么、为什么出现、由什么触发、影响什么、风险原因、产出什么。

在此之前，审批与运行记录更偏机器字段展示，内部 ID 和技术字段直接暴露在主视图里，负责人需要自己拼语义，阅读成本高，也容易把探测失败或历史数据兜底误判成业务异常。

## Decision

决定将 Web 端的长期展示收口为一条统一的负责人视图链路：

1. 先定义 `responsibleView` 共享契约，明确审批记录与运行记录必须提供负责人可读字段。
2. 后端在 `web-server.mjs` 中为审批队列/详情、运行中心 summary/list/detail 增加解释层字段，并保留旧字段兼容性。
3. 前端的 `ApprovalQueue`、`ApprovalDetail`、`RunCenterList`、`RunCenterDetail` 主视图优先消费 `responsibleView`，把内部 ID 下沉到 `technical` / `trace` 区域。
4. 网页主视图的默认表达从“机器字段罗列”切换为“叙事化负责人视图”，确保主标题、风险、状态、结果都先回答业务问题。

## Alternatives Considered

- 继续让页面直接展示原始字段：被拒绝，因为负责人需要自己拼接语义，且内部 ID 会污染主视图。
- 只改前端排版，不加后端解释层：被拒绝，因为语义仍然分散在各组件，后续数据源变化时更容易漂移。
- 只在后端新增字段，不调整页面主视图：被拒绝，因为最终仍会把机器字段直接暴露给负责人。

## Related Code

| Path | Role |
| ---- | ---- |
| `docs/responsible-view-contract.md` | `responsibleView` 契约定义锚点。 |
| `web-server.mjs` | 为审批队列/详情、运行中心返回解释层字段的服务入口。 |
| `ApprovalQueue` | 审批队列页负责人主视图。 |
| `ApprovalDetail` | 审批详情页负责人主视图。 |
| `RunCenterList` | 运行中心列表页负责人主视图。 |
| `RunCenterDetail` | 运行中心详情页负责人主视图。 |

## Consequences

- 正向：负责人在网页端能直接回答“是什么/为什么/影响什么/结果是什么”。
- 正向：主视图统一使用 `responsibleView` 后，页面语义不容易再被机器字段污染。
- 正向：后端保留旧字段兼容性，降低存量调用的破坏风险。
- 取舍：历史数据缺少业务标题时，仍可能需要可读化兜底，展示质量受源数据限制。
- 风险：如果后续页面绕过 `responsibleView` 直接消费原始字段，可解释性会再次回退。
- 验证锚点：阶段 M 已完成契约、后端解释层、前端负责人视图与逐页验收，且 build 通过。

## Search Terms

- `responsibleView`
- `web-server.mjs`
- `ApprovalQueue`
- `ApprovalDetail`
- `RunCenterList`
- `RunCenterDetail`
- `title`
- `purpose`
- `riskExplanation`
- `statusNarrative`
- `resultSummary`
- `outputSummary`
