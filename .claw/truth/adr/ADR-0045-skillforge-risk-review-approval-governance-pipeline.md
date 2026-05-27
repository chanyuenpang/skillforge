# ADR: SkillForge 风险审查与审批治理流程采用 review / approval 分层管控

## Status

accepted

## Context

这次计划已经完成收口：SkillForge 的技能注册必须从单纯 `pass/fail` 校验升级为可审查、可批准、可追踪的风险治理流程。计划明确了一个长期边界：现有 `acceptance/scoring` 仍是 reserved stub，不能把它误当成真实验收引擎，因此新方案必须围绕 `warning/fail` 风险暴露、`review` 审查、`approval` 审批与例外接受来建立语义。

核心原因是系统需要严格分离“发现风险”和“接受风险”两层语义：warning 只是事实暴露，不等于失败；approval 是显式接受例外风险，不应被混同为能力已自动通过。

## Decision

决定将 SkillForge 的技能注册治理流程固定为 **validation → review → approval** 的分层模型，并将其作为可执行的长期约束：

1. `validation` 只负责暴露风险事实，输出 `warning` / `fail` 等结构化风险信号。
2. `review` 只负责审查风险是否需要进一步处理，不直接等同于通过或发布完成。
3. `approval` 只负责显式接受例外风险，并为后续准入提供可追踪依据。
4. 任何“例外接受”都必须保留审计轨迹，不能被当作普通通过结果洗白。
5. `manual` 与 `API` 两条审批通道必须使用同一套 `Decision Command` 语义，保证同一审批意图在不同入口下得到一致解释。
6. `report` / `evidence` 必须分层保留事实、治理与审计信息：validator 输出风险事实，review/approval 记录治理决定，审计层保留可追踪证据。
7. 当前 `acceptance/scoring` 仍是 reserved stub，只能作为未来接线位存在，不参与当前准入裁决。

## Alternatives Considered

- 继续只保留 `pass/fail` 校验：拒绝。这样无法表达 warning 风险的审查与例外接受。
- 把 warning 直接映射为 fail：拒绝。会把可接受风险和真正阻断风险混为一谈。
- 直接把 approval 绑定到现有 `acceptance/scoring`：拒绝。现有能力仍是 reserved stub，不能承载真实治理语义。
- 让 manual 审批和 API 审批分别定义自己的语义：拒绝。会导致同一决策在不同入口下出现双重解释。

## Related Code

| Path | Role |
| ---- | ---- |
| `tasks/skill-风险审查与审批流程设计/plan.json` | 来源计划，定义风险审查与审批治理的产品目标、数据模型、状态机与实施顺序。 |
| `adr/ADR-0020-skillforge-scoring-acceptance-rubric-remains-a-reserved-stub-with-scored-always-false-and-no-dynamic-propagation.md` | 现有 `acceptance/scoring` reserved 边界，避免治理语义误并入评分语义。 |
| `adr/ADR-0029-skillforge-product-surface-first-blade-three-object-review-prep-registry-chain.md` | `approved != publish complete` 的分层追溯思路，可作为对象分离参考。 |

## Consequences

- 正向：后续实现可以清晰区分风险暴露、审查与审批，避免把不同语义压成单一状态。
- 正向：例外接受会天然带审计痕迹，便于追踪谁在什么条件下放行了风险。
- 正向：`manual` 与 `API` 共用同一 `Decision Command` 语义后，审批结果更容易做一致性验证。
- 取舍：流程会比单纯 `pass/fail` 更复杂，但能防止 warning 被误洗白。
- 取舍：在真实 acceptance 引擎尚未就绪前，治理流程必须保持与 reserved stub 的边界清晰。
- 验证锚点：计划中的任务 1-7 已明确覆盖产品方案、数据模型、状态机、report/evidence、双通道审批、stub 边界与实施顺序。

## Search Terms

- `warning`
- `fail`
- `review`
- `approval`
- `exception`
- `acceptance/scoring`
- `reserved stub`
- `Decision Command`
- `audit trail`
- `skill 注册`
