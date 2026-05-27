# SkillForge B4 证据可见性与回看槽位说明（v1）

## 5.1 目标与边界
本文只定义 B4 最小证据可见性与回看槽位，不扩展到复杂图谱、全局看板或高级可视化治理能力。

## 5.2 最小可见对象清单
- `Task(taskRef)`
- `PromptDraft@version`
- `StepPlan@version`
- `Approval`
- `Run`
- 可选：`Skeleton@version`

## 5.3 每对象最小摘要字段
### Task
- `taskRef`
- 当前链路位置
- 关联对象计数（PD / SP / Approval / Run 是否齐备）

### PromptDraft@version
- `id + version + status + updatedAt + owner + taskRef`
- `goal / constraints / acceptanceCriteria` 是否齐备

### StepPlan@version
- `id + version + status + updatedAt + owner + taskRef + promptDraftRef@version`
- 最小步骤闭环是否成立（输入 / 意图 / 输出 / 检查点）

### Approval
- `approvalId + decision + decidedAt + approvedPackageRef`

### Run
- `runId + status + startedAt + endedAt + approvalRef + consumedPlanRef@v + consumedPromptRef@v`

### Skeleton@version（可选）
- `skeletonId + skeletonVersion + status`
- `StepPlan.skeletonRef(id + version)`

## 5.4 最小回看路径定义
- 主路径：`Run -> Approval -> StepPlan@v -> PromptDraft@v -> Task`
- 版本一致性路径：`Approval.approvedPackageRef ↔ Run.consumedPlanRef@v ↔ Run.consumedPromptRef@v ↔ StepPlan.promptDraftRef@version`
- 提交前门禁路径：`Task -> PromptDraft@v -> StepPlan@v -> 提交检查摘要 -> Approval`
- 锁定修订路径：`LockedForApproval` 后的新修订替代痕迹可见
- 可选 B3 路径：`StepPlan@v -> skeletonRef@v`

## 5.5 异常场景槽位规范
### 拒绝
- 拒绝结论、拒绝时间、版本对、拒绝原因摘要、待补充项

### 补充
- 补充请求点、触发门禁项、责任人与时间戳

### 执行失败
- `runId`、失败时间、绑定审批与版本对、最小解释链

### 版本不一致 / 引用缺失
- 不一致字段位、缺失引用位、阻断判定结果

### 锁定后变更风险
- 锁定态、是否新修订、处置结果（阻断 / 告警）

### 统一异常槽位
- `异常类型`
- `触发规则`
- `影响对象`
- `影响版本`
- `发现时间`
- `当前处置状态`

## 5.6 第一批纳入与排除项
### 第一批纳入
- 五对象最小可见
- 主路径可串与回跳
- 强制版本化引用可见
- 审批包与执行消费一致性核对结果可见
- 锁定语义与修订痕迹可见
- 异常最小解释链可见
- `已实现 / 已验证 / 未验证` 与未覆盖范围可见

### 暂不纳入
- 复杂关系图谱、跨任务 / 跨域深追溯
- 自动化血缘推断、智能影响分析
- 质量评分、智能推荐、自动编排 / 自动优化
- 复杂审批策略引擎解释树
- 规模化治理看板与高级可视化治理能力

## 5.7 状态口径与证据表述规范
- 业务状态与证据状态分离展示
- 每条结论都要附锚点与未覆盖范围