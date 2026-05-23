# ADR: SkillForge master plan keeps milestones on the top level and pushes fine-grained follow-ups to subplans

## Status

accepted

## Context

SkillForge 的 roadmap 主计划已经从早期的 static / contract-first 收口，推进到 Runtime Replay、Generator、Product Surface 的真实实现承接阶段。来源计划明确指出：主计划只应保留 milestone 级阶段骨架，不应把细碎 follow-up、checklist、boundary audit 或 implementation entry 堆在顶层。

计划的 retrospective 还固定了一个可复用结论：当主计划开始出现大量“计划的计划”任务时，说明需要收敛主计划骨架，而不是继续加任务。阶段内的拆解、评估、执行清单一律应下沉到 subplan，主计划只负责方向、顺序、完成标准与阶段切换。

这条决策需要沉淀，因为它决定了 SkillForge roadmap 的长期组织方式：顶层是里程碑，不是执行清单。

## Decision

决定将 SkillForge master plan 固定为 milestone-only 骨架，并把细粒度 follow-up、checklist、boundary audit、implementation entry 与执行拆解全部下沉到各自 subplan。

具体规则如下：

- 主计划只保留 milestone 级阶段，不承载碎片化 follow-up 或执行层任务。
- 阶段内的拆解、评估、执行清单、boundary audit 一律交给 subplan。
- 主计划只负责方向、顺序、完成标准与阶段切换。
- 如果主计划开始出现“计划的计划”堆积，应优先收敛骨架，而不是继续扩张顶层任务。
- 真实实现阶段可以继续推进，但必须通过对应 subplan 记录细粒度事实，避免污染 master plan。

## Alternatives Considered

- 继续把 follow-up 和 execution breakdown 放在 master plan：拒绝。这样会让主计划偏离 milestone 骨架，逐步滑向执行层计划。
- 把主计划拆成很多细任务来管理：拒绝。这样会让顶层结构越来越重，失去 roadmap 作为方向总线的作用。
- 仅靠口头约定维持结构，不形成明确决策：拒绝。计划已经出现污染迹象，需要把边界写成可复用规则。

## Related Code

| Path | Role |
| ---- | ---- |
| `tasks/skillforge-roadmap-master-plan/plans/plan.json` | 来源计划记录，包含 Phase 0–9 的 milestone 结构、rules 与 retrospective。 |
| `tasks/skillforge-roadmap-master-plan/plans/subplan-7-phase-6-runtime-replay-real-implementation-subplan.json` | Phase 6 真实实现拆解的 subplan 入口。 |
| `tasks/skillforge-roadmap-master-plan/plans/subplan-8-subplan-8-phase-7-generator-real-implementation.json` | Phase 7 真实实现拆解的 subplan 入口。 |
| `tasks/skillforge-roadmap-master-plan/plans/subplan-9-subplan-9-phase-8-product-surface-real-implementation.json` | Phase 8 真实实现拆解的 subplan 入口。 |
| `tasks/skillforge-roadmap-master-plan/plans/subplan-10-subplan-10-phase-9-ui-integration-rebuilt.json` | Phase 9 UI 与集成阶段的 subplan 入口。 |

## Consequences

- 正向：master plan 可以长期保持简洁，始终作为 roadmap 的方向与顺序总线。
- 正向：细粒度实现事实会沉淀到 subplan，减少主计划被临时任务污染的风险。
- 正向：后续团队可以清楚区分 milestone 骨架与执行细节，便于审阅和接力。
- 取舍：主计划本身不再携带完整实施清单，需要额外查看对应 subplan 才能看到具体拆解。
- 取舍：如果某个阶段没有对应 subplan，细节就不能随意塞回 master plan，而要先补齐承载位置。
- 验证锚点：来源计划 retrospective 明确指出，主计划已被重构为简洁 milestone 主线，Phase 0–5 为已完成收口，Phase 6–9 为后续真实实现里程碑。

## Search Terms

- `milestone`
- `subplan`
- `follow-up`
- `boundary audit`
- `planning skeleton`
- `real implementation`
- `master plan`
