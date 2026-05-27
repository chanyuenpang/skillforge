# ADR: SkillForge boundary/privacy 判定必须聚合多源声明，且 fixture 权限表达采用最保守口径

## Status

accepted

## Context

这次批量验证把 `task-planning`、`browser-agent-workflow`、`coding-agent-workflow` 映射成 SkillForge fixtures 并完成静态验证后，验证过程暴露出一个稳定结论：`boundary` / `privacy` 不是单个文件能决定的，而是要综合 `skill-spec`、`workflow-source`、`generation-run`、`skill-manifest` 等多源声明后再统一归因。

如果只改某一个文件，validator 仍可能因为其他来源里的权限/边界信号继续命中 P0。这个问题在 `browser` 和 `coding` 两个样本上都出现过，说明它不是单点特例，而是 fixture 设计层面的长期约束。

## Decision

决定将 SkillForge 的 `boundary` / `privacy` 判定规则固定为“多源声明聚合后统一裁决”，并要求 fixture 权限表达始终采用最保守口径。

具体约束如下：

- `boundary` / `privacy` 不能只依据单一 `skill-spec.yaml` 或单一 manifest 字段下结论，必须聚合相关声明源后再判定。
- fixture 中的权限表达必须全源一致，不能在某个文件里放宽、在另一个文件里保守；否则会制造不可消除的归因冲突。
- 对于涉及路径、网络、副作用或可见性边界的技能映射，默认采用最保守的权限声明，直到所有相关源文件都能表达一致。
- 后续新增技能 fixture 时，应把这种多源一致性作为基础模板，而不是在验证失败后再做局部修补。

## Alternatives Considered

- 只修正 `skill-spec` 单文件：拒绝。验证结果表明，单文件修补不足以消除其他源带来的权限归因。
- 把 `browser` / `coding` 的失败视作各自独立特例：拒绝。它们共享同一类多源不一致问题，属于同一架构约束。
- 继续允许不同文件各自表达不同权限强度：拒绝。这样会让 validator 无法形成稳定的最终边界判断。

## Related Code

| Path | Role |
| ---- | ---- |
| `tasks/task-planning-与-browser-coding-agent-workflow-技能批量验证/plan.json` | 来源计划记录，包含 completed 任务、summary 与 retrospective 结论。 |
| `fixtures/task-planning` | 验证锚点 fixture，最先用于校准 `entry` 与 `boundary` schema。 |
| `fixtures/browser-agent-workflow` | 浏览器工作流 fixture，暴露多源边界归因问题。 |
| `fixtures/coding-agent-workflow` | 编码工作流 fixture，暴露默认边界判定与最小保守表达问题。 |
| `validate:fixture` | 首轮静态验证入口。 |
| `validator/normalize` | 多源声明聚合与归因的关键处理路径。 |

## Consequences

- 正向：后续 SkillForge fixture 的 `boundary` / `privacy` 判定会更稳定，不再依赖单文件特判。
- 正向：新技能映射可以直接复用“全源一致、最保守”模板，降低反复修补成本。
- 取舍：fixture 初始编写会更保守，短期内可能增加声明冗余。
- 风险：如果某个来源文件仍保留冲突信号，validator 仍会继续报阻断，这要求后续映射时一次性对齐所有相关源。
- 验证锚点：计划记录明确写明三技能 `P0` 阻断已清空，且验证过程确认 `boundary/privacy` 依赖多源声明聚合。

## Search Terms

- `boundary`
- `privacy`
- `skill-spec`
- `workflow-source`
- `generation-run`
- `skill-manifest`
- `validator/normalize`
- `P0`
- `browser-agent-workflow`
- `coding-agent-workflow`
