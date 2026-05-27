# ADR: SkillForge B8 第二阶段收口与第三阶段入口判定框架

## Status

accepted

## Context

B8 的目标不是直接宣布第二阶段已经完整退出，也不是提前批准第三阶段深执行，而是把第二阶段已经形成的治理、事实、证据与边界材料收束成一套负责人可裁决、可追溯、可防夸大的判断依据。此前如果把文档收口、最小样本验证或分支实现误写成阶段退出完成，后续就会把“可签收事实”和“待裁决结论”混在一起，导致阶段边界失真。

## Decision

决定将第二阶段的收口材料统一整理为负责人级判定框架，并明确第三阶段入口只能基于这套框架裁决，具体包括：

1. 第二阶段已形成的规则层、口径层与事实层结论必须先归并成统一底稿，再进入签收或裁决。
2. 必须把“可签收事实”与“待裁决结论”拆开表达，避免把未验证内容写成既成结论。
3. 第三阶段入口是否成立，只能依据统一的证据锚点、边界冻结结果与负责人收口口径判断，不能由局部文档片段单独替代。
4. 文档同步与收口 memo 只能作为收束动作，不得被描述成第二阶段已完成全部真实验证或第三阶段已批准深执行。
5. 边界冻结与禁用表述必须同步复核，防止“阶段退出完成”“深执行已批准”这类越界表述混入主结论。

这次收口的核心结果是：第二阶段负责人级收口依据已形成，第三阶段入口判定框架已明确，但最终裁决位仍保持开放。

## Alternatives Considered

- 直接把第二阶段写成已完成并关闭：被拒绝，因为当前仍缺少大规模真实样本、复杂异常分支与自动化能力的验证证据。
- 直接批准第三阶段深执行：被拒绝，因为 B8 只负责形成判断依据，不负责替负责人做最终准入决定。
- 只记录文档同步结果，不单列边界冻结与禁用表述：被拒绝，因为这样容易把收口动作误写成阶段结论。

## Related Code

| Path | Role |
| --- | --- |
| `docs/skillforge-b8-facts-and-evidence-merge-draft-v1.md` | 第二阶段事实与证据锚点归并底稿 |
| `docs/skillforge-b8-owner-closeout-criteria-v1.md` | 负责人收口口径锚点 |
| `docs/skillforge-b8-phase-c-entry-framework-v1.md` | 第三阶段入口判定框架锚点 |
| `docs/skillforge-b8-boundary-freeze-and-banlist-review-v1.md` | 边界冻结与禁用表述复核锚点 |
| `docs/skillforge-b8-sync-and-close-memo-v1.md` | 主文档与真相文档同步及收口 memo 锚点 |

## Consequences

- 正向：第二阶段的治理、事实、证据和边界材料被收成统一判断依据，后续裁决更可追溯。
- 正向：第三阶段入口不再依赖分散文档中的局部口径，减少越界批准风险。
- 正向：可签收事实与待裁决结论被分离，降低阶段收口时的口径污染。
- 取舍：当前仍未补齐真实样本、复杂异常分支与自动化验证，因此裁决位需要保持开放。
- 风险：如果后续再次把收口动作写成阶段完成结论，会重新模糊第二阶段边界。
- 验证锚点：`docs/skillforge-b8-facts-and-evidence-merge-draft-v1.md`、`docs/skillforge-b8-owner-closeout-criteria-v1.md`、`docs/skillforge-b8-phase-c-entry-framework-v1.md`、`docs/skillforge-b8-boundary-freeze-and-banlist-review-v1.md`、`docs/skillforge-b8-sync-and-close-memo-v1.md` 的落盘结果。

## Search Terms

- `skillforge-b8-facts-and-evidence-merge-draft-v1.md`
- `skillforge-b8-owner-closeout-criteria-v1.md`
- `skillforge-b8-phase-c-entry-framework-v1.md`
- `skillforge-b8-boundary-freeze-and-banlist-review-v1.md`
- `skillforge-b8-sync-and-close-memo-v1.md`
- `第二阶段负责人收口`
- `第三阶段入口判定`
- `边界冻结`
- `禁用表述`
