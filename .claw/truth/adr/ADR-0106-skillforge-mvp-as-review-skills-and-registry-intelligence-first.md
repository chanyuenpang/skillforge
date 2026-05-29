# ADR: SkillForge MVP 收敛为 review skills，核心难点前移到 registry intelligence

## Status

proposed

## Context

围绕 `betterWorkflow` / `betterPrompt` 的复盘表明，当前项目的主要风险不是缺少更多治理层或对象模型，而是建设顺序偏重：大量治理框架与基础设施先于核心体验落地，导致最简单的 run input/output 可见需求都被放大成复杂工程。

同时，产品定义也被重新纠正：SkillForge 不是直接服务终端用户的执行助手，而是服务 **LLM / agent** 的提示优化与规范化引擎。正确主路径应为：

`用户说一句话 -> agent 先产出可执行 prompt / plan -> SkillForge 对这个 prompt / plan 做 Workflow、skill 定位、优化与规范化 -> 再还给 agent 执行`

在此定义下，`betterWorkflow` / `betterPrompt` 的最简 MVP 不应先落成大平台，而应先收敛为两个给 agent 使用的 review / refinement skills，例如：

- `reviewPlan`
- `reviewSubagentPrompt`

这意味着，`betterWorkflow` / `betterPrompt` 的直接用户并不是最终用户，而是上游 agent 已经产出的 prompt / plan。

## Decision

决定将 SkillForge 的最简 MVP 固定为“review skills 先行、registry intelligence 前移”的路线：

1. **`betterWorkflow` / `betterPrompt` 的最简 MVP 形态就是 skill**
   - `betterWorkflow` 更像 `reviewPlan`：检查、收敛、重写 agent 已产出的 plan/task skeleton。
   - `betterPrompt` 更像 `reviewSubagentPrompt`：审查、补全、规范化 agent 准备发给 subagent 的 prompt。
   - 第一阶段不要求先形成完整平台、完整对象模型或复杂 Web 产品面。

2. **当前核心程序难点不在 prompt review 本身，而在 registry intelligence**
   后续真正卡主价值上限的关键问题前移到 skill 注册与检索阶段：
   - 注册 skill 时，是否要用 LLM 提炼与整理可复用的 workflow 资产。
   - 注册 skill 时，是否要用 LLM 标记语义 tag。
   - 是否能基于这些资产与 tag，稳定搜索到高匹配度的 workflow / skill。

3. **如果 registry intelligence 足够成立，`betterWorkflow` / `betterPrompt` 的下游生成会大幅简化**
   - 一旦步骤 2 中的 workflow / skill 检索命中率足够高，`betterWorkflow` 与 `betterPrompt` 的工作会收敛为：
     - 读取上游 agent 已给出的 prompt / plan
     - 读取高匹配 workflow / skill 资产
     - 用一份稳定的表单 / 模板让 LLM 填写
     - 输出更规范的 plan / prompt
   - 也就是说，下游生成层更像“模板填充 + 规范化输出”，而不是从零重建复杂推理链。

4. **字段设计应围绕输出质量，而不是围绕流程字段完整度**
   - 交付物、验收标准、约束等内容，若不是当前阶段推理所必需，不应为了流程字段完整性而强制前置提取。
   - 应优先约束最终 prompt / plan 的输出格式，只要最终阶段能自然产出交付物描述或 review 答案，就不应在过早阶段硬性抽取。

## Consequences

- 正向：SkillForge 的 MVP 可以先用最小 skill 形态验证价值，而不被重治理层拖慢。
- 正向：项目主线会更清楚地聚焦在“workflow intelligence / skill digestion / prompt normalization”三件事上。
- 正向：`betterWorkflow` / `betterPrompt` 的复杂度会明显下降，更接近高质量模板填充器，而不是平台级规划器。
- 取舍：需要把更多注意力前移到 skill 注册、workflow 提炼、tag 标注与检索质量上。
- 风险：如果 registry intelligence 做不好，下游 review skill 的质量上限也会被锁死。
- 风险：若重新回到“先做全套治理层再说”的惯性，MVP 会再次失焦。

## Follow-up Questions

1. register skill 时，workflow 资产提炼是否必须依赖 LLM，还是可以部分规则化？
2. tag 标注在注册阶段应做到多细？是否需要分层标签？
3. workflow / skill 检索的成功标准是什么？命中率、可解释性、还是对最终 review 质量的提升？
4. `reviewPlan` / `reviewSubagentPrompt` 的最小输入输出模板该如何定义？

## Related Facts

- 当前复盘确认：大量前期治理框架与基础设施更像“觉得应该要有”的建设，而不是从核心痛点倒推的最小必要能力。
- 当前产品定义确认：SkillForge 服务的是 LLM / agent 的 prompt / plan 优化，而不是直接替代 agent 接收用户任务。
- 当前推进共识：先做成 skill 验证价值，再决定哪些外围产品层值得扩展。
