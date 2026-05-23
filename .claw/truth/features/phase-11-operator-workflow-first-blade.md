# Phase 11 Operator Workflow 第一刀：Review → PublishPrep → RegistryEntry

## 结论

Phase 11 的第一个可操作入口应当固定为 `ReviewRecord → PublishPrep → RegistryEntry` 三段链，且第一刀优先做 **CLI 交互层**，不要从 UI、dashboard、generator 或 runtime replay 切入。这个入口成熟度最高、切口最小、产品面最直接，适合作为 operator workflow 的首个稳定实现面。

## 长期行为 / 规则

- `ReviewRecord → PublishPrep → RegistryEntry` 是 operator workflow 的首个稳定可操作链路，不应被 UI 或 runtime 依赖绑死。
- 第一刀的实现边界应当是 CLI 交互层；`skillforge-operate.mjs` 这类脚本属于正确入口。
- 这条链路的核心价值是把 `review -> approve/reject -> publish-prep -> registry-entry` 的操作意图显式化，而不是做 full UI / full collaboration suite。
- 之所以优先选这条链，是因为三个 schema 都已注册/校验，且 `create+validate` 函数完整，门控条件也已定义。
- `approved != publish complete` 的分层原则仍然适用：审阅通过不应被误读为发布完成。
- `PublishPrep` 与 `RegistryEntry` 的引入目标是提供稳定的中间交接与登记层，而不是顺手把完整发布系统做出来。
- `Generator` 和 `Runtime Replay` 都应后置；前者依赖 provider execution，后者依赖真实 runtime，切口都更大。
- state 持久化宜采用轻量 JSON 文件，不要一上来引入数据库。

## 关联代码

### 主锚点

- `projects/workflow-kit/docs/phase-11-operator-workflow-decision.md`：Phase 11 第一刀的决策文档，定义候选流对比、最小链与交付物。

### 关联锚点

| 路径 | 作用 |
| ---- | ---- |
| `src/skillforge/review-record.mjs` | `ReviewRecord` 工厂与审阅状态机。 |
| `src/skillforge/publish-prep.mjs` | `PublishPrep` 中间交接对象与 readiness 聚合。 |
| `src/skillforge/registry-entry.mjs` | `RegistryEntry` 登记对象，排除 `published`。 |
| `src/skillforge/schema.mjs` | 三段对象的 schema registry。 |
| `scripts/skillforge-operate.mjs` | 预期中的 CLI 操作入口脚本。 |
| `src/skillforge/state-store.mjs` | 预期中的轻量 JSON 状态持久化层。 |

## 真实调用链路

1. operator 选择 fixture。
2. 读取当前 `review-record` 状态。
3. 执行 `approve/reject`。
4. 门控通过后自动构造 `publish-prep`。
5. 继续自动构造 `registry-entry`。
6. 输出结果总览，供 operator 直接判断下一步。

## 不要改错的位置

- 不要把 `ReviewRecord` 当成最终发布完成态。
- 不要把 `RegistryEntry` 做成含 `published` 的通用发布记录。
- 不要从 UI / dashboard 切入这条链；第一刀应保持 CLI 层最小切口。
- 不要把 generator 或 runtime replay 当成 Phase 11 的第一个操作入口。

## 验证标准

后续围绕这条链路推进时，至少要确认：

- `approve -> publish-prep -> registry-entry` 可以通过 CLI 走通。
- 非法操作会被 gate 正确阻断，例如未 `approve` 直接进入 `publish-prep`。
- 状态能够跨 session 恢复。
- CLI 输出人类可读，不依赖手工翻 JSON。
- 文档和脚本能支撑新的 operator 独立操作。

## 关键检索词

- `ReviewRecord`
- `PublishPrep`
- `RegistryEntry`
- `skillforge-operate.mjs`
- `state-store.mjs`
- `approved != publish complete`
- `publish-prep`
- `registry-entry`
- `operator workflow`
- `CLI 交互层`
