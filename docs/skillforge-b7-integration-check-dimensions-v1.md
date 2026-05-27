# SkillForge B7 第二阶段最小联调检查维度说明（v1）

## 1. 范围与非目标
B7 只定义第二阶段最小联调基线，不新增能力承诺，不扩展到自动联调、跨项目深联调或复杂治理图谱。

## 2. 最小联调对象链定义
- 主路径：`Task -> PromptDraft@v -> StepPlan@v -> Approval(approvedPackageRef) -> Run(consumed refs)`
- 可选补充：`StepPlan@v -> skeletonRef(id+version)`

## 3. 最小门禁链定义
### 提交 → 审批
- 提交包锚点齐备
- `StepPlan -> PromptDraft@v` 可追溯
- `Ready` 准入
- `LockedForApproval` 建立

### 审批 → 生效
- `Approval` 批准包版本与 `Run` 消费版本一致
- `Run` 挂 `approvalRef`

### 生效 → 回看
- 可按主路径完整回看
- 可解释异常

## 4. 版本一致性规则
- 关键引用必须带 `@version`
- 锁定后禁止无痕改写，只能新修订
- 审批包版本 = 执行消费版本

## 5. 检查项分层
### 主链必查（阻断）
- 五对象主路径可串联
- `StepPlan@v -> PromptDraft@v` 绑定完整
- `Approval.approvedPackageRef` 与 `Run.consumed*Ref@v` 一致
- 关键引用无缺失、无无版本引用
- `Ready` 准入、`LockedForApproval` 后无痕改写拦截
- 结论口径不夸大

### 辅助核对（告警）
- 提交前检查摘要完整度
- 非关键字段漂移、新鲜度风险
- `skeletonRef@v` 可见性与应用资格
- 资产侧最小字段可见性
- 回看展示质量

## 6. 断点分类与判级
- A 版本漂移类
- B 引用合规类
- C 状态门禁类
- D 语义对齐类
- E 口径证据类
- F 跨域映射类

## 7. 首批纳入边界
### 第一批纳入
- 主链对象、引用、版本一致性核验
- 三段门禁最小检查
- `Approval`—`Run` 一致性硬校验
- `Ready` 准入与 `LockedForApproval` 锁定语义
- 三分状态口径与证据锚点校核
- 覆盖 B3 / B5 时补 `StepPlan -> skeletonRef@v` 合规检查

### 暂不纳入
- 自动联调、自动修复、自动回滚、自动优化推荐
- 跨任务 / 跨项目深联调与复杂治理图谱
- 智能血缘推断、智能影响分析、评分推荐
- 运营级规模化看板与复杂审批策略引擎

## 8. 输出口径模板
- 已实现：事实 + 证据锚点 + 覆盖边界
- 已验证：验证动作 + 证据锚点 + 覆盖边界
- 未验证：缺口 + 风险 + 后续归属