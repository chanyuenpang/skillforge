# SkillForge B5 复用与追溯最小规则说明（v1）

## 5.1 范围与非范围声明
本文只定义 B5 最小复用治理与追溯标准，不承诺自动推荐、自动回写、复杂血缘分析或智能化资产能力。

## 5.2 对象与域边界
- 资产域：`Skeleton@version`
- 编排域：`PromptDraft@version / StepPlan@version`
- 证据域：`Task / Approval / Run`
- 禁止把 Skeleton 写成运行事实对象，也禁止把 Approval / Run 并入资产对象层

## 5.3 最少复用动作链
- Apply：按 `Ready` 状态筛选 Skeleton，并以明确版本执行应用
- Adjust：在 StepPlan 内进行人工裁剪 / 增补 / 重排与任务化细化
- Lock：提交前执行一致性检查并冻结 `skeletonRef(id + version)` 与提交包版本锚点
- Trace：审批 / 执行后可回看 Skeleton 来源版本

## 5.4 应用后调整与保留约束
### 可调整
- StepPlan 步骤裁剪、增补、重排
- 对 `inputs / outputs / checks` 做任务化细化
- 补充 `dependencies / fallbackPolicy / riskNotes`

### 必须保留
- `skeletonRef = { skeletonId, skeletonVersion }`
- `StepPlan@v -> PromptDraft@v` 绑定
- Skeleton 关键检查点语义不可无痕抹除
- 锁定后不得无痕改写，变更只能新修订

## 5.5 最少追溯锚点模型
- `taskRef`
- `PromptDraft(id, version)`
- `StepPlan(id, version)`
- `Approval(approvedPackageRef)`
- `Run(consumedPlanRef@v, consumedPromptRef@v, approvalRef)`
- `skeletonRef(id + version)`
- `status / owner / updatedAt`

## 5.6 锁定与版本一致性规则
- 提交进入锁定态后，引用与版本不可被静默覆盖
- 审批通过包（PromptDraft@v + StepPlan@v）是执行消费的唯一对齐基准
- 历史版本可回看、可审计
- `Deprecated / Archived` 只影响新任务应用资格，不破坏历史追溯
- 无版本引用 / 版本漂移 / 锁定后改写应按硬冲突处理

## 5.7 冲突分级与处置口径
- 阻断：无版本引用、版本漂移、锁定后改写、状态越权应用
- 告警：非关键字段漂移、上下文补充不足
- 回看解释：失败样本、历史版本回跳、未覆盖范围说明

## 5.8 第一批纳入与排除清单
### 第一批纳入
- Apply → Adjust → Lock → Trace 最小动作链
- `Ready` 才可新应用、关键引用强制版本化
- `StepPlan -> PromptDraft` 与 `StepPlan -> skeletonRef@v` 合规校核
- `Approval` 与 `Run` 版本一致性校核
- 三分状态口径 + 证据锚点 / 覆盖边界模板

### 暂不纳入
- 自动推荐、智能标签 / 分类、质量评分、自动优化
- 自动一致性修复、执行复盘自动反哺 Skeleton
- 跨任务 / 跨项目复杂血缘图谱与深度影响分析
- 复杂审批分层策略、运营级全链联动看板

## 5.9 状态与证据表述模板
- 统一使用：`已实现 / 已验证 / 未验证`
- 每条结论必须附证据锚点与覆盖边界