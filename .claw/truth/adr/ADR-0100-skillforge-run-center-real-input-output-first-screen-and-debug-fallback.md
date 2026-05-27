# ADR: SkillForge RunCenter 真实输入输出首屏展示与调试区降级

## Status

accepted

## Context

Run Center 的目标不是让负责人先看摘要或技术字段，而是打开任意一条运行记录时，能直接看到这次运行的真实输入与真实输出。此前相关页面虽然已经有 `inputMessage` / `outputMessage` / `failureMessage` 以及摘要兜底，但计划再次明确了产品目标：真实输入输出必须成为主叙事，摘要、结构化 payload、JSON、元数据只能退到次级区域。

这是一条长期展示约束，不是一次性的 UI 微调。若不把边界定死，后续很容易又回到“先看摘要，再翻 JSON”的旧模式。

## Decision

决定将 Run Center 的详情页展示规则收口为以下长期约束：

1. **首屏主叙事必须是真实输入与真实输出**
   - 详情页第一眼必须直接展示运行的真实输入与真实输出。
   - 对失败记录，真实失败信息也应进入主叙事，而不是只给状态码或技术错误块。

2. **摘要只做兜底，不做主展示**
   - `inputSummary` / `outputSummary` / `failureSummary` 只能在原话缺失时兜底。
   - 只要存在可读原文，就不能让摘要抢占主展示位。

3. **结构化 payload 与 JSON 只能进入调试区**
   - 原始结构化对象、展开 JSON、技术元数据必须放在折叠层或调试区。
   - 不能让 JSON 代码块成为用户第一眼看到的内容。

4. **展示粒度以“产品叙事”优先**
   - 主区回答“这次运行输入了什么、输出了什么、失败了什么”。
   - 调试区回答“底层对象长什么样”。

## Alternatives Considered

- **继续只靠摘要文案**：拒绝。摘要无法替代真实输入输出。
- **只把 JSON 折叠起来，但不改主叙事顺序**：拒绝。用户第一眼依然会先看到技术内容。
- **把所有结构化内容都去掉，只保留纯文本**：拒绝。会丢失必要的可观测性与排障能力。

## Related Code

| Path | Role |
| ---- | ---- |
| `web/src/components/RunCenterDetail.jsx` | 详情页主叙事区、调试区与 JSON 折叠区的收口点。 |
| `web-server.mjs` | `inputMessage` / `outputMessage` / `failureMessage` 以及原始结构化数据来源。 |

## Consequences

- 正向：负责人打开 Run Center 详情时，第一眼看到的是实际输入输出，而不是摘要或 JSON。
- 正向：摘要、payload、JSON 仍可保留，兼顾可读性与排障。
- 取舍：前端需要明确区分主叙事区与调试区，展示逻辑更复杂。
- 风险：如果后续新增字段只补到技术区而不补到主叙事区，页面会再次退化。
- 验证锚点：后续验收应直接检查 `RunCenterDetail` 的第一屏是否已以真实输入输出为主。

## Search Terms

- `RunCenterDetail`
- `inputMessage`
- `outputMessage`
- `failureMessage`
- `inputSummary`
- `outputSummary`
- `failureSummary`
- `JSON`
