# ADR: Milestone P 新一代 planning / spawn subagent skill 沉淀

## Status

accepted

## Context

前一阶段已经确认 SkillForge 作为负责人默认工作流中间层，真实任务推进的默认顺序也已经固定为“任务意图 → review plan → 回写计划 → optimize subagent prompt → spawn → 结果回流”。

本里程碑完成后，这条真实任务默认流程不再只是临时操作说明，而是要沉淀成可复用的 planning / spawn subagent skill 套件，作为后续任务的稳定入口模板、plan review 约束、prompt 优化约束、spawn 前校验与结果回流收口，并作为现有 planning skill 的候选替换实现。

## Decision

新一代 planning / spawn subagent skill 采用“职责拆分 + 默认链路固化”的方式沉淀，核心目标是把真实任务流程稳定成可复用能力，而不是停留在单次任务操作说明。该决策的落点是把 planning 与 spawn 分成两个职责明确的 skill，通过统一 I/O 约束把“先规划、后派生、再收口”变成默认路径。

### Planning skill 骨架

planning skill 负责从任务意图进入计划阶段，固定以下能力：

1. 任务意图输入模板，先明确要做什么、为什么做、边界在哪里。
2. `review plan` 触发条件与校验重点，覆盖计划结构、任务边界与完成标准。
3. 回写约束，把 review 后的结论落回主计划，保持计划与执行一致。
4. planning skill 不承担派发执行，只负责拆解、评审与回写。

### Spawn subagent skill 骨架

spawn subagent skill 负责从计划进入执行阶段，固定以下能力：

1. `optimize subagent prompt`，在派发前收敛约束、补齐上下文、降低偏题概率。
2. spawn 前校验，只允许在前置步骤完成后派发。
3. 例外路径，保留极小任务、纯同步确认、紧急止血等少数跳过场景。
4. 结果回流收口，把执行结果、偏差和新发现持续回写到流程与产品观察中。
5. spawn subagent skill 不承担计划拆解，只负责派发、校验与回流。

### 套件与替换关系

- 新 skill 套件的主职责是接管默认流程，不是再造一条平行实验线。
- 与现有 planning skill 的关系是候选替换实现：先以新流程稳定执行，再逐步评估是否替换现有实现。
- 并行期需要保持主路清晰，旁路仅保留极小任务、纯同步确认、紧急止血等少量例外。
- 替换策略采用“先并行、后按能力达标切换”，而不是按时间或版本号硬切。

### 持续收敛方向

该 skill 套件在真实任务推进中要持续收敛以下面向：

- 网页端可观测性。
- 真实业务接入边界。
- 计划评审质量。
- prompt 优化效果。
- 接口与产品面的摩擦点。
- `review plan`、`optimize subagent prompt`、`spawn` 与结果回流四段链路的稳定命中率。

## Alternatives Considered

- 只写一份统一提示词：被拒绝，因为无法把 planning 和 spawn 两个阶段的约束边界拆清，也不利于后续替换与维护。
- 继续保持现有 planning skill 不变：被拒绝，因为当前默认工作流已经进入真实任务阶段，旧实现不足以承载新的 review / 回写 / prompt 优化 / 回流闭环。
- 把新 skill 仅作为一次性任务脚本：被拒绝，因为这会把长期能力沉淀降级为临时操作，失去复用价值。
- 把 planning 与 spawn 合并成一个全能 skill：被拒绝，因为会重新把职责边界揉在一起，增加后续维护和替换成本。

## Related Code

| Path | Role |
| --- | --- |
| `plan.json` | 本次里程碑计划记录，包含真实任务默认流程与 skill 沉淀目标 |
| `adr/ADR-0083-skillforge-default-middle-layer-for-orchestrator-workflow.md` | 默认中间层的上游决策 |
| `adr/ADR-0086-milestone-o-true-task-intake-and-skillforge-default-flow-integration.md` | 真实任务默认流程的前置约束 |
| `workflow` 层 artifact | 默认执行顺序与回流路径的承载位置 |
| `规则层` artifact | `review plan`、`optimize subagent prompt`、跳过条件与补记录要求的约束来源 |
| `planning skill` / `spawn subagent skill` artifact | 新 skill 套件的职责边界与统一 I/O 约束 |

## Consequences

- 正向：planning 与 spawn 的职责边界更清楚，后续任务更容易复用同一套默认流程。
- 正向：`review plan`、`optimize subagent prompt`、spawn 前校验与结果回流被统一收口，减少流程漂移。
- 正向：新 skill 套件具备候选替换现有 planning skill 的基础。
- 取舍：并行期需要维持两套能力的解释一致性，避免负责人在急任务里混用。
- 取舍：例外规则仍依赖负责人判断，过度使用会削弱默认流程。
- 验证锚点：后续真实任务推进是否稳定经过“任务意图 → review plan → 回写计划 → optimize subagent prompt → spawn → 结果回流”。
- 验证锚点：planning / spawn 分拆后，任何一侧都不能越界承担对方职责。

## Search Terms

- `review plan`
- `optimize subagent prompt`
- `spawn`
- `结果回流`
- `planning skill`
- `spawn subagent skill`
- `真实任务`
- `旁路`
- `主路`
