# ADR: Milestone R 每一步都必须经过 SkillForge review 与 optimize 后再授权/派遣

## Status

accepted

## Context

Milestone R 的目标是把“服务器又挂了”的托管链路稳定下来，重点不是单次修复，而是建立一条不会反复掉线的执行约束。计划复盘显示，后续动作如果只在阶段入口做一次 SkillForge 处理，仍然可能在中途步骤上出现遗漏、偏题或授权边界不清的问题。

在该 Milestone 中，真正被收敛出来的不是某个一次性的修复手法，而是一个更强的流程门禁：**每一个后续步骤本身都要显式经过 SkillForge review，再经 SkillForge optimize 当前步骤的 prompt / 输入材料，之后才允许确认授权边界并派遣或执行**。

## Decision

Milestone R 的后续执行规则固定为：

**每一步都必须先经 SkillForge review 当前 step → 再经 SkillForge optimize 当前 step 的 prompt / 输入材料 → 再确认授权边界 → 最后才允许派遣或执行。**

这意味着：

- 不能只在阶段入口做一次 SkillForge 处理，就默认后续所有步骤都已被覆盖。
- 不能跳过针对单个 step 的 review / optimize。
- 任何真正执行前，都必须先完成该 step 的输入材料优化与授权确认。

该规则适用于 Milestone R 的后续所有步骤，而不只是 Task11 / Task12 / Task13 这类实施任务。

## Alternatives Considered

- 只在阶段入口做一次 SkillForge review / optimize，再直接推进后续步骤：被拒绝，因为中途步骤仍可能失去约束，无法保证每一步都被显式校验。
- 仅对实施任务做 SkillForge 处理：被拒绝，因为问题不只存在于实施段，计划中已明确要求“后续所有步骤”都要受同样约束。
- 直接沿用上一阶段的默认中间层流程，不单独强化到 step 级：被拒绝，因为 Milestone R 的核心诉求就是把“稳定挂载与托管可靠性”变成可持续执行边界，而不是一次性流程优化。

## Related Code

| Path | Role |
| --- | --- |
| `plan.json` | 本次 Milestone R 完成计划的源记录，包含 step 级 SkillForge 约束与实施/验证收口信息 |
| `plan.json`（Task 9、Task 11-13） | 记录“每一个步骤都必须显式经过 SkillForge”这一长期流程约束的最直接证据锚点 |

## Consequences

- 正向：后续每一步都带有 review 与 optimize 两道门禁，减少偏题、漏约束和越权执行。
- 正向：授权边界从一次性确认变成 step 级确认，更适合托管与稳定性类修复。
- 取舍：执行链路更长，单步推进会比“入口一次性处理”慢一些。
- 风险：如果未来把 step 级 SkillForge 当成可选项，Milestone R 的稳定性收益会明显下降。
- 验证锚点：Milestone R 已在完成计划中把 SkillForge review / optimize / 授权 / 执行拆成固定顺序，并在后续 step 中重复要求该链路。

## Search Terms

- `SkillForge`
- `review current step`
- `optimize current step`
- `授权边界`
- `每一个步骤`
- `Task11`
- `Task12`
- `Task13`
