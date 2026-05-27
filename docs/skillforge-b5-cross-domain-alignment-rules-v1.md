# SkillForge B5 与编排链 / 证据链一致性校核说明（v1）

## 5.1 目标与边界
本文只定义 B5 跨域一致性校核规则，不扩展到自动一致性修复、自动反哺 Skeleton 或复杂治理图谱能力。

## 5.2 校核对象范围
- 资产域：`Skeleton@version`
- 编排域：`PromptDraft@version / StepPlan@version`
- 证据域：`Task / Approval / Run`
- 可选扩展锚点：`skeletonRef@version`

## 5.3 跨域关系矩阵
- `Skeleton@version -> StepPlan@version`
  - 校核：`skeletonRef(id + version)` 是否存在、是否锁定、是否明确版本
- `StepPlan@version -> PromptDraft@version`
  - 校核：绑定是否完整
- `Approval -> approvedPackageRef(PromptDraft@v + StepPlan@v)`
  - 校核：批准包版本是否明确
- `Run -> approvalRef / consumedPromptRef / consumedPlanRef`
  - 校核：执行消费版本是否与审批包一致
- 主路径：`Run -> Approval -> StepPlan@v -> PromptDraft@v -> Task`

## 5.4 分层规则
### 必须成立
- 关键对象与关键引用均带 `@version`
- `Approval` 批准包版本 = `Run` 实际消费版本
- `LockedForApproval` 后禁止无痕改写
- 新任务应用 Skeleton 时，来源必须为 `Ready` 且版本明确
- `StepPlan@v` 必须绑定 `PromptDraft@v`

### 可见即可
- 资产侧最小字段可见：`id / name / version / status / owner / updatedAt`
- 编排侧可见：`skeletonRef`、已绑定 / 已锁定提示、待同步确认提示
- 证据侧可见：批准包版本、Run 消费版本、`approvalRef`
- 三分状态标签可见：`已实现 / 已验证 / 未验证`

### 可回看即可
- 可按主路径回看到 Task / PromptDraft@v / StepPlan@v / Approval / Run
- 可定位 StepPlan 的 Skeleton 来源版本
- `Deprecated / Archived` 不影响历史回看，只影响新任务应用资格

## 5.5 冲突分类与定性
- 版本漂移冲突：主链硬冲突
- 无版本引用冲突：引用不合规
- 状态越权冲突：治理门禁冲突
- 边界混写冲突：域边界冲突
- 口径夸大冲突：证据口径冲突
- 锁定失效冲突：审计可追溯冲突

## 5.6 第一批纳入与排除
### 第一批纳入
- B2 / B4 主链最小对象与引用完整性校核
- `Approval` 与 `Run` 版本一致性校核
- `StepPlan -> PromptDraft`、`StepPlan -> skeletonRef@v` 引用合规校核
- 锁定语义校核
- Skeleton 应用资格校核
- 三分状态与证据锚点 / 覆盖边界校核

### 暂不纳入
- 跨任务 / 跨项目复杂治理图谱与深血缘推断
- 自动一致性修复、自动反哺 Skeleton、自动优化 / 推荐
- 复杂审批分层策略、智能影响分析引擎
- 质量评分体系与运营级全链自动联动

## 5.7 证据与状态口径附录
- 统一 `已实现 / 已验证 / 未验证`
- 每条结论附证据锚点与覆盖边界模板