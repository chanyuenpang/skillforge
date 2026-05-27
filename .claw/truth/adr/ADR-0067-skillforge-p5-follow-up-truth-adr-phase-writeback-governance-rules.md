# ADR: SkillForge P5 跟随式 truth / ADR / phase 回写治理规则收口

## Status

accepted

## Context

P5 的负责人结论不是继续扩写产品能力，而是先把后续文档治理的边界收口：`truth`、`ADR`、`phase` 三类文档只有在最小真实证据、真实样本、负责人裁决与边界声明同时成立时，才允许写入对应的完成态或治理态。否则，容易把候选能力、冻结能力或局部样本越级写成既成事实。

第五阶段前序已固定对象链、证据链、回沉闭环与产品主线，但如果没有跟随式回写规则，后续仍可能出现“文档先于产品”或“已验证样本外推为全量可运营”的失真。

## Decision

决定将 SkillForge P5 的文档治理规则固定为“跟随式 truth / ADR / phase 回写治理规则收口”，并按以下约束执行：

1. `truth`、`ADR`、`phase` 只能跟随真实完成结果回写，不能作为能力解锁的前置证明。
2. 回写前必须同时满足真实证据、真实样本、负责人裁决与边界声明；任一条件不足时，只能挂账，不能写成完成态。
3. `已实现`、`已验证`、`可运营` 等口径必须严格区分，不能互相替代，也不能用局部样本外推全量成立。
4. 对候选能力、冻结能力、未验证自动化、跨项目规模化知识回流等内容，必须保持禁写或挂账，直到有新的真实输入足以支撑变更。
5. 回写模板只保留最小必要字段，用于约束后续主计划关账和实现层治理，不承担描述全部实施细节的职责。
6. 一旦回写结果与真实边界冲突，必须回退到挂账或候选状态，不能用文档补写掩盖事实不足。

## Alternatives Considered

- 让 `truth`、`ADR`、`phase` 自动联动回写：被拒绝，因为这会把文档治理误当成能力成立证明。
- 允许“已验证”直接等同“可运营”：被拒绝，因为局部样本无法证明全量可运营。
- 把回写规则分散到各阶段文档中：被拒绝，因为治理边界会碎片化，后续容易越级回写。

## Related Code

| Path | Role |
| --- | --- |
| `docs/skillforge-p5-follow-up-truth-adr-phase-writeback-governance-rules-draft-v1.md` | P5 回写治理锚点文档，承载最小回写触发条件、口径边界、禁写清单与回退条件 |
| `docs/skillforge-p4-retro-to-skeleton-minimal-writeback-loop-draft-v1.md` | P4 回沉闭环约束来源，作为跟随式回写的前置输入 |
| `docs/skillforge-p0-phase5-acceptance-map-and-mainline-anchor-v1.md` | 第五阶段验收图与主线锚点来源 |
| `plan.json` | P5 主计划收口记录与任务骨架来源 |

## Consequences

- 正向：后续 `truth` / `ADR` / `phase` 回写都有统一门槛，减少越级写入。
- 正向：`已实现`、`已验证`、`可运营` 的口径边界被固定，能防止局部样本外推。
- 正向：最小回写模板足以约束第五阶段主计划关账后的治理动作，不会让文档反向替代真实产品主线。
- 取舍：回写速度会更克制，不能用自动联动一键铺开。
- 风险：如果后续执行中把挂账当成完成态，治理规则会失真。
- 验证锚点：`docs/skillforge-p5-follow-up-truth-adr-phase-writeback-governance-rules-draft-v1.md`、`docs/skillforge-p4-retro-to-skeleton-minimal-writeback-loop-draft-v1.md`、`docs/skillforge-p0-phase5-acceptance-map-and-mainline-anchor-v1.md`。

## Search Terms

- `truth`
- `ADR`
- `phase`
- `已实现`
- `已验证`
- `可运营`
- `挂账`
- `回退条件`
- `最小回写模板`
