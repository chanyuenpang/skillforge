# ADR: SkillForge P4 复盘回沉最小闭环

## Status

accepted

## Context

P4 已完成对第五阶段复盘回沉链路的收口，关键不是把 Retro 再扩写一层，而是把“复盘如何形成结构化结论、如何指向 Skeleton 回沉入口、哪些动作属于人工可执行且可追溯的最小闭环”固定下来。若不收口，后续很容易把自动回写、自动优化或跨项目知识回流混进第五阶段的完成态。

## Decision

决定将 P4 的负责人级结论固定为“复盘回沉最小闭环定义”，并按以下规则作为后续 P5 与实现层的约束：

1. `Retro` 必须形成结构化结论，而不是只产出自由文本摘要。
2. `Retro` 的结论必须能指向 `Skeleton` 的回沉入口，形成可追踪的提议链路。
3. 回沉动作只保留人工可执行、可追溯、可校核的最小集合，不承诺自动回写。
4. 回沉边界必须显式冻结：自动回写、自动优化、自动根因诊断、自动修复 / 自动回滚、自动一致性修复、自动推荐联动、跨项目规模化知识回流，均不在 P4 的完成态内。
5. 回沉锚点文档可作为后续真实样本闭环与跟随式回写的约束输入，但不能替代真实执行链本身。

## Alternatives Considered

- 继续把 P4 仅作为复盘文档整理：被拒绝，因为这无法稳定 `Retro` → `Skeleton` 的回沉入口。
- 直接承诺自动回写或自动优化：被拒绝，因为当前阶段只完成了最小闭环定义，自动化能力尚未成立。
- 把回沉动作扩展为跨项目知识回流：被拒绝，因为这会超出 P4 的最小可执行边界。

## Related Code

| Path | Role |
| --- | --- |
| `docs/skillforge-p4-retro-to-skeleton-minimal-writeback-loop-draft-v1.md` | P4 回沉锚点文档，承载 Retro 结构、回沉入口与边界冻结项 |
| `docs/skillforge-p1-minimal-real-object-chain-and-state-machine-convergence.md` | 对象链与状态机收敛前置约束 |
| `docs/skillforge-p3-minimal-real-evidence-chain-and-regression-acceptance-baseline.md` | 证据链与回归验收前置基线 |
| `docs/skillforge-phase-c-cross-domain-linkage-and-asset-reuse-governance-baseline.md` | 复盘回沉与资产复用治理边界来源 |
| `plan.json` | P4 子计划完成记录与任务骨架来源 |

## Consequences

- 正向：`Retro` 的结构化结论和 `Skeleton` 回沉入口被固定，后续实现可以沿同一最小闭环推进。
- 正向：人工可执行回沉动作被限定为最小集合，减少把未验证自动化写进完成态的风险。
- 正向：后续 P5 可以直接以该回沉锚点为输入，继续推进跟随式 `truth` / `ADR` / `phase` 回写规则收口。
- 取舍：本阶段明确不承诺自动回写或跨项目知识回流，推进会更克制。
- 风险：如果后续实现将回沉动作解释为自动化闭环，`Retro` 的治理边界会失真。
- 验证锚点：`docs/skillforge-p4-retro-to-skeleton-minimal-writeback-loop-draft-v1.md`、`docs/skillforge-p1-minimal-real-object-chain-and-state-machine-convergence.md`、`docs/skillforge-p3-minimal-real-evidence-chain-and-regression-acceptance-baseline.md`。

## Search Terms

- `Retro`
- `Skeleton`
- `回沉`
- `最小闭环`
- `自动回写`
- `自动优化`
- `跨项目规模化知识回流`
