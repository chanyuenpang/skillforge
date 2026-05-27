# SkillForge B2 版本锚点与执行绑定追溯链说明（v1）

## A. 目标与边界
本文只定义 B2 所需的最小版本锚点、审批与执行绑定关系、以及 Run 回看追溯链，不扩展到复杂治理图谱、跨域追溯系统或自动化血缘分析。

## B. 版本锚点最小集合
- `Task(taskRef)`：编排与执行归属任务锚点
- `PromptDraft(id, version, status, updatedAt, owner)`：任务说明版本锚点
- `StepPlan(id, version, status, updatedAt, owner, promptDraftRef(version))`：执行计划版本锚点
- `Approval(approvalId, decision, decidedAt)`：审批结果锚点
- `Run(runId, status, startedAt, endedAt)`：执行事实锚点

## C. 审批-执行绑定规则
- Run 只消费 `ApprovedForRun` 的版本。
- 审批最少要能指向：
  - `approvedPackageRef = promptDraftId@version + stepPlanId@version`
- Run 最少要能指向：
  - `consumedPlanRef = stepPlanId@version`
  - `consumedPromptRef = promptDraftId@version`
  - `approvalRef = approvalId`
- 一致性规则：审批通过版本必须等于执行消费版本；若不一致，应标识为异常或禁止进入执行。
- 锁定规则：`LockedForApproval` 后不允许无痕覆写，只能新修订版本再走审批绑定。

## D. Run 回看最小追溯清单
### 可追对象
- `Task`
- `PromptDraft@version`
- `StepPlan@version`
- `Approval`
- `Run`

### 可追状态
- PromptDraft：提交时 / 执行关联时状态
- StepPlan：`ApprovedForRun` 与执行后状态（如 `Executed`）
- Approval：通过 / 拒绝 / 待决
- Run：执行状态与结果事实

### 最小回看路径
`Run -> Approval -> StepPlan(version) -> PromptDraft(version) -> Task`

## E. B2 纳入与排除
### B2 纳入
- 版本锚点链：`Task -> PromptDraft@v -> StepPlan@v`
- 门禁链：`PromptDraft@v + StepPlan@v -> Approval(decision)`
- 执行绑定链：`Approval(approved refs) -> Run(consumed refs)`
- 回看链：`Run -> Approval -> 编排对象版本`
- 状态审计链：`Draft / Ready / Locked / Approved / Executed / Superseded`

### B2 暂不纳入
- 跨任务 / 跨域深追溯图谱
- 自动化血缘推断与智能影响分析
- 复杂审批策略分层链
- Skeleton 深度映射追溯与质量评分链
- 大规模治理看板级全链自动联动

## F. 口径附录
- 必须继续区分：`已实现 / 已验证 / 未验证`
- 不能把追溯链定义文档的存在直接表述为“B2 版本追溯能力已完成验证”。
- 对外口径必须附证据锚点与未验证范围。