# SkillForge P4：Retro → Skeleton 最小回沉闭环草案（v1）

## 1. 背景与定位
本文承接：
- `docs/skillforge-p0-phase5-acceptance-map-and-mainline-anchor-v1.md`
- `docs/skillforge-p1-minimal-real-object-chain-and-state-machine-draft-v1.md`
- `docs/skillforge-p3-minimal-real-evidence-chain-and-regression-acceptance-baseline-draft-v1.md`
- `docs/skillforge-owner-decision-page-v2.md`

用于把第五阶段的最小复盘回沉闭环固定下来，明确：
- Retro 的最小结构
- Retro → Skeleton 的最小回沉决策链
- 人工可执行的最小回沉动作清单
- 回沉边界与继续冻结项

本文只定义第五阶段最小真实执行闭环中的回沉段：
- 不进入自动回写
- 不进入自动优化 / 自动诊断 / 自动修复
- 不把知识系统蓝图或跨项目知识回流混入本阶段闭环

## 2. Retro 最小结构

### 2.1 必填字段
- `retroId`
- `runRef`
- `status`: `Draft | Finalized`
- `decision`: `可回沉 | 暂不回沉 | 需补证据`
- `evidenceAnchors[]`
- `coverageScope`
- `nonCoverageScope`

### 2.2 可选但受约束字段
- `skeletonRevisionProposal`
  - `targetSkeletonId`
  - `baseVersion`
  - `proposedChangeSummary`
  - `changeType`

规则：
- `skeletonRevisionProposal` 一旦出现，字段必须完整
- Retro 不得脱离 `runRef` 独立存在
- 没有证据锚点，不得形成“可回沉”

## 3. 最小回沉决策链

### 3.1 主链
`ExecutionRun（已结束） -> Retro Draft -> Retro Finalized -> Skeleton 修订提议 -> 人工评审 -> Skeleton@newVersion`

### 3.2 决策主干
1. Run 已结束，且版本链已固化
2. Retro 汇总证据锚点、覆盖范围、未覆盖范围
3. Retro Finalized 时必须落入三分结论之一：
   - `可回沉`
   - `暂不回沉`
   - `需补证据`
4. 若结论为 `可回沉`，则进入 Skeleton 修订提议
5. 通过人工评审后，形成 `Skeleton@newVersion`
6. 后续 StepPlan 可在新任务中引用该新版本

### 3.3 最小门槛
- 没有证据锚点：不得 `可回沉`
- 没有覆盖 / 未覆盖范围：不得 `Finalized`
- 没有 `targetSkeletonId + baseVersion`：不得进入回沉实施讨论
- 对既有 Skeleton 的变更一律走新版本，不允许覆盖旧版本

## 4. Retro → Skeleton 最小动作链

### 4.1 锁定输入
确认 Retro 对应 Run 已结束，且以下版本链可追溯：
- `PromptDraft@v`
- `StepPlan@v`
- （若存在）`SkeletonRef@v`

### 4.2 形成 Retro 草稿
填写：
- 证据锚点
- 覆盖范围
- 未覆盖范围

### 4.3 做三分决策
Retro 结论必须明确落在：
- `可回沉`
- `暂不回沉`
- `需补证据`

### 4.4 若可回沉，补修订提议卡
最少写明：
- `targetSkeletonId`
- `baseVersion`
- `proposedChangeSummary`

### 4.5 人工评审回沉提议
- 通过：进入 Skeleton 新版本修订
- 驳回：回退为 `暂不回沉`
- 证据不足：回退为 `需补证据`

### 4.6 发布新版本 Skeleton
- 只能新建版本
- 不允许覆盖旧版本
- 必须保留新旧版本关系

### 4.7 建立引用闭环
后续 StepPlan 应用新版本时，保留：
- `skeletonRef(id + version)`

以形成可回看的最小真实闭环样本。

## 5. 人工可执行的最小回沉动作清单
- [ ] 检查 Run 是否有完整 evidence / log / transcript 锚点
- [ ] 新建 Retro 并绑定 `runRef`
- [ ] 填写结论证据锚点
- [ ] 填写覆盖范围 / 未覆盖范围
- [ ] 选择三分决策
- [ ] 若选“可回沉”，填写 `targetSkeletonId + baseVersion + 变更摘要`
- [ ] 发起人工评审并记录结论
- [ ] 通过后创建 Skeleton 新版本
- [ ] 记录新旧版本关系与可追溯引用
- [ ] 抽取 1 条后续 StepPlan 引用样本，验证回沉入口可用

## 6. 边界与继续冻结项

### 6.1 本阶段边界
- 做“回沉入口可用”，不做“自动回沉执行”
- 做“人工决策闭环”，不做“智能优化闭环”
- 做“单条真实样本可追溯”，不外推全量稳定运营

### 6.2 继续冻结项
以下能力不得混入 P4 验收：
- 自动回写 Skeleton
- 自动步骤优化 / 重排
- 自动根因诊断
- 自动修复 / 自动回滚 / 自动一致性修复
- 自动推荐联动
- 复杂血缘图谱 / 深度影响分析
- 跨项目规模化知识回流

## 7. 对后续 P5 与实现层的接口约束
- P5 只能在本文定义的 Retro 结构、回沉提议入口与人工评审闭环基础上，收口跟随式 truth / ADR / phase 回写规则
- 实现层必须优先证明“回沉入口可用、版本可追溯、旧版不被覆盖”，不得跳跃宣称自动回沉能力成立
- 后续若出现高阶自动化设想，只能作为候选能力挂牌，不得回写为本阶段已成立事实

## 8. 主要依据文档
- `docs/skillforge-p0-phase5-acceptance-map-and-mainline-anchor-v1.md`
- `docs/skillforge-p1-minimal-real-object-chain-and-state-machine-draft-v1.md`
- `docs/skillforge-p3-minimal-real-evidence-chain-and-regression-acceptance-baseline-draft-v1.md`
- `docs/skillforge-owner-decision-page-v2.md`
- `docs/skillforge-c3-execution-retro-and-skeleton-feedback-governance-v1.md`
- `docs/skillforge-knowledge-asset-domain-spec-v0.1.md`
- `docs/skillforge-roadmap-and-doc-governance-v1.md`