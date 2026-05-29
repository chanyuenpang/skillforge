# ADR: SkillForge 产品形态完整路径收口

## Status

accepted

## Context

本次主计划已经把 SkillForge 从单点能力推进到可完整落地的产品形态。计划中明确了五个长期有效的边界：`Skill Registry` 作为根资产层，`betterWorkflow` 负责 `project goal -> milestone -> atomic task` 的宏观拆解，`betterPrompt` 负责在 `atomic task` 基础上融合 skills 与任务 prompt 并递归细化，`skill bundle` 作为 reference 加速层，`Run Center` 则保留原始 I/O 作为评估体系。

后续子计划又进一步确认：`betterPrompt` 不能只是引用技能名或把技能当作提示引用，而必须把已选技能内部的 `workflow` / `knowledge` / `constrain` 内联进最终 prompt，产物不得暴露任何技能名称，并且要能独立执行。这个约束会直接影响 prompt 生成链路的长期实现方式。

如果这些能力各自独立演进，后续很容易再次出现“有资产、无规划”“有规划、无可执行 prompt”“有执行、无评估”的断层。因此需要把本次完成态沉淀为一条稳定的产品主路径。

## Decision

SkillForge 的产品主路径固定为：

`Skill Registry -> betterWorkflow -> betterPrompt -> skill bundle -> Run Center`

具体约束如下：

1. **`Skill Registry` 是根资产层**
   - 负责收录、扫描、刷新外部 skill 文件。
   - 所有后续规划与展开都基于 registry 的派生产物，而不是直接把源文件当作长期查询面。

2. **`betterWorkflow` 只负责宏观拆解**
   - 输入是 `goal/context/constraints/parameters`。
   - 输出是 `project goal -> milestone -> atomic task` 级别结构。
   - 它不承担 skill 级最小步骤展开。

3. **`betterPrompt` 只负责微观展开，且必须内联技能内容**
   - 输入是 `atomic task` 与相关 skills / 任务 prompt。
   - 它不再输出“引用某个 skill 名称”的提示，而是直接提取已选技能内部的 `workflow` / `knowledge` / `constrain` 并内联重组为自包含 prompt。
   - 产物不得暴露任何技能名称，且必须能独立执行。
   - 它不替代 `betterWorkflow` 的宏观拆解职责。

4. **`skill bundle` 只作为 reference 加速层**
   - 目的是缩小搜索范围、加速准备材料。
   - 它不能被当作原样输入给 subagent 的最终执行包。

5. **`Run Center` 保留原始 I/O 作为评估体系**
   - 需要能回看 workflow 生成、prompt 生成、subagent 执行三类原始 input/output。
   - 评估重点是质量复盘，而不是只看结果状态。

6. **推进过程必须持续使用 SkillForge 自身能力**
   - 每个 task 派发前都要先做 SkillForge 视角的 review 与 prompt 优化。
   - 每个 task 完成后都要补齐真实经验、原始 I/O 证据与复盘材料。
   - 主计划本身也必须把 planning / prompt 优化 / 调研过程当作真实样本来源。

## Alternatives Considered

- **只做 Registry，不继续推进 Workflow / Prompt / Run Center**：被拒绝。这样只能形成资产目录，无法支撑产品化闭环。
- **把 Workflow、Prompt、Bundle 混成一个大引擎**：被拒绝。职责会互相污染，后续无法稳定维护边界。
- **让 Bundle 直接作为 subagent 的最终输入**：被拒绝。会削弱 `betterPrompt` 的微观展开价值，也不利于保留真实 I/O 评估链路。
- **只记录完成态，不要求持续使用 SkillForge 自身能力**：被拒绝。这样主产品开发不会反哺经验库，失去自举价值。

## Related Code

| Path | Role |
| ---- | ---- |
| `plan.json` | 本次产品形态收口的源计划记录，包含五段主路径与完成态复盘。 |
| `plans/subplan-8-skillforge-registry-mvp-subplan.json` | `Skill Registry` 最小闭环的来源子计划。 |
| `plans/subplan-9-betterworkflow-mvp.json` | `betterWorkflow` 宏观拆解链路的来源子计划。 |
| `plans/subplan-10-betterprompt-mvp.json` | `betterPrompt` 微观展开链路的来源子计划。 |
| `plans/subplan-6-subplan-6-milestone-f-gray-rollout.json` | 里程碑 F 灰度验收与发布准备的完成态来源。 |

## Consequences

- 正向：SkillForge 的核心能力边界固定为“资产层 / 宏观规划层 / 微观展开层 / reference 加速层 / 评估层”，后续扩展更容易归位。
- 正向：从收录 skill 到执行与评估的路径被打通，产品形态真正闭环。
- 正向：真实运行数据会持续回流到规划与 prompt 优化过程中，形成自举式改进。
- 取舍：主计划推进成本更高，因为每个 task 都要保留真实 I/O 与复盘证据。
- 风险：如果后续把 `skill bundle` 误用为最终执行包，可能重新压缩掉 `betterPrompt` 的展开价值。
- 风险：如果 prompt 生成阶段继续泄露技能名称，后续 subagent 将无法独立执行，且会破坏 prompt 自包含约束。
- 验证锚点：本次主计划已 `end.completed`，且里程碑 F 的三条灰度业务流全部通过，发布说明草案已同步更新；后续子计划要求现场验收 `0` 处技能名泄露，并作为更高一层的实现约束继续沿用。

## Search Terms

- `Skill Registry`
- `betterWorkflow`
- `betterPrompt`
- `skill bundle`
- `Run Center`
- `project goal -> milestone -> atomic task`
- `原始 I/O`
- `SkillForge`
