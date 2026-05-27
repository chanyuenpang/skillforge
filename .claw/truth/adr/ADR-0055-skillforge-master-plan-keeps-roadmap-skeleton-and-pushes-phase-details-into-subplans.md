# ADR: SkillForge 主计划保持路线骨架，阶段细节下沉到 subplans

## Status

accepted

## Context

SkillForge 网页产品需要一个长期项目级主计划，持续承载产品定义、信息架构、子域规格和阶段化实现的全链路推进。此前推进中，单一计划如果同时容纳所有阶段细节，容易在阶段切换时丢失负责人视角，也会让顶层计划膨胀成执行清单，失去路线控制能力。

## Decision

主计划只保留 milestone 级路线骨架、阶段顺序和关键入口决策；具体实现、增强项和阶段内细节一律下沉到 subplans。

同时，阶段推进采用串行收口：先完成运行中心与知识资产等阶段性首刀，再进行统一联调、事实层回写与阶段复盘。进入下一阶段时，不直接跳到更深的写操作或治理能力，而是先补当前阶段的增强项，确认可演示基线稳定后再继续扩展。

## Alternatives Considered

- 把所有阶段任务都堆进主计划：被拒绝，因为会让主计划变成执行清单，削弱里程碑管理能力。
- 在第一阶段完成后直接进入写操作、资产治理或更深编排：被拒绝，因为阶段一的增强项尚未补齐，继续前进会破坏稳定基线。

## Related Code

| Path | Role |
| --- | --- |
| `docs/skillforge-product-charter-v1.md` | 产品总纲锚点 |
| `docs/skillforge-web-ia-and-module-layering-v1.md` | 网页信息架构锚点 |
| `docs/skillforge-roadmap-and-doc-governance-v1.md` | 路线治理锚点 |
| `docs/skillforge-run-center-domain-spec-v0.1.md` | 运行中心子域规格 |
| `docs/skillforge-knowledge-asset-domain-spec-v0.1.md` | 知识资产子域规格 |
| `.claw/truth/skillforge-阶段状态总表.md` | 阶段状态事实层 |
| `.claw/truth/skillforge-M6-联调验证记录.md` | 阶段联调验证记录 |

## Consequences

- 主计划可以持续作为顶层路线骨架，不会被阶段细节冲垮。
- 子计划承担具体实现和增强项，便于阶段切换与责任收口。
- 第二阶段入口被明确约束为“先补阶段一增强项”，有利于保持可演示产品面的稳定性。
- 未来若要扩展到写操作、资产治理或更深编排，必须先完成当前阶段增强与验证。

## Search Terms

- `master plan`
- `subplan`
- `milestone`
- `运行中心`
- `知识资产`
- `第二阶段入口`
