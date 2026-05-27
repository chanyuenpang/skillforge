# ADR: SkillForge 风险审批网页端 decision 语义统一与历史页显式排序交互

## Status

accepted

## Context

来源计划在网页端收尾阶段补齐了两个长期会反复影响使用体验与联调一致性的点：

1. 前后端对 `decision` 字段的理解不一致，历史上存在 `approved` / `rejected` 与 `grant` / `deny` 的语义歧义。
2. `ApprovalHistory` 历史页需要补一个显式排序交互，让页面默认排序、接口返回顺序与用户可见控制保持一致。

这两个问题都不是一次性的“UI 小修”，而是会持续影响协议稳定性、历史记录可读性和后续回归验证的长期约束。

## Decision

决定把 SkillForge 风险审批网页端的 `decision` 语义收敛为统一协议语义，并将历史页排序能力显式化：

1. **`decision` 语义必须统一**
   前后端在 `web-server.mjs` 与 `web/src/api.js` 范围内使用同一套 `decision` 语义，不再允许 `approved` / `rejected` 与 `grant` / `deny` 在协议层并行漂移。

2. **适配层承担语义收口**
   语义转换与兼容逻辑集中在 `web/src/api.js`，页面组件不直接承担多种 `decision` 表达的兼容判断。

3. **历史页必须提供显式排序交互**
   `web/src/components/ApprovalHistory.jsx` 需要提供可见的排序控件，并与现有 history 接口和默认排序保持一致。

4. **排序行为要和默认展示保持同一规则**
   页面上的排序状态、接口返回顺序与默认展示顺序不能彼此冲突，避免用户在历史页看到“可操作但难以预测”的记录顺序。

## Alternatives Considered

- 保持 `approved` / `rejected` 与 `grant` / `deny` 双语义并存：拒绝。这样会继续制造前后端歧义。
- 只在页面上做展示转换，不改协议语义：拒绝。后续联调和回归会继续被语义漂移影响。
- 只补历史页排序 UI，不统一 `decision`：拒绝。排序问题只能缓解可见性，不能根治协议歧义。
- 把排序逻辑分散到各个页面：拒绝。会破坏适配层单一收口。

## Related Code

| Path | Role |
| ---- | ---- |
| `web-server.mjs` | 后端 `decision/status` 语义与运行验证入口。 |
| `web/src/api.js` | 前端协议适配层，负责 `decision` 语义收口。 |
| `web/src/components/ApprovalHistory.jsx` | 历史页显式排序交互的实现入口。 |
| `web/package.json` | 自动化回归与构建验证脚本入口。 |
| `adr/ADR-0050-skillforge-web-ui-api-gateway-and-regression-baseline.md` | Web UI 网关收口与回归基线的既有约束。 |

## Consequences

- 正向：`decision` 语义统一后，前后端联调和历史数据展示更稳定。
- 正向：历史页排序交互显式化后，用户更容易理解记录顺序。
- 正向：适配层继续承担协议收口，页面组件不会再被多语义兼容污染。
- 取舍：短期内需要维护一层语义转换与排序状态，但能降低后续歧义成本。
- 风险：若后续新增 `decision` 值，必须先更新适配层约束，否则容易再次出现语义分叉。
- 验证锚点：计划中的关键自动化回归与构建验证可用来确认 `decision` 语义与历史页排序行为没有回退。

## Search Terms

- `decision`
- `approved`
- `rejected`
- `grant`
- `deny`
- `ApprovalHistory`
- `web/src/api.js`
- `web-server.mjs`
