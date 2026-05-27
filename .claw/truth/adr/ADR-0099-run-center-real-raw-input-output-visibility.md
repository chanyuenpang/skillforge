# ADR-0099: Run Center 真实输入输出可见化

## Status

accepted

## Context

Run Center 的详情页长期显示"当前记录未保存原文，仅展示摘要"——用户看到的 `inputMessage` / `outputMessage` 只是包装层的合成摘要，而不是真实的原始输入输出。根因追踪发现三层断裂：

1. **API 层**：`/api/tasks/runs/:id/complete` 只接收 `durationMs`，不接收也不传递 `input`/`output` 内容
2. **存储层**：`execution-log-store.mjs` 的 `buildExecutionLogEntry()` 不存储 `rawInput`/`rawOutput`，只在 entry shape 中保留了 `input`/`output` 的结构化对象引用
3. **传播层**：`buildRunDetail` 的 raw 提取链（rawInput → input.content → input.message → ...）永远命不中真实数据，因为存储层根本没写入

结果：所有运行记录的 `rawTextAvailability.hasAnyRawText` 都是 `false`，用户永远看不到真实输入输出。

## Decision

决定在本轮里程碑中打通全链路，确保新产生的运行记录能在详情页第一屏展示真实输入输出原文：

1. **execution-log-store.mjs**：`buildExecutionLogEntry()` 新增 `rawInput`/`rawOutput` 字段
2. **web-server.mjs**：`complete`/`fail` 接口接收 body 中的 `input`/`output` 文本，传入 `buildExecutionLogEntry`
3. **web-server.mjs**：`buildRunDetail` 从 execution-log entry 提取 `rawInput`/`rawOutput` 并透传
4. **RunCenterDetail.jsx**：用真实 raw 替换"当前记录未保存原文"占位

**不在本轮处理**：
- 历史记录回填（旧记录不会自动有 raw 内容，不需要迁移）
- 全量 transcript 对话记录（属于后续 Phase B/C）
- 列表页全文展示（列表用摘要即可）

## Related Code

| Path | Role |
| ---- | ---- |
| `src/skillforge/execution-log-store.mjs` | 存储层：buildExecutionLogEntry 扩展 rawInput/rawOutput |
| `web-server.mjs` | API 层：complete/fail 路由接收 input/output；buildRunDetail 传播 raw 字段 |
| `web/src/components/RunCenterDetail.jsx` | 展示层：Hero Card 展示真实输入输出 |

## Consequences

- 正向：新产生的运行记录在详情页第一屏展示真实输入输出
- 正向：用户能看懂系统"输入了什么、产出了什么"并能据此评估质量和做决策
- 取舍：旧记录仍然显示"未保存原文"，这是可接受的向后兼容行为
- 风险：input/output 可能包含大量文本（如 agent 的完整 prompt），需确认前端 truncate/expand 机制仍适用

## Search Terms

- `rawInput`
- `rawOutput`
- `rawTextAvailability`
- `execution-log-store`
- `buildExecutionLogEntry`
- `buildRunDetail`
- `getRunLogByRunId`
