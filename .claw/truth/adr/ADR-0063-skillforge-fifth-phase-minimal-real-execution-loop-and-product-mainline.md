# ADR: SkillForge 第五阶段最小真实执行闭环与产品主线落地

## Status

accepted

## Context

负责人裁决页 v2 已明确：第二、第三、第四阶段都已完成治理收口，接下来不应继续扩写治理文档，而应把 SkillForge 从“规则/裁决/候选能力已定义”推进到“最小真实执行闭环 + 可验证产品主线”落地。否则，后续会继续把“文档完备”误写成“产品闭环已完成”，把“统一输入成立”误写成“新阶段自动成立”。

第五阶段进一步完成了验收图与主线定锚：负责人把完成态压缩为用户侧、系统侧、产品侧三层闭环验收图，并明确本阶段必须落地项、继续冻结项与后续 P1-P5 的接口约束，避免主线再次滑回文档先行或能力外推。

## Decision

决定将 SkillForge 第五阶段的负责人级主线固定为“最小真实执行闭环与产品主线落地”，并按以下规则推进：

同时把第五阶段的验收口径定为三层闭环验收图：

1. 用户侧、系统侧、产品侧必须分别有明确入口、动作、结果与边界，且三者能拼成同一条最小真实执行链。
2. 本阶段必须落地项与继续冻结项必须显式分离，不能把高阶候选能力混入完成态表述。
3. 后续 P1-P5 只能在该验收图和接口约束下推进，不得把阶段完成态外推成更大范围的自动化或规模化能力已成立。

1. 下一轮主计划的核心目标不是继续扩写治理文档，而是先打通一条最小、真实、可操作、可追溯、可验证、可复盘、可回沉的产品主线。
2. 最小真实对象链必须至少覆盖 `Task / Request`、`PromptDraft`、`StepPlan`、`Approval / Risk Gate`、`ExecutionRun`、`Evidence / Transcript / Log`、`Retro`、`Asset Writeback / Skeleton Feedback`，并保持连续引用关系。
3. 每个节点都必须有身份、状态与证据锚点；相邻节点之间必须可追溯、可回看、可校验。
4. 用户侧闭环要能完成创建或选择真实任务、组织执行方案、提交审批、进入执行、查看状态与证据、查看复盘记录、并把复盘结果关联回编排资产或知识资产。
5. 系统侧闭环要支持真实任务链、真实审批链、真实执行链、真实证据链与真实复盘回沉链，而不是仅停留在只读看板或空数据闭环。
6. 文档回写继续作为跟随式回写层存在，但不得代替真实产品主线本身；truth / phase / spec / ADR 只在关键变更时回写。
7. 未验证池继续保留，尤其是自动回写、自动优化、自动根因诊断、自动修复 / 自动回滚、自动一致性修复、自动推荐联动、大规模真实业务样本、复杂血缘图谱、深度影响分析、跨项目规模化知识回流与复杂联动看板，均不得在本阶段写成已成立能力。
8. 发生冲突、证据不足或回归失败时，必须回退到候选 / 条件化状态，不能把最小样本验证外推成全量可运营。

## Alternatives Considered

- 继续以治理收口为主线：被拒绝，因为负责人裁决页已明确下一轮应转向真实产品闭环建设。
- 先批准高阶能力放开再补最小闭环：被拒绝，因为当前仍需要真实补证、真实回归与边界复核。
- 只写文档跟随，不建立真实对象链：被拒绝，因为这会继续让文档跑在产品前面。

## Related Code

| Path | Role |
| --- | --- |
| `docs/skillforge-owner-decision-page-v2.md` | 下一轮主计划的统一裁决输入与目标切换来源 |
| `docs/skillforge-roadmap-and-doc-governance-v1.md` | 长期路线与阶段推进治理规则来源 |
| `docs/skillforge-d5-phase-d-closeout-inputs-v1.md` | 第四阶段收口与下一轮主计划前置基线来源 |
| `plan.json` | 第五阶段主计划的任务骨架与推进约束来源 |

## Consequences

- 正向：第五阶段的主线从治理收口切换为真实产品闭环，目标更可验证。
- 正向：`Task / Request` 到 `Retro` 的连续对象链被固定为产品主线的最小骨架，后续实现不容易漂移。
- 正向：三层闭环验收图和接口约束被固化，后续 P1-P5 只需沿同一上位依据推进。
- 正向：文档回写重新回到跟随式位置，避免 truth / phase / spec / ADR 代替真实产品主线。
- 取舍：本阶段不承诺自动化、规模化或复杂跨域治理能力的解锁，推进速度会更克制。
- 风险：如果后续再次把“统一裁决输入成立”写成“阶段自动成立”，阶段语义会失真。
- 验证锚点：`docs/skillforge-owner-decision-page-v2.md`、`docs/skillforge-d5-phase-d-closeout-inputs-v1.md`、`docs/skillforge-roadmap-and-doc-governance-v1.md`、`plan.json`、`docs/skillforge-p0-phase5-acceptance-map-and-mainline-anchor-v1.md`。

## Search Terms

- `skillforge-owner-decision-page-v2.md`
- `最小真实执行闭环`
- `产品主线`
- `Task / Request`
- `PromptDraft`
- `StepPlan`
- `Approval / Risk Gate`
- `ExecutionRun`
- `Evidence / Transcript / Log`
- `Retro`
- `Asset Writeback / Skeleton Feedback`
- `truth`
- `phase`
- `spec`
- `ADR`
