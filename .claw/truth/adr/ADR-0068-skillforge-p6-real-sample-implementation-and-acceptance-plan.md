# ADR: SkillForge P6 真实样本实现与验收计划

## Status

proposed

## Context

第五阶段已经固定了验收图、对象链/状态机、产品面、证据链、回沉闭环与文档回写规则。接下来需要把这些既定约束落到“真实样本”上，明确先走哪条真实样本链路、要补哪些实现件、如何组织真实回归与验收，以及哪些任务应继续作为项目级里程碑推进。

## Decision

P6 采用“先真实样本链路、后扩展面”的推进方式：优先围绕已固定的第五阶段锚点，把真实样本实现与验收计划拆成可持续推进的项目级里程碑，而不是一次性铺开全部能力。

具体上，后续实现必须继续受以下既有基线约束：

- `docs/skillforge-p0-phase5-acceptance-map-and-mainline-anchor-v1.md`
- `docs/skillforge-p1-minimal-real-object-chain-and-state-machine-draft-v1.md`
- `docs/skillforge-p2-minimal-real-execution-mainline-product-surface-draft-v1.md`
- `docs/skillforge-p3-minimal-real-evidence-chain-and-regression-acceptance-baseline-draft-v1.md`
- `docs/skillforge-p4-retro-to-skeleton-minimal-writeback-loop-draft-v1.md`
- `docs/skillforge-p5-follow-up-truth-adr-phase-writeback-governance-rules-draft-v1.md`

## Alternatives Considered

- 直接把全部真实样本与验收面一次性铺开：被放弃，因为会冲淡第五阶段已经固定的约束边界，也不利于把真实样本链路做成可持续的里程碑。
- 仅把 P6 当成文档整理任务：被放弃，因为该阶段的核心不是复述既有基线，而是把这些基线转成后续可执行的实现与验收推进路径。

## Related Code

| Path | Role |
| ---- | ---- |
| `docs/skillforge-p0-phase5-acceptance-map-and-mainline-anchor-v1.md` | 第五阶段验收图与主线锚点 |
| `docs/skillforge-p1-minimal-real-object-chain-and-state-machine-draft-v1.md` | 对象链与状态机约束 |
| `docs/skillforge-p2-minimal-real-execution-mainline-product-surface-draft-v1.md` | 最小产品面锚点 |
| `docs/skillforge-p3-minimal-real-evidence-chain-and-regression-acceptance-baseline-draft-v1.md` | 最小真实证据链与验收基线 |
| `docs/skillforge-p4-retro-to-skeleton-minimal-writeback-loop-draft-v1.md` | 最小回沉闭环锚点 |
| `docs/skillforge-p5-follow-up-truth-adr-phase-writeback-governance-rules-draft-v1.md` | 跟随式回写治理规则 |

## Consequences

- 后续实现会被限定在既有基线之内，避免真实样本链路偏离第五阶段收口方向。
- P6 的推进方式会更像一组可持续里程碑，而不是一次性大改。
- 真实回归与验收需要围绕既定证据链和回写规则组织，减少后续反复返工。

## Search Terms

- `skillforge-p0-phase5-acceptance-map-and-mainline-anchor-v1.md`
- `skillforge-p1-minimal-real-object-chain-and-state-machine-draft-v1.md`
- `skillforge-p3-minimal-real-evidence-chain-and-regression-acceptance-baseline-draft-v1.md`
- `真实样本`
- `验收计划`
- `回写治理`
