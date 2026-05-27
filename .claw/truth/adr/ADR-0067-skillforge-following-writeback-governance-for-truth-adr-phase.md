# ADR: SkillForge truth/phase/ADR 跟随式回写治理规则

## Status

accepted

## Context

第五阶段已经把最小真实执行闭环、对象链、产品主线、证据链与复盘回沉链压成统一锚点。为了避免文档先行、口径漂移或把候选能力提前写成既成事实，需要明确 truth、phase、spec 与 ADR 的回写边界。

## Decision

第五阶段之后，`truth`、`phase`、`spec` 与 `ADR` 只允许按真实完成态做跟随式回写，不允许用文档反向替代产品主线或提前宣称高阶能力已成立。

具体约束如下：

- 只有当对应能力、闭环或治理规则已经在真实执行中成立时，才允许写入或更新 truth / phase / ADR。
- `truth` 侧只记录已确认的事实锚点，不记录未完成的候选能力。
- `phase` 侧只跟随真实阶段收口结果，不允许跨阶段越界叙事。
- `ADR` 侧只沉淀具有长期约束力的架构/治理决策，不把一次性实现动作写成长期规则。
- 若后续引入自动回写、自动优化、规模化知识回流等高阶能力，必须作为新阶段候选能力重新立项，不能回写为第五阶段已成立事实。

## Alternatives Considered

- 文档先行，先把 truth/phase/spec/ADR 写完整再补实现：被拒绝，因为会把未验证口径固化成事实。
- 将自动回写作为第五阶段既有结论：被拒绝，因为第五阶段只完成最小真实闭环与治理锚点，未验证高阶自动化。

## Related Code

| Path | Role |
| --- | --- |
| `docs/skillforge-roadmap-and-doc-governance-v1.md` | 阶段推进与文档治理边界的来源。 |
| `docs/skillforge-owner-decision-page-v2.md` | 负责人裁决口径的来源。 |
| `adr/ADR-0063-skillforge-fifth-phase-minimal-real-execution-loop-and-product-mainline.md` | 第五阶段总 ADR，作为本决策的上位阶段锚点。 |
| `adr/ADR-0066-skillforge-p4-retro-to-skeleton-minimal-writeback-loop.md` | 复盘回沉规则的相邻治理锚点。 |

## Consequences

- 后续文档回写会更稳，不容易把候选能力写成既成事实。
- 需要人工判断何时达到可回写阈值，增加一点治理成本。
- 适合作为抽样稽核基线，检查 truth / ADR / phase 是否与真实完成态一致。

## Search Terms

- `truth`
- `phase`
- `ADR`
- `follow-up writeback`
- `自动回写`
- `自动优化`
- `规模化知识回流`
