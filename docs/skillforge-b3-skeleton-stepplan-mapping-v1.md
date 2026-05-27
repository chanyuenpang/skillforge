# SkillForge B3 Skeleton → StepPlan 映射链路说明（v1）

## 1. 目标与边界
本文只定义 B3 的 Skeleton → StepPlan 最小可治理链路，不扩展到智能推荐、自动优化或复杂编排器。

## 2. 主链位置
在 B2 的 `PromptDraft → StepPlan → Approval → Run` 主链中，插入 Skeleton 的 `Apply → Adjust → Lock → Trace` 语义：
- Apply：按明确版本选择并应用 Skeleton
- Adjust：任务内人工修订 StepPlan
- Lock：提交审批前锁定 `skeletonRef`
- Trace：审批 / 执行回看可追溯 Skeleton 来源版本

## 3. 最小动作链
1. 选择 Skeleton（仅 `Ready`）
2. 指定 Skeleton 版本并应用到 StepPlan 初稿
3. 人工调整 StepPlan
4. 提交前检查 Skeleton 来源与 PromptDraft 一致性
5. 提交并锁定（冻结 `skeletonRef` 与计划版本）
6. 在审批 / 运行回链中可追溯来源版本

## 4. 字段映射表
- `goalPattern` → `StepPlan.objective`
- `stages[]` → `StepPlan.steps[]`
- `stage.intent` → `step.intent`
- `stage.checkpoints[]` → `step.checks`
- `stage.expectedArtifacts[]` → `step.outputs`
- `globalConstraints` → StepPlan 约束输入来源之一

### 必须保留的来源字段
- `skeletonRef = { skeletonId, skeletonVersion }`
- 可附带 `skeletonName` 仅作展示，不替代版本绑定

## 5. 锁定与追溯规则
- 仅允许按明确版本应用 Skeleton，不允许只按名称引用。
- 锁定后不得覆写已锁定版本，只能走新修订。
- Skeleton 生命周期变更不得自动改写历史已锁定 / 已审批 StepPlan。
- 审批 / 执行回看必须能看到 Skeleton 来源版本。

## 6. 可调整与不可突破边界
### 允许任务内调整
- StepPlan 步骤裁剪、增补、重排
- 补充 `dependencies / fallbackPolicy / riskNotes`
- 对 step 的 inputs / outputs / checks 做任务化细化

### 必须保留
- `skeletonRef(id + version)`
- Skeleton 关键检查点语义不可无痕抹除
- PromptDraft 关键字段变更后，需同步确认方可提交锁定

## 7. 第一批范围清单
### 第一批纳入
- Ready Skeleton 的版本化选择与应用
- `Skeleton → StepPlan` 最小映射
- `skeletonRef` 绑定、提交前可见、锁定后可追溯
- 与 B2 门禁拼接：完整性 / 一致性 / 来源 / 状态 / 变更 / 可追溯

### 暂不纳入
- 智能推荐、质量评分、自动优化、自动编排
- 基于执行复盘自动反哺 Skeleton
- 复杂可视化编排器、批量应用、跨项目深治理
- “自动生成高质量计划、基本不需人工”类表述

## 8. 状态口径与验收措辞
- 必须继续区分：`已实现 / 已验证 / 未验证`
- 不得把映射链路定义文档的存在直接表述为“Skeleton 库业务验证完成”。