# SkillForge B6 受控入口最小对象与状态流转说明（v1）

## 1. 范围与边界
B6 只覆盖受控发布入口的对象描述、状态声明与证据挂载，不扩展到复杂审批策略、自动回滚、自动优化或跨域治理图谱。

## 2. 最小对象模型
### 五对象主链
- `Task(taskRef)`
- `PromptDraft@version`
- `StepPlan@version`
- `Approval`
- `Run`

### 可选对象
- `Skeleton@version`（通过 `StepPlan.skeletonRef(id+version)` 挂接）

## 3. 最小字段基线
### 通用最小锚点
- `id / taskRef`
- `version`
- `status`
- `owner`
- `updatedAt`

### 分对象字段
- Task：`taskRef`
- PromptDraft@v：`id / version / status / updatedAt / owner / taskRef`
- StepPlan@v：`id / version / status / updatedAt / owner / taskRef / promptDraftRef@version`
- Approval：`approvalId / decision / decidedAt / approvedPackageRef`
- Run：`runId / status / startedAt / endedAt / approvalRef / consumedPlanRef@v / consumedPromptRef@v`
- Skeleton@v（可选）：`skeletonId / skeletonVersion / status`

## 4. 状态与门禁语义
### 证据结论三分法
- `已实现 / 已验证 / 未验证`

### 生命周期四态
- `Draft / Ready / Deprecated / Archived`

### 门禁关键态
- `Ready`：可提交 / 可应用前置
- `LockedForApproval`：锁定后禁止无痕改写，只允许新修订

## 5. 主路径与一致性核验
- 主路径：`Run -> Approval -> StepPlan@v -> PromptDraft@v -> Task`
- 必须一致字段：
  - `Approval.approvedPackageRef`
  - `Run.consumedPlanRef@v`
  - `Run.consumedPromptRef@v`
  - `StepPlan.promptDraftRef@version`

## 6. 可见性与异常槽位
### 必须可见
- 五对象主链
- 三分法状态
- `覆盖范围 / 未覆盖范围`
- 锁定语义与修订痕迹

### 异常槽位
- `异常类型`
- `触发规则`
- `影响对象`
- `影响版本`
- `发现时间`
- `当前处置状态`

## 7. 第一批纳入 / 排除清单
### 第一批纳入
- 五对象主链
- 可见一致性对照
- 三分法状态与覆盖边界
- 锁定与修订痕迹

### 暂不纳入
- 跨任务 / 跨项目复杂治理图谱
- 自动血缘推断、智能影响分析
- 复杂审批策略引擎状态树
- 自动回滚、自动优化、自动编排、智能推荐状态
- Skeleton 质量评分与场景推荐

## 8. 证据与结论模板
- 已实现：事实 + 锚点 + 未覆盖
- 已验证：动作 / 样本 + 锚点 + 覆盖边界
- 未验证：缺口 + 风险 + 后续候选
- 证据不足时统一降级为 `未验证 / 后续候选`