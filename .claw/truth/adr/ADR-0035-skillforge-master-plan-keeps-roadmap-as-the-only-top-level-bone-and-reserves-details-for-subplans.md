# ADR: SkillForge master plan keeps roadmap as the only top-level bone and reserves details for subplans

## Status

accepted

## Context

SkillForge 的主计划已经进入长期产品落地阶段，但它仍然需要保持“骨架级”组织方式，而不是把实现细节、验收清单、边界审计和阶段性入口都堆在顶层。

来源计划 `SkillForge Roadmap Master Plan` 已完成，且明确给出了两条长期有效的结构性事实：

- 主计划是 roadmap 的唯一骨干，负责自主决定未来开发内容与阶段顺序。
- 主计划只保留长期阶段骨架与里程碑，所有实现任务、验证任务、边界拆解、执行清单都必须下沉到对应 subplan。

这条决策需要沉淀，因为它定义了 roadmap 的长期治理方式：顶层负责方向，子计划负责实施。

## Decision

决定将 SkillForge master plan 固定为 **roadmap-only top-level skeleton**，并把细粒度 follow-up、implementation detail、boundary audit 与 execution checklist 全部下沉到 subplans。

具体规则如下：

- 主计划只保留长期阶段骨架与里程碑，不承载细粒度开发内容。
- 所有实现类任务、验证任务与边界拆解必须写入对应 subplan。
- 主计划负责阶段顺序、完成标准、方向切换与长期目标约束。
- 当顶层开始堆积“计划的计划”或执行层细节时，应优先收敛骨架，而不是继续扩张主计划。
- 真实实现可以持续推进，但细节事实应通过 subplan 沉淀，避免污染 master plan。

## Alternatives Considered

- 继续把 follow-up 和执行清单放在 master plan：拒绝。这样会让主计划偏离 roadmap 骨架，逐步滑向执行层。
- 把主计划拆成大量细任务：拒绝。这样会让顶层失去作为方向总线的作用。
- 只依赖口头约定不形成明确规则：拒绝。计划已经出现污染风险，需要写成可复用决策。

## Related Code

| Path | Role |
| ---- | ---- |
| `tasks/skillforge-roadmap-master-plan/plans/plan.json` | 来源计划记录，包含 completed plan、roadmap rules 与 retrospective。 |
| `tasks/skillforge-roadmap-master-plan/plans/subplan-7-phase-6-runtime-replay-real-implementation-subplan.json` | Phase 6 真实实现拆解入口。 |
| `tasks/skillforge-roadmap-master-plan/plans/subplan-8-subplan-8-phase-7-generator-real-implementation.json` | Phase 7 真实实现拆解入口。 |
| `tasks/skillforge-roadmap-master-plan/plans/subplan-9-subplan-9-phase-8-product-surface-real-implementation.json` | Phase 8 真实实现拆解入口。 |
| `tasks/skillforge-roadmap-master-plan/plans/subplan-10-subplan-10-phase-9-ui-integration-rebuilt.json` | Phase 9 UI 与集成阶段的 subplan 入口。 |
| `tasks/skillforge-roadmap-master-plan/plans/subplan-11-phase-10-generator-productization.json` | Phase 10 generator 产品化 subplan 入口。 |
| `tasks/skillforge-roadmap-master-plan/plans/subplan-12-phase-11-interactive-product-surface.json` | Phase 11 交互产品面 subplan 入口。 |
| `tasks/skillforge-roadmap-master-plan/plans/subplan-13-phase-12-delivery-operability-stable-launch.json` | Phase 12 交付与稳定发布 subplan 入口。 |

## Consequences

- 正向：master plan 可以长期保持简洁，始终作为 roadmap 的方向与顺序总线。
- 正向：细粒度实现事实会沉淀到 subplan，减少主计划被临时任务污染的风险。
- 正向：后续接力者可以清楚区分 milestone 骨架与执行细节，便于审阅和交接。
- 取舍：主计划本身不再携带完整实施清单，需要额外查看对应 subplan 才能看到具体拆解。
- 取舍：如果某个阶段没有对应 subplan，细节不能回填到 master plan，必须先补齐承载位置。
- 验证锚点：来源计划明确显示 Phase 0–12 的 milestone 骨架已完成闭环，且 retrospective 强调最小真实链路闭环不等于产品完整落地。

## Search Terms

- `milestone`
- `subplan`
- `follow-up`
- `boundary audit`
- `planning skeleton`
- `real implementation`
- `master plan`
