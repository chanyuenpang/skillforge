# ADR: SkillForge 风险事实、review、approval、gating 与 audit 边界采用分层 contract-first 语义

## Status

accepted

## Context

SkillForge 的风险审查与审批流程已经从单纯的 `pass/fail` 校验，演进为可审查、可审批、可追踪的治理链路。计划明确要求先冻结 `risk fact`、`review`、`approval`、`gating`、`audit/report` 的语义，再落实现实流程，避免把风险暴露、治理决定和审计留痕混成一个状态。

旧做法的问题在于：`warning` 只是风险事实暴露，不等于失败；`approval` 也不是普通通过，而是显式接受例外风险。如果没有边界，后续实现很容易把可接受风险误洗白，或者把治理层与报告层耦在一起。

## Decision

决定将 SkillForge 风险治理链路固定为以下分层语义，并作为后续实现约束：

1. `risk fact` 只负责承载风险事实，不直接代表通过或拒绝。
2. `review` 只负责审查风险是否需要进一步处理，不等同于发布完成。
3. `approval` 只负责显式接受例外风险，并必须保留可追踪依据。
4. `gating` 只负责把治理结果转换为准入判断，不应篡改上游事实。
5. `audit/report` 必须与治理决策分层保留，分别承载事实、决定与证据。
6. `manual` 与 `API` 双通道必须复用同一套 `Decision Command` 语义，避免同一决策在不同入口下出现双重解释。
7. 当前 `acceptance/scoring` 仍是 reserved stub，只能作为未来接线位存在，不能参与当前治理裁决。

## Alternatives Considered

- 继续只保留 `pass/fail`：拒绝。无法表达 warning 风险与例外接受。
- 把 `warning` 直接映射为 `fail`：拒绝。会把可接受风险和真正阻断风险混为一谈。
- 让 `manual` 与 `API` 各自定义审批语义：拒绝。同一治理意图必须保持一致解释。
- 把 `approval` 直接绑定到现有 `acceptance/scoring`：拒绝。现有能力仍是 reserved stub，不能承载真实治理语义。

## Related Code

| Path | Role |
| ---- | ---- |
| `tasks/skill-风险审查与审批流程实现/plan.json` | 来源计划，包含语义冻结、契约、主干闭环、双通道异常链路与验收结论。 |
| `adr/ADR-0045-skillforge-risk-review-approval-governance-pipeline.md` | 上层治理分层的已有 ADR，记录 `validation → review → approval` 的长期约束。 |
| `adr/ADR-0020-skillforge-scoring-acceptance-rubric-remains-a-reserved-stub-with-scored-always-false-and-no-dynamic-propagation.md` | `acceptance/scoring` 仍为 reserved stub 的边界。 |
| `adr/ADR-0029-skillforge-product-surface-first-blade-three-object-review-prep-registry-chain.md` | `approved != publish complete` 的分层追溯参考。 |

## Consequences

- 正向：后续实现可以清晰区分风险暴露、审查、审批、准入与审计。
- 正向：`manual` 与 `API` 共用同一语义后，更容易做一致性验证。
- 正向：审计链能稳定保留例外接受的依据，便于追踪谁在什么条件下放行了风险。
- 取舍：流程复杂度高于简单 `pass/fail`，但能防止 warning 被误洗白。
- 取舍：在真实 acceptance 引擎就绪前，治理流程必须继续保持与 reserved stub 的边界清晰。
- 验证锚点：计划任务 1-6 已覆盖语义冻结、契约、fixture、主干闭环、双通道异常与封板验收。

## Search Terms

- `warning`
- `fail`
- `risk fact`
- `review`
- `approval`
- `gating`
- `audit/report`
- `Decision Command`
- `acceptance/scoring`
- `reserved stub`
