# Phase 4 Closeout：Generator & Packaging 收口说明

> 这是一页收口文档，不是新一轮实现计划。它只负责把 Phase 4 已完成项、验收证据、边界和 Phase 5 输入清单钉死，防止后续把 static-only / contract-first 误读成完整生成器或完整 packaging pipeline。
>
> 核心边界：**static pass ≠ runtime pass**。Phase 4 这里收口的是 contract-first 的最小闭环，不是完整生成器，也不是完整 packaging pipeline。

## 1. 已完成项

### M4.1：workflow-source schema-only

- 已冻结 `workflow-source` 最小 schema
- 已明确 `kind / fixtureId / fixtureVersion / name / summary / profile / source / resources / permissions / checklist` 等最小输入契约
- 当前状态：**schema-only / static contract freeze**

### M4.2：static synthesis

- 已有 static synthesis 样本：`meeting-summary-assistant`
- 样本中存在 generated manifest 与 generated `SKILL.md`
- 已通过独立 contract test：`scripts/test-m42-static-skeleton-contracts.mjs`
- 结果：`PASS 13/13`
- 当前状态：**static-only landing**

### M4.3：packaging contract reconcile

- 已有独立 reconcile 检查脚本：`scripts/test-packaging-contract-reconcile.mjs`
- happy path fixture：`meeting-summary-assistant`
- 对账范围：`generated/skill-manifest.yaml`、`generated/skill/SKILL.md`、`validation-result.yaml`
- 独立测试结果：`PASS 16/16`
- 当前状态：**static packaging reconcile**

## 2. 验收证据

本 Phase 的验收证据不是 runtime pass，而是独立 contract / reconcile 测试：

- M4.1：`workflow-source` schema-only 独立 contract tests
- M4.2：`scripts/test-m42-static-skeleton-contracts.mjs` → `PASS 13/13`
- M4.3：`scripts/test-packaging-contract-reconcile.mjs` → `PASS 16/16`

这些证据只证明：
- 输入契约可冻结
- 静态产物可生成样本化 skeleton
- 生成产物与验证结果之间可做静态对账

它们不证明：
- 完整生成器已完成
- 完整 packaging pipeline 已完成
- runtime / provider / publish / registry 已完成

## 3. 边界

Phase 4 当前明确是：

- `static-only`
- `contract-first`
- `planning skeleton + sample landing`

它**不代表**：

- 完整生成器
- 完整 packaging pipeline
- 真实 runtime 执行
- 真实 provider replay / transcript / scoring
- 发布系统或 registry

## 4. out-of-scope

以下内容不在 Phase 4 收口范围内：

- UI / 可视化编辑器
- registry / marketplace / 发布分发
- 真实外发、邮件、HTTP side effect
- provider runtime / transcript persistence / scoring
- 跨平台 / 跨模型正式保证
- 完整 advanced skill 生成器
- 自动发布 / 自动回滚

## 5. Handoff to Phase 5：待规划问题清单

Phase 5 需要接住的问题，不是继续往 Phase 4 里塞实现。

### 待规划问题 1：真正的生成器边界

- 生成器的最小职责到底止步于哪里
- 哪些字段必须生成，哪些字段只能保守留白
- 如何避免把 contract shaping 误写成 runtime capability

### 待规划问题 2：输出目录与产物规范

- 生成产物目录结构如何标准化
- manifest / SKILL.md / validation-result 的关联关系如何固化
- 是否需要统一生成 run id、source id、spec id 的命名规则

### 待规划问题 3：验收链路

- 静态 contract tests、reconcile tests、以及未来 runtime validation 如何分层
- 哪些结果可以进入默认门禁，哪些必须仍然保留为 pending
- 如何防止 `static pass` 被误读成 `runtime pass`

### 待规划问题 4：扩展到多 fixture / 多 profile

- simple / standard / advanced-reserved 的推进顺序
- fixture 样本如何扩充而不让规则过拟合
- profile 与 capability 的边界如何写清

### 待规划问题 5：Phase 5 的真正目标

- Phase 5 是进入真实 generator 设计，还是先补齐 planning skeleton 的另一层契约
- 是否需要单独规划 runtime gate、registry、UI 的拆分阶段
- 哪些问题必须先定 ADR / decision log

## 6. 结论

Phase 4 已到自然收口点：

- M4.1 / M4.2 / M4.3 都有独立证据
- 边界已经稳定为 static-only / contract-first
- 继续留在 Phase 4 的收益开始递减
- 下一步更适合切到 Phase 5 planning skeleton 或 Phase 5 规划拆解
