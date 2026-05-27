# SkillForge P2：最小真实执行主线产品面草案（v1）

## 1. 背景与定位
本文承接：
- `docs/skillforge-p0-phase5-acceptance-map-and-mainline-anchor-v1.md`
- `docs/skillforge-p1-minimal-real-object-chain-and-state-machine-draft-v1.md`
- `docs/skillforge-owner-decision-page-v2.md`

用于把第五阶段的“最小真实执行主线产品面”固定下来，明确：
- 用户如何在产品中完成一条真实任务链
- 运行中心、审批中心、知识资产层在本阶段的最小职责分工
- 产品面必须出现的最小页面/模块/视图

本文只做最小产品面设计：
- 不进入大而全平台蓝图
- 不提前承诺自动化、规模化、复杂图谱能力
- 不替代真实实现与验收本身

## 2. 第五阶段最小真实用户动作链

### 2.1 进入运行中心，创建或选择真实 Task
- 任务必须是非占位、具备真实目标与上下文的任务实例
- 这是整条主线的入口

### 2.2 编辑 PromptDraft
- 补齐：`goal / constraints / acceptanceCriteria`
- 目标是把任务意图转成可执行说明
- 状态主干：`Draft -> ReadyForPlan`

### 2.3 生成并编辑 StepPlan
- 每步至少具备：`input -> intent -> output -> check`
- 可选引用 `Skeleton@version`，并记录 `skeletonRef`
- 状态主干推进到：`ReadyForApproval / LockedForApproval`

### 2.4 提交审批中心
- 审批对象是：`PromptDraft@v + StepPlan@v` 的提交包
- `Pending / Rejected / NeedsMoreInfo` 均不得进入 Run

### 2.5 审批通过后发起 ExecutionRun
- Run 创建时固化：
  - `approvalRef`
  - `PromptDraft@v`
  - `StepPlan@v`
  - 如存在则固化 `Skeleton@v`

### 2.6 执行过程回看
- 至少可看到：
  - Run 状态
  - 结果摘要
  - 证据锚点（log / transcript / refs）

### 2.7 完成 Retro 并给出回沉决策
- Retro 必须 `Finalized`
- 必须给出三分结论之一：
  - `可回沉`
  - `暂不回沉`
  - `需补证据`
- 同时必须写：
  - 覆盖范围
  - 未覆盖范围
  - 证据锚点

### 2.8 查看 Skeleton 追溯关系
- 至少可看到：
  - 本次任务使用了哪个 `Skeleton@v`
  - Retro 是否形成回沉建议
- 不要求自动回写

## 3. 第五阶段最小职责分工

### 3.1 运行中心（主工作台）
负责：
- Task 上下文承接
- PromptDraft 编辑
- StepPlan 编辑
- 提交审批
- Run 回看
- Retro 录入入口

不负责：
- 审批策略决策本身
- Skeleton 自动推荐

本阶段最小目标：
> 把“可编辑 -> 可提交 -> 可回看”做实。

### 3.2 审批中心（硬门禁）
负责：
- 对提交包给出：`Pending / Approved / Rejected / NeedsMoreInfo`
- 阻断未批执行
- 沉淀审计可追溯记录

不负责：
- 执行编排内容编辑

本阶段最小目标：
> 证明“未批不跑、批后可跑”。

### 3.3 知识资产层（Skeleton）
负责：
- Skeleton 版本化存储
- 被 StepPlan 引用
- 执行后可追溯到使用版本
- 承接 Retro 回沉建议入口

不负责：
- 自动回写
- 自动优化
- 自动推荐

本阶段最小目标：
> 至少一次真实应用 + 可追溯闭环。

## 4. 最小产品面必须出现的页面 / 模块 / 视图

### 4.1 任务工作台页（运行中心）
最小组成：
- 任务选择 / 创建区
- PromptDraft 编辑区
- StepPlan 编辑区
- 提交审批按钮
- 锁定态提示

### 4.2 审批决策视图（审批中心）
最小组成：
- 提交包版本引用展示
- 审批状态
- 审批动作：`Approve / Reject / NeedInfo`
- 门禁结果反馈（是否可启动 Run）

### 4.3 执行运行视图（Run 详情）
最小组成：
- Run 状态时间线
- 结果摘要
- 证据锚点列表

### 4.4 复盘视图（Retro）
最小组成：
- 三分结论选择
- 覆盖范围 / 未覆盖范围
- 证据锚点引用
- Skeleton 回沉建议入口（仅建议，不自动写回）

### 4.5 Skeleton 引用与追溯小视图
最小组成：
- `skeletonId + version`
- 查看该 Run / Retro 的关联关系

说明：
- 该视图可以嵌入，不必独立成大页
- 第五阶段只要求最小追溯，不要求复杂资产导航系统

## 5. 继续冻结项（P2 禁承诺表）
以下内容在 P2 继续冻结，不得混入产品面完成态：
- 自动回写（含 Skeleton 自动回写）
- 自动优化 / 自动步骤重排
- 自动根因诊断
- 自动修复 / 自动回滚 / 自动一致性修复
- 自动推荐联动（含高阶 Skeleton 推荐）
- 复杂血缘图谱 / 深度影响分析
- 跨项目规模化知识回流 / 复杂联动看板
- “长周期稳定性已成熟”叙事

允许口径：
- 候选能力
- 条件评估中
- 需补证
- 未验证

## 6. 对后续 P3 与实现层的接口约束
- P3 只能围绕本文定义的最小动作链与模块责任补最小真实证据链与回归验收基线
- 后续实现层必须围绕本文列出的最小页面/模块推进，不得先扩展复杂看板或自动化能力
- 文档回写继续保持跟随式，不得反向代替产品面验收

## 7. 主要依据文档
- `docs/skillforge-p0-phase5-acceptance-map-and-mainline-anchor-v1.md`
- `docs/skillforge-p1-minimal-real-object-chain-and-state-machine-draft-v1.md`
- `docs/skillforge-owner-decision-page-v2.md`
- `docs/skillforge-run-center-domain-spec-v0.1.md`
- `docs/skillforge-knowledge-asset-domain-spec-v0.1.md`
- `docs/skillforge-roadmap-and-doc-governance-v1.md`
- `docs/skillforge-d4-execution-mainline-and-doc-linkage-prep-v1.md`