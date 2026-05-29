# ADR: SkillForge `betterPlan` / `betterPrompt` 与自用 CLI 的收敛式重构边界

## Status

accepted

## Context

本次计划把 SkillForge 的产品定义进一步收口为：对上游 agent 已经产出的 `plan_write` 输入原文与 subagent prompt 原文做收敛式优化，而不是再扩展成更重的治理平台。该计划已完成并进入 `end.completed`，因此以下决策从“方案”升级为长期约束。计划明确指出：

- `betterPlan` 的输入主体是 `plan_write` 输入原文。
- `betterPrompt` 的输入主体是 subagent prompt 原文。
- CLI 对外只暴露 `betterPlan` / `betterPrompt`，不暴露旧的 `reviewXxx` 命名。
- 第一版不做 UI、不做审批中心、不做大而全的 bundle / registry 治理层。
- 实现策略是收敛式重构，不是推倒重做。
- 必须包含真实样本回归验证环节。

这意味着后续实现的关键，不是继续增加对象层，而是把 `register / search / output` 收紧到 MVP 输入边界，让 `betterPlan` 与 `betterPrompt` 成为可直接通过 CLI 调用的稳定工具。

## Decision

决定将 SkillForge 在这一条线上的长期实现边界固定为：

1. **实现策略固定为收敛式重构，并继承 `ADR-0107` 的「定义驱动实现」原则**
   - 允许复用旧内核，但必须按新边界重切输入/输出契约。
   - 不再以“补全平台能力”为目标扩展对象层。
   - 重构目标是把现有能力收敛成可用的 `betterPlan` / `betterPrompt` 工具。
   - `register/search/output` 的边界由 `betterPlan` / `betterPrompt` 的定义反推，而非反过来迁就内核的现有接口。

2. **`betterPlan` 与 `betterPrompt` 的输入边界固定，输出必须对齐 `ADR-0107` 模板**
   - `betterPlan` 直接处理 `plan_write` 输入原文（自由文本），输出按 ADR-0107 的 5 块模板映射：Task Objective → Boundary → Execution Skeleton → Success & Deliverables → Prompt Budget Control。
   - `betterPrompt` 直接处理 subagent prompt 原文。
   - 输入侧不提前抽取过多字段，避免把流程完整度误当作产品价值。
   - 模板块映射失败时输出缺失标记，不虚假填充。

3. **`register / search / output` 只服务必要骨架与约束，粒度按 ADR-0107 模板块切割**
   - `register` 只提炼必要字段与可复用资产。
   - `search` 只匹配与当前输入强相关的模板块级对象，而不是一次匹配整篇 plan。
   - `output` 只注入当前模板块的必要槽位，不提前生成整篇答案。
   - 这些模块要围绕最小模板与输出质量工作，而不是做大而全的治理层。

4. **CLI 是对外唯一稳定入口（确认 ADR-0107 第 6 条命名规则）**
   - 对外命令只保留 `betterPlan` / `betterPrompt`。
   - `reviewPlan` / `reviewSubagentPrompt` 不作为对外固定命名。
   - 自用 CLI 的职责是把这两个能力稳定暴露出来，供本地直接调用。
   - 这一命名规则与 ADR-0107 的第 6 条完全一致，互相确认。

5. **必须保留真实样本回归验证**
   - 回归验证必须使用真实 `plan_write` 原文样本与 subagent prompt 原文样本。
   - 验证重点是工具是否真正可用，且不会显著膨胀输出。
   - 样本库是持续测试集，不是结构化摘要替代输入。

6. **betterPrompt 内部入口签名统一：`buildBetterPromptV1` 为唯一契约中心，`buildBetterPromptPackage` 为 alias，`buildBetterPromptFromRawText` 为 raw adapter 并执行白名单校验**
   - `buildBetterPromptV1(input)` 是 betterPrompt 的唯一真实实现中心。所有输入必须走这个标准对象 shape 的入口。
   - `buildBetterPromptPackage` 仅保留为 `buildBetterPromptV1` 的 alias，不承担独立逻辑。后续可添加 `deprecated` 标注。
   - `buildBetterPromptFromRawText(text, optionsBag)` 只作为 raw adapter 存在，把原始文本与 options 转换为标准 input 对象后委托给 `buildBetterPromptV1`。
   - 对 `buildBetterPromptFromRawText` 的 `optionsBag`，未知字段必须报错（而不是静默忽略），以防止调用方误以为字段已生效。目前对白名单外的 `options` 直接抛出异常。
   - 这条约束消除的是历史调用方因参数错位产生 `undefined` / shape 漂移的长期隐患。
   - 验证锚点：专项回归覆盖 5 个入口（verify-betterprompt-v1、test-betterprompt-builder、test-betterprompt-contract、test-betterprompt-raw-input、test-betterprompt-qc），全部通过。唯一阻塞是旧 contract 测试 fixture 缺失 `delivery_package` 字段，补齐后全绿。

## Alternatives Considered

- **推倒重做，重新设计全套平台**：被拒绝。计划已明确当前阶段应做收敛式重构，而不是把问题再放大成平台工程。
- **继续扩展审批中心 / UI / bundle 治理层**：被拒绝。当前阶段这些层会偏离核心痛点，且会拖慢 `betterPlan` / `betterPrompt` 的可用化。
- **把 `reviewXxx` 固定成新产品对外名**：被拒绝。计划明确要求对外统一使用 `betterPlan` / `betterPrompt`。
- **取消真实样本回归，只做静态定义**：被拒绝。真实样本回归是验证工具是否可用的必要约束。
- **保持 `buildBetterPromptFromRawText` 对未知 `options` 静默忽略**：被拒绝。静默忽略会导致调用方误以为字段已生效，实际 shape 漂移更难排查。必须报错。
- **把 `buildBetterPromptFromRawText` 直接暴露为外部入口**：被拒绝。它只应是 raw adapter，真正的契约中心应当是 `buildBetterPromptV1(input)` 的标准对象签名。

## Related Code

| Path | Role |
| ---- | ---- |
| `plan.json` | 本次计划源记录，包含 `betterPlan` / `betterPrompt` / CLI 收敛边界与回归验证要求。 |
| `.claw/truth/features/betterworkflow-betterprompt-product-retrospective-2026-05-29.md` | 复盘来源，确认 SkillForge 应回到优化与规范化引擎定位。 |
| `adr/ADR-0103-skillforge-product-shape-registry-workflow-prompt-bundle-run-center-complete-path.md` | 既有产品主路径约束，提供 `Skill Registry -> betterWorkflow -> betterPrompt -> skill bundle -> Run Center` 的上层背景。 |
| `adr/ADR-0107-betterplan-evaluation-criteria-and-minimum-template.md` | `betterPlan` 的评价标准与最小模板，作为输入/输出收口的评价基线。 |
| `betterPrompt 源码（buildBetterPromptV1 / buildBetterPromptPackage / buildBetterPromptFromRawText）` | 三个入口函数的调用面盘点与签名统一待处理清单。 |

## Consequences

- 正向：`betterPlan` / `betterPrompt` 的边界更清晰，便于直接做成稳定 CLI 工具。
- 正向：实现层可以继续复用旧内核，但不会被旧命名与旧流程拖回去。
- 正向：`register / search / output` 的职责被压缩到最小，减少膨胀风险。
- 取舍：短期内不会有完整平台形态，能力边界更克制。
- 取舍：`buildBetterPromptFromRawText` 对未知字段报错是安全策略，但对宽松调用方可能引入 breakage，需在调用方使用处同步修正。
- 风险：如果回归验证不严，收敛后的工具可能“看起来能用、实际不稳”。
- 验证锚点 1：必须用真实 `plan_write` / subagent prompt 样本跑通 CLI，并检查输出没有明显膨胀。
- 验证锚点 2：入口签名统一专项回归 5/5 全绿，旧测试 fixture 缺字段问题已作为独立 issue 记录，不影响 builder 本体判断。

## Search Terms

- `betterPlan`
- `betterPrompt`
- `plan_write`
- `subagent prompt`
- `register`
- `search`
- `output`
- `CLI`
- `真实样本回归`
- `buildBetterPromptV1`
- `buildBetterPromptPackage`
- `buildBetterPromptFromRawText`
- `optionsBag`
- `白名单校验`
