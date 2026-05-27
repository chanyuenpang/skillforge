# ADR: SkillForge 执行主线里程碑路径与维护收口规范

## Status

accepted

## Context

SkillForge 的主计划已经从阶段性推进收口到可持续维护状态。前置沉淀已经证明：如果没有一条明确的主线里程碑路径，后续执行容易回到局部任务牵引；如果没有把收尾规则写成可复用规范，产品化叙事、托管稳定性与验证资产会在阶段结束后再次松散。

这次主计划完整跑通了 M1~M6，形成了可长期复用的执行主线和收尾边界，因此需要把这条路径沉淀为长期约束，而不是一次性项目总结。

## Decision

将 SkillForge 从当前状态推进到完整产品态的主线固定为 6 个 milestone：

- M1：规划与子计划骨架落地
- M2：SkillForge 运行记录打通 `Store/API`
- M3：`web-server` 托管稳定化
- M4：端到端闭环
- M5：产品叙事统一
- M6：托管收尾与规范沉淀

同时，后续所有执行阶段继续沿用以下长期约束：

- 主计划之下的子计划必须按 `review → optimize → spawn → 回写` 推进。
- 涉及托管与运行稳定性的改动，必须明确唯一托管入口与回滚边界。
- 每个 milestone 都必须带验证环节，不能只有实现没有验收。
- 网页端的定位是 review / 观察面，不是审批面。
- 阶段结束后要补流程 meta-review，把流程摩擦点、优化点和可复用资产沉淀下来。
- smoke test、真实 run、失败样例要沉淀为测试资产，不能只留口头汇报。
- 主 Agent 派 subagent 前，应尽量亲自走一遍 review / optimize / spawn 链路，作为第一体验者积累一手摩擦点。

## Alternatives Considered

- 只保留里程碑列表，不写收口规范：被拒绝。这样只能记录路径，不能约束后续维护方式。
- 只沉淀当前主计划复盘，不抽象成长期规范：被拒绝。复盘会随任务结束而失效，无法稳定指导后续执行。

## Related Code

| Path | Role |
| ---- | ---- |
| `docs/skillforge-execution-rules-v1.md` | `review → optimize → spawn → 回流` 的执行规则锚点 |
| `docs/skillforge-execution-workflow-v1.md` | 主路径、例外与重试顺序的流程锚点 |
| `docs/phase-6-closeout-and-maintenance.md` | 收尾验真记录与维护约束的落点 |
| `docs/m1-plan-structure-template-v1.md` | M1 规划骨架模板 |
| `docs/m1-feedback-loop-v1.md` | M1 回流机制模板 |

## Consequences

- SkillForge 的 100% 目标不再依赖临时计划解释，而是有稳定的 6 段路径可追踪。
- `systemd user service` 托管、`Store/API` 打通、端到端闭环和产品叙事统一，成为后续维护与回归的固定锚点。
- 收尾阶段必须把验证记录、术语统一和测试资产一起沉淀，否则不算真正收口。
- 阶段结束后补 meta-review，会增加少量维护成本，但能持续降低流程漂移和经验流失。

## Search Terms

- `review`
- `optimize`
- `spawn`
- `Store/API`
- `web-server`
- `systemd user service`
- `meta-review`
- `smoke test`
- `test assets`
- `第一体验者`
