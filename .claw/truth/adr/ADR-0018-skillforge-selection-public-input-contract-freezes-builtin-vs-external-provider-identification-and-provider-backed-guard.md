# ADR-0018: SkillForge selection public input contract 冻结 builtin vs external provider 识别规则与 provider-backed guard

## Status

accepted

## Context

决定先行：在 ADR-0013 已把 provider-backed selection lineage 冻结为 canonical builder 唯一来源之后，Phase 3 继续把 **selection 的 public input contract** 从“内部可推断、调用方可松散传参”收紧为正式输入边界。

来源计划“Phase 3 selection wiring public input freeze”已完成（`end.completed`）。计划中的 `done` 任务、review 与 retrospective 固定了以下事实：

- 已冻结 selection public input contract：新增 `isBuiltinProviderKey`、`isExternalProviderKey`、`assertSelectionInputProviderBackedConstraint`，明确 builtin vs external provider 的 formal 识别规则。
- 已补 4 个 selection wiring 专项测试，总测试数达到 `63`。
- 已修复 `assertSelectionInputContractCompliance` 误伤内部 selection 的 regression；retrospective 明确修复策略是“把 guard 从内部 resolver 移到外部入口点”。
- retrospective 的 knowledge candidate 明确：selection public input contract 已冻结，`isBuiltinProviderKey` / `isExternalProviderKey` 成为 formal 识别函数，`assertSelectionInputProviderBackedConstraint` 保证 `dry-run` / `null-runner` 不可能出现 `providerBacked=true`。
- 该子计划的目标进一步明确了意图：收紧 `buildRuntimeProviderSelection` 的输入参数，使其依赖 formal contract schema，而不是继续接受松散 public input。

这需要沉淀为 ADR，因为它改变的是长期输入边界，而不是一次性修 bug：从现在起，selection 的“内部 canonical builder”与“外部 public input contract”被明确分层，builtin/external provider 身份识别和 `providerBacked` 约束不再允许由调用方自由拼装或靠内部兜底修正。

## Decision

决定将 SkillForge selection wiring 的 **public input contract** 冻结为正式约束层：外部输入必须先通过 builtin vs external provider 的 formal 识别与 `providerBacked` guard，再进入 `buildRuntimeProviderSelection` 等内部 canonical builder；内部 resolver 不再承担替调用方纠偏 public input 的职责。

当前阶段的具体规则如下：

- `isBuiltinProviderKey` 与 `isExternalProviderKey` 是 selection public input 中 provider identity 的正式识别函数；builtin / external provider 的区分不能再由调用方隐式约定或下游自由猜测。
- `assertSelectionInputProviderBackedConstraint` 是 public input 的强制 guard：`dry-run` 与 `null-runner` 这类 builtin/internal selection 不允许出现 `providerBacked=true`。
- `buildRuntimeProviderSelection` 的输入边界必须收紧到 formal contract schema；它消费的是经过 public input contract 归一和校验后的参数，而不是宽松、可混源的调用方 object。
- `assertSelectionInputContractCompliance` 不再对内部 canonical selection 造成误伤；相关 guard 应放在外部入口点，面向 public input 生效，而不是侵入内部 resolver/canonical object 的正常流转。
- 后续若要扩展新的 provider key、provider 模式或 public input 字段，必须先更新 formal 识别规则、`providerBacked` guard 与专项 contract tests，而不能只在下游 builder / resolver 层做兼容补丁。

## Alternatives Considered

- 继续让 `buildRuntimeProviderSelection` 接受宽松输入，并由内部 resolver 顺手修正 builtin/external/providerBacked 关系：拒绝。来源计划已确认这种做法会把 public input 校验与内部 canonical 解析混在一起，并导致 `assertSelectionInputContractCompliance` 误伤内部 selection。
- 只修复这次 regression，不冻结 formal 识别函数与 guard：拒绝。计划 retrospective 已把 builtin/external formal 识别与 `providerBacked` 约束列为知识候选，说明这不是一次性补丁，而是长期 contract。
- 允许 `dry-run` / `null-runner` 在 public input 层携带 `providerBacked=true`，再由下游忽略：拒绝。该计划已经明确把这类组合定义为非法输入，必须在入口层被阻断。

## Related Code

| Path | Role |
| ---- | ---- |
| `src/skillforge/runtime-provider-adapter-contract.mjs` | `buildRuntimeProviderSelection` 输入边界收紧与 selection formal contract 消费锚点。 |
| `isBuiltinProviderKey` | builtin provider formal 识别函数锚点（函数名来自计划记录）。 |
| `isExternalProviderKey` | external provider formal 识别函数锚点（函数名来自计划记录）。 |
| `assertSelectionInputProviderBackedConstraint` | public input `providerBacked` guard 锚点（函数名来自计划记录）。 |
| `assertSelectionInputContractCompliance` | regression 修复锚点：不再误伤内部 selection。 |
| `scripts/test-runtime-contracts.mjs` | selection wiring 专项 tests 与 `63` 条验证锚点。 |

## Consequences

- 正向：selection public input 与内部 canonical selection 的职责边界被明确分开，后续可以在入口层稳定拒绝非法组合，而不是让内部 builder/resolver 承担纠偏责任。
- 正向：builtin vs external provider identity 变成 formal 规则，减少 provider key 语义漂移与 mixed-source 推断。
- 正向：`dry-run` / `null-runner` 不再可能通过 `providerBacked=true` 伪装成 provider-backed 输入，provider-backed reserved seam 的诚实边界更稳。
- 正向：regression 修复方式固定为“外部入口点 guard，内部 canonical 流程保持纯净”，可防止以后再把 public input 校验错误下沉到 resolver 内部。
- 取舍：未来任何 public input 扩展都要同步更新 formal 识别函数、guard 与专项 tests，短期灵活性更低，但 contract 更清晰。
- 验证锚点：来源完成记录确认已补 4 个 selection wiring 专项测试，总测试数达到 `63`，并且 `assertSelectionInputContractCompliance` 误伤内部 selection 的 regression 已修复，`63/63` 通过。

## Search Terms

- `isBuiltinProviderKey`
- `isExternalProviderKey`
- `assertSelectionInputProviderBackedConstraint`
- `assertSelectionInputContractCompliance`
- `buildRuntimeProviderSelection`
- `selection public input contract`
- `builtin provider`
- `external provider`
- `providerBacked`
- `dry-run`
- `null-runner`
- `selection wiring`
- `formal contract schema`
- `63/63`
