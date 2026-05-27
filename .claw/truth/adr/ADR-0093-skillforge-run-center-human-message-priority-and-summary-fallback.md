# ADR: SkillForge RunCenter 人类原话与标签优先展示

## Status

accepted

## Context

RunCenter 的运行详情、列表与首页，长期都在同时暴露两类信息：一类是 `runId`、`fixtureId`、`requestId`、`source` 这类机器定位字段，另一类是用户真正需要理解的自然语言内容。早期实现里，机器字段经常直接占据主叙事位，导致用户打开页面时先看到编号、来源和内部对象名，却看不懂这次运行到底做了什么。

这轮收口里又明确发现：后端 `execution-log`/detail API 不仅补出了 `inputMessage` / `outputMessage` / `failureMessage`，还把 `inputSummary` / `outputSummary` / `failureSummary` 作为兜底补齐；与此同时，页面上的术语层也完成了 `fixture`、`source`、`requestId` 等高频机器词的统一人类标签化。因此，需要把“人类原话优先 + 人类标签优先，机器标识降权”的规则定成长期约束，避免后续实现回到机器字段主导。

## Decision

决定在 `RunCenterOverview`、`RunCenterList`、`RunCenterDetail` 及相关展示里采用以下长期规则：

1. **人类标签优先**
   - 页面主叙事优先使用人类标签，如 `来源`、`运行编号`、`样例编号`、`请求编号`。
   - `fixture`、`source`、`requestId`、`runId` 不再直接作为主标题或主信息字段裸露展示。

2. **输入展示必须原话优先**
   - 优先使用 `inputMessage`。
   - 若不存在，再依次回退到 `input.content`、`input.text`、`input.prompt`。
   - 只有当原始可读正文都缺失时，才回退到 `inputSummary`。

3. **输出展示必须原话优先**
   - 优先使用 `outputMessage`。
   - 再回退到 `transcript output` 或其他原始可读正文。
   - 只有在没有原话时，才回退到 `outputSummary`。

4. **失败原因必须原话优先**
   - 优先使用 `failureMessage` 或 `errorMessage`。
   - 再回退到 `failureSummary`。
   - 失败态必须明确告诉用户“为什么失败”，不能只给状态码或机器状态。

5. **摘要只作为兜底，不作为主叙事**
   - `inputSummary` / `outputSummary` / `failureSummary` 继续保留，用于原话缺失或补充概括。
   - 详情页第一屏必须优先呈现自然语言主叙事，机器字段与 JSON 细节退到次级区域。

6. **内部字段降权到技术区**
   - `taskRef`、`promptDraftRef`、`stepPlanRef`、`assetId`、`skeletonId`、`approvalId`、`executionId`、`metadata`、`payload`、`trace` 等内部字段，只能放在技术信息或展开区。
   - 主叙事位只回答“这次运行是什么、做了什么、结果如何”。

## Alternatives Considered

- **只展示 `inputSummary` / `outputSummary` / `failureSummary`**：拒绝。摘要能提升可读性，但无法满足用户“优先看到原始人类语言内容”的要求。
- **继续把 `runId`、`fixtureId`、`requestId` 放在第一屏主叙事位**：拒绝。会把机器定位信息误当成运行内容，弱化可理解性。
- **只在前端临时拼接原话**：拒绝。虽然能缓解一时问题，但没有把“原话优先、摘要兜底”固化为稳定策略，后续容易回退。
- **保留机器术语不做别名**：拒绝。术语层如果不先统一，哪怕原话字段完善了，用户仍然会被内部词汇打断理解。

## Related Code

| Path | Role |
| ---- | ---- |
| `web-server.mjs` | `inputMessage` / `outputMessage` / `failureMessage` 与 `inputSummary` / `outputSummary` / `failureSummary` 的生成与兜底来源 |
| `web/src/components/RunCenterDetail.jsx` | 详情页原话优先规则、第一屏叙事区与折叠技术区 |
| `web/src/components/RunCenterOverview.jsx` | 首页主次结构、运行内容展示与人类标签优先策略 |
| `web/src/components/RunCenterList.jsx` | 列表页主标题、摘要与机器 ID 降权策略 |

## Consequences

- 正向：用户打开 RunCenter 详情、列表和首页时，先看到的是自然语言内容与人类标签，而不是机器字段。
- 正向：当原始正文存在时，展示更贴近实际运行语义；当正文缺失时，摘要仍能兜底。
- 正向：同一规则可以同时覆盖 detail、overview、list 三个页面，减少展示风格分裂。
- 取舍：前端需要维护一条更长的候选链，展示逻辑比单一摘要更复杂。
- 取舍：若后端继续新增可读字段，前端回退顺序也要同步维护。
- 验证锚点：`RunCenterDetail` 第一屏已按原话优先规则落地，`runId` / `fixtureId` / `requestId` 已降到辅助信息区；成功/失败样本都已验证可读。

## Search Terms

- `inputMessage`
- `outputMessage`
- `failureMessage`
- `errorMessage`
- `inputSummary`
- `outputSummary`
- `failureSummary`
- `RunCenterDetail`
- `RunCenterOverview`
- `RunCenterList`
- `runId`
- `fixtureId`
- `requestId`
- `source`
- `来源`
- `运行编号`
- `样例编号`
- `请求编号`
