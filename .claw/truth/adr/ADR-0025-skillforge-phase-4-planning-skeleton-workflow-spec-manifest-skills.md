# ADR: SkillForge Phase 4 planning skeleton 固定 `workflow→spec→manifest/SKILL.md` 主链路并排除 runtime/UI 范围

## Status

accepted

## Context

Phase 4 的目标不是直接实现生成器，而是先把最小 planning skeleton 钉死，避免后续实现时把静态契约、产物契约和 runtime 能力混在一起。现有计划明确要求围绕 roadmap 与现有 static/runtime contract 资产，先定义最小输入契约、最小产物契约、依赖映射与里程碑拆分。

## Decision

Phase 4 的 planning skeleton 以 `workflow→spec→manifest/SKILL.md` 作为主链路，作为后续生成器与打包阶段的最小契约边界。

同时明确以下内容在本阶段属于 out-of-scope：

- `UI`
- `registry`
- 真实外发
- `provider runtime`

Phase 4 的首个实现切口应是 `M4.1 Workflow→Spec` 最小输入契约冻结，而不是直接推进生成器全链路。

## Alternatives Considered

- 直接推进生成器全链路：被放弃，因为会过早引入 runtime 和产品化语义，破坏 skeleton 阶段的契约冻结目标。
- 把 `UI` / `registry` / `provider runtime` 一并纳入：被放弃，因为本阶段只需要先锁定静态链路和最小产物边界。

## Related Code

| Path | Role |
| --- | --- |
| `tasks/skillforge-roadmap-master-plan/plans/subplan-5-subplan-5-phase-4-planning-skeleton-v0.json` | 该决策的计划来源与完成记录 |
| `docs/` | 后续承载 Phase 4 相关设计与里程碑说明的文档区 |

## Consequences

- 后续 Phase 4 的实现可以围绕同一条静态主链路推进，减少契约漂移。
- 生成器与打包阶段不会被提前绑定到 runtime/UI 语义。
- `M4.1` 成为明确的优先切口，便于继续拆分实现任务。

## Search Terms

- `workflow→spec→manifest/SKILL.md`
- `M4.1`
- `Phase 4`
- `UI`
- `registry`
- `provider runtime`
