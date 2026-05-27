# SkillForge C4 文档联动与回写基线（v1）

## 1. C4 目标与边界
本文只做 truth / phase / spec / ADR 联动稳定化，不承诺全自动文档联动、自动知识治理、自动影响分析或复杂跨项目同步。

## 2. 输入依据与继承关系
- `docs/skillforge-roadmap-and-doc-governance-v1.md`
- `docs/skillforge-c1-cross-domain-object-model-and-reference-rules-v1.md`
- `docs/skillforge-c2-orchestration-assetization-and-skeleton-reuse-governance-v1.md`
- `docs/skillforge-c3-execution-retro-and-skeleton-feedback-governance-v1.md`
- `.claw/truth/skillforge-阶段状态总表.md`
- `.claw/truth/skillforge-第二阶段增强真相.md`
- `.claw/truth/skillforge-M6-联调验证记录.md`
- `tasks/skillforge-第三阶段主计划/plan.json`

## 3. 联动对象与事实锚点最小集
- `Task(taskRef)`
- `PromptDraft@version`
- `StepPlan@version`
- `Approval(approvedPackageRef)`
- `Run(consumedPlanRef@v, consumedPromptRef@v, approvalRef)`
- `Skeleton@version`

## 4. 触发矩阵：变更类型 → 必写文档集合
- 功能状态变化 → truth
- 验证状态变化 → truth + phase
- 阶段入口守门结论变化 → truth + phase
- 阶段任务偏差 / 风险 / 优先级调整 → phase
- 关键联调结论影响门禁 → phase + truth
- 对象结构 / 状态机 / 引用规则变化 → spec
- 跨域引用策略 / 门禁架构取舍变化 → ADR

## 5. 最小回写规则与时序
- 先规则后事实
- 先决策后状态
- 先 spec / ADR，再 truth / phase

## 6. 状态口径统一规范
- 实现结论层：`已实现 / 已验证 / 未验证`
- 生命周期层：`Draft / Ready / Deprecated / Archived`
- 门禁锁定层：`LockedForApproval`
- 禁止混写不同层状态

## 7. 冲突判定与回退机制
- 证据不足或争议：回退为 `未验证 / 后续候选`
- 文档冲突时：先按 `feature truth + ADR` 定事实，再回修 spec / phase
- 冲突分级：阻断 / 告警 / 解释

## 8. 证据模板与覆盖边界模板
每条记录至少包含：
- 结论
- 证据锚点
- 覆盖范围
- 未覆盖范围
- 影响对象与版本对
- 处置状态

## 9. 纳入范围与延后清单
### 当前纳入
- 变更类型到文档集合的触发表
- 最小锚点字段规范
- 冲突优先级与回退规则
- 回写时序建议

### 明确延后
- 全自动文档联动
- 自动知识治理
- 自动影响分析 / 自动血缘推断
- 自动一致性修复 / 自动回滚
- 复杂跨项目同步与规模化联动看板

## 10. 与 C5 收口接口
C4 产出的联动规则、证据模板与回退口径，作为 C5 阶段事实沉淀与收口输入的统一前置基线。