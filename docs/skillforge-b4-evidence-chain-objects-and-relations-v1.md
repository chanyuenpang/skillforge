# SkillForge B4 最小证据链对象与关系说明（v1）

## 5.1 目标与边界
本文只定义 B4 最小证据链对象层与关系口径，不扩展到复杂图谱、自动血缘、智能影响分析或跨域深追溯能力。

## 5.2 对象清单（最小集）
### Task
- 证据链归属锚点：`taskRef`

### PromptDraft@version
- 最小锚点：`id / version / status / updatedAt / owner`
- 核心语义：`goal / constraints / acceptanceCriteria`

### StepPlan@version
- 最小锚点：`id / version / status / updatedAt / owner / promptDraftRef@version / taskRef`

### Approval
- 最小锚点：`approvalId / decision / decidedAt / approvedPackageRef`

### Run
- 最小锚点：`runId / status / startedAt / endedAt / consumed refs`

### Skeleton@version（可选最小纳入）
- 若覆盖 B3 一致性，则至少保留：`skeletonId / skeletonVersion / status`
- 在编排对象上可见：`skeletonRef(id + version)`

## 5.3 引用关系清单（最小集）
- `Task -> PromptDraft@v`
- `Task -> StepPlan@v`
- `Task -> Run`
- `StepPlan@v -> PromptDraft@v`
- `Approval -> approvedPackageRef(PromptDraft@v + StepPlan@v)`
- `Run -> approvalRef`
- `Run -> consumedPlanRef(StepPlan@v)`
- `Run -> consumedPromptRef(PromptDraft@v)`
- 最小回看主路径：`Run -> Approval -> StepPlan@v -> PromptDraft@v -> Task`
- 若纳入 Skeleton：`StepPlan@v -> skeletonRef(skeletonId + skeletonVersion)`

## 5.4 一致性与锁定规则
- 所有关键引用必须带版本，禁止无版本引用。
- 审批通过包应与执行消费版本可核对。
- 锁定后只能新修订，不得无痕覆写版本。
- 若声明覆盖 B3 一致性，需保留 `skeletonRef` 与相关锁定语义。

## 5.5 原型可见性要求
- 回看中必须可见：`Task / PromptDraft@v / StepPlan@v / Approval / Run`
- 必须可见：
  - `StepPlan@v` 指向 `PromptDraft@v`
  - `Approval` 的批准包版本
  - `Run` 的消费版本与审批引用
- 不要求复杂关系图谱，但必须能按主路径串起来。

## 5.6 第一批排除项
- 跨任务 / 跨域深追溯图谱
- 自动化血缘推断、智能影响分析
- 质量评分、自动推荐、自动编排
- 复杂审批策略分层链
- 执行复盘自动反哺 Skeleton

## 5.7 状态与证据表述规范
- 统一区分：`已实现 / 已验证 / 未验证`
- 每条结论必须附证据锚点与未覆盖范围。