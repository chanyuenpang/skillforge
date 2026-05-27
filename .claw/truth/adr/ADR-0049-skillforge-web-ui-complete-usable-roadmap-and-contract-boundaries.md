# ADR: SkillForge 风险审批网页端完整可用化按产品补齐、协议收口与生产级边界推进

## Status

accepted

## Context

现有网页端已经不再是"能跑的演示壳",而是要继续推进到"整体完整可用"的长期形态。来源计划把目标明确成:不仅要能审批、能看状态,还要补齐历史页、筛选搜索、异常与空态、审计报表、前后端协议收口、生产级网关与验证能力。

之前的推进方式更偏单点补丁:能用就先接上,但容易留下轻量适配、临时降级和隐式猜测。计划现在明确要把这些边界收口,避免网页端继续停留在"局部可用、整体靠人工兜底"的状态。

## Decision

决定将 SkillForge 风险审批网页端的后续推进固定为以下四条长期约束:

1. **先补产品面,再谈扩展**
   历史页、审计报表、筛选、搜索、排序、状态高亮、空态、错误态、异常态与恢复路径,优先作为完整可用性的基本面补齐。

2. **前后端协议必须正式收口**
   `API contract`、`view model`、状态枚举、缺省值和错误码映射需要统一,不能继续依赖隐式猜测或多处分支兼容。

3. **审批流要提升为高频可操作能力**
   审批上下文、批处理边界、备注/理由体验、待我审批聚焦和操作反馈要围绕真实使用效率来设计,而不是停留在"可点击"。

4. **web api / 网关边界要生产化**
   路由组织、错误码、权限/鉴权预留、输入校验、环境配置、日志与可观测性基础,需要形成稳定边界,避免前端直接依赖临时式接口拼装。

5. **验证要成为可重复的回归基线**
   build 校验、关键页面 smoke、核心流程验证脚本或轻量 e2e 必须补齐,用来确认网页端是否真的达到完整可用,而不是只靠人工点验。

## Alternatives Considered

- 继续把网页端当作演示级入口,优先堆新功能:拒绝。这样会让可用性和维护性继续滞后。
- 只补 UI,不收口协议:拒绝。适配分支会持续膨胀,后续很难稳定维护。
- 只做后端接口加固,不补历史页、筛选和异常态:拒绝。用户侧仍会感到"能进但不好用"。
- 先上更复杂的工作流引擎:拒绝。当前阶段的主要矛盾是完整可用和边界收口,不是引入更重的流程系统。

## Related Code

| Path | Role |
| ---- | ---- |
| `plan.json` | 来源计划，定义"整体完整可用"目标与 12 个补齐任务。 |
| `features/web-api-adapter-protocol-layer.md` | 具体实现：`api.js` 协议适配层，统一信封解包与错误标准化。 |
| `features/web-ui-approval-history-and-smoke-regression-baseline.md` | 历史页、状态分层与回归基线的实现锚点。 |
| `web/src/api.js` | 前端唯一协议适配层实现文件。 |
| `adr/ADR-0045-skillforge-risk-review-approval-governance-pipeline.md` | 风险审查与审批治理链路的上层语义边界。 |
| `adr/ADR-0047-skillforge-risk-fact-review-approval-gating-contract-and-audit-boundary.md` | `risk fact` / `review` / `approval` / `gating` / `audit` 分层 contract-first 约束。 |
| `adr/ADR-0050-skillforge-web-ui-api-gateway-and-regression-baseline.md` | Web UI API 收口、页面职责分离、网关边界和回归基线的并行约束。 |

## Consequences

- 正向:网页端的目标从"局部能用"转成"整体可持续使用"。
- 正向:历史页、审计报表、筛选搜索和异常恢复会成为基础能力,而不是临时增强项。
- 正向:协议收口后,前后端联调和后续演进更稳定。
- 正向:P0 正确性与状态一致性先冻结,能减少后续反复返工。
- 取舍:前期会增加收口成本,但能显著减少后续兼容分支和隐式行为。
- 取舍:生产级边界更清晰后,短期迭代速度可能略慢,但长期维护成本更低。
- 风险: `decision` 字段语义若不统一,仍可能在前后端之间形成分支歧义。
- 风险:历史页排序交互暂未显式补齐,后续若使用反馈增强再单列处理。
- 验证锚点:计划中的 `validate:all` / 关键页面 smoke / 轻量 e2e 任务将作为完整可用性的回归依据。

## Search Terms

- `完整可用`
- `history page`
- `audit report`
- `filter`
- `search`
- `sort`
- `empty state`
- `error state`
- `API contract`
- `view model`
- `web api`
- `gateway`
- `validate:all`
- `approved`
- `rejected`
- `grant`
- `deny`
