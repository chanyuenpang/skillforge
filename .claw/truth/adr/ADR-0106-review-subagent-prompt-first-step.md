# ADR: reviewSubagentPrompt 作为默认首刀

## Status

proposed

## Context

SkillForge 真实任务链路已经收敛到 `review plan → 回写 → optimize prompt → spawn → 结果回流`，但在具体下发 subagent 之前，仍需要一个更细的提示词评审层来专门处理 subagent prompt 质量。

本次计划明确只做最小落地：一小批手工注册的 skill asset、`searchSkills`、`reviewSubagentPrompt`，不做 UI、不做审批、不做 registry 自动化，也不做 `reviewPlan`。这说明该决策的目标不是扩展整套系统，而是验证 `reviewSubagentPrompt` 能否成为 subagent prompt 的稳定前置门禁。

## Decision

将 `reviewSubagentPrompt` 固化为 subagent prompt 的默认第一步：在 `spawn` 之前，先用它对待下发的 subagent prompt 做质量评审，再决定是否进入后续优化与派发。

这条决策的核心是把 prompt 质量门禁前移到派发前，先处理以下问题：

- prompt 是否已经收敛到具体任务意图。
- 是否补齐了命中的 skill 约束。
- 是否存在遗漏上下文、指令冗余或边界不清。
- 是否适合继续进入派发链路。

## Alternatives Considered

- 继续只做 `review plan`：被拒绝，因为 plan 质量不等于 subagent prompt 质量，仍可能在派发时偏题。
- 直接优化 prompt 后 spawn：被拒绝，因为少了一道专门的 prompt 评审门禁，容易把问题带入执行期。
- 同时做 `reviewPlan` 和 `reviewSubagentPrompt` 的全链路自动化：被拒绝，因为本次只验证最小闭环，避免把目标扩大到 UI、审批与 registry 自动化。

## Related Code

| Path | Role |
| ---- | ---- |
| `plan.json` | 本次计划源记录，包含最小落地范围与排除项。 |
| `searchSkills` | 用于检索命中 skill asset，并为 prompt 评审提供约束来源。 |
| `reviewSubagentPrompt` | 本 ADR 的核心门禁点，负责在派发前评审 subagent prompt 质量。 |
| 手工注册的 skill asset | 本次只验证的小批量输入源，不扩展到 registry 自动化。 |

## Consequences

- 正向：subagent prompt 在派发前先经过专门评审，能更早发现偏题、冗余与缺失约束。
- 正向：`reviewSubagentPrompt` 可作为后续 prompt 质量治理的稳定入口。
- 取舍：这会额外增加一次前置评审步骤，单次任务链路更长。
- 风险：若 skill asset 太少或 `searchSkills` 命中不准，评审效果会受输入质量影响。
- 验证锚点：本计划明确只做最小落地，不引入 UI、审批、registry 自动化或 `reviewPlan`，因此后续若要升级链路，需要在此门禁之上继续补齐能力。

## Search Terms

- `reviewSubagentPrompt`
- `searchSkills`
- `spawn`
- `subagent prompt`
- `skill asset`
- `prompt 评审`
