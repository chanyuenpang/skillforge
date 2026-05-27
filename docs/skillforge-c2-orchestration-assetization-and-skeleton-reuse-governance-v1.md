# SkillForge C2 编排对象资产化与 Skeleton 复用治理（v1）

## 0. 文档定位与边界
本文只定义 C2 资产化与复用治理基线，不承诺智能化、自动优化、自动回写 Skeleton、自动一致性修复或复杂规模化复用治理。

## 1. 输入依据与继承关系
- `docs/skillforge-roadmap-and-doc-governance-v1.md`
- `docs/skillforge-c1-cross-domain-object-model-and-reference-rules-v1.md`
- `docs/skillforge-b5-asset-objects-and-boundaries-v1.md`
- `docs/skillforge-b5-reuse-and-traceability-rules-v1.md`
- `docs/skillforge-b5-cross-domain-alignment-rules-v1.md`
- `docs/skillforge-b6-gating-and-version-mapping-v1.md`
- `tasks/skillforge-第三阶段主计划/plan.json`

## 2. C2 资产化定义
编排对象资产化，是把 `PromptDraft@version` / `StepPlan@version` 从一次性任务产物提升为可被引用、可被审批、可被执行回看的版本化对象。其核心是可治理引用，而不是自动生成能力。

## 3. 最小对象清单与域边界
- 任务域：`Task(taskRef)`
- 编排域：`PromptDraft@version`、`StepPlan@version`
- 审批域：`Approval(approvedPackageRef)`
- 执行域：`Run(consumedPlanRef@v, consumedPromptRef@v, approvalRef)`
- 资产域：`Skeleton@version`

## 4. 最少关系模型与版本一致性规则
- `StepPlan@v -> PromptDraft@v` 强绑定
- `Approval` 审批对象必须是版本化包
- `Run` 必须保留 `approvalRef + consumedPlanRef@v + consumedPromptRef@v`
- 使用 `Skeleton` 时必须保留 `skeletonRef(id + version)`
- 版本一致性三角：`Approval.approvedPackageRef` / `Run` 实际消费版本 / `StepPlan@v + PromptDraft@v` 三者一致

## 5. 复用治理基线
- 最小动作链：`Apply -> Adjust -> Lock -> Trace`
- 允许：人工裁剪 / 增补 / 重排 / 任务化细化
- 必须保留：版本锚点、Skeleton 来源、审批执行链一致性
- 锁定前做一致性检查，锁定后不可静默漂移

## 6. 状态与门禁统一语义
- 三分法：`已实现 / 已验证 / 未验证`
- 生命周期：`Draft / Ready / Deprecated / Archived`
- 锁定态：`LockedForApproval`
- 三段门禁：提交→审批 / 审批→生效 / 生效→回看

## 7. 追溯与校核基线
- 主路径：`Run -> Approval -> StepPlan@v -> PromptDraft@v -> Task`
- Skeleton 挂接：`StepPlan@v -> skeletonRef(id + version)`
- 冲突分级：阻断 / 告警 / 回看解释
- 每条结论附证据锚点与覆盖边界

## 8. 纳入与延后清单
### 第一批纳入
- 版本化应用与复用治理
- 审批包与执行消费版本核验
- Skeleton 来源版本回看

### 明确延后
- 自动推荐 Skeleton
- 自动模板优化 / 自动步骤优化
- 自动回写 Skeleton
- 自动一致性修复 / 自动回滚
- 复杂血缘图谱 / 深度影响分析
- 质量评分体系 / 高级联动看板

## 9. 对 C3/C4 的前置接口
- C3：ExecutionRun 回沉所需版本前提
- C4：truth / phase / spec / ADR 触发前提

## 10. 非目标与禁用表述
- 不把资产化写成智能化
- 不把局部复用写成规模化治理完成
- 不把规则层完成写成全量验证完成