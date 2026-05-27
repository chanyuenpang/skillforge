# ADR: SkillForge B4 审批与执行证据链治理基线

## Status

accepted

## Context

B4 这次不是要直接宣称审批与执行全链治理已经完全落地，而是先把 `Task` / `PromptDraft` / `StepPlan` / `Approval` / `Run` / `skeletonRef` 之间最小且可审计的证据链收成一条稳定主链。此前如果只把它当成“审批已做完、执行已跑过”，后续就很容易丢失提交前检查、审批结论、执行消费版本与回看路径之间的稳定锚点，异常也难以解释。

## Decision

决定将 B4 的审批与执行关系固定为一条负责人级的最小规则基线：对象、关系、门禁、版本一致性、证据可见性与回看槽位必须先收口，再谈更深层的知识资产标准化、配置受控发布或总联调能力。

具体规则如下：

1. `Task`、`PromptDraft`、`StepPlan`、`Approval`、`Run` 与 `skeletonRef` 之间必须形成最小证据链对象与关系口径，能够回溯提交、审批与执行消费之间的对应关系。
2. 提交前检查、审批结论、执行消费版本与回看路径要共享同一条主链锚点，避免后续只看到结果而看不到来源。
3. 关键门禁与版本一致性核验必须成为治理规则的一部分，不能只停留在单次验证结论。
4. 证据可见性与回看槽位要先明确，保证异常时可以回看、解释与复盘，而不是事后补写。
5. B4 的完成标准是形成可继续验证的最小治理基线，不提前承诺知识资产标准化、配置发布入口、总联调或智能化治理能力。

## Alternatives Considered

- 只把 B4 当作一轮执行记录收尾：被拒绝，因为这无法形成长期可治理的证据链主链。
- 直接承诺知识资产标准化、配置发布入口或总联调：被拒绝，因为当前阶段目标是先把最小证据链与门禁收稳，不应扩大承诺面。
- 只保留审批结论，不保留执行消费版本与回看槽位：被拒绝，因为这会让异常难以解释，也无法形成稳定复盘路径。

## Related Code

| Path | Role |
| --- | --- |
| `docs/skillforge-b4-scope-and-guardrails-one-pager-v1.md` | B4 问题域与边界守门锚点 |
| `docs/skillforge-b4-evidence-chain-objects-and-relations-v1.md` | 最小证据链对象与关系口径锚点 |
| `docs/skillforge-b4-gating-and-version-consistency-rules-v1.md` | 关键门禁与版本一致性核验锚点 |
| `docs/skillforge-b4-evidence-visibility-and-review-slots-v1.md` | 证据可见性与回看槽位锚点 |
| `docs/skillforge-b4-acceptance-and-nongoals-v1.md` | 验收口径与非目标声明锚点 |
| `docs/skillforge-b4-doc-sync-and-closing-note-v1.md` | 文档回写与收口结论锚点 |

## Consequences

- 正向：审批与执行之间不再只是结果关联，而是具备可回溯的最小证据链主链。
- 正向：版本一致性、门禁和回看槽位被纳入治理口径，后续异常更容易解释。
- 正向：B4 的边界清晰，后续可以在不混淆承诺面的前提下继续推进更深的治理能力。
- 取舍：当前成果仍停留在最小规则层，尚未补齐真实样本级证据。
- 风险：如果后续实现重新把证据链拆散，提交前检查、审批结论与执行消费就会失去同链锚点。
- 验证锚点：计划已完成范围与边界守门、最小证据链对象与关系、关键门禁与版本一致性、证据可见性与回看槽位、验收口径与非目标声明、文档回写与收口结论的落盘。

## Search Terms

- `Task`
- `PromptDraft`
- `StepPlan`
- `Approval`
- `Run`
- `skeletonRef`
- `提交前检查`
- `版本一致性`
- `回看槽位`
