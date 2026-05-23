# SkillForge Owner Master Plan：从静态 MVP 到最终形态

> 本文是 SkillForge 的 owner master plan。主 Agent 以 SkillForge 研发负责人身份维护长期核心目标、阶段边界和证据口径；短期小计划只能推进本文中的阶段目标，不能替代本文成为事实来源。
>
> 回写机制：每个小计划完成后，必须把实际完成状态回写到 `docs/roadmap.md`、必要的 `docs/static-mvp-validation-report.md` 与 `README.md`；未完成、未验证或仅设计中的能力必须继续标记为 `PENDING` / 风险项，不能写成 done。
>
> 文档同步补充边界：当前 Phase 3 provider-backed reserved seam 的 failure taxonomy 只收紧到保留边界说明，不是 provider execution failure taxonomy 完成声明。当前只允许 `blocked | error`；其中 `blocked` 绑定 `preflight-blocked` / guard-blocked` 语义，provider-backed `error` 绑定 reserved slot 语义；`adapter-error` 仅作 internal semantic alias，对外仍序列化为 `error`；report / failureReason 当前要求 same-source，不允许 mixed-source fallback。这些都不代表真实 provider call / execution / transcript persistence / passed path / validate 默认链路接通。

## 1. 当前状态概览

### 1.1 已完成能力

| 类别 | 状态 | 证据 |
|---|---|---|
| 文档设计闭环 | 已完成 | `docs/data-structure.md` 定义核心实体；`docs/workflow.md` 定义端到端流程；`docs/acceptance.md` 定义验收标准 |
| 10 轮优化分析 | 已完成 | `docs/optimization/round-10.md` 汇总 round-01 至 round-10，形成 Go/No-Go 与边界收敛 |
| 文档/设计验收 | 已完成，结论为 `PASS_WITH_RISK` | `docs/acceptance-result.md` |
| 单 fixture 静态 MVP | 已完成 | `fixtures/meeting-summary-assistant/**` 作为正例 fixture |
| JSON validator | 已完成最小静态校验器 | `pnpm --silent validate`（等价于 `pnpm --silent validate:fixture fixtures/meeting-summary-assistant --format json`）可输出正例 JSON artifact |
| 本地静态矩阵 gate | Phase 1 已完成，需防回归 | `pnpm --silent validate:all`（等价于 `pnpm --silent validate:fixture:matrix`）当前 6/6 通过；输出 human-readable matrix summary |
| 正例静态验证 | 通过 | `docs/static-mvp-validation-report.md` 记录 `meeting-summary-assistant`、`study-card-assistant` 与 `release-notes-assistant` 单 fixture 均 exit `0`、各 15 条规则全 pass；`validate:fixtures` 当前 `totalFixtures=3`、`passedFixtures=3` |
| Phase 2A schema/profile 文档契约 | 已完成最小契约 | `docs/phase-2-schema-and-fixtures.md` 定义 `simple | standard | advanced-reserved`、扁平 fixture 目录、schema/report 字段候选与 pending 边界 |
| 第二个 simple fixture | 已完成静态正例 | `fixtures/study-card-assistant/**` 非会议类学习卡片样本，单 fixture 静态验证通过 |
| 首个 standard fixture | Phase 2D 已完成静态正例 | `fixtures/release-notes-assistant/**` 发布说明整理样本，包含 `templates/` 与 `examples/`，单 fixture 静态验证通过，profile=`standard` |
| 多正例静态入口 | 已完成最小入口 | `pnpm --silent validate:fixtures` 默认扫描当前三个完整正例 fixture；显式路径模式也通过；继续作为 multi-fixture JSON artifact 入口 |
| 本地总入口编排 | Phase 2B 已完成 | `pnpm --silent validate:all` 顺序运行 `validate:fixtures` 与 `validate:fixture:matrix`；即使正例阶段失败也继续运行矩阵，最终聚合 exit code；不输出 suite JSON |
| Phase 2E 最小 contract tests | 已完成最小脚本化覆盖 | `pnpm --silent validate:contracts` 以纯 Node 脚本断言 single-fixture JSON、multi-fixture JSON、`validate:all` 关键 stdout 与 matrix 关键 stdout；不引入测试框架，不修改 validator 语义 |
| 关键反例静态验证 | 已有证据 | 缺 description、secret/private path、伪 replay、缺 7 维 checklist 等反例均能失败并输出合法 JSON |

### 1.2 仍未完成 / PENDING

| 能力 | 当前状态 | 为什么不能宣称已完成 |
|---|---|---|
| 运行时模型回放 | PENDING | 目前只有静态 replay 诚实性检查、provider adapter seam 的 contract-first 接缝，以及 runtime draft 中受限的 provider-less transcript evidence 表达；adapter result 现在虽已更接近真实中间 truth payload，并把 `rawResponse` / `providerExecution` / `transcriptAvailability` 同源透传，selection lineage 也已收紧为内部 `adapter -> runner -> observed mapper -> report` 单一路径，但 availability / providerManaged / providerTranscript / persistence / providerMetadata.transcriptPersistence 目前都仍只是 reserved attach-point contract，provider-backed reserved slot 字段仍被故意收紧为 `false/null/reserved` 占位，没有真实 provider-backed runtime replay、真实 provider call、provider transcript、transcript persistence、observed 执行证据和人工/自动评分 |
| 跨平台兼容 | PENDING | 当前证据来自 Linux + 当前 Node/pnpm 环境，未覆盖 macOS/Windows 路径、shell、换行与权限差异 |
| 跨模型兼容 | PENDING | 未验证不同模型对同一 skill 的触发、边界遵循、输出稳定性 |
| 隐私 evidence 去重 | Phase 1 已完成，需防回归 | 同文件、同脱敏 detail、同 pattern kind 的 privacy evidence 已去重，且 secret/private path 反例仍阻断；后续只跟踪回归与覆盖扩展 |
| checklist 多来源聚合语义说明 | Phase 1 已完成，需防回归 | 规则说明与 README 已明确多来源聚合覆盖七维，不是单文件 exactly once；后续只跟踪回归与多 fixture 泛化 |
| 本地正反例矩阵脚本 | Phase 1 已完成，需防回归 | `pnpm --silent validate:fixture:matrix` 是独立静态矩阵入口；当前覆盖正例 baseline 与 5 类代表性反例，最新口径为 6/6 gate；`validate:all` 会调用它 |
| 完整生成器 | PENDING | 还不能从任意 workflow 自动生成完整 skill 文件树 |
| UI | PENDING | 尚无可视化录入、审核、回放、发布界面 |
| CI | 已完成最小 Linux GitHub Actions gate | `.github/workflows/ci-minimal-gate.yml` 已接入 `pull_request` 与 `push to main`，运行 `pnpm install`、`pnpm --silent validate:all` 与 `pnpm --silent validate:contracts`；当前仅代表 static validation minimal gate，不等于 runtime replay / schema engine / cross-platform / cross-model 已完成 |
| 多 fixture / 多平台 / 多模型系统矩阵 | 部分完成 / 其余 PENDING | Phase 2A 已有两个 simple 正例、一个 standard 正例与 `validate:fixtures` 多正例静态入口；advanced fixture、CI、跨平台、跨模型系统矩阵仍属后续 Phase 2+ |
| Phase 7 generator real implementation | 文档入口已建立，实施未开始 | `docs/phase-7-generator-real-implementation-entry-hub.md` 与 `docs/phase-7-generator-real-implementation-subplan-task-index.md` 已建立正式入口与原子任务索引；当前仅表示 generator 的 docs-level 实施入口已归位，不代表 generator 已实现完成 |

### 1.3 当前边界判定

- 可以说：SkillForge 已完成“文档设计闭环 + 单 fixture 静态 MVP + JSON validator + 两个 simple 正例与一个 standard 正例静态验证 + Phase 2A 最小多正例入口 + Phase 3 provider adapter seam/runtime draft/provider-less transcript evidence 的受限合同表达”，并且 provider-backed reserved seam 下已具备 same-source stub `executionId / providerRunId / providerStatus` metadata 透传，以及 reserved-only rawResponse / transcript / transcript persistence seam 字段的同源传播边界说明；其中 `providerStatus` 只停留在 metadata / execution seam，不进入 public case status 集合。
- 不可以说：SkillForge 已完成真实模型回放、provider-backed runtime replay、真实 provider execution、真实 provider raw payload capture/retrieval、provider transcript、provider transcript retrieval、transcript persistence、完整生成器、完整产品验收、跨平台/跨模型兼容；也不可以把 stub `executionId / providerRunId / providerStatus`、任何 `rawResponse.summary / handle`、任何 `transcriptAvailability` / `providerMetadata.transcriptPersistence`、或任何 `transcriptRef.handle / providerManaged / providerTranscript / persistence` 字段宣称成真实 provider execution / raw payload / transcript / persistence evidence；同样也不能把这些 stub / reserved seam 字段解释成新的 public case status 或 validate 默认链路已开放 provider-backed path。
- 后续所有报告必须区分：`static_checked`、`runtime_replay_pending`、`cross_platform_pending`、`product_pending`。

## 2. 最终形态愿景

SkillForge 的最终形态是一个把 workflow、经验、对话、代码规则沉淀为可复用 AI skill 的系统，覆盖：

```text
workflow/经验输入
  -> 结构化抽取 WorkflowSource
  -> 规格化 SkillSpec
  -> 生成 SkillManifest + SKILL.md + 附属资源
  -> 静态验证 ValidationResult
  -> 真实模型回放与评估
  -> 人工/自动验收 AcceptanceRecord
  -> 发布到 registry / 团队空间
  -> 使用反馈与 10 轮/持续优化
  -> 新版本 skill
```

最终系统应具备：

1. **输入收集**：支持手写 workflow、对话摘要、项目规则、代码片段、历史 skill 样本。
2. **结构化规格化**：抽取目标、触发、输入输出、权限边界、隐私等级、成功标准。
3. **skill 生成**：生成 `SKILL.md`、frontmatter、清晰触发描述、正文流程、边界、检查清单和必要附属文件。
4. **静态验证**：检查结构、触发、边界、依赖、回放声明、隐私、兼容七维规则。
5. **真实模型回放**：用正例/反例驱动真实模型执行，记录 transcript、observed、评分和失败原因。
6. **验收与发布**：支持 PASS / FAIL / ACCEPT_WITH_RISKS，发布到本地、团队 registry 或其他分发渠道。
7. **持续优化**：基于使用日志、回放失败、人工反馈和版本 diff 进行持续改进。
8. **团队协作**：支持评审、权限、版本、所有者、变更记录、风险豁免和回滚。

## 3. 阶段路线

### Phase 0：文档闭环与静态 MVP（已完成）

**目标**

建立 SkillForge 的概念、数据结构、流程、验收标准、优化闭环，并完成一个可复现的单 fixture 静态 MVP。

**主要产物**

- `docs/data-structure.md`
- `docs/workflow.md`
- `docs/acceptance.md`
- `docs/acceptance-result.md`
- `docs/optimization/round-01.md` 至 `round-10.md`
- `fixtures/meeting-summary-assistant/**`
- JSON 静态 validator
- `docs/static-mvp-validation-report.md`

**任务列表**

- [x] 定义核心实体：`WorkflowSource`、`SkillSpec`、`SkillManifest`、`GenerationRun`、`ValidationResult`、`AcceptanceRecord`、`OptimizationRound`、`AnalysisDocument`、`SampleSkill`。
- [x] 定义端到端流程：收集、规格化、生成、验证、验收、优化、分析。
- [x] 定义 7 维验收：结构、触发、边界、依赖、回放、隐私、兼容。
- [x] 完成 10 轮优化分析。
- [x] 创建单个正例 fixture。
- [x] 实现最小静态 validator 与 JSON 输出。
- [x] 固化正例静态验证报告。

**验收标准**

- 文档闭环可解释从 workflow 到 skill 的完整链路。
- 单 fixture 静态校验 exit `0`。
- JSON report 包含版本、summary、checks、findings/evidence 等关键字段。
- 关键反例能以非 0 exit 和合法 JSON 报告失败。

**风险**

- 静态验证容易被误解为运行时验证。
- 单 fixture 可能导致规则过拟合。
- 文档与实现可能随迭代漂移。

**退出条件**

已满足。后续进入 Phase 1 时必须保持 Phase 0 证据可复现，不得把 pending 能力写成已完成。

---

### Phase 1：稳定静态 validator 与开发体验

**目标**

把当前最小 validator 从“能跑”稳定为“可维护、可诊断、适合开发者日常使用”的工具。

**主要产物**

- 稳定 CLI 参数与退出码约定。
- 规则清单与规则 ID 文档。
- 更清晰的 JSON report schema 草案。
- evidence 去重和诊断可读性优化。
- checklist 多来源聚合语义说明。
- 本地开发指南。

**任务列表**

1. 固化命令契约：输入 fixture 路径、`--format json`、exit code、stdout/stderr 责任。
2. 梳理规则注册表：每条规则包含 ID、dimension、severity、scope、失败条件、修复建议。
3. 明确 P0/P1/P2 策略：P0 阻断，P1 默认阻断或需明确豁免，P2 warning。
4. [x] 实现 evidence 去重：privacy evidence 按同文件、脱敏 detail、pattern kind 合并，避免重复噪音且不降低 P0 检出。
5. [x] 明确 checklist 聚合语义：说明来自 manifest、validation、README、SKILL.md 等来源的聚合逻辑。
6. 优化错误信息：让失败报告能直接指导 fixture 作者修复。
7. 增加开发者文档：如何创建 fixture、如何运行校验、如何解释报告。
8. 防止规则过拟合：标注 generic 与 fixture-profile 规则，避免业务关键词硬编码。
9. [x] 新增本地正反例矩阵脚本，覆盖正例 baseline、缺 description/trigger、secret/token、private path、伪 replay、全来源缺 compatibility。

**验收标准**

- 正例 fixture 继续通过。
- 已有反例矩阵继续失败，且 evidence 无明显重复噪音。
- 每个 `checks[].id` 都能在规则清单中找到定义。
- checklist 聚合逻辑在文档和报告诊断中一致。
- 重复运行同一命令，summary 与 checks 状态稳定。

**风险**

- 过早设计复杂 schema，拖慢后续 fixture 扩展。
- 为了美化报告弱化 P0/P1 阻断能力。
- 规则说明和代码实现继续漂移。

**退出条件**

Phase 1 正在收敛：evidence 去重、本地矩阵脚本、checklist 聚合语义同步已完成；但仍不宣称进入 Phase 2 完成状态。

- validator 输出契约稳定。
- 规则清单、报告字段、开发指南三者一致。
- 静态 MVP 的正例与关键反例可持续复现。

---

### Phase 2：多 fixture 与 schema/CI

**目标**

从单 fixture 扩展到多类型 fixture，用 schema 与 CI 把静态质量变成可持续门禁。

**主要产物**

- 多 fixture 集合：至少覆盖 simple、standard，后续准备 advanced。
- Fixture schema / report schema。
- CI workflow 或等价自动化入口（最小 Linux GitHub Actions gate 已落地）。
- 自动化反例矩阵。
- 兼容性基础矩阵：Node/pnpm 版本、Linux 优先，预留 macOS/Windows。

**任务列表**

1. 新增至少 2 个非会议类 simple fixture，验证规则通用性。
2. 新增 1 个 standard fixture，包含必要附属目录，例如 `templates/` 与 `examples/`。（Phase 2D 已完成 `release-notes-assistant`；后续可继续扩展更多 standard/advanced 样本。）
3. 抽象 fixture schema：ID 链、entry、manifest、validation、replay cases、privacy 声明。
4. 抽象 report schema：版本、环境、summary、checks、findings、pending 项。
5. [x] 建立最小 CI：GitHub Actions 在 `pull_request` 与 `push to main` 中运行 `pnpm install`、`pnpm --silent validate:all` 与 `pnpm --silent validate:contracts`，作为 static validation minimal gate。
6. 建立 snapshot 或 contract test：稳定 JSON 关键字段，避免报告随意变形。
7. 将静态验证报告生成纳入发布前步骤。
8. 按来源和复杂度标注 fixture，避免样本偏置。

**验收标准**

- 全部正例 fixture 静态验证通过。
- 反例矩阵在 CI 中稳定失败且输出合法 JSON。
- schema 能捕获结构性错误。
- CI 能阻断 P0/P1 失败。
- 报告明确区分静态通过与运行时 pending。

**风险**

- fixture 数量扩张导致维护成本上升。
- schema 过严导致真实 skill 难以接入；过松又失去质量门禁。
- CI 只覆盖 Linux，跨平台问题继续隐藏。

**Phase 2A 契约状态（固化中，不代表 Phase 2 完成）**

- Phase 1 的 `pnpm --silent validate`、`pnpm --silent validate:fixture:matrix` 与 Phase 2B 的 `pnpm --silent validate:all` 在本地继续通过，且最新结果已回写验证报告。
- owner master plan、static report、README、validator contract 对验证入口和 static-only 边界保持一致。
- evidence 去重、checklist 聚合语义、本地反例矩阵均有防回归口径，不再被列为未完成能力。
- schema/profile 最小契约已固化：`simple | standard | advanced-reserved`、`fixtures/<fixture-id>/` 扁平目录、profile 推荐声明位置和 schema 字段候选。
- 第二个非会议类 simple fixture `study-card-assistant` 已创建并通过单 fixture 静态验证：主题为公开/虚构/合成学习材料转问答学习卡片，用于验证 trigger 与隐私规则不只围绕会议样本过拟合；runtime replay、跨平台、跨模型仍 pending。
- `validate:fixtures` 已实现为 Phase 2A 最小多正例静态入口：默认扫描当前三个完整 fixture，显式路径模式通过，multi report 当前 `totalFixtures=3`、`passedFixtures=3`、`failedFixtures=0`。
- `validate:all` 已实现为 Phase 2B 本地总入口：解析 `validate:fixtures` JSON 并打印 compact summary，再运行独立 matrix；任一阶段失败则总入口失败。
- Phase 2D 已新增 `release-notes-assistant` standard fixture：发布说明整理主题，profile 透传为 `standard`，包含 `templates/release-notes-template.md` 与 `examples/synthetic-changelog.md`，仍保持 static-only、权限全关闭、无外部依赖。
- Phase 2E 已补上最小 contract test 入口：`validate:contracts` 固定当前 static MVP JSON/stdout 关键 contract，避免 report shape 与 aggregate markers 无意漂移；不引入新测试框架。
- Phase 2F 已落地最小 Linux GitHub Actions gate：`.github/workflows/ci-minimal-gate.yml` 在 `pull_request` 与 `push to main` 运行 `pnpm install`、`pnpm --silent validate:all` 与 `pnpm --silent validate:contracts`，作为 static validation minimal gate。
- 仍未完成 schema engine、profile blocking rule、runtime replay、cross-platform、cross-model；不得宣称 Phase 2 完成。
- 进入 Phase 2 后续小计划必须明确：新增 fixture 范围、schema 草案边界、CI 入口是否只是规划还是已落地。

**首批小计划建议**

1. 多 fixture 扩展小计划：继续扩展 simple/standard fixture；当前已新增 `study-card-assistant` simple 与 `release-notes-assistant` standard，只宣称静态通过。
2. Schema/contract 小计划：抽象 fixture schema 与 report schema，保持 `validate` JSON artifact 兼容。
3. CI gate 小计划：已把本地总入口 `validate:all` 与 `validate:contracts` 接入最小 GitHub Actions PR/main gate；后续仍需扩展 schema engine、runtime replay 与更广泛平台矩阵，不能把这个 CI gate 解释成这些能力已完成。
4. Snapshot/contract test 小计划：固定关键 JSON 字段，避免 runtime metadata（如 `generatedAt`）导致脆弱测试。

**退出条件**

- 多 fixture 证明规则非单样例过拟合。
- schema 与 validator 实现对齐。
- CI 成为静态质量基线。

---

### Phase 3：真实模型回放与评估

**阶段收口说明（contract-first closeout）**

Phase 3 的 synthetic/provenance 这一波工作已经到达自然收口点：`synthetic provider pipeline`、`acceptance provenance`、`provenanceSummary` 以及相关 provenance contract 文档都已完成收口；当前不建议继续追加测试，也不继续向真实 provider execution 方向扩面。

**follow-up 复评入口**
- `docs/phase-3-followup-runtime-replay-readiness-reassessment.md`
- 该页用于判断 contract closeout 后是否已具备真实 runtime replay 承接入口，只做 readiness reassessment，不做实现结论。

**为什么此时收口**
- 边际收益低：继续往下做只会得到小幅文档/测试增量
- 约束边界已触顶：当前 contract 已把可表达范围收紧到位
- 测试追加不划算：不适合为了 closeout 再扩一轮验证面

**已完成**
- synthetic provider pipeline
- acceptance provenance
- `provenanceSummary`
- provenance contract 文档

**明确保留未完成**
- 真实 provider execution
- transcript capture
- persistence
- scoring
- sandbox
- multi-case
- passed path

**重新开启条件**
- 放松真实 provider 边界，允许接入真实 provider execution / transcript / persistence 链路
- 或进入下一阶段设计，需要在新的 contract 下重新拆分最小实现切口

> provenance contract 进一步固化见 `docs/phase-3-provenance-contract.md`：统一 synthetic provider pipeline、synthetic acceptance provenance 与 final report `metadata.provenanceSummary` 的 disclosure boundary；其中 informational-only 字段不得参与 decision，也不得被误读为真实 provider execution、transcript capture、persistence 或 scoring 已实现。

> 当前进度口径：Phase 3 目前只完成到 **provider adapter seam + runtime draft CLI + preflight→single-case dry/null runtime skeleton orchestration**。这代表独立 runtime draft 入口与 provider adapter seam 的 contract-first 接缝已存在，但仍然不是 provider-backed runtime、不是 provider transcript、不是 transcript persistence、不是正式 gate，也没有接入 `validate:all` / `validate:contracts` / `validate:preflight` 默认链路。
>
> 重要边界：当前“静态 MVP / Phase 2A 多正例静态入口 / Phase 2B 本地总入口通过”只表示当前 fixtures 与静态 validator 在当前环境下验证通过；**不等于真实模型回放通过，不等于跨平台/跨模型兼容通过，也不等于完整产品 PASS**。

### Phase 4：Skill 生成器

**目标**

实现从 workflow/经验输入到 skill 文件树的生成器，让 SkillForge 不只是验证已有 fixture，而是能生产新 skill。

**Phase 4 planning skeleton**

- 规划骨架已新增：`docs/phase-4-planning-skeleton-v0.md`
- 输入契约冻结已新增：`docs/phase-4-workflow-spec-input-contract.md`
- 该文档冻结 Phase 4 的最小输入契约、最小产物契约、validator/runtime/docs contract 依赖映射与 M4.1~M4.3 里程碑
- 当前仅作 skeleton 规划，不代表生成器、包装器、UI、registry 或 runtime 已完成
- M4.3 状态已额外回写到 `docs/phase-4-m43-status.md`
- M4.1 schema-only 实际落地点已完成：`workflow-source` 最小 schema 在 `src/skillforge/schema.mjs`，独立 contract tests 在 `scripts/test-workflow-source-contracts.mjs`；这不接默认 `validate:all` / `validate:contracts` 主链路
- M4.2 的静态样本已落地：fixture `meeting-summary-assistant` 已有 generated manifest + generated `SKILL.md`，且独立 contract test 结果为 `PASS 13/13`。这仍然只代表 static synthesis / static-only，不代表完整生成器、runtime pass 或 UI/registry/runtime 接入
- M4.3 的独立 packaging contract reconcile 已落地：`scripts/test-packaging-contract-reconcile.mjs` 已接上独立脚本并通过，happy path fixture 为 `meeting-summary-assistant`，对账覆盖 `generated/skill-manifest.yaml`、`generated/skill/SKILL.md`、`validation-result.yaml` 三份静态产物，当前测试结果为 `PASS 16/16`。CLI 只输出可读 `OK` / `FAIL`，失败非 0；这仍然只是 static packaging reconcile，不是完整 packaging pipeline，也不是 runtime pass

- Phase 4 已进入自然收口点：M4.1 / M4.2 / M4.3 均有独立 contract / reconcile 证据，边界已稳定收敛为 `static-only` / `contract-first`；详细 closeout 见 `docs/phase-4-closeout.md`。当前 Phase 4 的下一步，已经单独收束为 `docs/phase-4-generator-minimal-executable-chain-entry.md`、`docs/phase-4-generator-real-implementation-entry-plan.md` 与 `docs/phase-4-generator-implementation-task-breakdown.md`，只承接 generator 的最小可执行链路入口与执行清单，不把 UI / publish / registry / runtime 一锅端。
- Phase 7 已建立为 generator real implementation 的正式入口：`docs/phase-7-generator-real-implementation-entry-hub.md` 与 `docs/phase-7-generator-real-implementation-subplan-task-index.md`，仅表示 generator docs-level 实施入口已归位，不代表 generator 已实现完成。

**主要产物**

- WorkflowSource 输入格式。
- SkillSpec 生成/编辑流程。
- SkillManifest 与 `SKILL.md` 生成器。
- 附属资源生成策略。
- 生成后自动静态验证与可选运行时回放。
- 生成质量报告。

**任务列表**

1. 定义最小输入：标题、原始 workflow、上下文、目标用户、触发场景、权限边界、隐私等级。
2. 生成 `SkillSpec`：目标、触发、输入输出、约束、成功标准、validationPlan。
3. 生成 `SkillManifest`：entry、files、dependencies、permissions、compatibility。
4. 生成 `SKILL.md`：frontmatter、description 触发描述、流程、边界、检查清单、输出格式。
5. 支持 simple skill 优先，standard/advanced 必须有资源计划后再生成。
6. 接入静态 validator：生成后自动校验，不通过则返回修复建议。
7. 接入可选 runtime replay：有 replay cases 时执行或标记 pending。
8. 保存 `GenerationRun`：输入摘要、模型/模板版本、产物路径、验证结果。
9. 设计人工确认点：外发、写文件、网络、隐私内容不得默认进入公开产物。

**验收标准**

- 给定一个新 workflow，能生成一个 simple skill 文件树。
- 生成产物静态 validator 通过。
- 生成报告能追踪输入、生成过程、产物和验证结果。
- 隐私与权限边界不会被默认放宽。
- 失败时能给出可操作的修复建议，而不是只输出“生成失败”。

**风险**

- 生成器可能幻觉不存在的工具、路径或权限。
- 输入材料中的私密信息可能被带入公开 skill。
- 过度自动化会绕过人工确认点。
- 生成器为通过 validator 而写空泛模板，实际不可用。

**退出条件**

- 至少 3 个从不同 workflow 生成的 simple skill 静态通过。
- 至少 1 个生成 skill 完成真实模型回放。
- GenerationRun、ValidationResult、AcceptanceRecord 链路可追踪。

**M4.1 当前状态补记**

- schema-only 已落地，且当前只做 static contract freeze。
- 仍不做 builder/UI/registry/runtime，也不把 schema-only 误写成 runtime pass。

---

### Phase 5：发布 / registry / 团队协作与 UI（远期）

**follow-up 复评入口**

- `docs/phase-5-publish-registry-ui-real-implementation-entry-plan.md`


**目标**

把 SkillForge 从本地工具扩展为可协作、可发布、可治理的 skill 生产与分发系统。

**主要产物**

- Skill registry：本地/团队/远程索引。
- 发布流程：版本、变更记录、验收证据、风险声明。
- UI：输入、生成、验证、回放、评审、发布、历史版本。
- 团队协作：owner、reviewer、approval、risk waiver、rollback。
- 使用反馈与持续优化闭环。

**任务列表**

1. 设计 registry 元数据：name、version、description、entry、owner、tags、compatibility、checksums。
2. 定义发布门禁：静态验证必过；运行时回放按风险等级要求；隐私 P0 零容忍。
3. 支持团队评审：diff、证据、风险、评论、批准记录。
4. 支持安装/更新/回滚：版本选择、依赖检查、兼容提醒。
5. 建设 UI：workflow 输入、生成预览、validator 报告、replay transcript、发布状态。
6. 建立使用反馈：触发成功率、用户修正、失败原因、模型差异。
7. 支持持续优化：自动创建优化建议，不自动越权修改发布产物。
8. 建立权限和审计：谁生成、谁批准、谁发布、何时回滚。

**验收标准**

- 一个 skill 可以从生成到发布完成全链路记录。
- registry 中每个版本都能追溯 manifest、校验报告和验收结果。
- UI 不隐藏 P0/P1 风险，不把 pending 展示为 pass。
- 团队协作流程支持 review、approval、rollback。
- 发布后反馈能进入下一轮优化。

> 说明：Phase 5 当前已具备 docs-first / contract-first 入口，但真实实现仍需从最小切口承接；详见上方 follow-up 复评入口。

**风险**

- 发布系统可能造成错误 skill 大范围传播。
- 团队权限和隐私治理不足会带来安全风险。
- UI 简化术语后可能掩盖真实边界。
- registry 与本地文件版本不一致导致使用混乱。

**退出条件**

- 有受控团队试点完成端到端发布。
- 发布门禁能阻断 P0/P1 风险。
- 每个已发布 skill 都具备可追溯、可回滚、可复验能力。
