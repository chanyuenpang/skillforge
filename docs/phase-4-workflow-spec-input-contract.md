# Phase 4 Workflow → Spec 最小输入契约（WorkflowSource Frozen Contract）

> 这是一份 **最小输入契约冻结文档**，只用于 Phase 4 M4.1 的 planning / contract-first。先把“怎么说”钉死，再谈 schema、test、generator。
>
> 重要边界：**static pass ≠ runtime pass**。静态通过只表示字段、边界、契约和文档口径对齐；不代表生成器、runtime、UI、registry 已实现。
>
> 当前实际落地点已完成：`workflow-source` 最小 schema 已实现于 `src/skillforge/schema.mjs`，独立 contract tests 已落地于 `scripts/test-workflow-source-contracts.mjs`。
>
> 这版是 schema-only 冻结：不接默认 `validate:all` / `validate:contracts` 主链路。

## 1. 目标与边界

### 1.1 目标

本页冻结的是 `WorkflowSource` → `SkillSpec` 之前的 **最小输入契约**，用于后续 Phase 4 M4.1 的规划与 contract-first 实现。

这个契约只做三件事：

1. 约束 `workflow-source` 的最小字段集合；
2. 固定这些字段的语义、必填性和允许值；
3. 明确哪些字段会进入后续 `SkillSpec`，哪些只是上下文或边界信息。

当前这版只覆盖 schema-only 的静态冻结：已实现最小 schema 校验与独立测试入口，但**不接 builder/UI/registry/runtime**。

### 1.2 边界

- 这是 **WorkflowSource 最小输入契约冻结**。
- 仅服务 **Phase 4 M4.1 planning / contract-first**。
- 明确 **static pass ≠ runtime pass**。
- 不代表生成器、runtime、UI、registry 已实现。
- 不代表现在就能一键生成可发布 skill。
- 不代表 provider runtime、真实回放、发布流水线已接通。
- 不接默认 `validate:all` / `validate:contracts` 链路；当前只通过独立 `scripts/test-workflow-source-contracts.mjs` 验证。

### 1.3 术语约定

- **workflow-source**：原始 workflow / 经验输入的结构化入口。
- **SkillSpec**：从 workflow-source 抽象出的规格层。
- **static pass**：结构与契约检查通过。
- **runtime pass**：真实执行、真实观察、真实评估通过。

---

## 2. 字段清单（以 workflow-source 为主）

下面字段是 Phase 4 M4.1 建议冻结的最小输入契约。这里优先按 `workflow-source` 的角度定义，因为它是后续 spec 的输入源头。

### 2.1 顶层字段

| 字段名 | 必填 | 语义 | 约束 / allowed values |
|---|---:|---|---|
| `kind` | 是 | 实体类型标识，必须指向 workflow 源 | 固定为 `workflow-source` |
| `fixtureId` | 是 | 工作流样本/fixture 的稳定标识 | 小写短横线或下划线风格；在同一集合内唯一 |
| `fixtureVersion` | 是 | fixture 版本 | 建议 SemVer，如 `0.1.0` |
| `profile` | 否 | 复杂度/形态档位 | 推荐值：`simple`、`standard`、`advanced-reserved` |
| `name` | 是 | 工作流展示名 | 人类可读，简洁明确 |
| `summary` | 是 | 一句话说明该 workflow 做什么 | 必须能反映用途，不可空泛口号化 |
| `source` | 是 | 输入来源与契约主体 | 见下方 `source` 子字段 |
| `resources` | 否 | 仅在 `standard` 或更高形态时使用的附属资源声明 | 仅声明资源计划，不代表已生成 |
| `permissions` | 是 | 输入/执行边界声明 | 必须显式表达网络、外发、文件、破坏性操作等边界 |
| `dependencies` | 否 | 依赖声明 | 无依赖可显式声明 `noneDeclared: true` |
| `checklist` | 是 | 静态检查维度说明 | 需覆盖 structure / trigger / boundary / dependency / replay / privacy / compatibility |

> 当前实现边界：schema 只覆盖最小静态冻结面；builder、UI、registry、runtime 仍不在范围内。

### 2.2 `source` 子字段

| 字段名 | 必填 | 语义 | 约束 / allowed values |
|---|---:|---|---|
| `source.type` | 是 | 来源类型 | 推荐枚举：`public-fictional-sample`、`public-fictional-synthetic-sample`、`manual`、`doc`、`chat`、`code`、`mixed` |
| `source.language` | 是 | 原始材料语言 | 如 `zh-CN`、`en-US`；至少应能表达主要语言 |
| `source.inputContract.acceptedInputs` | 是 | 允许进入 workflow 的输入类型 | 列表；内容必须是可公开、可复用、可静态判断的输入类别 |
| `source.inputContract.rejectedInputs` | 是 | 明确拒绝的输入类型 | 列表；必须覆盖隐私、凭证、私有路径、未授权内容等高风险输入 |
| `source.outputContract.format` | 是 | 输出格式 | 当前最小契约固定以 `markdown` 为主 |
| `source.outputContract.sections` | 是 | 输出结构段落 | 列表；应能描述输出骨架，不要求一次穷举所有细节 |

### 2.3 `resources` 子字段

| 字段名 | 必填 | 语义 | 约束 / allowed values |
|---|---:|---|---|
| `resources.templates` | 否 | 模板资源清单 | 路径列表；仅在标准/更高档位使用 |
| `resources.examples` | 否 | 示例资源清单 | 路径列表；仅在标准/更高档位使用 |

### 2.4 `permissions` 子字段

| 字段名 | 必填 | 语义 | 约束 / allowed values |
|---|---:|---|---|
| `permissions.network` | 是 | 是否允许联网 | 必须显式布尔值；静态契约默认应为 `false` |
| `permissions.externalSend` | 是 | 是否允许外发消息/内容 | 必须显式布尔值；静态契约默认应为 `false` |
| `permissions.fileRead` | 是 | 是否允许读取文件 | 必须显式布尔值；静态契约默认应为 `false` 或明确受限 |
| `permissions.fileWrite` | 是 | 是否允许写文件 | 必须显式布尔值；静态契约默认应为 `false` |
| `permissions.destructiveOperations` | 是 | 是否允许删除/破坏性操作 | 必须显式布尔值；静态契约默认应为 `false` |
| `permissions.privatePathRead` | 是 | 是否允许读取私有路径 | 必须显式布尔值；静态契约默认应为 `false` |

### 2.5 `dependencies` 子字段

| 字段名 | 必填 | 语义 | 约束 / allowed values |
|---|---:|---|---|
| `dependencies.noneDeclared` | 否 | 是否声明无外部依赖 | 推荐布尔值；当无依赖时可为 `true` |
| `dependencies.items` | 否 | 依赖条目列表 | 列表；每项应是可审计的工具、服务或文件依赖 |

### 2.6 `checklist` 子字段

| 字段名 | 必填 | 语义 | 约束 / allowed values |
|---|---:|---|---|
| `checklist.structure` | 是 | 结构检查说明 | 必须说明 fixture / workflow-source / version / profile / 输入输出契约 |
| `checklist.trigger` | 是 | 触发检查说明 | 必须说明主题、使用场景或触发意图 |
| `checklist.boundary` | 是 | 边界检查说明 | 必须明确拒绝哪些敏感或私有输入 |
| `checklist.dependency` | 是 | 依赖检查说明 | 必须说明是否依赖外部服务、网络、本地私有数据源 |
| `checklist.replay` | 是 | 回放设计说明 | 仅描述静态回放设计；不等于真实 runtime |
| `checklist.privacy` | 是 | 隐私检查说明 | 必须明确只用公开、虚构或合成材料，或其他可公开材料 |
| `checklist.compatibility` | 是 | 兼容性检查说明 | 必须说明文档/格式/读取方式的兼容约束 |

---

## 3. 与现有 fixture 的逐字段对照

这一节不穷举所有 fixture，只总结目前 `fixtures/*/workflow-source.yaml` 里稳定、共性的字段模式。

### 3.1 共同稳定字段

目前三个 fixture 的共性大致是：

- 都有 `kind: workflow-source`
- 都有 `fixtureId`、`fixtureVersion`
- 都有 `name`、`summary`
- 都有 `source.type`、`source.language`
- 都有 `source.inputContract.acceptedInputs` / `rejectedInputs`
- 都有 `source.outputContract.format` / `sections`
- 都有 `permissions`，且都显式关闭高风险能力
- 都有 `checklist`，且覆盖 structure / trigger / boundary / dependency / replay / privacy / compatibility

### 3.2 逐字段对照表

| 契约字段 | meeting-summary-assistant | study-card-assistant | release-notes-assistant | 稳定性结论 |
|---|---|---|---|---|
| `kind` | `workflow-source` | `workflow-source` | `workflow-source` | 稳定 |
| `fixtureId` | 有 | 有 | 有 | 稳定 |
| `fixtureVersion` | 有 | 有 | 有 | 稳定 |
| `profile` | 未显式声明 | `simple` | `standard` | 作为分层字段有效，但不是所有 fixture 都写 |
| `name` | 有 | 有 | 有 | 稳定 |
| `summary` | 有 | 有 | 有 | 稳定 |
| `source.type` | `public-fictional-sample` | `public-fictional-synthetic-sample` | `public-fictional-synthetic-sample` | 稳定，且属于来源分型 |
| `source.language` | 有 | 有 | 有 | 稳定 |
| `source.inputContract.acceptedInputs` | 有 | 有 | 有 | 稳定 |
| `source.inputContract.rejectedInputs` | 有 | 有 | 有 | 稳定 |
| `source.outputContract.format` | `markdown` | `markdown` | `markdown` | 稳定 |
| `source.outputContract.sections` | 有 | 有 | 有 | 稳定 |
| `resources` | 无 | 无 | 有 | 说明 resources 不是所有 fixture 的必需字段 |
| `permissions.network` | false | false | false | 稳定 |
| `permissions.externalSend` | false | false | false | 稳定 |
| `permissions.fileRead` | false | false | false | 稳定 |
| `permissions.fileWrite` | false | false | false | 稳定 |
| `permissions.destructiveOperations` | false | false | false | 稳定 |
| `permissions.privatePathRead` | false | false | false | 稳定 |
| `dependencies.noneDeclared` / `items` | 有 | 有 | 有 | 稳定 |
| `checklist.structure` | 有 | 有 | 有 | 稳定 |
| `checklist.trigger` | 有 | 有 | 有 | 稳定 |
| `checklist.boundary` | 有 | 有 | 有 | 稳定 |
| `checklist.dependency` | 有 | 有 | 有 | 稳定 |
| `checklist.replay` | 有 | 有 | 有 | 稳定 |
| `checklist.privacy` | 有 | 有 | 有 | 稳定 |
| `checklist.compatibility` | 有 | 有 | 有 | 稳定 |

### 3.3 从 fixture 反推的字段结论

1. **`kind`、`fixtureId`、`fixtureVersion`、`name`、`summary` 是最稳定的入口字段。**
2. **`source.inputContract` / `outputContract` 是当前最强的契约表达区。**
3. **`permissions` 必须显式，且默认保守。**
4. **`checklist` 不是装饰项，而是静态约束的一部分。**
5. **`profile` 有价值，但不是所有 fixture 都强制声明的历史事实；因此在冻结契约时应作为推荐字段，而不是强行把历史 fixture 改写成统一形态。**
6. **`resources` 只对标准/更高形态有意义；simple fixture 不必强制带它。**

---

## 4. 与 SkillSpec 的最小映射关系

这一节只定义最小映射，不把 workflow-source 直接等同于 SkillSpec。

### 4.1 会进入后续 SkillSpec 的字段

这些字段通常会被抽象到 SkillSpec：

- `name` → `displayName` / `name`
- `summary` → `goal` / 触发描述草案
- `source.type` → `domain` / 来源语境参考
- `source.language` → `locale` / 文档语言偏好
- `source.inputContract.acceptedInputs` → `inputs`
- `source.outputContract.sections` → `outputs`
- `permissions` → `permissionBoundary`
- `dependencies` → `toolBoundary` / `dependencies`
- `checklist.trigger` → `triggerScenarios`
- `checklist.boundary` → `constraints`
- `checklist.dependency` → `validationPlan`
- `checklist.replay` → `validationPlan`
- `checklist.privacy` → `constraints` / `validationPlan`
- `checklist.compatibility` → `validationPlan` / `compatibility notes`

### 4.2 仍然只是上下文或边界信息的字段

这些字段通常不直接进入 SkillSpec 主体，而是作为上下文、来源或治理信息保留：

- `fixtureId`：更偏向输入样本标识，不等于 skill 标识。
- `fixtureVersion`：样本版本，不等于 skill 版本。
- `profile`：用于决定生成复杂度策略，但不是 skill 本体目标。
- `source.type`：作为来源语境保留，不应直接伪装成 skill 业务领域定义。
- `source.language`：语言上下文，通常是生成约束，不是 skill 核心内容。
- `resources.templates` / `resources.examples`：更像附属资源计划，不是核心目标字段。

### 4.3 最小映射原则

1. **WorkflowSource 负责“事实输入”**，SkillSpec 负责“抽象意图”。
2. **输入契约里的 accepted / rejected 只是边界材料**，不等于 skill 的最终输入输出清单。
3. **permissions 是治理边界，不是运行能力声明。**
4. **checklist 是静态验证线索，不是 runtime pass 证据。**
5. **profile 只决定生成策略，不自动升级成能力声明。**

---

## 5. 非目标与误读防护

### 5.1 非目标

- 不开 runtime pass。
- 不开 provider runtime。
- 不把 static pass 说成 runtime pass。
- 不代表可一键生成可发布 skill。
- 不代表 registry、UI、发布流水线、评分器已可用。
- 不代表 `workflow-source` 已经等于 `SkillSpec`。

### 5.2 常见误读与纠偏

| 误读 | 正确说法 |
|---|---|
| “字段齐了就说明能运行” | 只是静态契约齐了，不代表 runtime pass。 |
| “有 replay 字段就说明支持真实回放” | 这里只是静态回放设计位，不代表真实 provider runtime。 |
| “standard profile 就是已完成高级生成” | 只是样本/输入档位，不等于生成器能力已实现。 |
| “permissions 写了 false 就说明系统已经有权限控制” | 这里只是契约声明，不是运行时 enforcement 证明。 |
| “resources 出现就说明附属资源已生成” | 这里只是资源计划，不代表产物已存在。 |

### 5.3 必须写死的防误读句

建议在后续相关文档里保留下面这类表述：

- “这是一份输入契约，不是实现声明。”
- “static pass ≠ runtime pass。”
- “replay 设计不等于真实 runtime。”
- “profile / resources / checklist 只是治理和规划信息，不代表已实现。”

---

## 6. 文档回链

本契约与以下文档保持一致，并应作为后续 Phase 4 文档的输入参考：

- `docs/phase-4-planning-skeleton-v0.md`
- `docs/workflow.md`
- `docs/data-structure.md`
- `docs/roadmap.md`

### 6.1 推荐回链说明

- `docs/phase-4-planning-skeleton-v0.md`：定义 Phase 4 的大骨架、边界与里程碑。
- `docs/workflow.md`：定义端到端流程中 WorkflowSource → SkillSpec 的位置。
- `docs/data-structure.md`：定义核心实体字段和关系，是字段语义的主账本。
- `docs/roadmap.md`：定义当前阶段与长期路线，确保本契约不越权。

---

## 7. 本次冻结结论

本页冻结的最小共识是：

1. `workflow-source` 是 Phase 4 的最小输入入口。
2. 输入契约要先固定字段、边界、允许值，再谈 schema/test。
3. 目前稳定公共字段已经足够支持 M4.1 的 planning / contract-first。
4. `profile` 与 `resources` 是分层信息，不应把 simple fixture 强行改写成统一形态。
5. **static pass ≠ runtime pass**，这条边界不能被文档绕过去。
6. 当前 schema-only 已落地，独立 contract tests 已可直接引用，不需要接入默认 validate 主链路。
