# SkillForge B5 资产域标准对象清单与边界说明（v1）

## 5.1 目标与守门范围
本文只定义 B5 知识与资产管理标准化的对象层收敛，不扩展到智能推荐、自动优化、复杂治理图谱或执行自动反哺机制。

## 5.2 资产域标准对象清单（第一批）
### Skeleton@version
- 最小字段：`id / name / version / purpose / goalPattern / stages[] / status / owner / updatedAt`
- `stages[]` 最小约束：至少 1 个 stage，且至少包含 `stageId / title / intent / checkpoints[] / order`
- 状态集：`Draft / Ready / Deprecated / Archived`

## 5.3 跨域引用契约
- `skeletonRef(id + version)`
- 所有关键引用必须带版本
- 锁定后不得无痕改写，只能新修订
- 仅 `Ready` 状态 Skeleton 可被新任务应用

## 5.4 与编排域边界说明
- 资产域：沉淀可复用结构方法（Skeleton），强调治理态与版本治理
- 编排域：任务实例对象（PromptDraft@v / StepPlan@v），强调任务上下文下的形成、提交、锁定、审批衔接
- Skeleton 不能承载任务执行事实
- StepPlan 不能被描述为资产模板本体

## 5.5 与证据域边界说明
- 证据链主路径仍是：`Run -> Approval -> StepPlan@v -> PromptDraft@v -> Task`
- Skeleton 在证据链中仅作为可选 / 受控引用锚点：`StepPlan@v -> skeletonRef(id + version)`
- Skeleton 不替代审批 / 执行事实对象

## 5.6 第一批可见性清单
### 资产侧必须可见
- `name / purpose / version / status / owner / updatedAt`
- `stages[]` 摘要（`title / intent / checkpoints` 数）

### 编排侧必须可见
- `skeletonRef(skeletonId + skeletonVersion)`
- 来源 Skeleton 版本已绑定 / 已锁定提示

### 证据侧必须可见
- 可核对 StepPlan 使用的 `skeletonRef` 与版本

## 5.7 首批排除清单与禁用表述
- 不纳入质量评分对象、推荐策略对象、自动优化对象
- 不纳入跨任务 / 跨项目深治理对象与复杂图谱血缘对象
- 不纳入执行复盘自动反哺 Skeleton 的自动化对象机制
- 不把 Approval / Run 并入资产对象层
- 继续强制区分：`已实现 / 已验证 / 未验证`