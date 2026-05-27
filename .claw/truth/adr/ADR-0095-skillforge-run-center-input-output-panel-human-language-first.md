# ADR: SkillForge RunCenter 输入输出面板人类语言优先

## Status

accepted

## Context

`RunCenterDetail` 的首屏已经有 `HumanSummaryBlock`，但计划记录确认，用户实际看到的下方“输入 (Input) / 输出 (Output)”可观测分区仍然以结构化对象和 JSON 展开为主。也就是说，首屏有人话，不代表输入/输出主面板已经真正人话化；用户体感仍会是“input/output 还是 JSON 格式”。

这次计划的目标不是再补一层摘要，而是把输入/输出面板本身的主展示顺序改掉：先展示可读文本，再把 JSON 细节放到折叠层或技术区。

## Decision

决定将 `RunCenterDetail` 的输入/输出面板长期收口为以下规则：

1. **输入/输出面板主层必须优先展示人类语言**
   - 输入侧优先展示 `inputMessage`，其次才回退到其他可读文本或摘要。
   - 输出侧优先展示 `outputMessage`，其次才回退到其他可读文本或摘要。
   - 失败态优先展示 `failureMessage`，必要时再回退到其他可读文本或摘要。

2. **JSON 只能作为展开细节**
   - 结构化对象、原始 payload、展开 JSON 只能放在折叠层或技术信息区。
   - 不能让 JSON 代码块占据用户第一眼看到的主叙事位。

3. **面板级可观测性不等于机器字段主导**
   - 输入/输出区域仍然可以保留技术细节，但主视觉必须是人类可读内容。
   - 页面上的“可观测”不能退化成“先看 JSON 再找正文”。

## Alternatives Considered

- **继续只靠首屏 `HumanSummaryBlock`**：拒绝。首屏有人话不代表输入/输出面板本身已经可读。
- **只把 JSON 折叠，不改主展示顺序**：拒绝。用户第一眼仍然会被 JSON 占住。
- **把输入/输出都改成纯文本，完全去掉结构化内容**：拒绝。会丢失必要的技术可观测性。

## Related Code

| Path | Role |
| ---- | ---- |
| `web/src/components/RunCenterDetail.jsx` | `RunCenterDetail` 输入/输出主展示区与 JSON 折叠区的收口点。 |
| `web-server.mjs` | `inputMessage` / `outputMessage` / `failureMessage` 以及原始结构化数据的来源。 |

## Consequences

- 正向：用户打开 `RunCenterDetail` 时，输入/输出区域第一眼看到的是人类语言，而不是 JSON。
- 正向：结构化数据仍可保留，方便排查和可观测性。
- 取舍：前端需要维护更明确的主层/展开层分工，展示逻辑比直接渲染 JSON 更复杂。
- 风险：如果后续新增字段只补进 JSON 区而不补人话，主面板可能再次退化。
- 验证锚点：计划明确要求验证修复后 `run-center detail` 页面里的输入/输出主内容已不再是 JSON。

## Search Terms

- `RunCenterDetail`
- `inputMessage`
- `outputMessage`
- `failureMessage`
- `JSON`
- `input/output`
- `HumanSummaryBlock`
