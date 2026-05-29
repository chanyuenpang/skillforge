# ADR: betterPlan 评价标准与最小模板

## Status

accepted

## Context

在 SkillForge 真实任务链路中，plan 质量是决定 spawn 成败的前置因素。此前缺乏对 plan 的结构化评价标准，导致 task 拆分粒度不一、依赖顺序不清、可派发性无法判断、收口条件模糊等问题。

本次计划（`SkillForge：样本库与 betterPlan / betterPrompt 定义研究`，状态 `end.completed`，全部 5 个 task 均为 `done`）通过研究外部优秀 harness/skills（superpowers/trellis/开源技能）的执行模板共性，结合 Feishu main agent 真实 session transaction 样本库，完成了 betterPlan 的六维评价标准、最小模板与反模式清单的定义，并确定了"定义驱动实现"的产品边界原则。其中 Task 4 专门负责 betterPlan 定义，Task 2 的外部模板研究为其提供了输入。

## Decision

### 1. betterPlan 六维评价标准

betterPlan 从以下六个维度评价，覆盖 plan 从生成、结构化到可派发的全流程：

1. **任务粒度（Task Granularity）** — 每个 task 是否足够小、边界清晰，能独立派发给 subagent 执行。
2. **依赖顺序（Dependency Ordering）** — task 之间的依赖关系是否显式声明，执行顺序是否合理，是否避免了循环或隐式依赖。
3. **可派发性（Delegability）** — 每个 task 是否自带足够上下文、约束与验收条件，能被独立 subagent 理解并执行，无需主代理中途干预。
4. **收口条件（Closure Criteria）** — 每个 task 的 done 标准是否明确可检验，是否可客观判定完成状态。
5. **模板区块一致性（Template Consistency）** — plan 是否使用了最小模板结构（目标/边界/执行骨架/交付/控膨胀），区块是否完整、不冗余。
6. **反模式规避（Anti-Pattern Avoidance）** — plan 是否避免了已知反模式（如粒度太大不可派发、依赖隐式、验收标准模糊等）。

### 2. betterPlan 最小模板

betterPlan 应包含以下五个区块：

| 区块 | 作用 |
| ---- | ---- |
| **Task Objective** | 任务目标，明确要完成什么。 |
| **Boundary（Scope / Exclude）** | 边界声明，明确包含什么、不包含什么。 |
| **Execution Skeleton** | 执行骨架，描述执行步骤或策略。 |
| **Success & Deliverables** | 完成定义与交付物，可客观检验。 |
| **Prompt Budget Control** | 控膨胀机制，限制 prompt 长度与范围。 |

### 3. betterPlan 反模式

- 任务粒度过大，无法独立派发。
- 依赖关系隐式，未在 plan 中显式声明。
- 收口条件模糊，不可客观检验。
- 模板区块缺失（如无边界声明、无完成定义）。
- 执行骨架包含实现细节而非策略描述。

### 4. 定义驱动实现

SkillForge MVP 中 plan 相关模块的输入边界必须由 betterPlan 定义反推，而不是用实现约束反过来定义 betterPlan 的产品形态。register/search/output 模块应当围绕 betterPlan 模板的槽位提供服务，不提前抽离非必要字段。

### 5. 持续验证视角

未来样本库将作为 betterPlan 的连续测试集使用。所有 plan 定义与评价标准需能在样本库上落地验证，避免脱离真实数据空转。

### 6. 命名规则

对外接口名统一使用 `betterPlan` 与 `betterPrompt`；不将 `reviewPlan` / `reviewSubagentPrompt` 固定为内部实现名，保留后续重构空间。

## Alternatives Considered

- **跳过结构定义直接进入实现**：被拒绝。没有评价标准就无法衡量 plan 质量，也无法指导 SkillForge 的自动化 plan review 行为。
- **从实现约束反推定义**：被拒绝。计划明确要求"定义必须先行，实现边界由定义反推"，避免实现先入为主扭曲产品意图。
- **仅复用外部模板，不定义本土化标准**：被拒绝。superpowers/trellis 等提供共性参考，但 Feishu main agent 的使用场景需要本土化评价标准。

## Related Code

| Path | Role |
| ---- | ---- |
| `plan.json`（当前计划源记录） | 计划状态 `end.completed`，Task 4 为 betterPlan 定义的主要载体。 |
| 样本库 | 作为持续测试集，为 betterPlan 评价标准提供验证数据。 |
| `adr/ADR-0108-skillforge-betterplan-betterprompt-cli-boundary-and-convergent-rewrite.md` | 收敛式重构边界与输入输出契约，与本 ADR 的「定义驱动实现」与模板定义互相确认。 |

## Consequences

- 正向：betterPlan 有了一组明确的评价维度，可直接用于后续 SkillForge plan review 判断。
- 正向：最小模板为 plan 生成提供一致的结构参考，降低不同执行者输出的质量方差。
- 正向：定义驱动实现把质量门禁前置，避免实现脱离产品意图。
- 取舍：六维标准需要持续在真实样本上验证和迭代，不可能一次完美收敛。
- 风险：样本库质量不足时，六维标准难以有效应用于判别。

### 7. 输入原文到模板槽位的映射规则（与 ADR-0108 对齐）

`betterPlan` 的输入是自由文本 `plan_write` 输入原文（ADR-0108 边界），而非结构化表单。这意味着五块模板必须通过一次 LLM 解析/映射完成：

- **输入原文 → Task Objective**：从原文首段提取目标陈述。若原文无显式目标，取可推断的意图。
- **输入原文 → Boundary**：提取 `scope` / `exclude` / `不含` 等边界词块。若原文无边界声明，标记为缺失并输出提醒。
- **输入原文 → Execution Skeleton**：提取步骤或方案描述。若原文只有任务标题而无策略，仅输出骨架占位。
- **输入原文 → Success & Deliverables**：提取验收条件或交付物描述。若原文无，则从上下文推断或标记缺失。
- **输入原文 → Prompt Budget Control**：不依赖原文提取，由 `betterPlan` 工具基于任务数量和原文长度自动估算限幅值。

映射失败（某块缺失且不可推断）应输出缺失标记，而不是虚假填充。这直接指导 `register/search/output` 模块的槽位设计：它们应按单个模板块做粒度匹配与注入，而不是一次注入整篇。

## Search Terms

- `betterPlan`
- `Task Granularity`
- `Dependency Ordering`
- `Delegability`
- `Closure Criteria`
- `Template Consistency`
- `Anti-Pattern`
- `reviewPlan`
- `定义驱动实现`
