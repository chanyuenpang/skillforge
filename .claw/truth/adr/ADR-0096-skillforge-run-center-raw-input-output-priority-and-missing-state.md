# ADR: SkillForge RunCenter 原文优先与缺失状态诚实降级

## Status

accepted

## Context

`RunCenterDetail` 之前已经把输入/输出面板做成“人类语言优先”，但本轮计划进一步确认：用户要的不是解释性摘要，也不是概括文案，而是 `request` / `prompt` / `message` / `transcript` / `output.content` / `error` 这些真正的原文正文。

计划执行后的结论是：历史样本里很多记录并没有稳定保存原文正文，页面如果继续拿摘要冒充原文，会让用户误以为“已经有原文”。因此，展示策略不能只做“原话优先”，还必须把“原文缺失”作为一等状态显式呈现。

## Decision

决定将 RunCenter 详情页的输入/输出/失败展示收口为以下长期规则：

1. **原文正文优先于摘要**
   - 输入侧优先取 `detail.input.content`、`detail.input.message`、`detail.input.prompt` 或等价的真实正文来源。
   - 输出侧优先取 `detail.output.content`、`detail.output.message`、`transcript.output.content` 或等价的真实正文来源。
   - 失败态优先取 `error` 原文、`raw error text` 或等价的真实正文来源。
   - 只有当真正原文不存在时，才回退到 `inputSummary` / `outputSummary` / `failureSummary` 这类解释性摘要。

2. **原文缺失必须显式提示**
   - 当后端没有返回原文时，前端必须明确告诉用户“当前记录未保存原文，仅展示摘要”。
   - 不能用摘要、派生文案或 JSON 填补成“看起来像原文”的正文。
   - 缺失状态本身是可观测信息，必须和正文区分开。

3. **API 必须提供原文可用性信号**
   - `web-server.mjs` 的 `buildRunDetail()` 需要返回 `rawInput`、`rawOutput` 与 `rawTextAvailability` 这类信号。
   - 前端根据可用性信号决定是否显示正文、摘要或缺失提示，而不是靠猜字段名。

4. **JSON 继续只做技术展开层**
   - 结构化 payload、原始对象和调试信息仍可保留，但只能放在折叠区。
   - 主层的职责是告诉用户“原文是什么；如果没有原文，就明确说明没有”。

## Alternatives Considered

- **继续只展示摘要**：拒绝。摘要不能替代原文，尤其在用户明确要求“输入原文/输出原文”时。
- **让前端自己拼接成看似原文的文本**：拒绝。历史记录没有稳定正文时，伪装成原文会制造误导。
- **只改前端，不补原文可用性信号**：拒绝。没有 `rawTextAvailability` 一类信号，前端无法可靠判断何时该降级。
- **把缺失状态藏进 JSON 里**：拒绝。缺失状态本身就是主界面必须告诉用户的事实。

## Related Code

| Path | Role |
| ---- | ---- |
| `web-server.mjs` | `buildRunDetail()` 返回 `rawInput`、`rawOutput`、`rawTextAvailability` 的来源。 |
| `web/src/components/RunCenterDetail.jsx` | 输入/输出/失败展示的原文优先与缺失状态提示收口点。 |

## Consequences

- 正向：有原文时，RunCenter 详情页优先展示真正正文，不再拿摘要冒充。
- 正向：无原文时，页面会明确告诉用户“当前记录未保存原文，仅展示摘要”，避免误判。
- 正向：API 与前端的职责更清楚，原文可用性不再靠页面猜测。
- 取舍：老数据如果没有原文，会继续以摘要辅助阅读，而不是被伪装成正文。
- 取舍：展示链路需要维护正文、摘要、缺失提示三套状态，逻辑比单一路径更复杂。
- 验证锚点：计划已确认 `buildRunDetail()` 返回 `rawInput/rawOutput/rawTextAvailability`，且前端在无原文时展示明确缺失提示。

## Search Terms

- `buildRunDetail()`
- `rawInput`
- `rawOutput`
- `rawTextAvailability`
- `RunCenterDetail`
- `inputSummary`
- `outputSummary`
- `failureSummary`
- `当前记录未保存原文，仅展示摘要`
- `request`
- `prompt`
- `message`
- `transcript`
- `output.content`
- `error`
