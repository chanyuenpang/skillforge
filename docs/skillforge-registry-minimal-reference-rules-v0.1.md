# SkillForge Registry 最小引用规则 v0.1

## 1. 目的与范围
本文档用于定义阶段 A 所需的 Registry 最小引用规则，目标是为 SkillForge 核心对象建立统一的身份、引用、版本与门禁约束，确保后续阶段的编排、审批、执行与登记可追溯。

本稿仅覆盖产品 / 领域规则，不进入实现设计，不扩展跨域自动联动能力。

## 2. Registry 角色定位与非目标
### 2.1 角色定位
- Registry 是通过治理门控后进入可检索、可分发、可追溯的资产登记层。
- Registry 是可复用交付的起点，不是所有运行对象的收纳区。
- Registry 承担身份与引用治理职责，不替代 PromptDraft / StepPlan / Skeleton / Run / Approval 的业务定义本体。

### 2.2 非目标
- 不定义复杂关系图查询能力。
- 不定义智能推荐、自动匹配、自动优化策略。
- 不定义跨域自动回写或自动升级引用。
- 不定义 API、存储、权限细粒度、同步机制等实现细节。

## 3. 核心对象清单与命名
- `Task`
- `Task Prompt Spec / PromptDraft`
- `StepPlan`
- `Skeleton`
- `Run`
- `Approval`
- `RegistryEntry`

命名约束：
- `Task Prompt Spec` 表示规范态；`PromptDraft` 表示编辑态。
- `Skeleton` 为主名；`Workflow Skeleton / Plan Template` 仅作别名说明。
- `Run` 为主名；`ExecutionRun` 仅作实现层命名。

## 4. 最小引用关系矩阵
### 4.1 主干引用链
- `Task → PromptDraft(version)`
- `Task → StepPlan(version)`
- `StepPlan(version) → PromptDraft(version)`
- `StepPlan(version) → Skeleton(version)`（若使用骨架）
- `StepPlan(ApprovedForRun) → Run`
- `Run → ApprovalDecision / ApprovalRequest`
- `Run / StepPlan / Skeleton → RegistryEntry`（仅对通过门控、需复用 / 可追溯对象）

### 4.2 规则说明
- 引用顺序遵循：**编排在前、审批在中、执行在后、登记在末**。
- 不引入跨域自动回写：下游事实不自动重写上游对象。

## 5. 唯一性规则
以下对象必须具备唯一且不可歧义的身份标识：
- `Task id`
- `PromptDraft id`
- `StepPlan id`
- `Skeleton id`
- `Run id`
- `Approval id`
- `RegistryEntry id`

唯一性约束：
- Registry 记录时必须能唯一定位“登记的是哪个对象实例 / 版本”。
- 不允许仅以名称或自然语言描述替代对象标识。
- 同名对象存在时，必须通过 id + 版本消除歧义。

## 6. 版本化规则
### 6.1 必须带版本的引用
- `StepPlan → PromptDraft` 必须带 PromptDraft 版本。
- `StepPlan → Skeleton` 必须带 `skeletonId + skeletonVersion`。
- `Run` 只能绑定 `ApprovedForRun` 的 StepPlan 版本。
- Skeleton 的应用必须指向明确版本，不允许仅按名称引用。

### 6.2 变更一致性语义
- 上游关键字段变化后，下游对象进入“待同步确认 / 待重核”语义状态，不自动认定持续有效。
- 版本变更不得自动改写已批准 / 已执行对象，必须保留历史可追溯性。

## 7. 门禁与状态约束
- 只有满足前置门禁的对象才能进入后续引用链。
- 未通过审批（或需审批但未决）的 StepPlan 不得进入 Run。
- Registry 只登记通过治理门控、具备复用或追溯价值的对象。
- 已批准或已执行对象的历史引用不得被隐式改写。

## 8. 阶段A边界声明
### 可写粒度
- Registry 的角色边界
- 核心对象最小引用关系表
- 唯一性规则与版本化规则
- 与审批 / 执行状态的最小门禁关系
- 术语一致性要求

### 禁止越界
- 不把定义存在写成全量验证完成
- 不引入跨域自动联动
- 不写复杂关系图、评分体系、跨项目治理机制
- 不写实现方案

## 9. 引用来源
- `docs/skillforge-stage-a-alignment-one-pager-v1.md`
- `docs/skillforge-run-center-domain-spec-v0.1.md`
- `docs/skillforge-knowledge-asset-domain-spec-v0.1.md`
- `docs/skillforge-roadmap-and-doc-governance-v1.md`
- `docs/skillforge-product-charter-v1.md`
- `docs/skillforge-web-ia-and-module-layering-v1.md`
