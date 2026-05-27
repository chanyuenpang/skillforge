# SkillForge P6：真实样本实现与验收锚点（v1）

## 1. 文档目的与边界
本文承接：
- `docs/skillforge-p0-phase5-acceptance-map-and-mainline-anchor-v1.md`
- `docs/skillforge-p1-minimal-real-object-chain-and-state-machine-draft-v1.md`
- `docs/skillforge-p2-minimal-real-execution-mainline-product-surface-draft-v1.md`
- `docs/skillforge-p3-minimal-real-evidence-chain-and-regression-acceptance-baseline-draft-v1.md`
- `docs/skillforge-p4-retro-to-skeleton-minimal-writeback-loop-draft-v1.md`
- `docs/skillforge-p5-follow-up-truth-adr-phase-writeback-governance-rules-draft-v1.md`

本文是 P6 的执行约束文档，用于把第五阶段已经固定的约束转成下一阶段可派发、可验收、可回退的真实样本推进框架。

本文只定义：
- 首条真实样本唯一主线
- 里程碑切分
- 工作包结构与依赖关系
- 验收口径与回退机制
- 禁区与文档治理边界

本文不定义：
- 具体实现代码
- 大而全路线图
- 高阶自动化、规模化或跨项目能力承诺

## 2. 首条真实样本链路定义（唯一主线）
P6 第一刀只允许围绕一条最短真实闭环推进：

`Task -> PromptDraft@v -> StepPlan@v -> Approval -> Run -> Evidence -> Retro -> Skeleton@newVersion（可选） -> 跟随式文档回写`

固定要求：
- `Approval` 是硬门禁：未批不跑
- `Run` 必须绑定获批版本：`PromptDraft@v + StepPlan@v + （若使用）Skeleton@v`
- `Evidence / Transcript / Log` 必须可回看
- `Retro` 必须 `Finalized` 且满足三分法与边界字段
- `Skeleton` 只能新版本回沉，不得覆盖旧版本

## 3. P6 里程碑切分

### M1 主链打通
目标：完成 1 条从 Task 到 Run + Evidence 的真实端到端。

完成判据：
- 存在唯一可追溯主链
- `Pending / Rejected / NeedsMoreInfo` 无法启动 Run
- Run 绑定版本可见
- Evidence 与 runId 绑定可回看

### M2 Retro 完整化
目标：把“跑通”提升为“可裁决、可回退”。

完成判据：
- Retro 为 `Finalized`
- 包含：`可回沉 / 暂不回沉 / 需补证据` 之一
- 包含：证据锚点、覆盖范围、未覆盖范围、回退条件

### M3 Skeleton 回沉入口可用
目标：证明 Retro → Skeleton 的人工回沉闭环可用。

完成判据：
- 存在完整 `skeletonRevisionProposal`
- 有人工评审结论（通过 / 驳回 / 需补证据）
- 若通过，则生成 `Skeleton@newVersion`
- 保留新旧版本关系，不覆盖旧版本

### M4 跟随式文档回写闭环
目标：完成一次结果驱动的最小回写样本。

完成判据：
- 至少 1 条回写结论可对齐真实对象 ID / 版本
- 每条结论含：证据锚点、覆盖范围、未覆盖范围、回退条件
- 无越界叙事

## 4. 工作包结构与依赖关系

### 4.1 实现包
- I-1 对象链基础件落地
- I-2 状态机与锁定规则实现
- I-3 审批硬门禁实现
- I-4 Run 版本固化与证据锚点实现
- I-5 最小产品动作链实现
- I-6 Retro → Skeleton 回沉入口实现

### 4.2 验证包
- V-1 首条真实样本 E2E 验证
- V-2 门禁与负例验证
- V-3 版本固化与漂移防护验证
- V-4 证据链完整性与 Retro 结构验证

### 4.3 审查包
- R-1 验收基线审查
- R-2 回沉决策审查
- R-3 文档口径与边界合规审查

### 4.4 主串行骨架
`I-1 -> I-2 -> I-3 -> I-4 -> I-5 -> I-6 -> V-1 -> V-4 -> R-1 -> R-2 -> R-3`

### 4.5 可并行窗口
- I-4 与 I-5 可在 I-1 / I-2 完成后并行推进
- V-2 与 V-3 可并行
- R-2 可在 R-1 初判后预审，但最终结论仍依赖 R-1 定版

## 5. 验收基线与判定规则
P6 必须沿用 P3 的最小真实验收基线，至少覆盖：
- 真实样本存在性
- 对象链连续性
- 审批硬门禁生效
- Run 版本固化
- 执行证据可回看
- Retro 结构化完成
- Skeleton 最小追溯（若使用）
- 口径风控合规

固定要求：
- 不能用空数据、代码存在性、页面存在性替代验收
- 通过 / 不通过必须有证据锚点支撑

## 6. 风险与回退机制
出现以下情况时，必须回退为 `未验证 / 需补证据 / 条件评估中`：
- 主链断裂
- 审批门禁失效
- Run 版本漂移
- 证据不足或不可回看
- Retro 缺三分结论或缺边界字段
- 口径越界
- 回归失败或复核冲突

## 7. 禁区与口径治理
P6 第一刀必须避免：
- 把“有代码 / 有页面 / 有文档”写成“已验证通过”
- 把“单样本通过”外推为“全量稳定可运营”
- 把“条件推进”写成“自动切换 / 自动解锁”
- 把冻结能力写成已实现：
  - 自动回写
  - 自动优化
  - 自动诊断
  - 自动修复
  - 自动推荐
  - 复杂图谱
  - 跨项目规模化回流
- 忽略“未覆盖范围”
- 在无证据锚点时使用“已成立 / 已闭环 / 已成熟”措辞

允许口径：
- `候选能力`
- `条件评估中`
- `需补证据`
- `未验证`

## 8. 执行节奏与后续派发接口
P6 的推进顺序固定为：
1. 先打通首条真实样本主链
2. 再补齐证据与 Retro 裁决
3. 再验证回沉入口可用
4. 最后做跟随式文档回写验收

后续 subplan / subagent 派发必须沿用：
- 实现 / 验证 / 审查分离
- 每包可追溯、可验收、可回退
- 不混合冻结能力

## 9. 主要依据文档
- `docs/skillforge-p0-phase5-acceptance-map-and-mainline-anchor-v1.md`
- `docs/skillforge-p1-minimal-real-object-chain-and-state-machine-draft-v1.md`
- `docs/skillforge-p2-minimal-real-execution-mainline-product-surface-draft-v1.md`
- `docs/skillforge-p3-minimal-real-evidence-chain-and-regression-acceptance-baseline-draft-v1.md`
- `docs/skillforge-p4-retro-to-skeleton-minimal-writeback-loop-draft-v1.md`
- `docs/skillforge-p5-follow-up-truth-adr-phase-writeback-governance-rules-draft-v1.md`