# ADR-0017: SkillForge provider execution identity stub 与 status-compat 保持 provider-backed reserved seam

## Status

accepted

## Context

决定先行：在 `rawResponse` contract hardening 刚完成之后，Phase 3 继续把 `executionId` / `providerRunId` / `providerStatus` 从保守 `null` / 文档预留推进为 **provider-backed reserved seam 下的 same-source stub tuple**，并同时冻结最小 `status-compat` 规则。

来源计划“Phase 3 provider execution identity stub + status-compat seam”已完成（`end.completed`）。计划中的 `done` 任务与 retrospective 固定了以下事实：

- `executionId` / `providerRunId` / `providerStatus` 的最小 stub contract 已冻结：只允许在 provider-backed 且语义状态为 `blocked` / `error` 时出现；出现时也只是 stub tuple，不得升级为真实 provider execution proof。
- execution identity stub 只允许沿 `adapter -> mapper -> runner -> report` 单一路径 same-source propagation；downstream 不得自造 tuple，不得只从 metadata 拼装 partial tuple，也不得 mixed-source fallback。
- provider-backed `status-compat` seam 已冻结：public case status 不扩容，`providerStatus` 仅允许 `stub-blocked` / `stub-error` / `stub-reserved`，且只停留在 metadata / execution seam，不泄漏为新的 public status token。
- runtime contract tests 已补齐并通过 `48/48`，覆盖 non-provider-backed `null` fallback、stub tuple 不升级 capability、public status 不变、same-source propagation 与 status-compat 守卫。
- 文档口径已同步到 roadmap / checklist / protocol / validator：当前 provider-backed reserved seam 只是保守 metadata seam，仍未接入真实 provider execution、provider evidence、transcript、raw payload retrieval、persistence，也未接入 `validate` 默认链路。

该决策需要沉淀，因为它把 execution identity 与 provider status 的长期解释边界固定下来：未来真实 provider 接入可以复用这些槽位，但在真实 execution / evidence / transcript / raw payload 未接通之前，任何下游都不能把 stub tuple 或 metadata status 误读成能力已落地，或借机扩张 public status 词表。

## 后续修改

本 ADR 中 "public case status 不扩容" 的约束已被 **ADR-0027** 修改：`synthetic-passed` 作为单 token 例外被加入公共 case status 集合。除 `synthetic-passed` 外，其他公共 case status 仍不扩容。

## Decision

决定将 SkillForge 当前阶段的 execution identity 与 provider status contract 固定为：**provider-backed reserved seam 可以携带 same-source stub tuple，但它只是一组保守 metadata / execution 占位；public case status 继续保持原有最小词表，不因 provider seam 暴露新 token。**

当前阶段的具体规则如下：

- `executionId` / `providerRunId` / `providerStatus` 只允许在 provider-backed 且最终语义状态为 `blocked` / `error` 时出现；non-provider-backed 路径必须继续统一回落为 `null`。
- 这三个字段必须作为 **all-or-nothing same-source tuple** 出现：要么同源完整透传，要么整体为 `null`；禁止 metadata-only、partial tuple、或跨层 mixed-source fallback。
- 该 tuple 只允许沿 `adapter -> mapper -> runner -> report` 单一路径传播；downstream 不得重新生成 identity，不得从局部字段兜底补齐。
- `providerStatus` 当前仅允许 `stub-blocked` / `stub-error` / `stub-reserved`，并且只存在于 metadata / execution seam；public case status 不增加新 token，继续保持既有兼容边界。
- stub tuple 不得升级任何能力语义：不得推出 `executed=true`、`providerCall=true`、`providerEvidence` 已存在、`transcript` 已存在、`rawResponse` 已可取回、`persistence` 已接通，也不得开放 `passed` path 或 `validate` 默认链路。
- provider-backed reserved seam 的 status-compat 必须保持四层一致：adapter / mapper / runner / report 都只能把 `providerStatus` 当作内部兼容状态，而不是对外 public status。
- 后续若要接入真实 provider execution，必须在保留现有 stub tuple、same-source propagation 与 public status 不扩容约束的前提下演进；不能让 execution identity / provider status 重新退回各层自造、部分可见或含义漂移的状态。

## Alternatives Considered

- 继续把 `executionId` / `providerRunId` / `providerStatus` 全部固定为 `null`，等真实 provider 接入后再设计：拒绝。来源计划确认当前需要先冻结保守的 reserved seam，避免未来真实接入时各层各自发明字段语义。
- 允许 downstream 从 metadata 或局部字段补造 identity tuple：拒绝。已完成任务明确要求 same-source propagation，禁止 partial tuple 与 mixed-source fallback。
- 把 `providerStatus` 直接暴露为新的 public case status token：拒绝。来源计划明确 public case status 不扩容，`providerStatus` 只能停留在 metadata / execution seam。
- 让 stub tuple 被解释成真实 provider execution、provider evidence、transcript 或 raw payload retrieval 已完成：拒绝。该计划的核心就是冻结诚实的 stub contract，避免保守占位被误读成能力完成。

## Related Code

| Path | Role |
| ---- | ---- |
| `plans/subplan-4-subplan-phase-3-provider-execution-identity-stub-and-status.json` | 来源计划记录，提供 execution identity stub、status-compat seam、tests 与 retrospective 结论。 |
| `docs/roadmap.md` | Phase 3 execution identity stub + status-compat 进度与边界口径同步锚点。 |
| `docs/phase-3-provider-backed-slot-contract-checklist.md` | execution identity / provider status seam、same-source propagation 与 anti-upgrade 约束文档锚点。 |
| `docs/runtime-replay-protocol-lightweight-design.md` | execution identity 与 status-compat protocol 口径同步锚点。 |
| `docs/validator-contract.md` | execution identity stub 与 public status 不扩容的 validator contract 文档锚点。 |

## Consequences

- 正向：execution identity 现在有了冻结的最小 stub tuple contract，未来真实 provider execution 可以在稳定 seam 上演进，而不是重新发明 lineage 字段。
- 正向：`providerStatus` 被明确限制在 metadata / execution seam，避免 internal stub status 污染 public case status。
- 正向：same-source all-or-nothing tuple 规则阻止了 metadata-only、partial tuple 与 mixed-source fallback，降低 lineage 漂移与误报风险。
- 正向：`48/48` runtime contract tests 为 non-provider-backed `null` fallback、status-compat、public status 不扩容与 capability anti-upgrade 提供长期回归锚点。
- 取舍：当前仍不支持真实 provider execution、provider evidence、transcript、raw payload retrieval、persistence、`passed` path 或 `validate` 默认链路；execution identity 仍是 reserved seam，而不是完成态执行证据。
- 取舍：未来若要放开真实 execution identity 语义，必须先补齐 provider-backed truth payload 与 contract tests，不能在 report 或 metadata 层局部放宽解释。
- 验证锚点：来源完成记录确认 runtime contract tests 通过 `48/48`，并明确覆盖 stub tuple、status-compat、public status 不扩容、same-source propagation 与 capability 不升级边界。

## Search Terms

- `executionId`
- `providerRunId`
- `providerStatus`
- `stub tuple`
- `same-source propagation`
- `all-or-nothing tuple`
- `provider-backed reserved seam`
- `status-compat`
- `stub-blocked`
- `stub-error`
- `stub-reserved`
- `public status`
- `public status 不扩容`（被 ADR-0027 修改：`synthetic-passed` 为单 token 例外）
- `metadata seam`
- `adapter -> mapper -> runner -> report`
- `null fallback`
- `provider evidence`
- `transcript`
- `rawResponse`
- `persistence`
- `Runtime contract tests passed: 48/48`
