# SkillForge B2 任务编排独立入口与对象分区说明（v1）

## A. 入口定位与边界声明
任务编排需要独立入口，而不是继续挂在 run 详情附属区。原因很简单：Run 是执行事实与回看对象，PromptDraft / StepPlan 是执行前编排对象；若继续混在 run 详情里，会把“计划形成”和“执行结果”压成同一语义层，弱化对象边界。

本文只覆盖 B2 的独立入口与对象分区边界，不承诺 B3 / B4 的深能力。

## B. IA 落点与层级定义
### L1
- 运行中心（保持现有一级导航）

### L2
- 任务编排入口（运行中心内独立路径）

### L3 最小功能区块
1. 编排对象区：PromptDraft / StepPlan 当前版本与状态
2. 提交检查区：完整性 / 一致性 / 来源 / 状态 / 变更 / 可追溯摘要
3. 提交与锁定区：Ready → LockedForApproval 的确认语义
4. 版本绑定区：审批获准版本与执行入口绑定提示
5. 回链区：到 Approval 与 Run 的稳定回跳

## C. 对象分区说明
### PromptDraft 区
- 聚焦 goal / context / constraints / acceptanceCriteria 等任务规范化语义
- 状态重点：`Draft / ReadyForPlan / LockedForApproval`

### StepPlan 区
- 聚焦 steps 的最小闭环语义（输入、意图、输出、检查点）与依赖关系
- 必须绑定 PromptDraft 版本来源
- 状态重点：`Draft / ReadyForApproval / LockedForApproval / ApprovedForRun`

### 对象关系提示带
- 明确 `PromptDraft(版本) -> StepPlan(版本)` 关联
- 当 PromptDraft 关键字段变更时，StepPlan 进入“待同步确认”语义

## D. 主链衔接口径
- 主链固定为：`PromptDraft → StepPlan → Approval → Run`
- 编排区只负责“形成并提交包”
- Approval / Run 作为后续阶段入口与回看引用，不反向自动改写编排对象

## E. 第一批纳入与排除清单
### 纳入
- 运行中心内任务编排独立入口定义
- PromptDraft / StepPlan 对象级分区与版本锚点展示
- 提交前检查摘要与锁定语义位置
- 审批获准版本与执行入口绑定提示
- Task ↔ PromptDraft ↔ StepPlan ↔ Approval ↔ Run 最小可见链路

### 暂不纳入
- 自动 prompt 生成、自动步骤拆解、自动策略优化
- 复杂可视化编排器、批量编排、跨任务智能推荐
- Skeleton 深能力、评分推荐、跨域深联动自动化
- 把代码已实现 / 空数据闭环写成业务 happy path 全量验证

## F. 状态口径与证据锚点
- 必须区分：`已实现 / 已验证 / 未验证`
- 证据锚点：
  - `docs/skillforge-run-center-domain-spec-v0.1.md`
  - `docs/skillforge-web-ia-and-module-layering-v1.md`
  - `docs/skillforge-b1-first-batch-workbench-actions-v1.md`
  - `docs/skillforge-b2-scope-and-guardrails-one-pager-v1.md`
