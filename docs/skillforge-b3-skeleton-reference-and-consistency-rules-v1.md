# SkillForge B3 Skeleton 引用锚点与一致性检查说明（v1）

## 5.1 目标与边界
本文只定义 B3 Skeleton 原型所需的最小引用锚点与一致性治理，不承诺智能化能力、质量评分或复杂规则引擎。

## 5.2 术语与对象锚点清单
### Skeleton 资产锚点
- `skeletonId`
- `skeletonVersion`
- `status`
- `updatedAt`
- `owner`

### Skeleton 结构锚点
- `goalPattern`
- `stages[].stageId / order / title / intent / checkpoints`

### 编排绑定锚点
- `skeletonRef = { skeletonId, skeletonVersion }`
- `promptDraftRef(version)`
- `taskRef`
- `StepPlan(id, version, status, updatedAt, owner)`

## 5.3 引用锚点最小规则
- Skeleton 引用必须是明确版本，禁止只按名称引用。
- 只有 `Ready` 状态的 Skeleton 可 Apply。
- 锁定后不得无痕改写引用版本，只能新修订。
- 必须可回链到 Approval / Run 的版本消费关系。

## 5.4 一致性检查矩阵
### Skeleton ↔ StepPlan
- `goalPattern` 与 `StepPlan.objective` 不冲突
- `stages[]` 到 `steps[]` 的核心语义不丢失
- 允许裁剪 / 重排 / 增补，但不得无痕抹除关键检查点语义

### Skeleton ↔ PromptDraft
- Skeleton 导出的 objective / steps 不得与 PromptDraft 的 `goal / constraints / acceptanceCriteria` 冲突

### PromptDraft ↔ StepPlan
- 若 PromptDraft 关键字段变更，需触发“待同步确认”，禁止直接锁定

## 5.5 检查分层
### Apply 即时检查
- Skeleton 是否 `Ready`
- 是否选择了明确 `skeletonId + skeletonVersion`
- 最小映射是否已生成
- `skeletonRef` 是否已写入并可见

### Lock / Submit 阻断检查
- PromptDraft / StepPlan / Skeleton 三方语义冲突检查
- PromptDraft 关键字段变更后的同步确认检查
- `taskRef / promptDraftRef@v / skeletonRef@v / owner / updatedAt / version` 完整性检查
- 若存在版本漂移或未走新修订，则阻断提交

## 5.6 第一批纳入与排除
### 第一批纳入
- `skeletonRef(id+version)` 强制保留
- 仅 `Ready` Skeleton 可 Apply
- Apply 与 Lock 分层检查
- 最小一致性冲突检测
- 锁定后引用版本不可无痕改写

### 暂不纳入
- 质量评分、智能推荐、自动优化、自动编排
- 自动判定“高质量计划”
- 基于执行复盘自动反哺 Skeleton
- 跨项目 / 跨域深治理与大规模血缘分析

## 5.7 状态口径与验收表述
- 必须继续区分：`已实现 / 已验证 / 未验证`
- 对外表述必须说明是对象层、门禁层还是回看层，不得把治理规则定义直接写成“B3 全链路验证完成”。