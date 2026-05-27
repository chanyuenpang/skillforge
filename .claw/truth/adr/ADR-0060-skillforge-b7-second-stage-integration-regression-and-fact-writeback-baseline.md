# ADR: SkillForge B7 第二阶段联调、回归与事实层回写基线

## Status

accepted

## Context

B7 的目标不是宣称第二阶段已经退出完成，而是把 B1-B6 已形成的运行中心、编排链、Skeleton、审批执行证据链、知识资产治理与受控发布入口，收束成一套可联调、可回归、可回写的统一事实视图。此前如果继续沿用分段规则与分散文档，后续就很难稳定解释跨模块最小联调维度、回归判定口径、以及 truth / phase / 主文档之间的事实分工。

## Decision

决定将第二阶段 B7 作为“联调 + 回归 + 事实层回写”的统一收口基线，具体包括：

1. 建立跨模块的最小联调检查维度，先确保第二阶段各模块之间的关联关系可被统一检查，再谈更大范围联动。
2. 固化回归检查清单与判定口径，避免把已实现、已验证与未覆盖范围混写成同一层事实。
3. 为事实层回写建立明确承载位与字段模板，使阶段事实能够以证据锚点、覆盖边界、未覆盖范围的形式回写到 truth / phase / 主文档。
4. 明确验收口径与边界冻结说明，避免提前承诺 B8 阶段退出判定、阶段 C 跨域联动或智能化治理能力。
5. 以文档回写和阶段汇报结论作为阶段收口动作，但不把这次收口误写成第二阶段总体完成的产品化承诺。

## Alternatives Considered

- 继续保留分段规则与分散文档：被拒绝，因为会让联调和回归只能靠人工拼接事实。
- 直接把 B7 写成第二阶段退出完成：被拒绝，因为当前只完成了规则层与事实沉淀基线，尚未补足大规模真实样本与复杂异常分支验证。
- 只写验收结论，不定义事实回写承载位：被拒绝，因为 truth / phase / 主文档会失去统一事实锚点。

## Related Code

| Path | Role |
| --- | --- |
| `docs/skillforge-b7-scope-and-guardrails-one-pager-v1.md` | B7 问题域与范围守门锚点 |
| `docs/skillforge-b7-integration-check-dimensions-v1.md` | 第二阶段最小联调检查维度锚点 |
| `docs/skillforge-b7-regression-checklist-and-judgment-rules-v1.md` | 回归检查清单与判定口径锚点 |
| `docs/skillforge-b7-fact-writeback-mapping-v1.md` | 事实层回写承载位与字段模板锚点 |
| `docs/skillforge-b7-acceptance-and-boundary-freeze-v1.md` | 验收口径与边界冻结锚点 |
| `docs/skillforge-b7-doc-sync-and-phase-close-v1.md` | 文档回写与阶段汇报结论锚点 |

## Consequences

- 正向：第二阶段的联调、回归与事实回写从分段规则变成统一口径，后续更容易复用。
- 正向：truth / phase / 主文档的职责分工更清楚，减少规则文档与事实台账混写。
- 正向：B8 做负责人收口与第三阶段入口判断时，不需要再从零拼接阶段事实。
- 取舍：当前仍以规则层与既有事实沉淀为主，未补足大规模真实样本与复杂异常分支验证。
- 风险：若后续继续把事实回写拆散，统一口径会再次碎片化。
- 验证锚点：已完成范围守门、联调检查维度、回归判定口径、事实回写映射、验收与边界冻结、文档回写与阶段汇报结论的落盘。

## Search Terms

- `第二阶段最小联调检查维度`
- `回归检查清单`
- `事实层回写`
- `truth`
- `phase`
- `边界冻结`
- `docs/skillforge-b7-integration-check-dimensions-v1.md`
- `docs/skillforge-b7-fact-writeback-mapping-v1.md`
