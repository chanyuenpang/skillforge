# SkillForge C1 跨域对象模型与引用规范（v1）

## 0. 文档定位与边界
本文只定义 C1 跨域对象模型与引用规范基线，不承诺复杂图谱、自动治理、自动血缘分析或智能推荐。

## 1. 输入依据与继承关系
- `docs/skillforge-roadmap-and-doc-governance-v1.md`
- `docs/skillforge-c0-gate-and-boundary-lock-v1.md`
- `docs/skillforge-b6-entry-objects-and-state-flow-v1.md`
- `docs/skillforge-b5-asset-objects-and-boundaries-v1.md`
- `docs/skillforge-b5-cross-domain-alignment-rules-v1.md`
- `docs/skillforge-b5-reuse-and-traceability-rules-v1.md`
- `tasks/skillforge-第三阶段主计划/plan.json`

## 2. C1 核心对象清单（跨域最小集）
- `Task(taskRef)`
- `PromptDraft@version`
- `StepPlan@version`
- `Approval(approvedPackageRef)`
- `Run(consumedPlanRef@v, consumedPromptRef@v, approvalRef)`
- `Skeleton@version`

## 3. 最小关联模型
### 主证据链
`Run -> Approval -> StepPlan@v -> PromptDraft@v -> Task`

### 资产挂接链
`StepPlan@v -> skeletonRef(id + version) -> Skeleton@version`

### 版本一致性三角
`Approval.approvedPackageRef = Run.consumedPlanRef@v + Run.consumedPromptRef@v = StepPlan@v / PromptDraft@v`

## 4. 强制引用规则（先成文项）
- `StepPlan@version -> PromptDraft@version` 必须强绑定
- `Approval` 必须审批版本化包，不能只批 `taskRef`
- `Run` 必须保留 `approvalRef + consumedPlanRef@v + consumedPromptRef@v`
- 使用 `Skeleton` 时必须引用 `skeletonRef(id + version)`
- `Task(taskRef)` 作为跨对象归属主键
- `Skeleton.status=Ready` 才允许新任务 Apply
- `LockedForApproval` 后禁止无痕改写，只能新修订

## 5. 状态与门禁语义
- 三分法：`已实现 / 已验证 / 未验证`
- 生命周期：`Draft / Ready / Deprecated / Archived`
- 锁定态：`LockedForApproval`

## 6. 一致性校核基线
- 必须成立：关键版本引用、审批包与执行消费版本一致、锁定后不可无痕改写
- 可见即可：主链与资产挂接链可被回看
- 可回看即可：解释当前状态、引用对象与受影响版本对
- 冲突分级：阻断 / 告警 / 解释

## 7. 命名与版本锚点规范
- 正文统一写 `对象名@version`
- `skeletonRef` 必须写 `id + version`
- 关键对象最小字段：`id(or taskRef), version, status, owner, updatedAt`
- 审批执行关键字段：`approvedPackageRef`, `consumedPlanRef@v`, `consumedPromptRef@v`, `approvalRef`
- 主名：`Run`；实现层别名：`ExecutionRun`

## 8. 与 C2/C3/C4 的前置接口
- C2 依赖：编排对象资产化所需引用前提
- C3 依赖：执行-复盘-回沉所需版本前提
- C4 依赖：truth / phase / spec / ADR 触发前提

## 9. 非目标与降调口径
- 不写复杂跨项目治理图谱
- 不写自动依赖推断 / 自动影响分析
- 不写自动一致性修复 / 自动回滚
- 不写全自动联动或智能推荐
- 结论必须带覆盖边界