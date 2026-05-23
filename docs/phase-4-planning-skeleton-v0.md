# Phase 4 Planning Skeleton v0：Generator & Packaging

> 这是一页规划骨架，不是实现声明。目标是把 Phase 4 的最小输入契约、最小产物契约和依赖边界先钉死，供后续 Generator & Packaging 实现使用。
>
> 核心原则：**static pass ≠ runtime pass**。静态通过只说明结构、边界与契约满足；不代表真实运行、真实外发、真实 provider runtime 或真实验收已完成。

## 1. 目标与边界

Phase 4 的目标是把 `workflow / 经验输入` 规范化为可验证、可打包的 skill skeleton，至少覆盖：

- `workflow -> SkillSpec`
- `SkillSpec -> SkillManifest + SKILL.md`
- 生成后自动静态验证
- 生成产物与输入、验证结果之间的可追踪链路

本阶段只做 **planning skeleton**，不做完整生成器、不做发布系统，也不把 runtime 当作默认门禁。

边界明确如下：

- 只面向 **simple skill 优先** 的最小闭环
- 允许保守声明 `pending / reserved` 能力位，但不得伪装成已实现
- 生成器只负责 **contract shaping**，不负责真实执行
- 任何 runtime 相关信息只能作为后续扩展位，不能写成已完成证据

## 2. workflow -> spec 最小输入契约字段清单

> 当前实际落地点：`workflow-source` 最小 schema 已实现于 `src/skillforge/schema.mjs`，独立 contract tests 已落地于 `scripts/test-workflow-source-contracts.mjs`。这仍然是 schema-only 冻结，不接默认 `validate:all` / `validate:contracts` 主链路。

Phase 4 的最小输入建议至少包含以下字段：

### 2.1 WorkflowSource

当前 Phase 4 M4.1 的 schema-only 实际冻结面已经从抽象字段收敛为可执行契约：

- `kind: workflow-source`
- `fixtureId`
- `fixtureVersion`
- `name`
- `summary`
- `profile`（可选）
- `source`
- `resources`（可选）
- `permissions`
- `checklist`

其中 `source`、`permissions`、`checklist` 已在 schema 中被最小化约束；这版只做 static contract freeze，不接 builder/UI/registry/runtime。

### 2.2 规划层补充字段

- `goals`
- `successCriteria`
- `toolBoundary`
- `permissionBoundary`
- `externalDependencyHints`
- `riskNotes`
- `profile`
- `version`
- `status`

> 说明：这些字段仍属于规划层候选，不是当前 schema-only 的强制实现面；当前只确保最小 schema 可独立验证。

### 2.3 SkillSpec 最小生成字段

> 当前这一步仍然是规划，不是 builder/runtime 实现。M4.1 只冻结输入契约，不接默认 validate 主链路。

- `kind: skill-spec`
- `id`
- `workflowSourceId`
- `name`
- `displayName`
- `slug`
- `goal`
- `triggerScenarios`
- `inputs`
- `outputs`
- `constraints`
- `toolBoundary`
- `permissionBoundary`
- `dependencies`
- `successCriteria`
- `validationPlan`
- `profile`
- `version`
- `status`

最小原则：字段可以少，但不能缺少目标、触发、输入输出、约束、边界与验证计划这几类核心信息。

## 3. spec -> manifest / SKILL.md 最小产物契约字段清单

### 3.1 SkillManifest 最小字段

- `kind: skill-manifest`
- `id`
- `fixtureId`
- `skillSpecId`
- `name`
- `version`
- `title` / `displayName`
- `slug`
- `profile`
- `entry`
- `files`
- `resourceFiles`
- `permissions`
- `dependencies`
- `compatibility`
- `status`
- `generationRunId`

### 3.2 SKILL.md 最小字段

- YAML frontmatter
  - `name`
  - `version`
  - `description`
  - `metadata.profile`
  - `metadata.slug`（可选但推荐）
- 正文最小段落
  - 触发条件
  - 不应触发的场景
  - 执行流程
  - 边界声明
  - 输出规范
  - 检查清单

### 3.3 产物约束

- `entry` 应保持固定相对路径，默认仍以 `skill/SKILL.md` 为基线
- `description` 必须可触发，不能写成空泛口号
- `permissions` 与 `dependencies` 以保守声明为准
- `compatibility` 只能表达静态状态或待定状态，不能冒充 runtime pass

## 4. 与 validator / runtime / docs contract 的依赖映射

### 4.1 validator 依赖

- 依赖 static validator 的基础 schema 约束
- 依赖 `SKILL.md` frontmatter 的最小字段要求
- 依赖 `entry`、`files`、`dependencies`、`permissions` 等静态可审计字段
- 依赖规则聚合与 evidence 口径保持稳定

### 4.2 runtime 依赖

- 仅保留 `runtime pending` 的契约位
- 可为未来 replay / transcript / scoring / sandbox 预留字段，但不能默认启用
- 不能把生成器输出解释成真实 runtime evidence

### 4.3 docs contract 依赖

- 维持 `WorkflowSource -> SkillSpec -> SkillManifest -> ValidationResult` 主链
- 维持 `static pass ≠ runtime pass` 的文档叙事
- 维持 Phase 3 / Phase 4 边界一致：Phase 4 先产 skeleton，runtime 仍是后续能力
- 与 `docs/roadmap.md`、`docs/workflow.md`、`docs/data-structure.md` 的术语保持一致

## 5. 里程碑

> 里程碑说明补充：M4.1 的实际落地现在是 schema-only + 独立 contract tests；其余 builder/UI/registry/runtime 仍保留为后续阶段。

### M4.1：输入契约冻结

- 冻结 `workflow -> spec` 的最小字段
- 明确 `WorkflowSource` 与 `SkillSpec` 的 ID 链
- 输出可用于生成的 spec 草案
- 验收：字段集稳定，且不与现有 validator / docs contract 冲突

### M4.2：最小产物生成

- 生成 `SkillManifest` 与 `SKILL.md` skeleton
- 保证 entry / frontmatter / boundary / dependencies 满足 static baseline
- 当前已落地的静态样本：`meeting-summary-assistant`
- 该样本已存在 generated manifest + generated `SKILL.md`，并通过独立 contract test：`PASS 13/13`
- 验收：生成结果可通过静态 validator；这仍然只代表 **static synthesis / static-only**，不代表完整生成器或 runtime pass

### M4.3：打包与对账

- 建立 generation run 与产物的追踪链路
- 记录 source / spec / manifest / entry 的关系
- 输出 packaging contract 对账说明
- 当前已落地独立 reconcile 检查：`scripts/test-packaging-contract-reconcile.mjs`
- 当前 happy path fixture：`meeting-summary-assistant`
- 对账范围覆盖 `generated/skill-manifest.yaml`、`generated/skill/SKILL.md`、`validation-result.yaml` 三份静态产物
- 独立测试结果：`PASS 16/16`
- CLI 输出为可读 `OK` / `FAIL`，失败时非 0 exit
- 这仍然只是 static packaging reconcile，不是完整 packaging pipeline，也不是 runtime pass
- 验收：产物、验证结果与输入链路可回溯，且独立对账检查稳定通过

## 6. out-of-scope

以下内容不在本 skeleton 范围内：

- UI / 预览页 / 可视化编辑器
- registry / marketplace / 版本分发系统
- 真实外发、消息、邮件、HTTP side effect
- 真实 provider runtime / replay / transcript / scoring
- 自动发布与自动回滚
- 完整高级 skill 资源生成
- 跨平台 / 跨模型正式保证

## 7. 明确 static pass ≠ runtime pass

必须写死的边界：

- 静态通过只表示结构、字段、边界、依赖、文档契约符合要求
- runtime pass 才表示真实执行、真实观察、真实评分或真实证据完成
- 生成器的静态输出不能被写成 runtime 已完成
- `pending`、`reserved`、`static_checked` 都不等于 `runtime_passed`

## 8. 当前不做 UI / registry / 真实外发 / provider runtime

Phase 4 当前明确不做：

- UI
- registry
- 真实外发
- provider runtime
- transcript persistence
- scoring engine
- 运行时默认门禁接入

这几项如果未来要做，必须另起阶段、另写 contract，不可在本 skeleton 中偷渡。
