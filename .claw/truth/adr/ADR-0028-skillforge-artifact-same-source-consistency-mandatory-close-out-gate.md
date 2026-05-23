# ADR-0028: SkillForge 新 execution path 必须通过 artifact 层 same-source consistency 关账验证

## Status

accepted

## Context

在 Phase 6 的 synthetic provider mode 接入过程中，系统首次以完整 observable 形式走通了 `adapter → runner → mapper → reporter` 全链路，并进行了 four-layer 分层验证（Phase 6.1 执行接线 → Phase 6.2 reserved seams 保守语义 → Phase 6.3 入口 guard 无漂移 → Phase 6.4 artifact 一致性）。

Phase 6.4 的验证发现了一个可泛化的规律：当一条新 execution path 首次接入时，artifact 层各字段（execution identity、providerExecution、transcriptAvailability、rawResponse seam、report metadata、case-level fields）之间存在 **same-source drift 风险**。具体表现为：

- `case.status` 与 `failureReason.sourceStatus` 可能不同源，导致 mixed-source failureReason。
- `executionId`/`providerRunId`/`providerStatus` 作为 same-source tuple 可能在某层被截断或独立推导，失去同源一致性。
- `transcriptAvailability.available` 与 `transcriptRef.available` 之间可能出现不对称（参见 ADR-0014 runner fallback artifactRef available:true gap）。
- `metadata.executionSource` 与 `case.observed` 的各层 provenance 字段之间可能不一致。

在 synthetic 模式验证中，通过 `buildRuntimeReport` 与 contract test 中的 `assertSameSourceFailurePropagation` 和 `assertSameSourceExecutionIdentity` 确认了无 drift。但这一验证步骤是在 Phase 6.4 作为 **最后一层** 才执行的，而非事先计划为强制关账门禁。

来源计划 "Phase 6 Runtime Replay Real Implementation Subplan" 已完成（`end.completed`），其 retrospective 将其提炼为知识候选：

> "artifact 层 same-source consistency 验证应作为每条新 execution path 的关账前置检查"

## Decision

决定将 **artifact 层 same-source consistency 验证** 固定为 SkillForge 项目中**每一条新 execution path 的强制性关账前置检查**。规则如下：

### 触发条件

以下行为被视为"新 execution path"，必须在关账前通过 same-source consistency 验证：

1. 新增 provider 类型（如 synthetic → 真实 provider-backed）
2. 新增 orchestration 路径（如 single-case → multi-case）
3. 新增 adapter 分支（如 adapter 的 providerCall 模式扩展）
4. 新增报告类型（runner → reporter 之间的新 artifact 形态）
5. 新增 reserved seam 升级为真实实现

### 验证范围

验证必须覆盖以下层级的字段一致性（以当前 contract 为准，未来扩展同理）：

- **report 层**：`case.status` ↔ `failureReason.sourceStatus`
- **case 层**：`executionId` / `providerRunId` / `providerStatus` 作为 same-source tuple 必须来自同一来源
- **metadata 层**：`providerExecution` / `transcriptAvailability` / `rawResponse.available` / `metadata.executionSource` 之间的来源一致性
- **跨层字段**：execution identity 从 adapter → runner → mapper → reporter 必须保持同一 source channel，不允许混合来源

### 验证方法

每个新 execution path 的 contract tests 必须增加显式的 same-source consistency 断言：

- 使用 `assertSameSourceFailurePropagation`（来自 ADR-0014 的规范）验证 failureReason 同源
- 使用 `assertSameSourceExecutionIdentity`（来自 ADR-0014 的规范）验证 execution identity tuple 同源
- 增加 `observed.evidence` 的 field-level same-source 守卫（`buildRuntimeReport` 已在 synthetic 模式中应用）
- 新增 execution path 的 contract test 计数必须保持已知基线不下降

### 例外规则

- reserved seam 本身（如 rawResponse summary-only、transcript handle reserved）不受本验证约束，因为它们尚未进入"执行"路径
- 仅当 reserved seam 升级为真实执行/证据路径时，才触发此项验证

## Alternatives Considered

- 不设置强制性关账门禁，依赖逐条 execution path 各自判断：拒绝。Phase 6 的实践表明 same-source drift 容易被后续某层引入而漏检，在 synthetic 模式下虽无 drift，但如无门禁则其他路径可能忽略。
- 改为 CI 层通用检查：暂不接受。当前 same-source 检查依赖对具体 execution path 的 field-level 理解，不是通用的 schema 校验，不适合在 CI 层做通用抽象。
- 交给各层的 contract test 自行决定是否覆盖：拒绝。来源计划已明确"应作为每条新 execution path 的关账前置检查"，说明这是一个强制要求，不是可选项。

## Related Code

| Path | Role |
| ---- | ---- |
| `src/skillforge/runtime-replay-reporter.mjs` | `buildRuntimeReport` 提供 artifact 组装与 same-source 验证锚点 |
| `scripts/test-runtime-contracts.mjs` | contract tests 中的 `assertSameSourceFailurePropagation` 和 `assertSameSourceExecutionIdentity` 断言锚点 |
| `docs/phase-6-a6-handoff-boundary-audit.md` | Phase 6.4 artifact same-source consistency 手动验证记录 |
| Phase 6 完整链路（adapter → runner → mapper → reporter） | 本验证策略的首个应用路径与验证基线 |

## Consequences

- 正向：新 execution path 在关账时自动包含 artifact 同源性检查，防止 execution identity、failureReason、transcriptAvailability 等字段在不同层之间 drift。
- 正向：验证方法和断言函数（`assertSameSourceFailurePropagation`, `assertSameSourceExecutionIdentity`）已有现成实现，可复用而非发明。
- 正向：每个 execution path 的 contract test 基线自然包含 same-source 断言，使回归护栏更健壮。
- 取舍：增加关账前置检查的工作量，需要开发者理解 artifact 各层的同源约束。
- 取舍：reserved seam 暂不受约束，意味着未来升级 reserved seam 时仍需要补充该验证。
- 验证锚点：该规则已在 synthetic provider execution path 上实践验证通过（Phase 6.4，`buildRuntimeReport` 与 same-source contract tests 均通过）。

## Search Terms

- `artifact same-source consistency`
- `assertSameSourceFailurePropagation`
- `assertSameSourceExecutionIdentity`
- `buildRuntimeReport`
- `same-source drift`
- `execution path close-out gate`
- `Phase 6.4`
- `executionId / providerRunId / providerStatus`
- `failureReason.sourceStatus`
- `observed.evidence`
