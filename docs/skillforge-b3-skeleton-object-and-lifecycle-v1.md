# SkillForge B3 Skeleton 最小对象与状态语义说明（v1）

## 1. 对象定位与边界
Skeleton 是跨任务复用的结构骨架，不是任务实例，也不是执行记录。本文只定义 B3 原型所需的最小对象模型与生命周期语义，不扩展到评分、推荐、自动优化或复杂资产治理。

## 2. 最小对象模型
### 必填字段
- `id`
- `name`
- `version`
- `purpose`
- `goalPattern`
- `stages[]`
- `status`
- `owner`
- `updatedAt`

### `stages[]` 最小约束
- 至少 1 个 stage
- 每个 stage 至少包含：
  - `stageId`
  - `title`
  - `intent`
  - `checkpoints[]`
  - `order`

### 推荐但首批不阻塞字段
- `expectedArtifacts[]`
- `globalConstraints`
- `applicationHints`

## 3. 生命周期与状态语义
### 最小状态集
- `Draft`：可编辑，不可作为新 StepPlan 的正式来源
- `Ready`：可应用状态；仅该状态可被新任务 Apply
- `Deprecated`：不建议新用，但历史引用继续可追溯
- `Archived`：归档冻结，退出常规应用视图

### 最小流转链
`Draft → Ready → Deprecated → Archived`

### 硬规则
- 这是资产治理态，不是 Run 执行态。
- 生命周期变化不得自动改写既有已锁定 / 已审批 StepPlan。
- 不得把“对象已建”写成“业务闭环已验证”。

## 4. 与 StepPlan 映射与追溯约束
- `goalPattern → objective`
- `stages → steps`
- `intent / checkpoints / expectedArtifacts` 对应 StepPlan 结构语义
- StepPlan 必须保留 `skeletonRef(id + version)`
- 提交审批前应明确 Skeleton 来源版本已绑定 / 已锁定

## 5. 原型界面可见性清单
### Skeleton 侧必须可见
- `name`
- `purpose`
- `version`
- `status`
- `owner`
- `updatedAt`
- `stages[]` 摘要（`title / intent / checkpoints` 数）

### 编排侧必须可见
- `skeletonRef(skeletonId + skeletonVersion)`
- “来源 Skeleton 版本已绑定 / 已锁定”提示

## 6. 第一批纳入 / 排除清单
### 第一批纳入
- 最小对象字段
- 四态生命周期
- `Skeleton → StepPlan` 最小映射语义
- `skeletonRef` 绑定与追溯可见

### 首批排除
- 质量评分
- 智能推荐
- 自动优化
- 复杂治理态（如 ReviewPending、QualityScored、AutoOptimized）
- 跨项目深治理

## 7. 对外叙事与验收口径附注
- 使用“定义闭环 / 对象层可用 / 原型层可见”这类限定词。
- 不得把本对象模型文档的存在直接表述为“Skeleton 库全链路业务验证完成”。