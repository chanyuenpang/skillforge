# ADR-0073: Run Detail 使用 executionId 作为 Transcript 证据主链接键，fixtureId 作为旧数据回退

## Status

accepted

## Context

E1-D 之前，run detail 的 transcript 证据只通过 `fixtureId`/`caseId` 侧关联，没有从 `runId`/`executionId` 取证证据的稳定锚点。这意味着：

1. 一个 run 执行完成后，无法从 run 侧精确追到它的 transcript 执行证据。
2. transcript-store 按 `caseId` 去重存储，导致同一次 case 多次运行的 transcript 被覆盖，丢失回看能力。
3. 缺少显式的证据锚点字段，run detail 消费者（UI、Retro、审计）无法确知证据源的 key 类型与可靠性。

已有的 `execution-log.jsonl`（ADR-0072）已为 Run 落盘版本快照，但 transcript 证据仍然缺乏 execution 级的稳定绑定。

## Decision

决定将 run detail 的 evidence transcrip t 链接规范固定为标准实现范式：

**主链接键**：`buildRunDetail(runId)` 必须优先按 `executionId` 精确关联 transcript record，确保最新执行可追到其专属 transcript 证据。

**旧数据回退**：当 `executionId` 关联未命中时，回退到 `fixtureId` 关联，保证已有 fixture 级 transcript 数据不被断链。

**Transcript 存储模型变更**：transcript-store 的 `list()` 从 `caseId` 侧去重改为 append-only 全量返回，使每次 run 执行的 transcript 记录都被完整保留，不再因同 case 多次执行被覆盖。

**证据锚点字段**：run detail 的 `evidence.transcript` 必须暴露以下结构化字段：

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `anchorType` | string | 当前使用的链接键类型：`executionId` 或 `fixtureId` |
| `anchorValue` | string | 当前使用的链接键值 |
| `count` | number | 关联到的 transcript 记录数 |
| `refs` | array | 关联的 transcript record 引用列表 |

**Transcript record 结构变更**：transcript record 必须增加 `executionId` 字段，支持 execution 级精确匹配。

**持久化模型**：transcript-store 采用 JSONL append-only 持久化，天然保留完整历史；list() 直接返回全部记录的引用视图。

## Alternatives Considered

- 继续只靠 fixtureId 关联：被拒绝，因为同一 fixture 多次 run 执行时 transcript 会被覆盖，丧失执行级证据追溯能力。
- 只加 executionId 不改 append-only：被拒绝，因为去重存储下即使有 executionId，同 case 的旧 transcript 仍会被新 run 的 transcript 覆盖。
- 不做 fixtureId 回退，强制要求所有消费方 upgrade：被拒绝，因为存量 fixture 级 transcript 数据需要无缝兼容，不能断链。
- 把证据锚点埋入 execution-log 而非 transcript-store：被拒绝，因为 transcript 是执行证据的主体载体，run detail 应通过动态关联找到 transcript，不应在 execution-log 中复制 transcript 数据。

## Related Code

| Path | Role |
| --- | --- |
| `src/skillforge/transcript-store.mjs` | Transcript 存储：增加 `executionId` 字段，list() 改为 append-only 全量返回 |
| `web-server.mjs` | `buildRunDetail(runId)` 入口：优先按 executionId 关联 transcript，回退 fixtureId，暴露证据锚点字段 |

## Consequences

- 正向：run detail 能稳定暴露 executionId 级 transcript 证据锚点，UI、Retro、审计可直接使用。
- 正向：APPend-only transcript 存储不再因同 case 多次执行覆盖历史数据，run 级回看链路可靠。
- 正向：fixtureId 回退保证存量数据不断链，无需消费者同步 upgrade。
- 正向：证据锚点字段（anchorType/anchorValue/refs[]）为 run detail 消费者提供明确的证据源类型与可靠性说明。
- 取舍：transcript-store 存储量会随执行次数线性增长，短期内可接受，长期需考虑清理策略。
- 验证锚点：`buildRunDetail(runId)` 按 executionId 命中 transcript 时，evidence.transcript.anchorType=`executionId`、refs.length>=1；未命中时回退 fixtureId。

## Search Terms

- `buildRunDetail`
- `executionId`
- `fixtureId`
- `evidence.transcript`
- `anchorType`
- `anchorValue`
- `transcript-store`
- `transcript record`
- `append-only`
- `evidence 锚点`
- `run detail`
