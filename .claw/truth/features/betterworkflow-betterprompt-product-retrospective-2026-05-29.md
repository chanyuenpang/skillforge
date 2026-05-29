# betterWorkflow / betterPrompt 产品复盘（2026-05-29）

## 结论

当前项目的核心痛点是真实存在的，但需要重新纠正产品定义：SkillForge 不是直接服务终端用户的执行助手，而是服务 **LLM / agent** 的提示优化与规范化引擎。

更准确的主路径应该是：

`用户说一句话 -> agent 先产出可执行 prompt / plan -> SkillForge 对这个 prompt / plan 做 Workflow、skill 定位、优化与规范化`

因此，整体方向并没有错：`betterWorkflow` 与 `betterPrompt` 仍然应该作为主引擎能力存在；但当前完整技术路线偏长，外围治理与审批链路已经先于核心体验变重，导致体感不强。

## 对 betterWorkflow / betterPrompt 的重新定位

### betterWorkflow
- 它的职责应该是：把模糊目标快速收敛成稳定的任务骨架。
- 它不应该为了“结构完整”而过早引入过多中间对象。
- 它的价值不在于多一层流程，而在于减少主 Agent / 用户每次重新想拆解方式的负担。

### betterPrompt
- 它的职责应该是：把任务目标与 skill 能力重组成一份高质量、可直接执行的 prompt。
- 输入阶段不该为了适配内部流程而过早收集过多字段；应优先保证最终产物质量。
- `success criteria`、约束、交付物等内容，应围绕“最终 prompt 是否需要它”来设计，而不是围绕输入表单是否齐全来设计。

## 关于“交付物提取”的新判断

当前不应把“是否提取交付物描述”当成固定前置步骤，而应先问：

1. 提取交付物的目的是什么？
2. 这个目的是否属于当前阶段必须满足？
3. 它是输入阶段必需信息，还是最终 prompt 输出阶段自然可生成的信息？

新的判断是：
- 如果“交付物描述”只是为了满足流程中的某个字段约束，那么首先应反问这个约束是否必要。
- 对于 `betterPrompt`，真正应该强约束的是**最终 prompt 输出格式**，而不是输入阶段必须显式准备一份交付物描述。
- 只要最终阶段的 prompt 模板能够稳定产出合适的交付物答案/交付形式，那么交付物可以在更晚的阶段生成，而不必在拿到 prompt 时提前抽取。
- 某些任务的“交付物”本身可能是 review 结论、判断答案、结构化意见或建议清单；这类内容更适合在最终 prompt 生成阶段随上下文自然产出，而不是作为早期输入提取字段硬塞进系统。

## 当前阶段的核心判断

1. 真实痛点存在，但痛点主体不是“终端用户如何直接完成执行”，而是“agent 已经写出一份可执行 prompt / plan 后，如何继续被 SkillForge 稳定优化、规范化、补全 workflow 与 skill 能力”。
2. 当前技术路线理论上能解决这个痛点，但真正直接打痛点的是 `betterWorkflow + betterPrompt`，外围系统更多是在解决治理、回溯、规模化。
3. 因此接下来应优先继续打磨 `betterWorkflow / betterPrompt` 的核心体验，而不是继续放大审批与外围流程对象。
4. 过去前期构建的相当一部分“治理框架 / 基础设施”更像是基于“觉得应该要有”的推演，而不是从核心痛点倒推出来的最小必要能力。
5. 这种偏差带来的直接后果是：即使只是想在网页端每一个 run 里稳定看到 input / output，也会被跨域对象、治理规则、审批链路与配套基础设施放大成复杂工程。

## 对既有治理 / 基础设施的复盘判断

- 不是所有治理与基础设施都没有价值，但当前阶段它们的建设顺序明显过早、过重。
- 很多对象与规则并不是“为了让 betterWorkflow / betterPrompt 更好用”而存在，而是“为了让体系完整”而存在。
- 当核心体验尚未形成压倒性价值时，过早建设完整治理层，会让最简单的观察需求（如 run input / output 可见）也变得异常复杂。
- 因此后续应采用一个更严格的判断原则：**任何新对象、新约束、新治理层，必须先回答“它是否直接缩短 agent 的可执行 prompt / plan 到高质量执行输入之间的路径”。如果不能，就后置。**

## 后续优化原则

1. **先问目的，再决定字段**：不要先决定提取什么字段，而要先问这个字段服务什么最终能力。
2. **先约束输出，不先绑死输入**：对 `betterPrompt` 更应约束最终 prompt 格式与质量，而非前置输入字段齐全度。
3. **把审批降回门禁角色**：审批是风险门，不应该反过来塑造任务主链路。
4. **优先缩短主路径**：围绕 `自然语言任务 -> task skeleton -> 高质量 prompt -> 执行` 打磨，不轻易增加新对象层。
5. **让交付物晚生成**：若交付物不是当前阶段推理必需，就尽量后置到最终 prompt 产出阶段。

## SkillForge 的新产品定义

SkillForge 不是为了替代 agent 写 prompt，而是为了替代 agent 去**消化 skill、提炼 workflow、规范化 prompt / plan**。

更准确的主路径应该是：

`用户说一句话 -> agent 先产出可执行 prompt / plan -> SkillForge 对这个 prompt / plan 做 Workflow、skill 定位、优化与规范化 -> 再还给 agent 执行`

这意味着 SkillForge 的核心角色不是“生成者”，而是“优化 / 规范化引擎”。

## 为什么 MVP 可以先做成 skill

当前最短、最直接、最贴近痛点的形态，不是一个大平台，而是一组给 agent 用的 review / refinement skills，例如：

- `reviewPlan`
- `reviewSubagentPrompt`

它们已经可以解决大部分真实问题：
- plan 不稳
- prompt 不稳
- skill 没吃进去
- 验收标准不全
- 约束不清楚

因此，MVP 先做成 skill 是对的。它的第一目标是验证：**经过 review / refinement 后，plan / prompt 是否明显更好、更稳、更少返工。**

## 为什么长期仍值得做成独立 project

MVP skill 化与长期独立项目并不冲突。独立项目的合理性来自两个更强目标：

### 1. 沉淀可复用的 workflow intelligence

我们真正要做的，不是“多一个调用层”，而是从海量开源 skill 中整理出：
- 可复用的 workflow
- 有质量差异的 skill 能力
- 可迁移的约束模式
- 更适合 plan / prompt review 的知识中间层

也就是说，SkillForge 的长期价值之一是把分散 skill 里的 workflow intelligence 提炼出来，变成可复用中间层。

### 2. 提前消化 skill，降低下游 agent 的认知负担

没有 SkillForge 时，下游 agent 需要：
- 自己判断哪些 skill relevant
- 自己读 skill
- 自己抽 workflow
- 自己重新规划步骤

而 SkillForge 的目标是：
- 上游先做 skill 路由
- 上游先做 workflow 提炼
- 上游先做 prompt 规范化
- 下游只拿到唯一的、清晰的、可执行的 plan / prompt

这意味着 SkillForge 的核心价值不是提供 skill 目录，而是替 agent 提前完成 **skill digestion / workflow digestion / prompt normalization**。

## 因此新的推进顺序应该是

### 第一阶段：先做成 skill 验证价值
- `reviewPlan`
- `reviewSubagentPrompt`

### 第二阶段：把 skill 背后的 intelligence 独立出来
- skill intake
- workflow extraction
- quality scoring
- routing
- bundle generation
- prompt normalization engine

### 第三阶段：再决定哪些外围层是必须的
只有当上面两层已经证明价值，再决定是否扩展：
- run center
- approval gate
- web UI
- asset archive

## 建议的下一轮讨论方向

- betterWorkflow 应该输出“最小必要骨架”还是“完整计划对象”？
- betterPrompt 的最终 prompt 模板，哪些区块是刚需，哪些区块是流程自嗨？
- 哪些输入字段可以彻底取消显式提取，改为最终产物阶段自然生成？
- 审批在主链路里到底最小应该扮演什么角色？
- `reviewPlan` / `reviewSubagentPrompt` 作为 MVP skill 时，输入输出格式最小应该长什么样？
