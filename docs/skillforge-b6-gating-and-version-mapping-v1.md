# SkillForge B6 门禁与版本一致性映射说明（v1）

## 5.1 目标与边界
B6 只定义受控入口的最小门禁与版本一致性口径，不扩展到复杂策略引擎、自动修复、自动回滚或智能治理能力。

## 5.2 对象与关系最小模型
- `Task`
- `PromptDraft@version`
- `StepPlan@version`
- `Approval`
- `Run`
- 可选：`Skeleton@version`

关键关系：
- `StepPlan@v -> PromptDraft@v`
- `Approval -> approvedPackageRef(PromptDraft@v + StepPlan@v)`
- `Run -> approvalRef`
- `Run -> consumedPlanRef@v / consumedPromptRef@v`

## 5.3 三段门禁最小检查表
### 提交 → 审批
- 提交包锚点齐备：`taskRef / promptDraft@version / stepPlan@version`
- `StepPlan.promptDraftRef@version` 存在且可追溯
- 对象满足 `Ready`，并建立 `LockedForApproval` 锁定语义
- PromptDraft 与 StepPlan 最小语义可对齐
- 提交前检查摘要可挂载到审批上下文

### 审批 → 生效
- `Approval.approvedPackageRef = PromptDraft@v + StepPlan@v`
- `Run` 必须带 `approvalRef`
- `Run.consumedPlanRef@v / consumedPromptRef@v` 与审批包一致
- 仅满足可运行审批结论可进入执行链
- 锁定后若出现引用漂移或无痕改写，必须触发门禁处理

### 生效 → 回看
- 主路径：`Run -> Approval -> StepPlan@v -> PromptDraft@v -> Task`
- 对象 `id / version / status / owner / time` 与关键引用关系可见
- 异常可解释：异常类型、触发规则、影响对象/版本、发现时间、处置状态
- 结论必须区分：`已实现 / 已验证 / 未验证`

## 5.4 分层处置规则
### 阻断
- 关键引用缺失或无版本
- 审批包与执行消费版本不一致
- 非 `Ready` 对象进入提交或执行链
- `LockedForApproval` 后无痕改写
- 关键语义冲突达到不可审 / 不可执行级

### 告警
- 提交前检查摘要不完整
- 非关键字段漂移、新鲜度风险、回流定位成本高
- 域边界混写倾向但未破坏主链一致性

### 回看呈现
- 五对象主链并列展示
- 生命周期轨迹与三分状态标签可见
- 覆盖范围 / 未覆盖范围与失败样本最小解释链可见

## 5.5 版本一致性核验清单
### 必须一致
- `StepPlan@v -> PromptDraft@v`
- `Approval.approvedPackageRef`
- `Run.approvalRef`
- `Run.consumedPlanRef@v / consumedPromptRef@v`

### 可选一致
- `StepPlan.skeletonRef(id + version)`

## 5.6 状态与证据表述规范
- 使用三分法：`已实现 / 已验证 / 未验证`
- 继续区分生命周期四态：`Draft / Ready / Deprecated / Archived`
- 每条结论附证据锚点、覆盖范围、未覆盖范围
- 争议或证据不足时统一降级为 `未验证 / 后续候选`

## 5.7 第一批纳入 / 暂不纳入范围
### 第一批纳入
- 三段门禁最小核验
- 强制版本化引用
- 审批包—执行消费一致性核验
- `Ready` 准入与 `LockedForApproval` 锁定语义
- 回看侧最小证据卡片与异常槽位

### 暂不纳入
- 复杂审批策略引擎 / 分层状态树
- 自动一致性修复、自动回滚、自动优化、自动编排
- 自动血缘推断、智能影响分析、智能推荐
- 跨任务 / 跨项目复杂治理图谱、运营级高级看板
- Skeleton 质量评分与自动反哺机制