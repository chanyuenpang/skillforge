# SkillForge 知识与资产子域规范 v0.1（Skeleton）

## 1. 文档目标
本文档用于在阶段 A 内定稿「知识与资产」子域中 Skeleton 的最小领域规范（v0.1），回答三个核心问题：
- Skeleton 作为“结构化计划骨架”要解决什么问题；
- Skeleton 在对象层最小应包含哪些字段与约束；
- Skeleton 如何与运行中心 StepPlan 建立可追溯映射，支撑阶段 B 的“可编辑 / 可提交 / 可追溯”闭环。

本稿只覆盖产品 / 领域规则，不涉及接口、存储、算法、自动化生成等实现细节。

## 2. 子域范围
### In Scope（阶段 A）
- 定义 Skeleton 的领域定位：跨任务复用的结构化计划骨架（不是具体执行计划）。
- 给出 Skeleton 概念字段级定义与最小必填字段。
- 定义 Skeleton → StepPlan 的映射关系与一致性约束。
- 定义 Skeleton 的最小版本语义、应用语义、状态 / 生命周期。
- 明确与阶段 A / B 边界一致的治理口径。

### Out of Scope（阶段 A）
- 自动推荐 Skeleton、质量评分、场景智能匹配。
- 基于历史效果的自动优化与自动编排策略。
- 复杂可视化编辑器、批量应用、跨项目协同治理机制。
- 底层技术实现（API / DB / 权限细粒度 / 执行引擎耦合）。

## 3. 核心对象定义
### 3.1 Skeleton（结构化计划骨架）
定位：沉淀“可复用的方法结构”，用于在任务编排前 / 中辅助形成 StepPlan 初稿。
本质：模板化骨架，不是任务实例，不是运行记录。

概念字段：
- `id`：Skeleton 标识
- `name`：骨架名称
- `purpose`：适用目的 / 任务类型说明
- `goalPattern`：目标范式
- `stages[]`：阶段集合，每阶段含：
  - `stageId`
  - `title`
  - `intent`
  - `checkpoints[]`
  - `expectedArtifacts[]`
  - `order`
- `globalConstraints`：全局约束
- `applicationHints`：应用提示
- `version`：版本号
- `status`：状态
- `owner`：维护责任人
- `updatedAt`：最近更新时间

### 3.2 最小必填字段（阶段 A）
- `id`
- `name`
- `purpose`
- `stages[]`（至少 1 个阶段）
- 每个 `stage` 的 `title`、`intent`、`checkpoints[]`（至少 1 项）
- `version`
- `status`
- `owner`
- `updatedAt`

说明：`expectedArtifacts`、`globalConstraints`、`applicationHints` 在阶段 A 为推荐必填，但不强制阻塞录入。

### 3.3 规则要点
- Skeleton 只能表达“结构与方法”，不能伪装成“具体任务执行事实”。
- Skeleton 必须支持版本化引用，避免“同名不同义”。
- Skeleton 与知识资产导航名解耦：对象名为 Skeleton，模块名为知识与资产。

## 4. 与 StepPlan 的映射关系
### 4.1 映射定位
- Skeleton 是 StepPlan 的结构来源之一（可选但受控）。
- StepPlan 是任务实例级执行计划；Skeleton 是跨任务复用骨架。

### 4.2 基本映射单元
- `Skeleton.goalPattern` → `StepPlan.objective`
- `Skeleton.stages[]` → `StepPlan.steps[]`
- `stage.intent` → `step.intent`
- `stage.checkpoints[]` → `step.checks`
- `stage.expectedArtifacts[]` → `step.outputs`
- `globalConstraints` → StepPlan 的约束输入来源之一

### 4.3 映射约束
- StepPlan 必须保留 `skeletonRef`（含 skeletonId + skeletonVersion）以实现追溯。
- StepPlan 不得与关联 PromptDraft 的 `goal / constraints / acceptanceCriteria` 语义冲突。
- Skeleton 生成的是“初始结构”，任务级可裁剪 / 增补，但应保留关键检查点语义。
- Skeleton 版本变更后，不自动改写已批准或已执行的 StepPlan。

## 5. 版本与应用语义
### 5.1 版本语义（Skeleton）
- `major.minor`
  - `major`：结构语义发生不兼容变更
  - `minor`：兼容性增强
- 应用必须指向明确版本，不允许仅引用名称。

### 5.2 应用语义
- **Apply**：以某版本 Skeleton 生成 StepPlan 初稿。
- **Adjust**：在任务上下文下对初稿做人工修订。
- **Lock**：进入审批前，StepPlan 固化其 `skeletonRef` 与当前计划版本。
- **Trace**：执行 / 复盘时可回看“该任务使用了哪个 Skeleton 版本”。

## 6. 最小状态 / 生命周期
- `Draft`
- `Ready`
- `Deprecated`
- `Archived`

最小流转：
`Draft → Ready → Deprecated → Archived`

最小生命周期语义：
- 仅 `Ready` 可被新 StepPlan 应用。
- `Deprecated` 不影响历史任务追溯与回放。
- 生命周期是资产治理语义，不等同运行态。

## 7. 非目标
- 不定义 Skeleton 自动生成 StepPlan 的算法与质量判分。
- 不定义 Skeleton 推荐、排序、智能匹配策略。
- 不定义执行效果自动反哺并自动改写 Skeleton。
- 不把“已有对象定义”表述为“已完成全链路产品化验证”。
- 不跨越阶段 A / B 边界承诺阶段 D 能力。
