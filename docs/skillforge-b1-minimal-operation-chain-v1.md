# SkillForge B1 PromptDraft / StepPlan 最小操作链（v1）

## 1. 范围与边界
本稿只定义 B1 第一条最低闭环：在单任务上下文中，让 PromptDraft / StepPlan 形成可编辑、可提交、可进入审批前检查的基础操作链。

不包含自动生成、复杂编排器、跨任务智能推荐、Skeleton 深能力与跨域深联动。

## 2. 单任务对象前提
- PromptDraft 与 StepPlan 都必须绑定同一 `taskRef`。
- StepPlan 必须关联明确的 `promptDraftRef` 版本。
- 主干顺序固定为：`PromptDraft → StepPlan → Approval → Run`。

## 3. PromptDraft 最小操作链
1. 绑定任务：设置 `taskRef`
2. 补齐核心语义：`goal`、`constraints`、`acceptanceCriteria`
3. 补充上下文与假设：`context`、`inputAssumptions`
4. 落位最小风险提示：`riskHints`
5. 记录追溯字段：`version`、`updatedAt`、`owner`
6. 进入 `ReadyForPlan`

## 4. StepPlan 最小操作链
1. 绑定来源：设置 `promptDraftRef`
2. 目标对齐：填写 `objective`
3. 建立最小步骤集：每步至少具备 `title + intent + inputs + outputs + checks + order`
4. 补基础风险与兜底：`riskNotes`、`fallbackPolicy`
5. 表达必要依赖：`dependencies`
6. 记录追溯字段：`version`、`updatedAt`、`owner`
7. 进入 `ReadyForApproval`

## 5. 两者衔接与门禁
- StepPlan 不得偏离 PromptDraft 的 `goal / constraints / acceptanceCriteria`。
- PromptDraft 关键字段变更后，关联 StepPlan 应进入“待同步确认”语义。
- 进入审批时，采用“PromptDraft + StepPlan 提交包”。
- 任一对象未达可提交态，都不得进入审批。

## 6. 提交前最低检查清单
### 完整性检查
- PromptDraft：`goal / constraints / acceptanceCriteria` 齐备
- StepPlan：最小步骤闭环字段齐备

### 一致性检查
- StepPlan `objective / steps / checks` 不与 PromptDraft 语义冲突

### 来源检查
- StepPlan 已绑定明确 PromptDraft 版本

### 状态检查
- PromptDraft 已 `ReadyForPlan`
- StepPlan 已 `ReadyForApproval`

### 变更检查
- 锁定前不存在未同步的关键字段改动

### 可追溯检查
- `owner / version / updatedAt / taskRef` 完整

## 7. 首批不纳入项
- 自动 prompt 生成
- 自动步骤拆解
- 自动策略优化
- 复杂可视化编排器
- 批量编排 / 跨任务智能推荐
- Skeleton 评分推荐与深度效果反馈自动闭环
- 复杂审批策略引擎细则
- 跨域深联动与规模化复用承诺

## 8. 状态口径标注
- 本稿定义的是 B1 第一条最低闭环的对象操作链与门禁要求。
- 对外表述仍须区分：已实现 / 已验证 / 未验证。
- 不得把本操作链文档的存在直接表述为“B1 全链路工作台已完成验证”。
