# ADR: SkillForge 100% 完整产品终态与里程碑路径

## Status

accepted

## Context

SkillForge 进入不再做碎片化阶段规划的收口期，需要一个可长期沿用的终态定义，来约束后续所有 milestone 的判定标准。此前的实现已经验证了全局主计划、差距分析和分阶段推进的价值，但如果没有统一的终态与路径，后续执行会继续被局部任务牵引，难以形成完整产品态。

## Decision

将 SkillForge 的 100% 产品终态固定为四个面：

1. 功能面：SkillForge 全链路自主运行。
2. 观测面：网页端可完整观测 review / optimize / spawn / 回流过程。
3. 稳定性面：`web-server` 以 `systemd user service` 唯一托管，避免被随意终止。
4. 流程面：负责人只做判定与修正，由 SkillForge 接管“规范 → 执行 → 回流”的循环。

同时，将从当前状态推进到终态的主路径固定为 6 个 milestone：

- M1：规划与子计划骨架落地
- M2：SkillForge 运行记录打通 `Store/API`
- M3：`web-server` 托管稳定化
- M4：端到端闭环
- M5：产品叙事统一
- M6：托管收尾与规范沉淀

后续所有执行阶段的子计划，必须挂在主计划之下，并按 `review → optimize → spawn → 回写` 的顺序推进。

## Alternatives Considered

- 继续采用阶段性碎片规划：被拒绝。短期可执行，但无法提供统一终态与长期验收标准。
- 只沉淀当前差距清单：被拒绝。差距清单能指导优先级，但不能替代产品终态定义。

## Related Code

| Path | Role |
| ---- | ---- |
| `docs/skillforge-execution-rules-v1.md` | 强制 `review / optimize / spawn / 回流` 的执行规则锚点 |
| `docs/skillforge-execution-workflow-v1.md` | 主路径、例外与重试顺序的流程锚点 |

## Consequences

- 后续 milestone 有了统一终态和验收基线，不再围绕碎片功能反复摇摆。
- 执行必须遵守 `review → optimize → spawn` 的强制链路，子计划不能直接裸起。
- `web-server` 的托管方式被约束为 `systemd user service`，这是稳定性上的长期边界。

## Search Terms

- `review`
- `optimize`
- `spawn`
- `systemd user service`
- `Store/API`
- `web-server`
- `Milestone M1`
- `Milestone M6`
