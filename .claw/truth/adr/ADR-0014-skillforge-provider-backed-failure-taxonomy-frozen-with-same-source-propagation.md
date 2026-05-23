# ADR-0014: SkillForge provider-backed failure taxonomy 冻结最小状态词表与 same-source 传播规则

## Status

accepted

## Context

在 ADR-0010–0013 已固定 provider-backed reserved slot、observed mapper 单一 truth channel、adapter result 单一 truth payload 与 selection lineage canonical builder 之后，Phase 3 继续推进 failure semantics 的 taxonomy tightening。

来源计划"Phase 3 provider-backed failure taxonomy tightening"已完成（`end.completed`），6 个任务全部 `done`，retrospective 确认 commit 4932407 已推送到 fork/master。

已完成任务固定了以下事实：

- adapter contract 与 runner contract 层已冻结最小 failure taxonomy 词表：public serialized status 仍为 `blocked|error|dry-run|not-executed`，internal alias 允许 `adapter-error → error`；优先级排序为 `blocked > error > dry-run > not-executed`。
- provider-backed reserved seam 当前只允许 `blocked` 或 `error`（含 `adapter-error → error`），不允许 `dry-run|not-executed`；provider-less 路径才允许 `dry-run|not-executed`。
- `blocked` 必须绑定 `preflightBlocked=true` 语义与 `RUNTIME_PREFLIGHT_BLOCKED` reason；非 `blocked` 不允许复用 blocking failureReason。
- adapter result 新增语义归一与约束校验：provider-backed selection 下不允许产出 `dry-run|not-executed`，`blocked` 必须携带 `preflight-blocked` 语义，当前 reserved seam 下所有 failure 状态都不允许 `executed=true|providerCall=true`。
- runner orchestration 对齐 contract：provider-backed 映射后 runtime status 只能是 `blocked|error`；preflight 通过时不允许产出 `blocked`，未通过时不允许产出非 `blocked`；failureReason 按最终 mappedRuntime.status 决定。
- observed mapper 新增状态守卫：provider-backed reserved seam 只接受 `blocked|error`；`observed.evidence` 不再信任上游自由传入，改为按 `status + providerSelection` 单向推导（`blocked → preflight-blocked`，`provider-backed error → provider-slot-reserved`）。
- report 层新增 `normalizeFailureReason()` 与 `assertSameSourceFailurePropagation()`：provider-backed case 只允许 `blocked|error`，`failureReason.sourceStatus` 必须与 `case.status` 一致，不允许 mixed-source failureReason。
- runner 侧 report case 优先透传 `mappedRuntime.failureReason`，避免回退到 runner 侧原始对象造成 mixed-source。
- 新增 5 组 failure taxonomy contract tests，通过 `Runtime contract tests passed: 31/31 cases`。
- 文档同步明确：这仍是 reserved seam failure taxonomy，不接真实 provider、不开放 `passed` path、不接 `validate` 默认链路。

该决策需要沉淀，因为它把 failure status 词表、优先级、语义绑定规则、same-source 传播约束与 adapter/runner/mapper/report 四层一致性全部冻结为长期 contract。后续真实 provider 接入必须在这个 taxonomy 框架内扩展，而不是在状态词汇或传播路径上各自发明。

## Decision

决定将 SkillForge provider-backed reserved seam 的 failure taxonomy 冻结为以下规则，adapter → runner → observed mapper → report 全链路必须遵守：

### 状态词表与优先级

- Public serialized status 集合：`blocked | error | dry-run | not-executed`。
- Internal semantic alias：`adapter-error` → 对外序列化为 `error`。
- 优先级排序：`blocked > error > dry-run > not-executed`。
- Provider-backed reserved seam 当前最小允许集：`blocked | error`；provider-less 路径允许 `dry-run | not-executed`。

### 语义绑定

- `blocked` 必须绑定 `preflightBlocked=true` 语义，failureReason code 必须为 `RUNTIME_PREFLIGHT_BLOCKED`；非 `blocked` 状态禁止复用该 reason code。
- Provider-backed `error` 的 observed evidence 映射为 `provider-slot-reserved`，不得伪装为真实 provider execution failure。
- 当前 reserved seam 下所有 failure 状态禁止 `executed=true` / `providerCall=true`。

### Same-source 传播

- `failureReason.sourceStatus` 必须与 `case.status` 一致，禁止 mixed-source fallback。
- Report case 优先透传 `mappedRuntime.failureReason`，不得回退到 runner 侧原始对象。
- `observed.evidence` 由 mapper 按 `status + providerSelection` 单向推导，不信任上游自由传入值。

### 扩展约束

- 后续若要新增 failure status 或修改优先级，必须先更新 taxonomy 常量（`RUNTIME_PROVIDER_FAILURE_STATUS_ALLOWED_SET` / `RUNTIME_PROVIDER_FAILURE_STATUS_PRIORITY` / `RUNTIME_PROVIDER_FAILURE_STATUS_SEMANTICS`）并通过 contract tests。
- 真实 provider 接入后，failure taxonomy 应在此框架内扩展，而不是在 adapter/runner/mapper/report 各层私自发明状态词或传播路径。

## Alternatives Considered

- 保持宽松 failure status，让各层自行决定状态词与传播方式：拒绝。来源计划确认这导致 failure 语义在 adapter/runner/mapper/report 之间漂移、夸大或混源。
- 允许 provider-backed reserved seam 出现 `dry-run` / `not-executed`：拒绝。已完成任务明确 provider-backed 当前只保留 `blocked | error` 两个状态位，`dry-run` / `not-executed` 只属于 provider-less 路径。
- 允许 report 层回退到 runner 原始 failureReason 传播：拒绝。来源计划确认这导致 mixed-source failureReason，report 必须优先透传 mapped 同源结果。
- 等真实 provider 接入后再整理 failure taxonomy：拒绝。来源计划结论是先冻结 taxonomy contract，避免后续一边接真实 provider 一边猜状态词。

## Related Code

| Path | Role |
| ---- | ---- |
| `src/skillforge/runtime-provider-adapter-contract.mjs` | failure taxonomy 词表、优先级、语义常量与 `buildRuntimeProviderAdapterResult()` 归一校验锚点。 |
| `src/skillforge/runtime-runner-contract.mjs` | runner 层 taxonomy 常量、blocked 绑定 `RUNTIME_PREFLIGHT_BLOCKED`、provider-backed status guard 锚点。 |
| `src/skillforge/runtime-runner.mjs` | runner orchestration status 映射、preflight→blocked 收口、failureReason 按最终 status 决定、report case 透传锚点。 |
| `src/skillforge/runtime-observed-mapper.mjs` | mapper 状态守卫、`observed.evidence` 单向推导、same-source failureReason 传播锚点。 |
| `src/skillforge/runtime-replay-reporter.mjs` | `normalizeFailureReason()`、`assertSameSourceFailurePropagation()`、provider-backed case status/failureReason 一致性校验锚点。 |
| `scripts/test-runtime-contracts.mjs` | 5 组 failure taxonomy contract tests 与 `31/31 cases` 验证锚点。 |
| `docs/phase-3-provider-backed-slot-contract-checklist.md` | failure taxonomy 边界文档同步锚点。 |
| `docs/runtime-replay-protocol-lightweight-design.md` | failure taxonomy 协议口径同步锚点。 |
| `docs/validator-contract.md` | failure semantics 诚实边界文档同步锚点。 |
| `docs/roadmap.md` | Phase 3 failure taxonomy tightening 进度口径回写锚点。 |

## Consequences

- 正向：failure status 拥有冻结词表与优先级，后续真实 provider 接入可在固定 taxonomy 框架内扩展，减少状态词漂移与语义歧义。
- 正向：same-source 传播规则锁住 adapter → runner → mapper → report 的 failure 语义一致性，防止 case 级 truth 与 metadata 级 truth 分裂。
- 正向：`blocked` 绑定 `RUNTIME_PREFLIGHT_BLOCKED` 后，"被前置条件拦下"与"provider 执行失败"不再混用，failure 归因更诚实。
- 正向：provider-backed reserved seam 的 `blocked/error` 现在要求 adapter execution 与 `providerMetadata` 同源产出完整 stub execution identity tuple（`executionId` / `providerRunId` / `providerStatus`）；runner 下游不再丢失 identity，mapper 也能在 same-source guard 下稳定消费。
- 正向：non-provider-backed 路径继续强制 scrub provider execution identity 为 `null`，避免 `dry-run` / `null-runner` 带出假的 provider lineage。
- 正向：contract tests 现在把 taxonomy 词表、优先级、语义绑定、same-source 传播、stub identity tuple 对齐与 mixed-source 拒绝一起锁进回归护栏；来源完成记录确认 `scripts/test-runtime-contracts.mjs` 已通过 `Runtime contract tests passed: 34/34 cases`。
- 取舍：当前 taxonomy 仍只覆盖 reserved seam，不包含真实 provider execution failure 分类；后续真实 provider 接入时需要在此框架内扩展，短期内扩展需先更新 taxonomy 常量与 tests。
- 取舍：`adapter-error` 作为 internal alias 不允许对外暴露，意味着所有 internal error 消费方必须统一映射到 `error`，不能依赖内部细分状态。

## 已知补充（2026-05 execution identity stub 与 transcript reserved seam closure）

来源计划“Phase 3 provider execution identity stub”与后续 transcript docs sync 已完成（`end.completed`）。它把此前仅在 failure taxonomy ADR 中补充说明的 execution identity gap fix，进一步推进为更完整的长期 contract：`executionId` / `providerRunId` / `providerStatus` 作为 provider-backed reserved seam 的受控、诚实、可传播 stub identity 语义存在；同时，`transcriptRef.handle` / `providerManaged` / `providerTranscript` / `persistence` 也被正式收紧为 **reserved-only transcript seam**，不能从 stub tuple、provider-less transcript stub、rawResponse 或 mixed-source fallback 反推出“已有 provider transcript”。

已完成任务固定了以下事实：

- provider-backed `blocked/error` 路径允许出现 stub execution identity，但该 identity 只表示 reserved seam 下的 execution metadata stub，不代表真实 `providerCall`、`executed` 或 `providerEvidence`。
- execution identity 必须走 `adapter -> runner -> observed mapper -> report` 的单一路径 same-source 透传；downstream 不允许从 `providerMetadata` 或 partial tuple 兜底拼装 mixed-source identity。
- tuple 语义为 all-or-nothing：`executionId` / `providerRunId` / `providerStatus` 必须作为完整同源三元组出现，不能只出现部分字段。
- 这个 same-source stub tuple 不能升级解释成 provider transcript 已存在；它只表示未来真实 provider execution contract 预留的保守 execution metadata 槽位已经接通透传。
- `transcriptRef.handle` / `providerManaged` / `providerTranscript` / `persistence` 当前都只是 reserved-only transcript seam：它们表达的是未来真实 provider transcript capture / retrieval / persistence 应该落在哪些字段、沿哪条链路传播，不表示当前已经具备 provider transcript handle、provider-managed retrieval、provider transcript availability 或 transcript persistence。
- provider-less transcript stub 若存在，也只能解释为 draft artifact 内的 provider-less evidence ref；它不能升级成 provider transcript，也不能当作 provider-managed handle 的替身。
- `rawResponse` 及其 handle/summary 也不能 fallback 成 transcript handle；raw response slot、transcript seam、persistence seam 必须继续分槽，禁止 mixed-source fallback。
- non-provider-backed 路径必须继续强制 null / false / none fallback：`executionId` / `providerRunId` / `providerStatus` 统一为 `null`，`transcriptRef.available=false`、`providerManaged=false`、`providerTranscript=false`、`handle=null`，persistence 相关位保持 `false` / `"none"`。
- 这一 contract 已通过 runtime contract tests 与文档同步一起锁定；当前文档基线明确 `stub execution identity != provider call != execution evidence != provider transcript`。

这意味着后续若接入真实 provider，必须在保留现有 stub identity 边界、same-source tuple contract 与 transcript reserved-only seam 的前提下演进，而不是让 execution metadata 或 transcript fields 重新退回“部分可见、各层兜底、自造 lineage”的漂移状态。

## 已知补充（2026-05 transcript same-source guard、report scrub 与 runner availability gap）

来源报告“skillforge-phase3-transcript-tests-finalize”确认：`scripts/test-runtime-contracts.mjs` 已扩展到 `37/37 cases`，其中新增 6 组 transcript contract tests，把 transcript same-source 约束进一步从“概念边界”收紧为 mapper/report 的明确拒绝条件，并顺手暴露了 runner 侧一个仍待修复的 fallback artifact gap。

已固定的长期事实如下：

- `transcriptRef` 现在被明确视为 **单一 transcript truth source** 的一部分，而不是可由 `providerMetadata`、`rawResponse` 或 runner fallback 自行补齐的松散字段。
- non-provider-backed 路径若携带 `transcriptRef`，`runtime-observed-mapper.mjs` 必须直接拒绝；这条路径只能保持 `transcriptAvailability.available=false` 与 `transcriptRef=null`，避免把 provider-less transcript stub 升级解读成 provider transcript。
- provider-backed 路径若声明 `transcriptAvailable=true` 却没有同源 `transcriptRef`，mapper 必须拒绝；同理，若只有 `providerMetadata` 上的 transcript 相关字段而 `transcriptRef` 没有对应值，也必须拒绝，防止 metadata-only transcript truth 漂移。
- `runtime-replay-reporter.mjs` 现已把 transcript 同源约束锁成两道显式校验：
  1. `transcriptAvailability.available` 必须与 `transcriptRef.available` 一致；
  2. `providerExecution.transcriptAvailable` 必须与 `transcriptAvailability.available` 一致。
- report 层还会在 `rawResponseAvailable=false` 时强制 scrub `rawResponseSummary`、`rawResponseHandle`，并在 `transcriptAvailable=false` 时强制 scrub `transcriptHandle`；下游不得再从“看起来像有 handle/summary 的残留字段”误判已有 transcript/raw response 能力。
- 当前 runner 仍存在一个 **known gap**：`src/skillforge/runtime-runner.mjs` 在 `result.transcriptRef` 为空时构造 fallback in-report artifact ref，会把 `available` 硬编码为 `true`；而 mapper 对 non-provider-backed/provider-reserved 当前给出的 `transcriptAvailability.available` 是 `false`。reporter 的 same-source 校验会正确拒绝这类 mismatch。
- 因此，现阶段 contract tests 使用 `runPipelineToMapperResult(...) + buildRuntimeReplayReport(...)` 绕过 runner fallback gap，优先验证 adapter → mapper → report 的 canonical truth；这个绕过是为了保住 contract 真实性，不代表 runner gap 可以长期保留。
- runner gap 的最小修复方向已经明确：要么把 fallback `artifactRef.available` 改为 `transcriptAvailability.available`，要么重新定义 non-provider-backed in-report stub 在 mapper 中的 availability 口径，但无论哪条路，都必须继续满足 reporter 的 same-source guard，而不是放松校验。

### 真实调用链路（transcript truth）

1. `src/skillforge/runtime-provider-adapter-contract.mjs`：产出 adapter result 中与 transcript 相关的原始 truth 槽位。
2. `src/skillforge/runtime-observed-mapper.mjs`：将 `adapterResult` 归一为 `providerExecution` 与 `transcriptAvailability`，并拒绝 non-provider-backed transcriptRef、metadata-only transcript field、或 transcriptAvailable/ref 不同源的情况。
3. `src/skillforge/runtime-runner.mjs`：把 mapper truth 透传到 runtime case；当前 fallback artifactRef 逻辑位于这里，也是 transcript availability mismatch gap 的真实入口。
4. `src/skillforge/runtime-replay-reporter.mjs`：最终执行 `transcriptRef` / `transcriptAvailability` / `providerExecution` 三者的 same-source 校验，并对 raw response / transcript handle 做保守 scrub。
5. `scripts/test-runtime-contracts.mjs`：通过 `testMapperRejectsNonProviderBackedTranscriptRef`、`testMapperRejectsProviderBackedTranscriptAvailableWithoutRef`、`testMapperRejectsProviderMetadataOnlyTranscriptField`、`testReportScrubsRawResponseWhenNotAvailable`、`testTranscriptAvailabilityProviderExecutionAlignment`、`testReportRejectsMismatchedTranscriptAvailabilityAndRef` 锁住这些 contract。

### 不要改错的位置

- 不要把 reporter 的 transcript same-source 校验当成“测试太严”；它正是这次沉淀的长期 truth 守门逻辑。
- 不要试图通过放宽 `normalizeRuntimeCase()` 来掩盖 runner fallback mismatch；真正该修的是 `runtime-runner.mjs` 的 fallback artifactRef availability 传播。
- 不要再让 `providerMetadata`、`rawResponse` 或其他摘要字段偷偷承载 transcript truth；`transcriptRef` 与 `transcriptAvailability` 才是 canonical source。
- `runRuntimeCaseSkeleton(...)` 在测试脚本里目前只是兼容包装层，不应被误读成“runner gap 已解决”。

### 验证标准补充

- non-provider-backed 模式必须始终满足：`transcriptRef=null`、`transcriptAvailability.available=false`、`providerExecution.transcriptAvailable=false`。
- provider-backed 模式若未来开放 transcript availability，必须由同源 `transcriptRef` 驱动，且 `providerExecution.transcriptAvailable`、`transcriptAvailability.available`、`transcriptRef.available` 三者完全一致。
- `providerMetadata` 不能单独提供 transcript truth；任何 metadata-only transcript field 都应被 mapper 拒绝。
- `rawResponseAvailable=false` 时，report 输出中不得残留 `rawResponseSummary`、`rawResponseHandle`；`transcriptAvailable=false` 时不得残留 `transcriptHandle`。
- `scripts/test-runtime-contracts.mjs` 必须继续保持 `37/37 cases` 或更高覆盖，不得回退这些 transcript same-source 守卫。

## 关联代码

| 路径 | 作用 |
| ---- | ---- |
| `src/skillforge/runtime-provider-adapter-contract.mjs` | stub execution identity 的生成、补齐与 `execution` / `providerMetadata` same-source 回写主入口。 |
| `src/skillforge/runtime-observed-mapper.mjs` | provider-backed same-source identity guard，以及 non-provider-backed identity scrub 主入口。 |
| `src/skillforge/runtime-runner-contract.mjs` | runner contract 对 provider-backed `blocked/error` 与 identity/status 边界的守卫锚点。 |
| `src/skillforge/runtime-runner.mjs` | adapter→runner→report identity 透传与禁止 mixed-source fallback 的运行期锚点。 |
| `src/skillforge/runtime-replay-reporter.mjs` | report 侧 identity/status/failure 同源输出锚点。 |
| `scripts/test-runtime-contracts.mjs` | provider-backed stub identity / non-provider-backed scrub / same-source guard / all-or-nothing tuple 回归测试锚点。 |
| `docs/phase-3-provider-backed-slot-contract-checklist.md` | execution identity stub 边界与 checklist 文档同步锚点。 |
| `docs/runtime-replay-protocol-lightweight-design.md` | execution identity stub 协议口径同步锚点。 |
| `docs/validator-contract.md` | validator contract 中 execution identity 保守语义同步锚点。 |
| `docs/roadmap.md` | Phase 3 provider execution identity stub 进度口径回写锚点。 |

## 真实调用链路

1. `src/skillforge/runtime-provider-adapter-contract.mjs`：冻结 provider-backed reserved seam 的 stub execution identity contract，并在 `blocked/error` 上生成完整 `executionId` / `providerRunId` / `providerStatus` tuple。
2. 同文件：identity 同步写回 `execution` 与 `providerMetadata`，保证 adapter result 内部 same-source。
3. `src/skillforge/runtime-observed-mapper.mjs`：读取 adapter result，通过 same-source guard 校验 tuple，并对 non-provider-backed 路径执行 identity scrub。
4. `src/skillforge/runtime-runner.mjs`：维持 adapter → runner → report 的单一路径透传，禁止 downstream 自造 identity 或 partial fallback。
5. `src/skillforge/runtime-replay-reporter.mjs`：输出与最终 case status 对齐的 identity/failure truth，不把 stub identity 误写成真实 provider execution 证据。
6. `scripts/test-runtime-contracts.mjs`：用 provider-backed `blocked/error`、non-provider-backed fallback 与 all-or-nothing 样例锁住上述 contract。

## 不要改错的位置

- 这次决策不只是补一个实现缺口；核心是冻结 execution identity 的长期 contract，不能把它当成临时 patch 再次放松。
- `runtime-observed-mapper.mjs` 的 same-source identity guard 不是 bug；它是阻止 mixed-source lineage 漂移的守门逻辑。
- non-provider-backed identity scrub 是故意保留的 contract，不能为了“字段统一好看”让 dry-run/null-runner 也带 stub identity。
- stub execution identity 不是 provider execution evidence，不能借此开放 `executed=true`、`providerCall=true`、`providerEvidenceAvailable=true`、`passed`、`transcript persistence` 或 `validate` 默认链路。

## 验证标准

- provider-backed reserved seam 的 `blocked/error` 结果必须始终携带完整 stub execution identity tuple：`executionId`、`providerRunId`、`providerStatus`。
- 这组三元组必须在 `adapter -> runner -> observed mapper -> report` 上保持 same-source all-or-nothing 对齐，不能出现 metadata-only、partial tuple 或 mixed-source 值。
- same-source stub tuple 不得被解释成 provider transcript、transcript handle、provider-managed retrieval 或 transcript persistence 已存在。
- `transcriptRef.handle` / `providerManaged` / `providerTranscript` / `persistence` 在未接入真实 provider transcript contract 前必须继续保持 reserved-only seam 语义，不得从 provider-less transcript stub、rawResponse 或 stub execution identity tuple 推导置真。
- non-provider-backed 路径必须继续输出 `executionId=null`、`providerRunId=null`、`providerStatus=null`，并保持 `transcriptRef.available=false`、`providerManaged=false`、`providerTranscript=false`、`handle=null`、persistence=`false`/`"none"`。
- stub identity 与 transcript seam 都不得升级 `executed`、`providerCall`、`providerEvidence`、`transcriptAvailable`、`transcriptCaptured` 等能力语义。
- `scripts/test-runtime-contracts.mjs` 必须保持通过；文档口径也必须持续明确 `stub execution identity != provider transcript`。

## Search Terms

- `RUNTIME_PROVIDER_FAILURE_TAXONOMY_VERSION`
- `RUNTIME_PROVIDER_FAILURE_STATUS_PRIORITY`
- `RUNTIME_PROVIDER_FAILURE_STATUS_ALLOWED_SET`
- `RUNTIME_PROVIDER_FAILURE_STATUS_SEMANTICS`
- `adapter-error`
- `RUNTIME_PREFLIGHT_BLOCKED`
- `normalizeFailureReason`
- `assertSameSourceFailurePropagation`
- `assertSameSourceExecutionIdentity`
- `failureReason.sourceStatus`
- `sameSource`
- `providerBackedReserved`
- `mixed-source failureReason`
- `executionId`
- `providerRunId`
- `providerStatus`
- `stub execution identity`
- `same-source tuple`
- `reserved-only transcript seam`
- `transcriptRef.handle`
- `providerManaged`
- `providerTranscript`
- `transcript persistence`
- `provider-less transcript stub`
- `mixed-source fallback`
- `preflight-blocked`
- `provider-slot-reserved`
- `Runtime contract tests passed: 34/34 cases`
