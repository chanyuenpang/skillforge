# ADR-0015: SkillForge transcript handle 保持 reserved-only same-source seam，直到真实 provider evidence 接通

## Status

accepted

## Context

决定先行：在 ADR-0014 已冻结 provider-backed failure taxonomy、execution identity stub 与 transcript same-source guard 之后，Phase 3 继续把 transcript truth seam 从“有守卫”推进到“字段级 reserved contract 冻结”，但仍不接真实 provider call、不开放 `passed`、不做 transcript persistence 真落地，也不把 raw payload retrieval 或 validate 默认链路接进来。

来源计划“Phase 3 provider transcript handle reserved seam”已完成。计划中的 `done` 任务与 retrospective 固定了以下事实：

- transcript availability / ref truth table 已冻结：无论 non-provider-backed 还是 provider-backed reserved seam，当前都不得伪造 provider transcript；只允许保留 future reserved slot。
- transcript 相关引用字段被收紧为 `adapter → mapper → runner → report` 的单一路径 same-source propagation；禁止从 `metadata`、`rawResponse` 或 report fallback 自造 transcript handle。
- runtime contract tests 已把 transcript seam 锁到 `37/37`，覆盖 non-provider-backed 全回落、provider-backed 不得伪造 provider transcript handle，以及 provider-less transcript stub 不得升级为 provider transcript。
- runner fallback transcript artifact 与 `transcriptAvailability.available` 不一致的最小 gap 已被修平，确保 provider-less draft artifact 不再与 reporter same-source/alignment 校验冲突。
- 文档已统一为 reserved-only 口径：`transcript handle`、`transcriptRef`、`persistence-state` 只是未来 provider transcript capture / retrieval / persistence 的保留槽位，不代表这些能力已经实现。

该结论需要单独沉淀，是因为它把 transcript 相关 truth 从“不能乱写”进一步推进为“必须沿单一路径同源传播，而且 availability / handle / providerManaged / providerTranscript / persistence 这些字段现在都只表达 future seam，不表达当前能力”。这已经是未来真实 provider transcript capture、retrieval 与 persistence 接入时必须遵守的长期结构约束。

## Decision

决定将 SkillForge 当前阶段的 transcript contract 固定为：`transcriptRef`、`transcriptAvailability` 与相关 `handle / providerManaged / providerTranscript / persistence` 字段，只能作为 **reserved-only same-source seam** 存在；在真实 provider evidence、transcript capture、retrieval 与 persistence 全部接通前，这些字段不得被任何 fallback、stub 或摘要字段升级为“provider transcript 已可用”的信号。

当前阶段的具体规则如下：

- transcript truth table 固定为保守 contract：non-provider-backed 路径必须回落到 `available=false`、`providerManaged=false`、`providerTranscript=false`、`handle=null`，persistence 相关位保持 `false` 或 `none`；provider-backed reserved seam 也只能保留 future slot，不得伪造可用 transcript。
- transcript 字段只允许沿 `adapter → mapper → runner → report` 单一路径同源传播；downstream 不得从 `metadata`、`rawResponse`、report fallback 或其他 mixed-source 摘要字段补造 transcript identity。
- `transcriptAvailability.available`、`transcriptRef.available` 与 `providerExecution.transcriptAvailable` 必须保持同源对齐；任一层不得单独把 availability 置真。
- provider-less transcript stub 若存在，只能表示 in-report draft artifact 的 orchestration evidence；它不能升级解释成 provider transcript、provider-managed handle、provider retrieval 或 transcript persistence。
- `rawResponse` 及其 handle/summary 必须继续与 transcript seam 分槽；不得把 raw response slot 或 raw payload retrieval fallback 成 transcript handle。
- 当前 contract 仍不开放真实 provider transcript capture、transcript retrieval、transcript persistence、`passed` path、scoring、sandbox 或 validate 默认链路；这些能力若未来接入，必须显式扩展当前 reserved seam，而不是在现有字段上偷偷放宽。
- transcript seam contract tests 必须长期保留，继续守住 non-provider-backed 回落、provider-backed reserved honesty、same-source propagation 与 report scrub/alignment 约束。

## Alternatives Considered

- 继续允许 runner、reporter 或 `providerMetadata` 在缺失同源 transcript truth 时补造 `transcriptRef` / `handle`：拒绝。来源计划明确要求 transcript 只能走单一路径 same-source propagation，防止 mixed-source transcript lineage 漂移。
- 让 provider-less transcript stub 直接承担 provider transcript 语义：拒绝。来源计划与既有 contract tests 都明确它只代表 draft-only orchestration evidence。
- 把 `rawResponse` 或其 handle/summary 当作 transcript fallback：拒绝。来源计划明确 raw payload seam、transcript seam 与 persistence seam 必须继续分槽。
- 在真实 provider transcript 未接通前提前开放 `available=true`、`providerManaged=true` 或 persistence 语义：拒绝。当前计划的核心就是冻结 reserved-only contract，避免用半实现字段暗示能力已完成。

## Related Code

| Path | Role |
| ---- | ---- |
| `plans/subplan-4-subplan-phase-3-provider-transcript-handle-reserved-seam.json` | 来源计划记录，提供 truth table、same-source propagation、tests、gap 修复与 retrospective 结论。 |
| `src/skillforge/runtime-provider-adapter-contract.mjs` | transcript 原始 truth 槽位、reserved seam 与 provider-backed 保守 contract 的上游入口。 |
| `src/skillforge/runtime-observed-mapper.mjs` | `transcriptAvailability` 同源归一、non-provider-backed transcript scrub 与 metadata-only transcript 拒绝锚点。 |
| `src/skillforge/runtime-runner.mjs` | adapter→runner transcript 透传与 fallback artifact availability 对齐锚点。 |
| `src/skillforge/runtime-replay-reporter.mjs` | `transcriptRef` / `transcriptAvailability` / `providerExecution` same-source 校验，以及 transcript/raw response scrub 锚点。 |
| `scripts/test-runtime-contracts.mjs` | transcript seam contract tests、same-source guard、alignment 与 `37/37` 验证锚点。 |
| `docs/runtime-replay-protocol-lightweight-design.md` | transcript reserved seam 协议口径同步锚点。 |
| `docs/validator-contract.md` | transcript honesty / reserved-only contract 文档同步锚点。 |
| `docs/roadmap.md` | Phase 3 transcript seam 进度口径回写锚点。 |
| `docs/phase-3-provider-backed-slot-contract-checklist.md` | transcript handle / persistence 预留槽位与 future contract checklist 锚点。 |

## Consequences

- 正向：transcript truth 现在拥有冻结的 truth table 与单一路径 same-source 传播规则，后续真实 provider transcript 接入有了稳定落点。
- 正向：`transcriptAvailability`、`transcriptRef` 与 `providerExecution.transcriptAvailable` 同源对齐后，下游更难把 draft artifact、metadata 残留或 raw response handle 误读成 provider transcript 能力。
- 正向：provider-less transcript stub 被明确限制为 draft-only orchestration evidence，减少“有 transcriptRef 就代表 provider 执行过”的语义漂移。
- 正向：runner fallback gap 被修平后，reporter 的 same-source guard 可以继续作为长期 truth 守门逻辑，而不必靠放宽校验掩盖 mismatch。
- 取舍：当前仍不支持真实 provider transcript capture、retrieval、persistence、raw payload retrieval contract、`passed` path、scoring 或 validate 默认链路；能力上仍是 reserved seam，而不是完成态 transcript system。
- 取舍：未来若要开放 transcript 相关能力，必须先扩展 adapter truth payload、mapper contract 与 tests，再让 runner/reporter 透传；不能在下游局部补字段绕过 same-source guard。
- 验证锚点：来源完成记录确认 transcript contract tests 维持 `37/37` 通过，并明确锁住 non-provider-backed 全回落、provider-backed 不得伪造 provider transcript handle、provider-less transcript stub 不得升级为 provider transcript，以及 runner fallback artifact / `transcriptAvailability.available` mismatch 已被最小修复。

## Search Terms

- `transcriptAvailability`
- `transcriptRef`
- `providerManaged`
- `providerTranscript`
- `transcript handle`
- `transcript persistence`
- `reserved-only transcript seam`
- `same-source propagation`
- `adapter -> mapper -> runner -> report`
- `provider-less transcript stub`
- `rawResponse`
- `mixed-source fallback`
- `transcriptAvailability.available`
- `providerExecution.transcriptAvailable`
- `Runtime contract tests passed: 37/37 cases`
