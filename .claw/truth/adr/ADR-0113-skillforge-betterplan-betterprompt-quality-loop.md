# ADR: SkillForge `betterPlan` / `betterPrompt` 质量闭环

## Status

accepted

## Context

本次完成的计划把 `betterPlan` / `betterPrompt` 从单点能力推进到一个可持续提质的最小质量闭环。计划的核心不是再扩外围系统，而是把现有能力收束为一条可回归、可复核、可持续迭代的质量链：先定义评价维度，再沉淀真实样本，再接入执行结果回流，最后形成稳定的评测基线。

计划记录同时确认了几个长期约束：

- 质量推进必须遵循 SkillForge 流程，先研究再收敛，不直接扩外围壳子。
- 每次派发 subagent 前都要先做 prompt 优化，保证任务边界清楚。
- 质量工作只聚焦 `betterPlan` / `betterPrompt`，不扩 UI、不扩 registry、不扩审批系统。
- 所有阶段都必须补验证环节，输出要能复核。
- `betterPlan` 既有评价标准与最小模板已经存在，`betterPrompt` 也已有输入收口与自包含约束，因此这次计划落点是把它们串成闭环，而不是重新发明定义。

## Decision

决定将 `betterPlan` / `betterPrompt` 的长期质量策略固定为一条最小闭环：**统一评判标准 -> 真实样本回流 -> 执行结果回灌 -> 可回归基线**。

具体规则如下：

1. **先统一尺子，再谈优化**
   - `betterPlan` 继续以 `Task Granularity`、`Dependency Ordering`、`Delegability`、`Closure Criteria`、`Template Consistency`、`Anti-Pattern Avoidance` 作为评价基线。
   - `betterPrompt` 继续保持“只提取 tag 与核心目标、约束来自 skill、`success criteria` 由 LLM 推断、产物不得暴露技能名”的收口策略。
   - 质量闭环的第一步不是扩能力，而是把评价尺度先固定住。

2. **真实样本必须进入回流链路**
   - 样本来源必须是真实 `plan_write` 原文与真实 subagent prompt 原文，而不是静态示例。
   - 每个样本都要保留原始输入、工具产出、执行结果与人工评判，避免只有“看起来像”的摘要。
   - 样本库不是一次性展示材料，而是持续回归集。

3. **执行结果必须回灌到质量判断**
   - 不能只评 prompt/plan 文本本身，还要把实际执行结果纳入回流。
   - 质量闭环判断要看是否真的减少偏题、减少膨胀、减少遗漏约束，而不是只看格式是否漂亮。
   - 对应的回流信息应反哺后续 `betterPlan` / `betterPrompt` 的优化。

4. **回归基线要可持续、可复核**
   - 必须形成可回归的 baseline，而不是一次性验收。
   - baseline 的重点是“能不能持续复现同样的质量判断”，不是追求单次满分。
   - 验证输出要可复核，且能用于后续对比。

5. **实施顺序采用三段式落地**
   - 先做 shared baseline，统一样本协议与评测口径。
   - 再分别优化 `betterPrompt` 与 `betterPlan`。
   - 最后制度化门槛与回归节奏，让质量闭环进入稳定运行。

## Alternatives Considered

- **只优化 `betterPlan` 或只优化 `betterPrompt`**：被拒绝。两者在实际工作流里是相连的，拆开做会让评价口径和回流样本断裂。
- **只做定义，不接真实样本回流**：被拒绝。没有真实样本，质量判断很容易停留在静态文档层。
- **把质量闭环扩成 UI / registry / 审批平台**：被拒绝。当前阶段的核心是提质闭环，不是扩展治理面。
- **只看文本格式，不看执行结果**：被拒绝。这样无法证明优化真的减少了偏题和返工。

## Related Code

| Path | Role |
| ---- | ---- |
| `plan.json` | 本次计划源记录，包含 shared baseline v0 落地目标。 |
| `adr/ADR-0113-skillforge-betterplan-betterprompt-quality-loop.md` | 上一层质量闭环，明确 `betterPlan` / `betterPrompt` 的持续提质方向。 |
| `adr/ADR-0107-betterplan-evaluation-criteria-and-minimum-template.md` | `betterPlan` 的评价标准与最小模板基线。 |
| `adr/ADR-0108-skillforge-betterplan-betterprompt-cli-boundary-and-convergent-rewrite.md` | `betterPlan` / `betterPrompt` 的收敛边界、CLI 唯一入口与真实样本回归要求。 |
| `adr/ADR-0105-betterprompt-tag-extraction-skill-derived-constraints-and-inferred-success-criteria.md` | `betterPrompt` 的输入收口、自包含输出与约束来源规则。 |
| `adr/ADR-0106-review-subagent-prompt-first-step.md` | `betterPrompt` 的前置评审门禁思路。 |
| `adr/ADR-0083-skillforge-default-middle-layer-for-orchestrator-workflow.md` | `review plan -> optimize prompt -> spawn` 的默认中间层工作流。 |

## Consequences

- 正向：shared baseline v0 先把样本协议和评测口径统一起来，后续优化不再各说各话。
- 正向：真实样本池和失败样本池有了共同起点，后续可以稳定回归与对比。
- 正向：统一评测命令后，baseline 报告可重复生成，减少一次性验收偏差。
- 取舍：先做 shared baseline 会增加前期整理成本，但能换来后续优化的可比性。
- 取舍：样本协议一旦固化，后续新增样本必须遵守同一格式，灵活性会下降。
- 风险：如果后续把评测口径拆成多个分支，baseline 会失去可比性。
- 验证锚点：计划目标明确指向 `Phase 1`，包括统一样本协议、统一评测命令、baseline v0 报告与第一批失败样本池。

## Search Terms

- `betterPlan`
- `betterPrompt`
- `shared baseline`
- `baseline v0`
- `样本协议`
- `评测命令`
- `失败样本池`
- `SkillForge`
