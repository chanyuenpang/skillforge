# ADR-0027: `synthetic-passed` 成为一等公民的公共 case status 并贯穿适配层全链路

## Status

accepted

## Context

在 Phase 3 synthetic provider pipeline 实现与 contract convergence 阶段，系统面临一个契约冲突：

- mapper 的 `RUNTIME_OBSERVED_MAPPER_ALLOWED_STATUSES` 已经包含了 `synthetic-passed`，因为 mapper 需要接受 synthetic 模式的结果。
- adapter 的 `RUNTIME_PROVIDER_PUBLIC_CASE_STATUS_SET` **不包含** `synthetic-passed`。
- 合约测试 `testExecutionIdentityConstantsAndPublicStatusStability` 断言两个集合必须**严格相等**，这必然失败。

**冲突根因**：`public case status` 集合在 ADR-0017 中被约束为"不扩容"，导致 adapter 侧不敢把 `synthetic-passed` 纳入公共集合。但 mapper 侧因为功能需要已经包含了它，两边的允许集合不同步。

**三个可选方案**：

1. 把 `synthetic-passed` 从 mapper 的允许集合中移除 —— 但这样 mapper 无法接受并透传 synthetic 结果。
2. 维持两个集合之间的差异，但不做严格相等断言 —— 放弃 contract guard 的完整性。
3. **让 `synthetic-passed` 成为一等公民的公共 case status**，在所有层（adapter → runner → mapper → reporter）的公共允许集合中一致包含它。

方案 3 被选中。这意味着 ADR-0017 中"public case status 不扩容"的约束需要针对 `synthetic-passed` 做显式例外。

来源计划 `Phase 6 skillforge synthetic mode contract convergence` 已完成（`end.completed`）。计划中的 `done` 任务与 retrospective 固定了以下事实。

## Decision

决定将 `synthetic-passed` 固定为**一等公民的公共 case status**，贯穿 adapter → runner → mapper → reporter 所有层，并明确其语义边界。

具体规则如下：

### 公共 Case Status 扩容规则

- `synthetic-passed` 是一个**公共 case status**，不是层内部状态，也不是 metadata 保留占位。
- 它被加入以下所有层的公共集合：
  - adapter contract: `PROVIDER_PUBLIC_CASE_STATUS_SET`、`DEFAULT_ALLOWED_PROVIDER_STATUSES`、`PROVIDER_FAILURE_STATUS_ALLOWED_SET`、`PROVIDER_STATUS_COMPAT_BY_SEMANTIC_STATUS`、`PROVIDER_FAILURE_STATUS_PRIORITY`
  - runner contract: `DEFAULT_ALLOWED_CASE_STATUSES`、`RUNNER_FAILURE_STATUS_PRIORITY`、`RUNNER_FAILURE_STATUS_SEMANTICS`
  - runner: `NON_PASSING_STATUSES`、`statusTaxonomy.caseStatuses`
  - replay reporter: `ALLOWED_DRAFT_CASE_STATUSES`
- 这表示 ADR-0017 的"public case status 不扩容"约束不再整体成立，但扩容仅限于 `synthetic-passed` 这一个 token；其他公共 case status 不做新增。这是**单 token 例外**，不是 general window 开放。

### synthetic-passed 的 Failure Taxonomy 语义

- `allowsExecution: true` — 表示 synthetic 执行已记录
- `allowsProviderCall: true` — 表示途中确实进行了 provider 调用（虽然是 deterministic mock）
- 在 adapter 的 zero-logic 中，`semanticStatus === "synthetic-passed"` 是显式例外，用于保留 execution 与 evidence 不被下游 cleanup 丢掉的路线。

### synthetic-passed 的 Passing 语义

- `synthetic-passed` 属于 `NON_PASSING_STATUSES`，因此 `summary.passed === false`
- synthetic 结果本身不表示通过：`provenanceSummary` 固定为 `"synthetic mock provider path；非真实 provider 执行，仅用于契约连线验证"`。

### 全链路一致性要求

- `synthetic-passed` 在所有四层的公共状态集合中必须保持一致。任何一层如果独自排除它，将导致 contract test 失败（`testExecutionIdentityConstantsAndPublicStatusStability`）。
- 不允许恢复到"mapper 集合包含但 adapter 集合不包含"的状态。
- 未来如果增加其他层（例如 generator / UI），也必须把 `synthetic-passed` 纳入其公共状态集合。

## Alternatives Considered

- 把 `synthetic-passed` 从 mapper 集合中移除：拒绝。synthetic 模式需要 mapper 接受并透传结果，移除会破坏合成路径。
- 维持 mapper/adapter 集合差异，放弃严格相等断言：拒绝。放弃 contract guard 会削弱回归护栏，反而无法及时发现同步漂移。
- 允许 general "公共 case status 扩容"开放窗口：拒绝。当前只允许 `synthetic-passed` 单 token 扩容，防止 public status 集合随功能随意膨胀。

## 关联代码

### 主锚点

| 路径 | 作用 |
| ---- | ---- |
| `src/skillforge/runtime-provider-adapter-contract.mjs` | `synthetic-passed` 加入 `PROVIDER_PUBLIC_CASE_STATUS_SET`、`DEFAULT_ALLOWED_PROVIDER_STATUSES`、`PROVIDER_FAILURE_STATUS_ALLOWED_SET`、`PROVIDER_STATUS_COMPAT_BY_SEMANTIC_STATUS`、`PROVIDER_FAILURE_STATUS_PRIORITY`；failure taxonomy 加入 `synthetic-passed` 的 semantics |
| `src/skillforge/runtime-runner.mjs` | `synthetic-passed` 加入 `NON_PASSING_STATUSES` 与 `statusTaxonomy.caseStatuses` |
| `src/skillforge/runtime-runner-contract.mjs` | `synthetic-passed` 加入 `DEFAULT_ALLOWED_CASE_STATUSES`、`RUNNER_FAILURE_STATUS_PRIORITY`、`RUNNER_FAILURE_STATUS_SEMANTICS` |
| `src/skillforge/runtime-replay-reporter.mjs` | `synthetic-passed` 加入 `ALLOWED_DRAFT_CASE_STATUSES` |

### 关联锚点

| 路径 | 作用 |
| ---- | ---- |
| `scripts/test-runtime-contracts.mjs` | 回归测试锚点；`testExecutionIdentityConstantsAndPublicStatusStability`（mapper allowed statuses = public set）、`testExecutionIdentityStatusCompatMapping`、`testBuiltinProviderAdapterKeysStability`、`caseStatuses` 硬编码断言；110/110 验证 |
| `src/skillforge/runtime-observed-mapper.mjs` | mapper 侧原先已包含 `synthetic-passed` 的 `RUNTIME_OBSERVED_MAPPER_ALLOWED_STATUSES`（契约冲突的起点） |

## 修改的先前决策

- **ADR-0017** 中的 "public case status 不扩容" 约束被本 ADR 修改：现在允许 `synthetic-passed` 作为单 token 例外加入 public case status 集合。
- **ADR-0023** 中 synthetic provider pipeline 的 case status 语义被本 ADR 补充：`synthetic-passed` 现在是一等公民公共 case status，不再是 mapper 层内部状态。

## Consequences

- 正向：synthetic 模式下的 `adapter → runner → mapper → reporter` 全链路的 allowed statuses 自然一致，contract test 不再需要特殊处理。
- 正向：`synthetic-passed` 拥有完整的 failure taxonomy semantics（`allowsExecution: true`, `allowsProviderCall: true`），为未来真实 provider 接入提供了可消化的类比点。
- 正向：adapter zero-logic 中的 `semanticStatus === "synthetic-passed"` 例外保护了 synthetic 结果不被下游 cleanup 丢弃。
- 正向：110/110 contract tests 全绿通过，3 个测试更新确认了全链路一致性。
- 取舍：ADR-0017 的 "public case status 不扩容" 不再完全成立；`synthetic-passed` 是显式单 token 例外，需在 ADR-0017 文档中补充交叉引用。
- 取舍：`summary.passed === false` 意味着 synthetic 结果不会触发"通过"语义，即使它在名义上是一个公共 case status。
- 验证锚点：`--mode synthetic` 输出 `kind: runtime-replay-report` 且无 fallback、exit 0；`cases[0].observed` 携带完整 synthetic payload；contract tests 110/110 全绿。

## 关键检索词

- `synthetic-passed`
- `PROVIDER_PUBLIC_CASE_STATUS_SET`
- `DEFAULT_ALLOWED_PROVIDER_STATUSES`
- `PROVIDER_FAILURE_STATUS_ALLOWED_SET`
- `PROVIDER_STATUS_COMPAT_BY_SEMANTIC_STATUS`
- `PROVIDER_FAILURE_STATUS_PRIORITY`
- `NON_PASSING_STATUSES`
- `DEFAULT_ALLOWED_CASE_STATUSES`
- `RUNNER_FAILURE_STATUS_PRIORITY`
- `RUNNER_FAILURE_STATUS_SEMANTICS`
- `ALLOWED_DRAFT_CASE_STATUSES`
- `RUNTIME_OBSERVED_MAPPER_ALLOWED_STATUSES`
- `allowsExecution: true`
- `allowsProviderCall: true`
- `semanticStatus === "synthetic-passed"`
- `public status 不扩容`（修改后的约束）
- `testExecutionIdentityConstantsAndPublicStatusStability`
- `testExecutionIdentityStatusCompatMapping`
- `testBuiltinProviderAdapterKeysStability`
- `110/110`
