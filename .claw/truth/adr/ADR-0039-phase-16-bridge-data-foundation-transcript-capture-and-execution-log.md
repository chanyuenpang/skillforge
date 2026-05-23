# ADR: Phase 16 bridge data foundation uses transcript capture and execution log as the UI-ready evidence layer

## Status

accepted

## Context

Phase 16 的目标不是先做前端，而是在进入 Web UI 之前先补齐两类可以被界面直接消费的真实数据底座：`transcript capture` 与 `execution log`。来源子计划明确指出，UI 不能建立在空心展示层之上，必须先把可观察、可审计的数据产物接好。

该阶段同时给出了明确边界：这是进入 Phase 16 Web UI 前的数据底座桥接任务，不做前端实现；实现任务必须锚定在正确的项目路径下；数据产物应保持轻量，不扩成复杂数据库或可视化平台。

## Decision

决定将 Phase 16 的桥接层固定为 **`transcript capture` + `execution log`** 两类数据底座，并据此推进 Web UI 的后续实现。

具体规则如下：

- 在进入 Web UI 前，先补齐 `transcript` 与 `execution log`，避免 UI 成为只读空壳。
- `transcript` 负责承载执行内容与结果，`execution log` 负责承载操作历史与审计轨迹。
- 数据层只做可被 UI 消费的最小产物，不引入更重的数据库或平台化抽象。
- 相关实现与观察面应围绕 `skillforge-operate.mjs` 和 `skillforge-status.mjs` 继续收口。

## Alternatives Considered

- **先做 Web UI**：拒绝。没有真实数据底座时，UI 只会变成空心展示层。
- **扩成复杂数据库或可视化平台**：拒绝。当前阶段只需要桥接可消费的数据产物，不需要额外基础设施。
- **只保留 transcript，不做 execution log**：拒绝。执行内容之外还需要操作历史与审计轨迹，才能支撑后续 UI 的可信展示。

## Related Code

| Path | Role |
| ---- | ---- |
| `scripts/run-runtime-draft.mjs` | 真实执行入口，作为 runtime replay 的桥接锚点。 |
| `scripts/skillforge-status.mjs` | 观察 `transcript / execution log` 状态的只读面。 |
| `src/skillforge/execution-log-store.mjs` | `execution log` 的持久化存储实现。 |
| `src/skillforge/transcript-store.mjs` | `transcript` 的持久化存储实现。 |
| `scripts/skillforge-operate.mjs` | 写入 `execution log` 的操作入口。 |

## Consequences

- 正向：Web UI 将建立在真实数据底座之上，而不是空壳展示层。
- 正向：`transcript` 与 `execution log` 分别覆盖执行内容和审计轨迹，后续界面有明确数据来源。
- 正向：Phase 16 可以从“先打通数据”切换到“把真实数据组织成可用界面”。
- 取舍：Phase 16 的前半段会把重心放在数据桥接与可观察性上，而不是页面视觉或交互细节。
- 验证锚点：来源子计划的完成记录明确写出 `transcript-store` 与 `execution-log-store` 已存在且独立验证通过，`skillforge-operate.mjs` 已写 execution log，`skillforge-status.mjs` 已能同时观察 transcript / execution log 状态。

## Search Terms

- `transcript capture`
- `execution log`
- `transcript-store.mjs`
- `execution-log-store.mjs`
- `skillforge-operate.mjs`
- `skillforge-status.mjs`
- `Phase 16`
