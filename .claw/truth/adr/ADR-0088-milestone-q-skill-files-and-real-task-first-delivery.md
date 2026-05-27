# ADR: Milestone Q skill 文件落地与真实任务首单接入

## Status

accepted

## Context

前一阶段已经把默认工作流固定为 `任务意图 → review plan → 回写计划 → optimize subagent prompt → spawn → 结果回流`,并明确 planning 与 spawn 要拆成两个职责清晰的 skill 套件。

Milestone Q 的关键变化不再是继续讨论方案,而是把这套 planning / spawn skill 真正写成 OpenClaw 可加载的技能文件,并选择一个真实项目任务作为首单接入对象。这样才能验证新 skill 的命中率、prompt 稳定性、子任务漂移与回流收口,而不是停留在纸面流程。

## Decision

Milestone Q 采用"skill 文件落地 + 真实任务首单接入"的实施主线：

1. 将 planning skill 与 spawn skill 按文件级结构落地为可加载技能，不再只保留方案描述。
2. 后续新建 plan 默认把该新 skill 作为 rule 写入，作为真实任务推进的默认入口模板。
3. 首单接入必须来自当前项目的真实任务，而不是拟真实验或临时脚本。
4. 首单任务的目标不是验证工具存在性，而是验证整条链路在真实任务中的稳定性：`任务意图 → review plan → 回写计划 → optimize subagent prompt → spawn → 结果回流`。
5. planning skill 继续只负责计划拆解、评审与回写；spawn skill 继续只负责派发、前置校验与结果回流，二者不合并为一个全能技能。

### Skill 文件落地骨架标准

基于 Milestone Q 完成的设计，skill 文件的落地骨架固定以下标准：

- **目录结构**：skill 文件落在项目根目录 `skills/` 层级下，每个 skill 独立子目录，例如 `skills/planning/`、`skills/spawn/`。通用版本可上移到更高层级复用，但当前阶段按项目内落地以避免规则漂移。
- **SKILL.md 固定段位**：每个 SKILL.md 至少包含：
  1. 定位与适用范围
  2. 输入前提/触发条件
  3. 核心规则与约束
  4. 执行步骤或工作流
  5. 与其他 skill / plan / rules 的引用关系
  6. 禁止事项
  7. 变更记录
- **引用方式**：在 skill 文本中引用已有 rules/workflow/plan 时，优先用"显式引用 + 相对位置"表达（例如"遵循 `docs/rules.md` 中的 XXX 规则"），skill 只负责约束与行动顺序，不复制整份规则。
- **"默认写入"可执行规则**：凡创建新 plan，必须先调用 planning skill；plan 文件中必须包含 `Applicable Skills` / `Required Rules` 段，默认注入 planning + spawn；若计划涉及多步骤或可并行子任务，必须按 spawn skill 拆分并登记子任务；未显式声明则视为违规。

### 首单真实接入任务选择标准

首单任务候选从 **Phase 7 generator real implementation** 切入，以 **meeting-summary-assistant** 作为首个 workflow/spec 输入样本，跑通最小生成链路（SkillSpec / SkillManifest / SKILL.md skeleton / 静态验证回写）。选择标准固定为：

1. 目标明确，边界清晰，交付物可验收。
2. 链路足够短，适合单次或少量分支推进。
3. 风险可控，不涉及高敏感、强依赖或大范围改造。
4. 能体现 planning/spawn 的优势，包含拆解、并行、跟进或阶段性交付。
5. 失败成本低，便于观察 skill 落地后的真实表现。

首单的核心验证信号：
- 输入字段是否足够支撑稳定生成
- 产物链路是否单向可追踪
- 静态验证是否稳定通过
- 回写信息是否足够支撑后续 optimize prompt
- 是否出现"边界偷渡"到 runtime / 产品化外扩

### 实施策略

采用"先落地骨架、再接入首单、再固化规范"的三段式实施策略：

1. 首先完成 SKILL.md 文件的实际写入（从草案到可加载文件）。
2. 以 meeting-summary-assistant 首单跑通最小生成链路，验证端到端闭环。
3. 基于首单接入结果修订骨架与落地规范，沉淀可复用模式。

### 例外与跳过条件

允许跳过新 skill 默认流程的例外仅限于：
- 紧急故障处理
- 一次性简单请求（明显不需要拆解或分派的小任务）
- 用户明确要求临时跳过 skill 流程的场景

除此之外，不应再回到"先拟真、后落地"的方式。

## Alternatives Considered

- 继续停留在方案层：被拒绝，因为会让 skill 仍然只是说明文档，无法进入真实任务闭环。
- 先做新的独立实验线：被拒绝，因为首单应优先服务真实项目任务，避免把能力沉淀再次切回拟真验证。
- 将 planning 与 spawn 合并为单一 skill：被拒绝，因为会重新模糊职责边界，增加后续维护和替换成本。
- 一次性铺开所有 skill 的文件落地：拒绝，当前阶段不追求覆盖所有 skill，而是以可验证、可扩展、可复用为原则优先打通最小闭环。
- 按时间或版本号硬切旧 planning skill：拒绝，替换策略采用"先并行、后按能力达标切换"，不设硬切换时间。

## Related Code

| Path | Role |
| --- | --- |
| `plan.json` | 本次里程碑计划记录,包含 skill 落地与首单接入目标 |
| `adr/ADR-0083-skillforge-default-middle-layer-for-orchestrator-workflow.md` | 默认中间层的上游决策 |
| `adr/ADR-0086-milestone-o-true-task-intake-and-skillforge-default-flow-integration.md` | 真实任务默认流程的前置约束 |
| `adr/ADR-0087-milestone-p-new-generation-planning-spawn-subagent-skill-sedimentation.md` | planning / spawn skill 拆分与默认链路固化的直接前置 |
| `workflow` 层 artifact | 默认执行顺序与回流路径的承载位置 |
| `规则层` artifact | `review plan`、`optimize subagent prompt`、跳过条件与补记录要求的约束来源 |
| `planning skill` / `spawn subagent skill` artifact | 新 skill 套件的职责边界与统一 I/O 约束 |

## Consequences

- 正向：skill 套件从方案沉淀进入可加载、可复用的实施层。
- 正向：真实任务首单可以直接检验默认链路是否稳定命中，减少纸面设计与实际执行脱节。
- 正向：planning 与 spawn 的职责边界继续保持清晰，后续替换和维护更可控。
- 正向：skill 文件落地骨架标准（目录结构、SKILL.md 段位、引用方式、检查项）成为后续所有新增 skill 的通用模板。
- 正向：首单选择标准可作为后续新 skill 接入的通用评估框架。
- 取舍：首单接入需要更严格的上下文准备和观察口径，否则容易把真实问题误判为 skill 失效。
- 取舍：新 skill 在并行期需要与旧实现保持解释一致，避免负责人在急任务里混用。
- 取舍：首单 meeting-summary-assistant 当前仍停留在候选阶段，未实际启动执行。
- 验证锚点：首单真实任务记录中应能稳定看到 `review plan`、回写、`optimize subagent prompt`、`spawn` 与结果回流的顺序。
- 验证锚点：后续新增 skill 是否遵循已固定的 SKILL.md 段位与引用方式。
- 验证锚点：首单接入后输入字段是否够用、产物链路是否可追踪、静态验证是否稳定、是否出现边界偷渡。

## Search Terms

- `review plan`
- `optimize subagent prompt`
- `spawn`
- `结果回流`
- `planning skill`
- `spawn subagent skill`
- `真实任务`
- `首单接入`
- `workflow`
- `SKILL.md`
- `skills/`
- `meeting-summary-assistant`
- `Phase 7`
- `先落地骨架`
- `首单选择标准`
- `并行期`
- `跳过条件`
- `generator real implementation`
- `SkillSpec`
- `SkillManifest`
