# SkillForge C3 执行—复盘—骨架回沉治理基线（v1）

## 1. C3 目标与边界
本文只定义最小执行—复盘—回沉治理链，不承诺自动回写 Skeleton、自动优化、自动诊断、自动修复或复杂规模化知识回流。

## 2. 输入继承与前置约束
- `docs/skillforge-roadmap-and-doc-governance-v1.md`
- `docs/skillforge-c1-cross-domain-object-model-and-reference-rules-v1.md`
- `docs/skillforge-c2-orchestration-assetization-and-skeleton-reuse-governance-v1.md`
- `docs/skillforge-b4-evidence-chain-objects-and-relation-v1.md`
- `docs/skillforge-b5-reuse-and-traceability-rules-v1.md`
- `docs/skillforge-b6-visibility-and-exception-slots-v1.md`
- `tasks/skillforge-第三阶段主计划/plan.json`

## 3. 最小闭环定义
最小闭环为：`ExecutionRun（执行事实） -> 复盘结论（证据化） -> Skeleton 修订决策（新版本） -> 下次 Apply 可引用`。
打通标准：
- 有证据
- 有结论
- 有回沉入口

## 4. 关系模型与回看路径
### 主证据链
`Run -> Approval -> StepPlan@v -> PromptDraft@v -> Task`

### 骨架挂接链
`StepPlan@v -> skeletonRef(id+version) -> Skeleton@version`

### 复盘回沉链
`Retro -> Run`
`Retro -> Skeleton修订提议(target skeletonId + base version)`

### 最小回看路径
- 执行一致性
- 复盘归因
- 回沉落点

## 5. 回沉治理基线（纳入项）
- Run 与来源版本强绑定
- 复盘记录必须带证据锚点与覆盖边界
- 回沉决策三类：可回沉 / 暂不回沉 / 需补证据
- Skeleton 回沉采用新修订，不覆盖旧版本

## 6. 延后能力清单（冻结承诺）
- 自动回写 Skeleton
- 自动诊断根因
- 自动优化步骤
- 自动修复 / 自动回滚
- 自动复杂血缘推断
- 跨项目规模化知识回流
- Skeleton 质量评分驱动的自动推荐联动

## 7. 状态与异常槽位统一规范
- 生命周期：`Draft / Ready / Deprecated / Archived`
- 锁定态：`LockedForApproval`
- 结论三分法：`已实现 / 已验证 / 未验证`
- 异常槽位：异常类型 / 触发规则 / 影响对象 / 影响版本 / 发现时间 / 当前处置状态

## 8. 证据模板与覆盖边界模板
- 每条结论必须附：证据锚点 / 覆盖范围 / 未覆盖范围
- 证据不足或争议项回退为：`未验证 / 后续候选`

## 9. 与 C4 的交接接口
- C3 中涉及执行回沉、异常解释、骨架修订决策的关键变更，需触发 truth / phase / spec / ADR 最小回写