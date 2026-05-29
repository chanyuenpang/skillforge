# ADR: betterPrompt 技能内联重组与隐式验收标准

## Status

proposed

## Context

本次子计划明确了 `betterPrompt` 的长期职责边界：它的首要任务不是补全完整表单，而是从自然语言输入中提取语义 `tag` 和核心目标。与此同时，约束不再由输入侧强制提供，而是从命中的 skill 中获取；`success criteria` 也不再要求用户显式填写，而是由 LLM 结合任务目标与 skill 内容推断补全。

这意味着 `betterPrompt` 的角色从“表单式补全器”转向“面向执行的提示重组器”，需要把技能内容内联到最终产物里，避免把技能名暴露给下游执行面。

## Decision

`betterPrompt` 固定采用“技能内联重组 + 隐式验收标准”的实现方式：

1. **输入侧只提取 `tag` 与核心目标**
   - LLM 只负责从用户自然语言里提炼语义 `tag` 和任务核心目标。
   - 不再把 `constraints`、`success_criteria`、`type` 作为强制输入字段来收集。

2. **约束与工作流从命中的 skill 中获取**
   - `constraints` 和 workflow 步骤由命中的 skill 提供。
   - 输入侧不承担约束编写职责。

3. **`success criteria` 由 LLM 推断补全**
   - LLM 结合 task goal 与 skill 内容生成验收标准。
   - 验收标准可以缺省为显式输入，但不能缺省为最终产物。

4. **最终产物不暴露技能名**
   - 生成结果必须是可独立执行的自包含 prompt。
   - 不输出“引用某个 skill 名称”的外壳表达。

## Alternatives Considered

- 继续要求输入侧提供完整表单字段：被拒绝，因为会把 LLM 的核心价值压成机械填表，且与真实自然语言入口不匹配。
- 让 `betterPrompt` 只做 tag 分类，不做约束与验收补全：被拒绝，因为下游执行仍缺少可操作边界，无法形成完整 prompt。
- 把技能名直接透传给下游：被拒绝，因为会削弱自包含能力，也会让最终产物依赖外部技能索引。

## Related Code

| Path | Role |
| ---- | ---- |
| `plan.json` | 本决策的源计划记录，包含 `betterPrompt：技能内联重组子计划（v2）` 的目标与任务拆分。 |
| `betterPrompt` 相关生成链路 | 需要遵守 `tag` 提取、技能内联、隐式验收标准的长期约束。 |
| `Skill Registry` | 提供命中 skill 的检索与内容来源。 |

## Consequences

- 正向：输入侧更贴近自然语言，减少对人工表单补全的依赖。
- 正向：`betterPrompt` 可以直接产出自包含 prompt，降低下游执行对技能名和外部上下文的依赖。
- 正向：`success criteria` 不再需要人工逐项显式填写，能更自然地跟随任务目标与 skill 内容变化。
- 取舍：LLM 的推断质量成为验收标准质量的关键变量，需要后续通过真实 prompt 验证。
- 风险：若 skill 内容不足或命中不准，隐式补全可能出现偏差。
- 验证锚点：需用真实自然语言输入跑全链路，并由主 Agent 现场验收最终 prompt 是否仍满足 `0` 处技能名暴露。 

## Search Terms

- `betterPrompt`
- `tag`
- `constraints`
- `success_criteria`
- `workflow`
- `skill name`
- `自包含 prompt`
