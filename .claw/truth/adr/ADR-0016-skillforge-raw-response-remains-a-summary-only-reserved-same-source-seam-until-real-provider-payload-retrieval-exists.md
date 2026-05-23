# ADR-0016: SkillForge rawResponse 保持 summary-only reserved same-source seam，直到真实 provider payload retrieval 接通

## Status

accepted

## Context

决定先行：在 transcript handle reserved seam 刚被冻结之后，Phase 3 继续把 `rawResponse` 的 shape、semantics 与 retrieval-handle reserved contract 固定下来，并要求它沿 `adapter → mapper → runner → report` 只走单一路径同源传播。

来源计划“Phase 3 provider raw-response contract hardening”已完成。计划中的 `done` 任务与 retrospective 固定了以下事实：

- `rawResponse` shape / semantics 已冻结：当前只允许最小 `summary-only`、`reserved-only`、默认不可用 contract，不得冒充 transcript / persistence，也不得冒充真实 payload retrieval 已完成。
- `rawResponse` 字段只允许沿 `adapter → mapper → runner → report` 单一路径传播；downstream 不得自造 `rawResponse` identity、`handle`，也不得混用 transcript handle。
- runtime contract tests 已补齐并通过 `43/43`，覆盖 non-provider-backed unavailable/null、provider-backed reserved seam 不得伪装 full payload captured，以及 `rawResponse handle` 不得混作 transcript / persistence handle。
- roadmap / checklist / protocol / validator 文档口径已同步：`rawResponse` 只是 summary truth slot 与 retrieval seam 的保留边界，不代表真实 provider raw payload capture / retrieval 已经完成。
- 当前仍未接入真实 provider payload capture / retrieval、`passed` path、validate 默认链路，也未落地 transcript persistence、scoring、sandbox 或 multi-case。

该结论需要沉淀，是因为它改变了未来实现约束：`rawResponse` 不再是一个可被下游任意补造的宽松“原始结果”概念，而是一个被严格限定的保守 truth slot。未来任何 provider-backed raw payload capture、retrieval handle、evidence 完成声明，都必须在这个 seam 上显式扩展，而不是复用 transcript、persistence 或 mixed-source fallback 偷渡进去。

## Decision

决定将 SkillForge 当前阶段的 `rawResponse` contract 固定为：它只能表达 **summary-only reserved same-source seam**；在真实 provider payload capture / retrieval evidence 接通前，`rawResponse` 默认不是 payload 已捕获证明，不是 transcript handle，不是 persistence handle，也不是 provider evidence 完成声明。

当前阶段的具体规则如下：

- `rawResponse` 只允许最小对象形状与保守语义：通过 `available / summary / handle` 表达 summary truth slot 与 future retrieval seam；当路径是 non-provider-backed 或尚未满足 execution / provider evidence 条件时，必须回落为 `available=false`，`summary=null`，`handle=null`。
- `rawResponse` 字段只允许沿 `adapter → mapper → runner → report` 单一路径同源传播；downstream 不得自行生成 `rawResponse` identity、不得重新推断 `available=true`、不得补造 retrieval handle。
- `rawResponse` seam 必须与 transcript seam、persistence seam 分槽：`rawResponse handle` 不得混作 `transcript handle`、`transcriptRef`、persistence handle 或其他 retrieval identity。
- provider-backed 路径即使保留 reserved seam，也不得伪装成 full payload 已 captured 或 retrieval 已可用；若真实 payload capture / retrieval 尚未落地，就必须继续诚实暴露 reserved-only contract。
- reporter、mapper 与 runner 都不得通过 fallback、metadata 或摘要拼装 mixed-source `rawResponse`；`available / summary / handle` 必须保持 same-source normalization。
- 当前 contract 仍不开放真实 provider raw payload capture、payload retrieval、`passed` path、validate 默认链路、transcript persistence、scoring、sandbox 或 multi-case；未来若要接入，必须先扩展上游 truth payload 与 contract tests，再允许下游透传。
- `rawResponse` seam contract tests 必须长期保留，继续守住 non-provider-backed 回落、provider-backed reserved honesty、same-source propagation 与 transcript/persistence anti-mixing 约束。

## Alternatives Considered

- 让 downstream 在 adapter truth 不完整时自行补造 `rawResponse`、`handle` 或 `available=true`：拒绝。来源计划明确要求 `rawResponse` 只沿单一路径同源传播，禁止 mixed-source fallback。
- 把 `rawResponse handle` 复用成 `transcript handle` 或 persistence handle：拒绝。来源计划明确要求 `rawResponse`、transcript、persistence 三类 seam 分槽，避免语义串线。
- 在真实 payload capture / retrieval 未落地前把 provider-backed reserved seam 包装成 full payload captured：拒绝。该计划的核心就是冻结诚实的 reserved-only contract，防止对外误报能力完成。
- 让 `rawResponse` 承担 provider evidence 完成声明：拒绝。当前它只是 summary truth slot 与 future retrieval seam，不能替代 execution/provider evidence 的独立 truth。

## Related Code

| Path | Role |
| ---- | ---- |
| `plans/subplan-4-subplan-phase-3-provider-raw-response-contract-hardening.json` | 来源计划记录，提供 `rawResponse` shape/semantics、same-source propagation、tests 与 retrospective 结论。 |
| `docs/roadmap.md` | Phase 3 `rawResponse` seam 进度与边界口径同步锚点。 |
| `docs/phase-3-provider-backed-slot-contract-checklist.md` | `rawResponse` reserved seam、retrieval handle 边界与 future contract checklist 锚点。 |
| `docs/runtime-replay-protocol-lightweight-design.md` | `rawResponse` protocol 口径同步锚点。 |
| `docs/validator-contract.md` | `rawResponse` honesty / reserved-only contract 文档同步锚点。 |

## Consequences

- 正向：`rawResponse` 现在拥有冻结的最小 shape、诚实语义与单一路径 same-source propagation 规则，未来真实 payload capture / retrieval 可以在稳定 seam 上扩展。
- 正向：summary truth slot 与 transcript / persistence / provider evidence 被明确分槽，减少下游把任意 handle 或摘要误读成“原始 payload 已可取回”的风险。
- 正向：downstream 不再能自造 `rawResponse` identity 或 mixed-source fallback，report 口径与上游 truth payload 更一致。
- 正向：`43/43` contract tests 为 mapper / reporter 双层边界提供了长期回归锚点，能持续阻止 rawResponse ↔ transcript/persistence 语义串线。
- 取舍：当前仍不支持真实 provider raw payload capture / retrieval，也不开放 `passed` path、validate 默认链路、transcript persistence、scoring、sandbox 或 multi-case；能力上仍是 reserved seam，而不是完成态 payload system。
- 取舍：未来若要放开 `rawResponse.available=true` 或提供 retrieval handle，必须先补齐 provider evidence、adapter truth payload 与 tests；不能在 report 层局部放宽语义。
- 验证锚点：来源完成记录确认 runtime contract tests 通过 `43/43`，并明确覆盖 non-provider-backed unavailable/null、provider-backed reserved seam 不得伪装 full payload captured、以及 `rawResponse handle` 不得混作 transcript / persistence handle。

## Search Terms

- `rawResponse`
- `summary-only`
- `reserved-only`
- `same-source propagation`
- `adapter -> mapper -> runner -> report`
- `rawResponse.available`
- `rawResponse.summary`
- `rawResponse.handle`
- `payload retrieval`
- `provider-backed reserved seam`
- `mixed-source fallback`
- `transcript handle`
- `persistence handle`
- `Runtime contract tests passed: 43/43`
