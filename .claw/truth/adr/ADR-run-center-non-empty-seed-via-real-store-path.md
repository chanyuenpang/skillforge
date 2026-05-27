# ADR: 运行中心非空样本通过真实 Store 路径安全实构

## Status

accepted

## Context

运行中心第一刀（ADR-0053）完成了只读聚合端点与真实空数据闭环，但"当前只验证了真实空数据闭环，尚未覆盖有数据时的 happy path"。在进入有数据验证阶段前，需要在真实 store 约束下安全实构最小非空样本。

直接风险在于：手搓 JSONL 写入 store 目录可能导致字段偏差（例如使用 `status=success` 而非 store 要求的 `status=completed`），或者写入不符合 store 校验约束的非法数据，从而污染持久化存储并造成不可逆的调试消耗。

## Decision

从运行中心空数据向最小非空样本过渡时，必须遵循以下安全实构方法：

1. **必须通过真实 Store 的 builder + save 路径写入**  
   execution-log 使用 `buildExecutionLogEntry()` + `save()`，transcript 使用 `buildTranscriptRecord()` + `save()`。禁止手搓 JSONL 文件直接写入 store 目录。

2. **种子参数必须遵守 Store 的真实校验约束**  
   execution-log 的 status 必须为 `completed`（而非 `success`），所有字段通过 store 的 build 函数导出，而非人肉列举。

3. **写入前必须整文件备份，支持回滚**  
   对目标 store 文件执行 `cp` 全量备份，不依赖版本控制或增量差异。

4. **写入后必须立即执行阶段一回归核验**  
   验证现有路由 200 正常、summary 反映新数据、list 返回非空记录、已有存量路径不受影响、NOT_FOUND 行为正常。

## Alternatives Considered

- **手搓 JSONL 直接写入 store 文件**：拒绝。容易产生字段偏差（如 `status=success` 并不是 execution-log store 的合法值），绕过 store 校验层，长期维护时无法区分合法写入与脏数据。
- **先伪造 UI 展示数据再补真实数据**：拒绝。违背 ADR-0053 确立的"真实空数据闭环"原则，掩盖真实数据状态，且后续可能忘记替换。

## Related Code

| Path | Role |
| ---- | ---- |
| `src/skillforge/execution-log-store.mjs` | execution-log 写入约束来源，`buildExecutionLogEntry()` + `save()` 入口 |
| `src/skillforge/transcript-store.mjs` | transcript 写入约束来源，`buildTranscriptRecord()` + `save()` 入口 |
| `.claw/truth/skillforge-阶段一回归基线.md` | 回归核验的对照标准 |

## Consequences

- 正向：运行中心从"真实空数据闭环"升级为"最小非空样本已验证"，新增数据不破坏既有产品面。
- 正向：种子数据通过真实 store 路径写入，字段完全合规，避免 schema 偏差与脏数据污染。
- 正向：写入后立即执行回归基线，确保增量不破坏既有页面，形成可重复的安全升级模式。
- 取舍：当前只有 1 条 `execution-log` + 1 条 `transcript` 的最小样本，扩展更多样本（如 `failed` 状态、不同 `source`）需重复此流程。
- 验证锚点：9/9 回归核验全部通过，summary 返回 `total:1`，runs 返回 1 条非空记录，knowledge-assets 仍为 93 条。

## Search Terms

- `execution-log`
- `execution-log-store.mjs`
- `buildExecutionLogEntry`
- `transcript-store.mjs`
- `buildTranscriptRecord`
- `completed` (status value)
- `非空样本`
- `run-center`
