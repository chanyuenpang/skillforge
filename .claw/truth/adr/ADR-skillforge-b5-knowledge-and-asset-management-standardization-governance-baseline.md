# ADR: SkillForge B5 知识与资产管理标准化治理基线

## Status

accepted

## Context

B5 的目标不是把知识与资产对象简单“补齐一轮文档”，而是把它们从局部定义可见推进到统一可治理、可复用、可审计的长期基线。此前如果资产范围、分类口径、元数据字段、标签维度、版本语义和状态语义各自独立，后续就会在 PromptDraft → StepPlan → Approval → Run 主链与 B4 证据链之间反复出现口径漂移，导致复用、追溯和验收都缺少稳定锚点。

## Decision

决定将 SkillForge B5 的知识与资产管理固定为一条负责人级的统一治理基线：资产范围、对象边界、元数据字段、标签维度、版本语义、状态语义、复用规则与追溯规则必须先标准化，再谈更高阶的配置发布入口、阶段总联调、第三阶段入口决策或智能化资产能力。

具体规则如下：

1. 资产对象必须先划清边界，避免把不同层级的对象混写成同一类资产。
2. 元数据、标签、版本与状态必须采用统一基线口径，保证对象可检索、可比较、可审计。
3. 知识与资产的复用必须配套最小追溯规则，保证后续能解释来源与演化路径，而不是只看最终内容。
4. PromptDraft → StepPlan → Approval → Run 主链与 B4 证据链必须保持兼容，不能因为 B5 标准化而破坏既有主链锚点。
5. 验收必须围绕边界守门、对象边界、元数据基线、跨域一致性、复用追溯与防越界检查展开，确保这次收口是规则层治理，不是一次性整理。
6. B5 的完成标准是形成可继续验证、可继续演进的规则基线，不提前承诺配置发布入口、总联调入口或智能化资产能力。

## Alternatives Considered

- 只做文档回写，不收统一规则：被拒绝，因为这只会留下更多分散定义，不能形成长期治理基线。
- 直接承诺配置发布入口、阶段总联调或智能化资产能力：被拒绝，因为当前阶段应先收稳对象边界与规则基线，不应扩大承诺面。
- 只做元数据标准，不管复用与追溯：被拒绝，因为没有复用追溯，资产仍然难以审计与复盘。
- 只对单条主链做兼容，不考虑 B4 证据链：被拒绝，因为主链与证据链必须共同保持稳定锚点。

## Related Code

| Path | Role |
| ---- | ---- |
| `docs/skillforge-b5-scope-and-guardrails-one-pager-v1.md` | B5 问题定义与范围冻结锚点 |
| `docs/skillforge-b5-asset-objects-and-boundaries-v1.md` | 资产对象清单与边界锚点 |
| `docs/skillforge-b5-metadata-tags-version-status-baseline-v1.md` | 元数据、标签、版本与状态基线锚点 |
| `docs/skillforge-b5-cross-domain-alignment-rules-v1.md` | 主链与 B4 证据链一致性校核锚点 |
| `docs/skillforge-b5-reuse-and-traceability-rules-v1.md` | 复用与追溯最小规则锚点 |
| `docs/skillforge-b5-acceptance-and-guardrail-check-v1.md` | 验收口径与防越界检查锚点 |
| `docs/skillforge-b5-doc-sync-and-closing-note-v1.md` | 文档回写与收口结论锚点 |
| `adr/ADR-0058-skillforge-b4-approval-execution-evidence-chain-governance-baseline.md` | B4 审批与执行证据链治理基线 |

## Consequences

- 正向：资产对象、元数据、版本和状态不再是局部约定，而是可治理的统一基线。
- 正向：复用与追溯有了最小规则，后续更容易审计与解释。
- 正向：PromptDraft → StepPlan → Approval → Run 主链能与 B4 证据链保持兼容，减少口径漂移。
- 取舍：当前成果仍停留在规则层标准化，尚未补齐规模化复用或产品化验证样本。
- 风险：如果后续实现重新把对象边界混写，统一治理口径会再次失真。
- 风险：若主文档同步不到位，规则基线可能被局部实现偏移。
- 验证锚点：计划已完成范围与边界守门、对象边界、元数据标签版本状态基线、跨域一致性校核、复用追溯、验收口径与防越界检查的落盘。

## Search Terms

- `PromptDraft`
- `StepPlan`
- `Approval`
- `Run`
- `Skeleton`
- `元数据`
- `标签`
- `版本`
- `状态`
- `复用`
- `追溯`
- `防越界检查`
