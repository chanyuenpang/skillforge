# Phase 5 Contract Consistency Checklist v0

> 这是一份 **docs-only contract consistency checklist**。它只用于人工审阅与收口前自检，不是 runtime、tooling 或 automation 实现。其目的，是在 Phase 5 contract map 已形成后，补一层“术语 / 字段 / 状态 / 错误语义 / 版本 / 追溯映射”的一致性巡检占位机制。

## 1. 目标与边界

### 目标
- 为 Phase 5 的 contract 文档提供一份统一的人工一致性检查清单。
- 确保 Input / Generate / Validate / Review / Replay / History 六个 surface 的文档口径可互相对齐，并把 Task 这个单点冻结入口纳入额外巡检范围。
- 在新增或修改 contract 页时，先做可读、可追溯、可导航的人工 gate，避免语义漂移。

### 边界
- 仅覆盖 docs 层的 contract-first 约束。
- 不实现任何自动化 lint、CI、脚本或 runtime 校验。
- 不把 placeholder / draft / planning 叙述误写为已完成能力。
- 不替代各 surface 自身的 contract 文档；它只做一致性巡检入口。
- 不替代收口子计划结构文档；收口结构由 `phase-5-subplan-closeout-structure-v2.md` 定义。
- 不替代 review gate 模板；通用审阅块由 `phase-5-review-gate-template-v0.md` 提供。

## 2. 覆盖范围：6 个 surface + 1 个冻结入口

本 checklist 覆盖以下六个 surface，并额外巡检 Task 冻结入口：

1. **Input**
2. **Generate**
3. **Validate**
4. **Review**
5. **Replay**
6. **History**
7. **Task（冻结入口）**

### Surface 约束原则
- **Input**：作为输入侧真相与展示约束的起点。
- **Generate**：作为生成态 contract 的中枢，需要与 Input / Validate 对齐。
- **Validate**：只承接验证语义，不扩写为 runtime 完整执行。
- **Review**：只承接收口后的审阅语义，不扩写为发布或执行完成。
- **Replay**：只承接回放意图、来源引用与守卫条件，不暗示真实回放已完成。
- **History**：作为历史/轨迹收口面，重点检查追溯链路与版本标记的一致性。
- **Task**：作为最小单点冻结入口，重点检查 docs-only 冻结、Queue / Detail 待补位与非实现态表述是否一致。

## 3. 检查维度

### 3.1 术语
**Must**
- 六个 surface 的核心名词在全文中保持一致，不混用别名、缩写或近义替换。
- 同一页中“contract / state-model / view-model / status / surface / snapshot”等术语的语义边界必须稳定。
- `frozen / draft / placeholder / pending / blocked / deferred` 等状态词必须按约定使用，不能互相偷换。

**Should**
- 每个 surface 使用统一的描述模板，降低歧义。
- 同类概念采用固定措辞，避免同一页内多套叫法切换。

### 3.2 字段
**Must**
- 同一类字段在不同 surface 间保持同构或显式差异说明。
- 字段命名应与 contract 文档中的角色一致，不把展示字段、状态字段、追溯字段混为一谈。
- 若文档声明某字段为必需、派生或只读，应在所有相关 surface 中保持一致口径。

**Should**
- 对关键字段给出最小映射说明，方便审阅时定位来源与去向。
- 避免同字段在不同文档中出现不同命名但相同含义的情况。

### 3.3 状态转移
**Must**
- 状态转移只描述 contract / state-model 的收口关系，不暗示 runtime 执行完成。
- 输入、生成、验证、审阅、回放、历史之间的状态流向必须有明确方向，不得互相矛盾。
- `ready / pass / approved / blocked / pending` 等状态必须在语义上可闭环解释。

**Should**
- 为关键状态转移保留最小前置条件与后置结果说明。
- 若某 surface 仅冻结了部分状态路径，应明确写出边界，而不是用模糊表达覆盖。

### 3.4 错误语义
**Must**
- 错误、失败、阻塞、缺失、降级等语义必须与对应 surface 的职责一致。
- 不得把“文档不完整”“contract 未冻结”误写成“产品失败”或“runtime error”。
- 错误语义必须可追溯到具体 surface 与具体字段/状态，而不是只有泛化描述。

**Should**
- 对常见错误类型使用固定描述模板，减少歧义。
- 若某错误只在 contract 层出现，应显式标注其非 runtime 性质。

### 3.5 版本标记
**Must**
- 所有文档版本标记必须能区分 frozen / draft / placeholder / v0 / next cut 等语义。
- 版本号与文档定位要一致，不能用版本号伪装成熟化实现。
- 若同一 surface 存在多个 contract 页，应明确哪一页是当前基线。

**Should**
- 在标题、页首说明或导航中保留版本线索，便于人工审阅。
- 版本演进应优先通过新增文档或清晰改版说明体现，而不是默默覆盖语义。

### 3.6 可追溯映射
**Must**
- 每个 surface 的 contract 都应能追溯到上游入口、相关 contract、current-status 或 index 页。
- 关键字段、状态或错误语义应能反向定位到定义来源，避免“孤定义”。
- History 还需同时核对 state-model 与 view-model 的映射引用，避免只冻结真相层却遗漏投影层。
- Task 还需核对冻结入口是否同时在 index / current-status / planning skeleton 中保持一致，且不把 Queue / Detail 写成已冻结。
- 链接关系必须指向真实存在的 docs，不得用近似文档代替。

**Should**
- 每个新页至少提供一个上游入口和一个相关入口。
- 优先使用相对链接，保持 docs 内部可搬迁性。

## 4. 通过标准（人工 gate）

以下条件满足时，才算通过本 checklist 的人工 gate：

1. 六个 surface 加 Task 冻结入口的术语口径一致，没有明显别名漂移。
2. 关键字段在相关文档间能互相映射，且差异有说明。
3. 状态转移没有把 contract 收口写成 runtime complete。
4. 错误语义能回到具体 surface / 字段 / 状态，而不是泛化结论。
5. 版本标记清楚，能辨认当前基线与历史演进。
6. 每个 surface 至少能从 index / current-status / 相关 contract 文档中找到追溯入口。
7. artifacts frozen / next phase entry defined / open risks triaged 三项都已能在 current-status、index、subplan、review gate 之间互相引用，并共同构成 closeout review 包的最小事实基线。

## 5. 建议执行步骤（manual review gate）

建议按以下顺序做人工巡检：

1. 先看 `phase-5-contract-index.md`，确认新 checklist 已进入导航体系。
2. 再看 `phase-5-closeout-current-status.md`，确认当前收口态没有被误改成实现态。
3. 按 Input → Generate → Validate → Review → Replay → History 的顺序，逐页抽查术语与字段。
4. 对每个 surface，检查至少 1 条状态转移和 1 条错误语义是否自洽；History 额外检查 1 条 state-model -> view-model 映射是否一致。
5. 复核版本标记与相对链接，确保每个页面都能回到上游入口。
6. 最后确认没有任何 docs 被写成 runtime/tooling/automation 实现。

## 6. 非目标

本 checklist 明确不做以下事情：
- 不实现 runtime
- 不实现 tooling
- 不实现 automation
- 不引入新的脚本、CI 或 lint 机制
- 不修改 `src/`、`scripts/`、`package.json`
- 不替代各 surface 的 contract 文档
- 不扩展新的 product surface
- 不把 manual gate 包装成自动 gate

## 7. Related

- 上游索引：[`phase-5-contract-index.md`](./phase-5-contract-index.md)
- 当前收口：[`phase-5-closeout-current-status.md`](./phase-5-closeout-current-status.md)
- lint plan：[`phase-5-docs-consistency-lint-plan.md`](./phase-5-docs-consistency-lint-plan.md)
- review gate template：[`phase-5-review-gate-template-v0.md`](./phase-5-review-gate-template-v0.md)
- 收口子计划结构：[`phase-5-subplan-closeout-structure-v2.md`](./phase-5-subplan-closeout-structure-v2.md)
- Input contract：[`phase-5-input-view-model-contract.md`](./phase-5-input-view-model-contract.md)
- Generate contracts：[`phase-5-generate-state-model-contract.md`](./phase-5-generate-state-model-contract.md) / [`phase-5-generate-view-model-contract.md`](./phase-5-generate-view-model-contract.md)
- Validate contracts：[`phase-5-validate-state-model-contract.md`](./phase-5-validate-state-model-contract.md) / [`phase-5-validate-view-model-contract.md`](./phase-5-validate-view-model-contract.md)
- Review contracts：[`phase-5-review-state-model-contract.md`](./phase-5-review-state-model-contract.md) / [`phase-5-review-view-model-contract.md`](./phase-5-review-view-model-contract.md)
- Replay contracts：[`phase-5-replay-state-contract.md`](./phase-5-replay-state-contract.md) / [`phase-5-replay-view-model-contract.md`](./phase-5-replay-view-model-contract.md)
- History contracts：[`phase-5-history-state-model-contract.md`](./phase-5-history-state-model-contract.md) / [`phase-5-history-view-model-contract.md`](./phase-5-history-view-model-contract.md)
