# SkillForge B5 元数据、标签、版本与状态标准基线（v1）

## 5.1 目标与边界守门
本文只定义 B5 知识与资产管理标准化的最小规则层，不扩展到智能标签、自动分类、推荐排序或复杂治理引擎。

## 5.2 术语与对象分层
- 资产域：`Skeleton@version`
- 编排域：`PromptDraft@version / StepPlan@version`
- 证据域：`Task / Approval / Run`
- 禁止把资产治理态与运行执行态混写

## 5.3 元数据最小统一字段表
### 通用最小锚点
- `id`
- `version`
- `status`
- `owner`
- `updatedAt`

### Skeleton 最小字段
- `name / purpose / goalPattern / stages[]`
- `stages[]` 最小语义单元：`stageId / title / intent / checkpoints[] / order`

### 跨域追溯最小引用字段
- `skeletonRef(skeletonId + skeletonVersion)`
- `promptDraftRef@version / taskRef / approvalRef / consumedPlanRef / consumedPromptRef`

## 5.4 标签最小维度与使用规则
### 状态口径标签
- `已实现 / 已验证 / 未验证`

### 对象类型标签
- `资产对象`
- `编排对象`
- `证据对象`

### 生命周期标签
- `Draft / Ready / Deprecated / Archived`

### 版本绑定标签
- `已绑定版本 / 未绑定版本`
- `已锁定引用 / 未锁定引用`

### 覆盖边界标签
- `覆盖范围`
- `未覆盖范围`

## 5.5 版本与状态语义规则
- 所有关键对象与关键引用必须带 `@version`
- 锁定后不得无痕改写，只能新修订版本
- Skeleton 应用必须指向明确版本，不允许仅名称引用
- 仅 `Ready` 可被新任务 Apply
- `Deprecated` 不影响历史追溯，`Archived` 为归档冻结
- `已实现 ≠ 已验证`
- 每条“已验证”都必须附证据锚点与覆盖边界

## 5.6 第一批纳入与排除清单
### 第一批纳入
- `id / version / status / owner / updatedAt`
- Skeleton 最小字段与 `stages[]` 约束
- `skeletonRef(id + version)` 与版本锁定语义
- 四态生命周期
- 三分法：`已实现 / 已验证 / 未验证`

### 暂不纳入
- 智能标签、自动分类、推荐排序
- 质量评分、自动优化、自动反哺 Skeleton
- 跨任务 / 跨项目复杂治理图谱与自动血缘推断
- 复杂审批分层策略与深度影响分析引擎

## 5.7 验收与失败回退口径
### 通过条件
- 有版本锚点
- 有证据锚点
- 有覆盖边界
- 无越界表述

### 回退动作
- 降级为 `未验证 / 后续阶段候选`
- 补充边界说明