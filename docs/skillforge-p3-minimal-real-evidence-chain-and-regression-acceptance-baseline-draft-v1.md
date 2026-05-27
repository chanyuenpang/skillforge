# SkillForge P3：最小真实证据链与回归验收基线草案（v1）

## 1. 背景与定位
本文承接：
- `docs/skillforge-p0-phase5-acceptance-map-and-mainline-anchor-v1.md`
- `docs/skillforge-p1-minimal-real-object-chain-and-state-machine-draft-v1.md`
- `docs/skillforge-p2-minimal-real-execution-mainline-product-surface-draft-v1.md`
- `docs/skillforge-owner-decision-page-v2.md`

用于把第五阶段的最小真实证据链与回归验收基线固定下来，明确：
- 主证据链结构
- 每个关键节点的最小证据位
- 最小真实回归验收清单与通过/不通过规则
- 覆盖范围 / 未覆盖范围模板

本文只定义第五阶段最小真实执行闭环所需的证据链与验收基线：
- 不进入大而全测试体系
- 不把代码存在性、空数据闭环、口头说明当作验收通过
- 不混入自动化成熟、规模化稳定性等更高阶段能力承诺

## 2. 主证据链

### 2.1 必需主链
`Task/Request -> PromptDraft@v -> StepPlan@v -> Approval/Risk Gate -> ExecutionRun -> Evidence/Transcript/Log -> Retro`

### 2.2 最小可选侧链
- `StepPlan.skeletonRef(id + version) -> Skeleton@version`
- `Retro.skeletonRevisionProposal(targetSkeletonId + baseVersion)`

### 2.3 主链判定原则
- 节点必须可追溯（有 ID / Ref）
- 关键节点必须有状态
- 版本链必须闭合（至少 PromptDraft / StepPlan；如使用 Skeleton，则含 Skeleton@v）
- 审批前不得执行
- Retro 必须输出边界化结论

## 3. 关键节点最小证据位

### 3.1 Task / Request
至少包含：
- `taskId / requestId`
- 真实任务标识（非占位）
- 创建时间 / 创建人（或等价审计锚点）

### 3.2 PromptDraft@v
至少包含：
- `promptDraftId + version`
- `taskRef`
- `goal / constraints / acceptanceCriteria`
- 状态流转痕迹

### 3.3 StepPlan@v
至少包含：
- `stepPlanId + version`
- `promptDraftRef@v`
- `steps[]` 四元组：`input -> intent -> output -> check`
- （若有）`skeletonRef(id + version)`
- 状态流转痕迹

### 3.4 Approval / Risk Gate
至少包含：
- `approvalId + submissionRef`
- 审批状态：`Pending / Approved / Rejected / NeedsMoreInfo`
- 审批时间与决策来源锚点
- 门禁结果记录（是否允许启动 Run）

### 3.5 ExecutionRun
至少包含：
- `runId`
- `approvalRef`
- 绑定版本：`PromptDraft@v + StepPlan@v + （可选）Skeleton@v`
- 状态轨迹：`Queued / Running / Succeeded | Failed | Aborted`
- 结果摘要引用

### 3.6 Evidence / Transcript / Log
至少包含：
- `evidenceRefs`
- 与 `runId` 的绑定关系
- 最小可回看入口

### 3.7 Retro
至少包含：
- `retroId + runRef`
- 状态：`Draft / Finalized`
- 三分结论：`可回沉 / 暂不回沉 / 需补证据`
- 证据锚点
- 覆盖范围
- 未覆盖范围
- （可选）`skeletonRevisionProposal`

## 4. 最小真实回归验收清单

### 4.1 真实样本存在性
**通过**：至少 1 条非占位真实任务完整跑到 `Retro Finalized`  
**不通过**：仅 demo、空数据、伪造数据或仅文档描述

### 4.2 对象链连续性
**通过**：主链所有相邻引用可追溯  
**不通过**：任一关键引用断链

### 4.3 审批硬门禁生效
**通过**：存在可审计证据证明“未 Approved 不可 Run”  
**不通过**：`Pending / Rejected / NeedsMoreInfo` 仍可启动 Run

### 4.4 Run 版本固化
**通过**：Run 明确绑定获准 `PromptDraft@v / StepPlan@v`（及可选 `Skeleton@v`）  
**不通过**：Run 使用漂移版本或无版本标注

### 4.5 执行证据可回看
**通过**：Run 至少有结果摘要 + evidence/log/transcript 锚点  
**不通过**：仅状态变化，无执行证据

### 4.6 Retro 结构化完成
**通过**：`Finalized + 三分结论 + 证据锚点 + 覆盖/未覆盖`  
**不通过**：复盘只写结论，不写证据边界

### 4.7 Skeleton 最小追溯（若使用）
**通过**：StepPlan 有 `skeletonRef@v`，Retro 可给出回沉建议入口  
**不通过**：引用无版本或不可追溯；把自动回写当作已实现要求

### 4.8 口径风控合规
**通过**：结论表述不越界  
**不通过**：把最小样本外推为全量稳定可运营

## 5. 覆盖范围 / 未覆盖范围模板
第五阶段每条验收结论必须附以下卡片：

- **结论**：
- **证据锚点**：
- **覆盖范围**：
- **未覆盖范围**：
- **通过 / 不通过判定**：
- **回退条件**：

固定规则：
- 没有“未覆盖范围”的结论，不得视为验收完成
- 证据不足或边界冲突时，必须回退为“未验证 / 需补证据”

## 6. 继续冻结项（P3 禁混入）
以下能力不得写入 P3 的通过条件：
- 自动回写（含 Skeleton 自动回写）
- 自动优化 / 自动步骤重排
- 自动根因诊断
- 自动修复 / 自动回滚 / 自动一致性修复
- 自动推荐联动（含高阶 Skeleton 推荐）
- 复杂血缘图谱 / 深度影响分析
- 跨项目规模化知识回流 / 复杂联动看板
- 长周期稳定性“已成熟”叙事

允许口径：
- 候选能力
- 条件评估中
- 需补证
- 未验证

## 7. 对后续 P4 / P5 / 实现层的接口约束
- P4 只能在本文定义的证据链与边界模板上推进最小回沉闭环
- P5 只能在真实证据成立后做跟随式 truth / phase / ADR 回写规则收口
- 实现层必须围绕本文的最小回归清单做真实样本与真实验收，不得先扩展长周期稳定性或自动化能力宣称

## 8. 主要依据文档
- `docs/skillforge-p0-phase5-acceptance-map-and-mainline-anchor-v1.md`
- `docs/skillforge-p1-minimal-real-object-chain-and-state-machine-draft-v1.md`
- `docs/skillforge-p2-minimal-real-execution-mainline-product-surface-draft-v1.md`
- `docs/skillforge-owner-decision-page-v2.md`
- `docs/skillforge-c3-execution-retro-and-skeleton-feedback-governance-v1.md`
- `docs/skillforge-d5-phase-d-closeout-inputs-v1.md`
- `docs/skillforge-d2-evidence-paths-and-sample-strategy-v1.md`