# SkillForge B4 关键门禁与版本一致性核验说明（v1）

## 5.1 目标与边界
本文只定义 B4 最小门禁与版本一致性核验口径，不扩展到复杂规则引擎、自动质量判定或跨域治理图谱。

## 5.2 对象与关系最小模型
- `Task(taskRef)`
- `PromptDraft(id, version, status, updatedAt, owner)`
- `StepPlan(id, version, status, updatedAt, owner, promptDraftRef@version, taskRef)`
- `Approval(approvalId, decision, decidedAt, approvedPackageRef)`
- `Run(runId, status, startedAt, endedAt, approvalRef, consumedPlanRef@v, consumedPromptRef@v)`
- 可选：`Skeleton(skeletonId, skeletonVersion, status)` 与 `skeletonRef@v`

## 5.3 三段门禁口径
### 提交 → 审批
- 提交包版本锚点齐备：`taskRef`、`promptDraft@version`、`stepPlan@version`
- 必填语义齐备：PromptDraft 的 `goal / constraints / acceptanceCriteria` 与 StepPlan 最小步骤闭环
- 来源与状态合法：`StepPlan -> promptDraftRef@version`，对象满足 `Ready`
- 一致性可审：PromptDraft ↔ StepPlan（及可选 Skeleton）无显著语义冲突
- 锁定语义成立：进入 `LockedForApproval` 后禁止无痕覆写
- 检查摘要可挂载：提交前检查结果进入审批上下文

### 审批 → 执行
- 审批包明确：`approvedPackageRef = promptDraft@v + stepPlan@v`
- 执行入口绑定审批：Run 必须引用 `approvalRef`
- 版本一致性核对：Run 的消费版本与审批通过包一致
- 仅 `ApprovedForRun` 可进入正式执行链
- 锁定后改动防穿透：版本漂移或引用变更需阻断或显式异常

### 执行 → 回看
- 主路径可串：`Run -> Approval -> StepPlan@v -> PromptDraft@v -> Task`
- 回看最少可见：对象ID、版本、状态、时间戳、owner、关键引用关系
- 异常可解释：版本不一致或引用缺失时要有异常标识
- 结论必须区分：`已实现 / 已验证 / 未验证`

## 5.4 核验分层与处置
### 阻断
- 关键引用缺失或无版本
- 审批包与执行消费版本不一致
- 未满足 `Ready` 却提交 / 执行
- 锁定后无痕改写
- 关键语义冲突达到不可审 / 不可执行级别

### 告警
- 提交前检查摘要不完整
- 非关键字段漂移或版本新鲜度风险
- 回流入口不稳定、定位成本高
- 异常态证据槽位不全

### 回看呈现
- 五对象并列展示（含可选 Skeleton）
- 状态轨迹展示
- 证据覆盖范围与未验证范围说明
- 失败样本的最小解释链展示

## 5.5 版本一致性核验清单
### 必须一致
- `Approval.approvedPackageRef`
- `Run.consumedPlanRef@v`
- `Run.consumedPromptRef@v`
- `StepPlan.promptDraftRef@version`

### 可选纳入（覆盖 B3 时）
- `StepPlan.skeletonRef(id + version)`

## 5.6 第一批纳入与暂不纳入
### 第一批纳入
- 三段主链最小门禁
- 强制版本化引用
- 审批包—执行消费一致性核验
- 锁定后仅允许新修订
- 回看侧最小证据卡片与状态口径统一

### 暂不纳入
- 复杂审批策略引擎
- 自动化血缘推断、智能影响分析
- 质量评分、智能推荐、自动优化 / 自动编排
- 执行复盘自动反哺 Skeleton
- 规模化治理看板与高级可视化治理能力

## 5.7 证据与状态表述规范
- 统一 `已实现 / 已验证 / 未验证`
- 每条结论必须附证据锚点与未覆盖范围。