# ADR: betterPrompt 仅提取 tag 与核心目标，约束来自 skill，success criteria 由 LLM 推断

## Status

accepted

## Context

本次 `betterPrompt` 子计划完成后，明确收紧了 prompt 生成职责边界。旧做法容易把输入侧要求做得过重：不仅要输入完整表单，还要显式提供 `constraints`、`success_criteria`、`type` 等信息。这样会让 prompt 生成链路变成“收集表单 + 再做重组”，增加输入负担，也让技能内容与任务目标之间的分工变得模糊。

计划记录还确认了一个长期有效的产品约束：最终产物不能暴露技能名，`constraints` 与工作流步骤应从命中的 skill 中获取，而不是要求用户输入；`success criteria` 则由 LLM 根据 task goal 和 skill 内容推断补全。这样 `betterPrompt` 才能把自己固定为微观重组层，而不是一个半人工的表单拼装器。

## Decision

`betterPrompt` 的长期规则固定为：

1. **输入侧只聚焦 tag 与核心目标**
   - 不再强制输入完整表单。
   - 主要提取语义 `tag` 和核心 `goal`，其余信息不作为输入侧硬门槛。

2. **约束与工作流从命中的 skill 获取**
   - `constraints` 和 workflow 步骤由 skill 提供。
   - `betterPrompt` 负责把已命中的 skill 内容内联进最终 prompt，而不是把这些内容外包给输入字段。

3. **`success criteria` 由 LLM 推断生成**
   - LLM 根据 task goal + skill 内容推断验收标准。
   - 不要求输入侧预先显式填写完整 `success_criteria`。

4. **最终产物不得暴露技能名**
   - 输出必须自包含，可独立执行。
   - 产物中不保留技能名引用，避免后续执行依赖外部语义上下文。

## Alternatives Considered

- **继续要求输入完整表单**：被拒绝。会把 `betterPrompt` 变成表单校验层，提升输入成本，也削弱技能内容的复用价值。
- **让用户手填 `constraints` / `success_criteria`**：被拒绝。约束应来自 skill，验收标准应由任务目标与 skill 内容推断，否则职责边界会错位。
- **在产物里保留技能名引用**：被拒绝。会破坏 prompt 自包含约束，影响后续独立执行。

## Related Code

| Path | Role |
| ---- | ---- |
| `plan.json` | 本次 `betterPrompt` 子计划源记录，包含任务拆分、完成态与复盘。 |
| `betterPrompt` 生成链路相关实现 | 承担 tag 提取、skill 内联重组与验收标准推断的核心逻辑。 |

## Consequences

- 正向：输入侧更轻，`betterPrompt` 只需关注 `tag` 与核心目标，减少表单噪音。
- 正向：约束与 workflow 直接来自 skill，职责分工更清晰，减少重复维护。
- 正向：`success criteria` 由 LLM 根据目标与 skill 内容补全，适合动态任务。
- 正向：最终产物保持自包含，不暴露技能名，后续执行更独立。
- 取舍：`success criteria` 由推断生成，依赖模型对目标与 skill 的理解质量。
- 风险：如果 skill 内容不完整或命中错误，推断出的验收标准会偏离真实预期。
- 验证锚点：计划已 `end.completed`，其中 Task 1、2、3、5 均为 `done`，分别对应 tag/goal 简化、约束从 skill 获取、success criteria 推断、以及约束与 success criteria 的落地收口；Task 4 和 Task 6 因验证链路超时处于 `blocked`，不改变上述实现决策。

## Search Terms

- `betterPrompt`
- `tag`
- `constraints`
- `success_criteria`
- `skill`
- `LLM`
- `self-contained prompt`
