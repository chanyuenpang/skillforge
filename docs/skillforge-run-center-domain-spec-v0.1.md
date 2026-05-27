# SkillForge 运行中心子域规范 v0.1（PromptDraft / StepPlan）

## 1. 文档目标
本文档用于定义 SkillForge「运行中心」子域在阶段 A 的最小规则骨架，聚焦 PromptDraft 与 StepPlan 两个编排对象，明确其对象结构、关系，以及与 Approval / Run 的前后衔接。

目标是形成“可引用、可对齐、可追溯”的产品/领域层规范，支撑阶段 A 的定义收敛与最小闭环，不进入实现细节，不超前承诺阶段 B 之后能力。

## 2. 子域范围
### In Scope（阶段 A）
- 运行中心内的任务编排对象：PromptDraft、StepPlan。
- 两对象的最小结构定义（概念字段级）、约束语义、相互关系。
- 与审批（Approval）及执行（Run）的前后关系与门禁位置。
- 最小状态流转（仅覆盖“可编辑 → 可提交 → 待审批/可执行 → 执行后回看”主干）。

### Out of Scope（阶段 A）
- 自动 prompt 生成、自动步骤拆解、自动策略优化。
- 复杂可视化编排器、批量编排、跨任务智能推荐。
- Skeleton 资产库细则与质量评分。
- 技术实现、接口协议、存储模型、权限细粒度策略。

## 3. 核心对象定义
### 3.1 PromptDraft（编辑态任务说明对象）
定位：承接任务原始意图的结构化编辑载体，是执行前“任务规范化”的主对象。

概念字段：
- `id`：对象标识
- `taskRef`：所属任务标识（Task）
- `goal`：任务目标
- `context`：上下文（已知事实、输入背景、依赖信息）
- `constraints`：约束（时间、资源、权限、边界、禁止项）
- `acceptanceCriteria`：验收标准
- `inputAssumptions`：输入前提 / 假设
- `riskHints`：风险提示
- `owner`：当前维护责任人
- `version`：版本号 / 修订序号
- `status`：对象状态
- `updatedAt`：最近更新时间

规则要点：
- PromptDraft 是“编辑态”，不是最终执行事实。
- 必须可追溯到具体 Task。
- 验收标准为必备语义，避免仅有目标无完成定义。

### 3.2 StepPlan（步骤化执行计划对象）
定位：将 PromptDraft 落为可执行步骤序列，是执行前“计划结构化”的主对象。

概念字段：
- `id`：对象标识
- `taskRef`：所属任务标识（Task）
- `promptDraftRef`：来源 PromptDraft 标识（版本关联）
- `objective`：计划目标
- `steps[]`：步骤集合，每步含：
  - `stepId`
  - `title`
  - `intent`
  - `inputs`
  - `outputs`
  - `checks`
  - `riskNotes`
  - `order`
- `dependencies`：步骤间依赖关系
- `fallbackPolicy`：异常处理原则
- `owner`：当前维护责任人
- `version`：版本号 / 修订序号
- `status`：对象状态
- `updatedAt`：最近更新时间

规则要点：
- StepPlan 必须关联一个 PromptDraft 版本，不允许无来源计划。
- 步骤需具备“输入 - 动作意图 - 输出 - 检查点”最小闭环语义。
- StepPlan 属于执行前计划，不等同 Run 的执行日志。

## 4. 对象关系与流程主干
### 4.1 PromptDraft 与 StepPlan 的关系
- 关系类型：`1 : N（按版本演进）`
- 一个 PromptDraft（某版本）可派生一个或多个 StepPlan 草案版本。
- 一个 StepPlan 必须指向一个明确 PromptDraft 版本。

约束关系：
- StepPlan 的 `objective`、关键步骤与 PromptDraft 的 `goal / constraints / acceptanceCriteria` 不得语义冲突。
- PromptDraft 发生关键字段变更后，已关联 StepPlan 应进入“待同步确认”语义状态，而非自动视为有效。

### 4.2 与 Approval / Run 的前后关系
主干顺序固定为：
**PromptDraft（编排） → StepPlan（编排） → Approval（门禁） → Run（执行）**

- 审批对象可以是“任务编排提交包”（PromptDraft + StepPlan 组合视图）。
- 未通过审批（或需审批但未决）不得进入 Run。
- Run 消费的是“获准版本”的 StepPlan（及其关联 PromptDraft）。
- Run 结果只回写执行事实与证据，不反向自动改写 PromptDraft / StepPlan；如需改动，应新开修订版本。

## 5. 最小状态流转
### 5.1 PromptDraft
- `Draft`
- `ReadyForPlan`
- `LockedForApproval`
- `ApprovedForRun`
- `Superseded`

最小流转：
`Draft → ReadyForPlan → LockedForApproval → ApprovedForRun`

### 5.2 StepPlan
- `Draft`
- `ReadyForApproval`
- `LockedForApproval`
- `ApprovedForRun`
- `Executed`
- `Superseded`

最小流转：
`Draft → ReadyForApproval → LockedForApproval → ApprovedForRun → Executed`

### 5.3 联动约束
- 仅当 PromptDraft 与 StepPlan 均达到可提交态，才可进入审批。
- 任一对象进入锁定审批态后，不应发生无痕改写。
- Run 只能绑定 `ApprovedForRun` 的 StepPlan 版本。

## 6. 非目标
- 不定义自动生成 PromptDraft / StepPlan 的算法与质量评估模型。
- 不定义 Skeleton 到 StepPlan 的自动映射实现细节。
- 不定义审批策略引擎细节。
- 不定义运行执行器、日志模型、回放机制。
- 不把“对象定义存在”表述为“已完成全量交互与真实样本验证”。
