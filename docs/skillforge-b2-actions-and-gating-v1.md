# SkillForge B2 编排最小动作集与提交门禁说明（v1）

## A. 文档目的与边界
本文只定义 B2 独立路径中的最小动作面与提交门禁，不覆盖自动化、复杂编排器、Skeleton 深能力与跨域深联动。

## B. 最小动作清单（按用户路径顺序）
1. 进入任务编排独立入口
2. 选择 / 创建 `PromptDraft` 并绑定 `taskRef`
3. 补齐并确认 PromptDraft 最小必备语义
4. 将 PromptDraft 置为 `ReadyForPlan`
5. 基于指定 `PromptDraft(version)` 选择 / 创建 `StepPlan`
6. 补齐 StepPlan 最小闭环步骤语义
7. 将 StepPlan 置为 `ReadyForApproval`
8. 触发提交前检查摘要并查看结果
9. 执行“提交并锁定”进入 `LockedForApproval`
10. 查看审批获准版本与执行入口绑定提示
11. 使用回链跳转至 Approval / Run

## C. 动作归属矩阵
### PromptDraft 动作
- 绑定任务（`taskRef`）
- 编辑 `goal / context / constraints / acceptanceCriteria / inputAssumptions / riskHints`
- 维护 `owner / version / updatedAt`
- 状态推进：`Draft -> ReadyForPlan`

### StepPlan 动作
- 绑定来源 `promptDraftRef(version)`
- 编辑 `objective + steps[]`
- 补充 `dependencies / fallbackPolicy / riskNotes`
- 维护 `owner / version / updatedAt`
- 状态推进：`Draft -> ReadyForApproval`

### 跨对象提交包动作
- 运行提交前检查摘要
- 提交并锁定为审批对象
- 展示版本绑定与 Approval / Run 回链信息

## D. 提交门禁最小集
### 完整性门禁
- PromptDraft：`goal / constraints / acceptanceCriteria` 齐备
- StepPlan：`intent / inputs / outputs / checks / order` 齐备

### 一致性门禁
- StepPlan `objective / steps / checks` 不得与 PromptDraft 语义冲突

### 来源门禁
- StepPlan 必须绑定明确 `PromptDraft(version)`

### 状态门禁
- PromptDraft 至少为 `ReadyForPlan`
- StepPlan 至少为 `ReadyForApproval`

### 变更门禁
- 锁定前不得存在 PromptDraft 关键字段已变更但 StepPlan 未同步确认的情况

### 可追溯门禁
- `taskRef / owner / version / updatedAt` 完整可见

## E. 关键状态动作语义
### LockedForApproval
- 表现为只读保护，禁止无痕编辑
- 如需改动，应发起新修订版本，而不是覆写锁定版本

### 未 Ready
- 提交按钮不可执行
- 必须先补齐字段、修正一致性或补追溯信息

### 待同步确认
- 当 PromptDraft 关键字段变更后触发
- 禁止直接提交锁定，要求先完成同步确认

## F. B2 第一批排除动作清单
- 自动 prompt 生成
- 自动步骤拆解 / 自动策略优化
- 复杂可视化编排器
- 批量编排 / 跨任务智能推荐
- Skeleton 深能力相关动作
- 跨域深联动自动化动作
- 复杂审批策略引擎配置类动作

## G. 对外口径附注
必须区分：`已实现 / 已验证 / 未验证`。
不得把路径定义、动作清单或门禁规则的存在，直接表述为“B2 编排能力已完成验证”。