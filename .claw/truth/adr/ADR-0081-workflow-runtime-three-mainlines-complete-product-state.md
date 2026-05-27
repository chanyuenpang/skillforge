# ADR: Workflow Runtime 三条主线完整产品态收口

## Status

accepted

## Context

本次总计划把三条主线从初始约 30%~40% 推进到完整产品态，且 `end.completed` 记录了 13 个阶段全部完成、285+ 验证零失败、三条主线验收成立。

这三条主线分别是：

1. `workflow` 真正指导并驱动 plan。
2. `spawn subagent` 时动态 skill 自动组装 prompt 并进入执行闭环。
3. 网页管理页面形成完整管理、执行、观察闭环。

计划的 retrospective 还明确了几个长期约束：核心层保持中立/独立/可复用；`PlanDTO` 作为中间层隔离 `planSkeleton` 与正式 plan 工具链；master plan 只保留 milestone，细粒度下沉 subplan；验收以真实验证为准，不信任口头完成声明。

## Decision

决定将 Workflow Runtime 的产品主线收口为三层稳定架构：

1. **Workflow → Plan Runtime**：用中立 `PlanDTO` 承接 `planSkeleton` 与正式 plan 工具链之间的转换，核心层只表达 skeleton、contract、state，不直接承担强执行编排。
2. **Dynamic Skill → Prompt → Spawn**：`spawn subagent` 的 prompt 组装必须由 skill resolver 与 prompt assembler 完成，形成可追溯的执行闭环，不把模型习惯或平台能力写死进核心层。
3. **Web 管理闭环**：管理、执行、观察三种操作面必须按职责分层收口，形成可直接使用的完整产品态，而不是停留在局部页面或占位实现。

同时固化以下长期规则：

- 核心层保持中立，不绑定特定模型或平台习惯。
- `master plan` 只保留 milestone 骨架，细粒度任务下沉到 subplan。
- 验收必须以真实验证结果为准，不能用口头完成代替。
- 设计、实现、验证按独立流水线推进，避免把不同责任混在同一层。

## Alternatives Considered

- 继续把运行时做成强执行 orchestrator：被拒绝，因为会把抽象边界与执行责任混在一起，放大耦合。
- 只保留 `planSkeleton`，不引入 `PlanDTO`：被拒绝，因为无法稳定承接正式 plan 工具链的状态与映射差异。
- 让核心层直接绑定模型习惯或平台能力：被拒绝，因为会破坏中立抽象，后续扩展更难收口。
- 让 web 管理长期停留在局部功能页面：被拒绝，因为无法形成完整管理、执行、观察闭环。

## Related Code

| Path | Role |
| --- | --- |
| `plans/subplan-2-plan.json` | 本次总计划的源计划记录与阶段收口依据 |
| `PlanDTO` | 中立中间层锚点 |
| `planSkeleton` | 骨架输入对象锚点 |
| `plan_write` | 正式 plan 写入接口锚点 |
| `plan_edit` | 正式 plan 修改接口锚点 |
| `spawn subagent` | 动态子代理执行入口锚点 |
| `skill resolver` | 动态 skill 解析锚点 |
| `prompt assembler` | prompt 组装锚点 |
| `web-server.mjs` | Web 管理闭环服务入口锚点 |
| `RunCenter` | 前端管理与运行观察面锚点 |

## Consequences

- 正向：三条主线有了统一的长期收口口径，后续实现不容易回退成碎片化功能。
- 正向：`PlanDTO` 让 `planSkeleton` 与正式 plan 工具链之间的职责边界更稳定。
- 正向：`spawn subagent` 的 prompt 组装与追溯链路具备明确闭环，便于持续扩展。
- 正向：Web 管理面从占位态升级为可直接使用的管理、执行、观察闭环。
- 取舍：需要持续维护中间层与适配层，短期实现路径更长。
- 风险：若后续绕过 `PlanDTO` 或破坏 master plan / subplan 分层，核心层独立性会再次被侵蚀。
- 验证锚点：计划记录中的 `285+` 真实验证、`13` 阶段全部完成、三条主线验收成立。

## Search Terms

- `PlanDTO`
- `planSkeleton`
- `plan_write`
- `plan_edit`
- `spawn subagent`
- `skill resolver`
- `prompt assembler`
- `RunCenter`
- `web-server.mjs`
- `master plan`
- `subplan`
- `285+`
