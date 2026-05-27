# SkillForge P1：最小真实对象链与状态机草案（v1）

## 1. 背景与定位
本文承接：
- `docs/skillforge-p0-phase5-acceptance-map-and-mainline-anchor-v1.md`
- `docs/skillforge-owner-decision-page-v2.md`

用于把第五阶段的最小真实对象链、状态机主干与关键门禁约束固定下来，作为后续：
- P2 最小真实执行主线产品面设计
- P3 最小真实证据链与回归验收基线
- P4 复盘回沉最小闭环定义

的统一结构基础。

本文只做对象链与状态机收敛：
- 不承诺自动化能力
- 不承诺规模化治理成熟
- 不进入复杂图谱与跨项目联动

## 2. 第五阶段最小真实对象集合

### 2.1 Task / Request
主链起点，承载真实任务实例。

### 2.2 PromptDraft@version
编辑态任务说明对象，至少承载：
- `taskRef`
- `goal`
- `context`
- `constraints`
- `acceptanceCriteria`
- `version`
- `status`

### 2.3 StepPlan@version
步骤化执行计划对象，至少承载：
- `promptDraftRef`
- `steps[]`（每步具备 `input -> intent -> output -> check`）
- `version`
- `status`

### 2.4 Approval / Risk Gate
审批门禁对象，承载提交包的审批结论与门禁状态。

### 2.5 ExecutionRun
执行事实对象，绑定获准版本并记录执行状态与结果。

### 2.6 Evidence / Transcript / Log
执行证据对象，支撑可回看、可校验、可复盘。

### 2.7 Retro
结构化复盘对象，对 Run 形成证据化结论、覆盖边界说明与回沉决策。

### 2.8 Skeleton@version
知识资产骨架对象，既是 StepPlan 的结构来源引用对象，也是 Retro 的回沉目标。

## 3. 相邻引用链

### 3.1 主链（必须成立）
`Task/Request -> PromptDraft@v -> StepPlan@v -> Approval/Risk Gate -> ExecutionRun -> Evidence/Transcript/Log -> Retro`

最低引用关系：
- `PromptDraft.taskRef -> Task/Request`
- `StepPlan.promptDraftRef -> PromptDraft@v`
- `Approval.submissionRef -> StepPlan@v`（或等价提交包来源）
- `ExecutionRun.approvalRef -> Approval`
- `ExecutionRun.evidenceRefs -> Evidence/Transcript/Log`
- `Retro.runRef -> ExecutionRun`

### 3.2 骨架与回沉侧链（最小可追溯）
- `StepPlan.skeletonRef -> Skeleton@version`
- `Retro.skeletonRevisionProposal -> targetSkeletonId + baseVersion`
- `Skeleton(oldVersion) -> Skeleton(newVersion)`

固定原则：
- Skeleton 回沉只产生新版本
- 不允许覆盖旧版本

## 4. 状态机主干

### 4.1 PromptDraft
`Draft -> ReadyForPlan -> LockedForApproval -> ApprovedForRun -> Superseded`

要求：
- 进入 `LockedForApproval` 后不可无痕改写
- 如需改动，必须走新版本

### 4.2 StepPlan
`Draft -> ReadyForApproval -> LockedForApproval -> ApprovedForRun -> Executed -> Superseded`

要求：
- 必须关联明确的 `PromptDraft@version`
- Run 只能绑定 `ApprovedForRun` 的 StepPlan 版本

### 4.3 Approval / Risk Gate
`Pending -> Approved | Rejected | NeedsMoreInfo`

要求：
- `Pending / Rejected / NeedsMoreInfo` 均不得进入 Run
- 审批是硬门禁，不是展示态规则

### 4.4 ExecutionRun
`Queued -> Running -> Succeeded | Failed | Aborted`

要求：
- 创建时即固化 `PromptDraft@v / StepPlan@v / SkeletonRef@v`
- 结束后方可进入 Retro

### 4.5 Retro
状态：`Draft -> Finalized`

同时必须带决策枚举：
- `可回沉`
- `暂不回沉`
- `需补证据`

要求：
- 必须包含证据锚点
- 必须包含覆盖范围 / 未覆盖范围

### 4.6 Skeleton
`Draft -> Ready -> Deprecated -> Archived`

要求：
- 仅 `Ready` 可被新 StepPlan 应用
- 回沉只生成新版本，不回写覆盖历史版本

## 5. 关键门禁约束

### 5.1 未批不跑
Approval 未通过，不得创建或启动 ExecutionRun。

### 5.2 Run 绑定版本
Run 必须绑定获准的 `StepPlan@v`，以及对应的 `PromptDraft@v`；如存在 `SkeletonRef`，也必须固化版本。

### 5.3 锁定态不可无痕改写
PromptDraft / StepPlan 进入 `LockedForApproval` 后，只能新版本修订。

### 5.4 StepPlan 来源约束
StepPlan 不可脱离 PromptDraft 来源版本独立存在。

### 5.5 语义一致性约束
StepPlan 不得与 PromptDraft 的：
- `goal`
- `constraints`
- `acceptanceCriteria`

发生语义冲突。

### 5.6 Retro 三分法强制
每条复盘结论必须落在：
- `可回沉`
- `暂不回沉`
- `需补证据`

之一。

### 5.7 Retro 边界强制
每条 Retro 结论必须同时写：
- 证据锚点
- 覆盖范围
- 未覆盖范围

### 5.8 Skeleton 回沉只增量
只允许生成新版本，不允许覆盖历史版本。

### 5.9 冻结能力不外推
以下能力不进入 P1 验收：
- 自动回写
- 自动优化
- 自动诊断
- 自动修复 / 自动回滚
- 自动推荐联动
- 复杂图谱 / 深度影响分析
- 跨项目规模化知识回流

## 6. 对后续 P2-P4 的约束接口
- P2 只能在本文定义的对象集合、状态机和门禁上设计最小产品面
- P3 只能在本文定义的对象链上补证据链与回归基线
- P4 只能在本文定义的 Retro / Skeleton 关系上补最小回沉闭环

禁止后续任务绕过本文直接发明新主对象、新状态主干或新自动化承诺。

## 7. 主要依据文档
- `docs/skillforge-p0-phase5-acceptance-map-and-mainline-anchor-v1.md`
- `docs/skillforge-owner-decision-page-v2.md`
- `docs/skillforge-run-center-domain-spec-v0.1.md`
- `docs/skillforge-knowledge-asset-domain-spec-v0.1.md`
- `docs/skillforge-c3-execution-retro-and-skeleton-feedback-governance-v1.md`
- `docs/skillforge-d4-execution-mainline-and-doc-linkage-prep-v1.md`
- `docs/skillforge-roadmap-and-doc-governance-v1.md`