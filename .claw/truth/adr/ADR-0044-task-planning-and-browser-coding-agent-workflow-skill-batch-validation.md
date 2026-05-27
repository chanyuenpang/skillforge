# ADR: task-planning 与 browser/coding agent workflow 技能批量验证的复用边界

## Status

accepted

## Context

这次计划把 `task-planning`、`browser-agent-workflow`、`coding-agent-workflow` 映射成 SkillForge fixtures，并做首轮静态验证，核心目的不是单纯补一批样本，而是检验当前受控文件/工作流规则能否复用到更多技能。

计划记录已经给出稳定边界：来源 skill 分别来自 `task-planning`、`browser-agent-workflow`、`coding-agent-workflow`，目标是复用既有 SkillForge 验证模型，重点观察“规划型工作流”“浏览器型工作流”“编码型工作流”在同一套静态契约下是否可被统一表达。

## Decision

决定将 `task-planning`、`browser-agent-workflow`、`coding-agent-workflow` 这类不同形态的 workflow skills 继续纳入同一套 SkillForge fixture 与静态验证框架，而不是为每种 workflow 单独发明验证规则。

具体规则如下：

- 规划型 workflow、浏览器型 workflow、编码型 workflow 应优先复用同一套 fixture 映射与验证边界。
- 验证框架需要支持把 workflow skills 的职责边界表达为可检验的契约，而不是只依赖自然语言说明。
- 后续再遇到新的 workflow skill，应先判断能否落入现有受控文件/工作流规则，再考虑新增特例。
- 当前计划的价值在于批量验证复用性，而不是把每个 skill 变成独立的验证分支。

## Alternatives Considered

- 为 `task-planning`、`browser-agent-workflow`、`coding-agent-workflow` 分别定义独立规则：拒绝。这样会把通用能力拆成三个孤立分支，后续维护成本更高。
- 只做 fixture 映射，不沉淀统一验证边界：拒绝。这样只能完成样本收录，无法形成可复用的长期约束。
- 将不同 workflow skill 视为完全不相容的验证对象：拒绝。这样会放弃当前受控文件/工作流规则已经形成的复用价值。

## Related Code

| Path | Role |
| ---- | ---- |
| `tasks/task-planning-与-browser-coding-agent-workflow-技能批量验证/plan.json` | 来源计划记录，包含目标与参考来源。 |
| `skills/task-planning/SKILL.md` | 规划型 workflow 的源 skill。 |
| `skills/browser-agent-workflow/SKILL.md` | 浏览器型 workflow 的源 skill。 |
| `skills/coding-agent-workflow/SKILL.md` | 编码型 workflow 的源 skill。 |
| `projects/workflow-kit` | 本次批量验证的目标项目根。 |
| `validate:fixture` | 首轮静态验证入口。 |

## Consequences

- 正向：workflow skills 的复用验证可以在同一套 SkillForge 静态契约下推进，减少重复规则。
- 正向：后续新增类似 workflow skill 时，可以优先尝试复用现有受控文件/工作流边界。
- 正向：技能批量验证的结论会反向增强 fixture 映射层的通用性，而不是只生成一次性样本。
- 取舍：当前计划仍处于 `prepare.requirements`，还没有完成最终验证结论，因此这条 ADR 先按架构方向沉淀为 accepted 的复用边界，而不是补充具体验证结果。

## Search Terms

- `task-planning`
- `browser-agent-workflow`
- `coding-agent-workflow`
- `validate:fixture`
- `SkillForge fixture`
- `受控文件`
- `工作流规则`
