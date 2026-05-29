# ADR: SkillForge 正式主入口与轻量编排收敛

## Status

accepted

## Context

在“真实运行最小产品闭环”已经成立之后，新的主要风险不再是功能缺口，而是主链周边继续长出脚本旁路、入口分叉，以及 `taskRun` / `execution` / `transcript` / `run detail` 的语义漂移。若不收敛，后续实现会出现多个事实主入口，导致编排约束和运行证据无法稳定复用。

## Decision

将 SkillForge 的正式运行入口收敛为单一主路径；其他入口只能作为调试壳或兼容壳存在，不能再承担事实主入口职责。

同时，`taskRun`、`execution`、`transcript` 与 `run detail` 必须保持同一语义链：

- `taskRun` 负责表达一次任务运行。
- `execution` 负责承载执行过程。
- `transcript` 负责保留真实请求/响应证据。
- `run detail` 负责从同一链路回看与展示。

编排层不得再通过旁路写入或独立聚合制造新的语义分叉。后续若新增入口，必须先判断它是正式主链还是仅调试壳，并默认拒绝再引入新的事实主入口。

## Alternatives Considered

- 保留多个入口并通过约定区分主次：被拒绝，因为约定式主入口会继续放大语义漂移。
- 用大规模重构统一所有实现：被拒绝，因为当前阶段的目标是轻量收敛，而不是扩张改造面。

## Related Code

| Path | Role |
| --- | --- |
| `web-server.mjs` | 正式运行入口与调试壳边界的主要收敛点 |
| `run_task4` | 被点名为需要盘点和收壳的潜在旁路入口 |
| `taskRun` | 运行语义主对象 |
| `execution` | 执行语义承载层 |
| `transcript` | 真实请求/响应证据层 |
| `run detail` | 回看与展示的落点 |

## Consequences

- 正式入口唯一，后续实现与验收更容易对齐。
- 旁路脚本不再能“悄悄变主路”，减少编排漂移。
- `taskRun` / `execution` / `transcript` / `run detail` 的链路更稳定，便于后续 runtime/provider 能力继续升级。
- 需要额外维护调试壳与正式主链之间的边界说明，避免再次分叉。
- 验收锚点是运行态真实请求/响应证据，而不是单纯脚本可跑通。

## Search Terms

- `taskRun`
- `execution`
- `transcript`
- `run detail`
- `web-server.mjs`
- `run_task4`
- `SkillForge`
