# ADR-0030: SkillForge `status` 直接接入 `runtime-replay-reporter.mjs`，且只保留 read-only 检查

## Status

accepted

## Context

`scripts/skillforge-status.mjs` 过去内联了一套 `runtime replay` 的 mock 常量与构造逻辑，导致 `status` 输出和真实实现存在潜在漂移。随后将状态脚本改为直接从 `src/skillforge/runtime-replay-reporter.mjs` 导入真实导出，并在 `status` 中新增只读的 `Runtime Replay` 检查段，用于验证报告构造链路是否稳定，而不是模拟执行或替代真实运行。

这类改动值得沉淀，因为它明确了 `status` 的职责边界：它可以作为 read-only 的接线与协议健康检查入口，但不能被误读成真实 `runtime execution`、fixture execution、sandbox 或 scoring 已落地。

## Decision

决定将 `scripts/skillforge-status.mjs` 的 `Runtime Replay` 部分固定为“诚实接线、只读检查、禁止假装执行”的模式。

当前稳定规则如下：

- `status` 直接 import `src/skillforge/runtime-replay-reporter.mjs` 的真实导出，至少包括 `buildRuntimeReplayReport`、`RUNTIME_REPLAY_KIND`、`RUNTIME_REPLAY_PROTOCOL_VERSION`、`RUNTIME_REPLAY_REPORT_VERSION`。
- `status` 不再内联维护 runtime replay mock/常量/构造逻辑，避免脚本侧与源实现分叉。
- `Runtime Replay` 段只做 read-only 检查：最小 report 是否可构造、二次构造是否稳定、协议版本 / artifact 版本是否可读、`adapter mode` / `case status` 是否被识别、`provenance` 是否诚实标注为 read-only 路径、`status taxonomy` 是否有效。
- 该检查只验证“接线和协议可读性”，不触碰真实 fixture execution、sandbox、scoring、multi-case 或 provider-backed 路径。

## 关联代码

### 主锚点

- `scripts/skillforge-status.mjs`：`status` 脚本入口；已改为直接接入真实 `runtime replay` 导出，并新增只读检查段。
- `src/skillforge/runtime-replay-reporter.mjs`：`buildRuntimeReplayReport` 与相关常量的真实来源。

### 关联锚点

| 路径 | 作用 |
| ---- | ---- |
| `src/skillforge/*.mjs` | 仍然保持未触碰；本次改动没有扩展到其他 runtime 实现文件。 |
| `run-runtime-draft.mjs` | 明确未运行，避免把 `status` 检查误当成执行链路验证。 |

## 真实调用链路

1. `scripts/skillforge-status.mjs`：直接 import `src/skillforge/runtime-replay-reporter.mjs` 的真实导出。
2. `src/skillforge/runtime-replay-reporter.mjs`：提供 `buildRuntimeReplayReport` 与协议 / artifact 版本常量。
3. `scripts/skillforge-status.mjs`：基于真实导出构造最小 `Runtime Replay` 读-only 检查，并打印检查结果。
4. `node scripts/skillforge-status.mjs`：验证脚本可以成功运行，且输出五个维度 `PASS`。

## 不要改错的位置

- 不要把 `scripts/skillforge-status.mjs` 误改回内联 mock；否则 `status` 会再次偏离真实导出。
- 不要把 `Runtime Replay` 检查理解成真实 fixture execution、sandbox、scoring、multi-case 或 provider-backed 路径。
- 不要把 `status` 输出里的 `PASS` 当成 runtime 已落地的证据；它只说明 read-only 接线和协议检查通过。
- 不要在 `status` 里偷偷接入 `src/skillforge/*.mjs` 之外的执行副作用。

## 验证标准

后续若修改 `scripts/skillforge-status.mjs` 或 `src/skillforge/runtime-replay-reporter.mjs`，至少复核：

```bash
node scripts/skillforge-status.mjs
```

预期：`Runtime Replay` 仍然是 read-only 检查，且输出结果保持稳定、诚实，不引入真实执行路径。

## 关键检索词

- `scripts/skillforge-status.mjs`
- `runtime-replay-reporter.mjs`
- `buildRuntimeReplayReport`
- `RUNTIME_REPLAY_KIND`
- `RUNTIME_REPLAY_PROTOCOL_VERSION`
- `RUNTIME_REPLAY_REPORT_VERSION`
- `Runtime Replay`
- `read-only`
- `adapter mode`
- `case status`
- `provenance`
- `status taxonomy`
