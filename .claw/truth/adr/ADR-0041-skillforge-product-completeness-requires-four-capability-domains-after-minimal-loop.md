# ADR: SkillForge 完整落地必须在最小闭环之后补齐四个能力域

## Status

accepted

## Context

来源计划 `SkillForge Roadmap Master Plan` 已完成，并明确修正了一个长期边界：**最小产品闭环不是终点，产品完整落地才是终点**。

计划的 retrospective 直接指出，前半程已经完成从静态基线到最小产品闭环的推进，但这只说明 demo 级或最小闭环成立，不代表产品已经具备完整落地所需的能力。为了避免后续继续沿用过碎的小切口方式推进，主计划后半程被重排为 4 个能力域阶段包。

## Decision

决定将 SkillForge 的后半程固定为 **四个能力域补齐**，而不是继续把最小闭环当作终点或延续碎片化阶段推进。

这四个能力域是：

1. **持久化状态层**
   - 让系统不再主要依赖内存状态。
   - 提供可持久化读写、最小事务边界和恢复能力。

2. **真实模型回放**
   - 接入真实 provider 的执行链路。
   - 让回放结果可验证、可观测，而不只是 synthetic/stub 闭环。

3. **Web UI 产品面**
   - 把 CLI 导向能力转成可视化产品交互。
   - 覆盖浏览、操作、状态跟踪等真实使用场景。

4. **分发与团队协作**
   - 补齐 registry / 分发 / 安装 / 版本管理 / 协作与治理能力。
   - 让系统从单人可用走向团队可协作、可分发、可治理。

同时约定：主计划继续只保留长期阶段骨架与里程碑，细节实现、验证任务和边界拆解必须下沉到子计划。

## Alternatives Considered

- **把最小闭环当作终点**：拒绝。计划已经明确这只是中段里程碑，不是完整落地。
- **继续沿用前半程的小切口节奏**：拒绝。这样会导致阶段名大于内容，后半程难以覆盖产品能力域。
- **把后半程重新展开为很多细任务**：拒绝。主计划应保持骨架稳定，细节应由 subplan 承载。

## Related Code

| Path | Role |
| ---- | ---- |
| `tasks/skillforge-roadmap-master-plan/plans/plan.json` | 来源计划，明确给出后半程四个能力域重排。 |
| `tasks/skillforge-roadmap-master-plan/plans/subplan-16-subplan-16-phase-14-persistent-state-layer.json` | 持久化状态层阶段入口。 |
| `tasks/skillforge-roadmap-master-plan/plans/subplan-17-subplan-17-phase-15-real-provider-replay.json` | 真实模型回放阶段入口。 |
| `tasks/skillforge-roadmap-master-plan/plans/subplan-19-phase-16-web-ui-surface.json` | Web UI 产品面阶段入口。 |
| `tasks/skillforge-roadmap-master-plan/plans/subplan-19-subplan-20-phase-17-distribution-collaboration.json` | 分发与团队协作阶段入口。 |

## Consequences

- 正向：后半程的方向边界更清楚，不再把最小闭环误当终点。
- 正向：后续推进会围绕能力域补齐，而不是继续堆小切口任务。
- 正向：每个阶段都有明确职责，便于后续接力和验收。
- 取舍：顶层计划不再携带细粒度实现内容，需要查看对应 subplan 才能获得执行细节。
- 取舍：如果某阶段的承载位置缺失，不能回填到主计划，必须先补齐子计划。
- 验证锚点：来源计划 retrospective 明确写出“最小产品闭环已完成，但尚未达到产品完整落地”；followUps 明确将后半程重排为 4 个能力域阶段包。

## Search Terms

- `minimal product loop`
- `product completeness`
- `persistent state layer`
- `real provider replay`
- `Web UI`
- `distribution collaboration`
- `Phase 14`
- `Phase 15`
- `Phase 16`
- `Phase 17`