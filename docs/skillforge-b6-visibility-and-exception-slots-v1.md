# SkillForge B6 证据可见性与异常槽位说明（v1）

## 5.1 目标与边界
B6 只定义受控发布入口的最小回看面，不扩展到复杂关系图谱、自动根因分析或高级可视化治理能力。

## 5.2 最小可见对象清单与字段基线
### 对象范围
- `Task`
- `PromptDraft@version`
- `StepPlan@version`
- `Approval`
- `Run`
- 可选：`Skeleton@version`

### 每对象最少摘要
- Task：`taskRef`、链路齐备性
- PromptDraft@v：`id/version/status/updatedAt/owner/taskRef` + 最小语义齐备提示
- StepPlan@v：`id/version/status/updatedAt/owner/taskRef/promptDraftRef@version` + 最小步骤闭环提示
- Approval：`approvalId/decision/decidedAt/approvedPackageRef`
- Run：`runId/status/startedAt/endedAt/approvalRef/consumedPlanRef@v/consumedPromptRef@v`

## 5.3 状态口径与门禁语义
- 生命周期：`Draft / Ready / Deprecated / Archived`
- 证据结论：`已实现 / 已验证 / 未验证`
- 每条结论附：证据锚点 + 覆盖范围 + 未覆盖范围
- 门禁语义显式可见：`Ready` 准入、`LockedForApproval` 锁定与修订痕迹

## 5.4 最小回看路径定义
- 主路径：`Run -> Approval -> StepPlan@v -> PromptDraft@v -> Task`
- 版本一致性路径：`Approval.approvedPackageRef ↔ Run.consumedPlanRef@v ↔ Run.consumedPromptRef@v ↔ StepPlan.promptDraftRef@version`
- 提交门禁路径：`Task -> PromptDraft@v -> StepPlan@v -> 提交检查摘要 -> Approval`
- 锁定修订路径：`LockedForApproval` 后仅允许新修订
- 可选补充路径：`StepPlan@v -> skeletonRef@v`

## 5.5 异常与拒绝 / 阻断 / 生效失败槽位
### 统一异常槽位字段
- `异常类型`
- `触发规则`
- `影响对象`
- `影响版本`
- `发现时间`
- `当前处置状态`

### 必须覆盖的异常类型
- 拒绝
- 补充
- 阻断
- 生效失败
- 告警类

### 失败解释下限
- 只提供：规则触发点 + 受影响版本对 + 当前状态
- 不承诺自动根因分析

## 5.6 第一批纳入与暂不纳入清单
### 第一批纳入
- 五对象主链可见
- 三段门禁最小核验可见
- 强制版本引用与审批包-执行消费一致性核验结果
- `Ready` 与 `LockedForApproval` 语义 + 修订痕迹
- 三分法结论 + 覆盖 / 未覆盖边界
- 异常最小槽位与最小解释链

### 暂不纳入
- 跨任务 / 跨项目复杂治理图谱
- 自动血缘推断、智能影响分析、自动根因分析
- 复杂审批策略引擎状态树
- 自动修复、自动回滚、自动优化、自动编排、智能推荐
- Skeleton 质量评分与自动反哺联动
- 运营级高级看板与高阶可视化治理

## 5.7 证据结论模板
- 已实现：事实 + 锚点 + 未覆盖
- 已验证：动作 / 样本 + 锚点 + 覆盖边界
- 未验证：缺口 + 风险 + 后续候选

## 5.8 争议回退规则
- 证据不足或口径冲突统一降级为 `未验证 / 后续候选`