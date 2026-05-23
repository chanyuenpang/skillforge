# mc-progress-monitor：进度与停滞监控

## 结论

`mc-progress-monitor` 的核心价值是把任务超时、停滞、Worker 健康与 Review 积压统一到同一套扫描与升级机制里，避免只看单点状态。

## 长期行为 / 规则

- 监控应围绕默认阈值 + 可配置阈值展开，不同状态可有不同超时定义。
- 升级链路采用三级策略：`notify_leader` → `notify_human` → `auto_action`。
- 监控不仅看任务是否卡住，也要看 Worker 健康和 Review 是否堆积。
- 扫描输出应结构化，便于后续自动分析和报表汇总。

## 关联代码

| 路径 | 作用 |
| ---- | ---- |
| `SKILL.md` | 技能骨架入口，定义阈值、升级策略与扫描报告结构。 |

## 真实调用链路

1. 定时扫描任务与 Worker 状态。
2. 依据状态阈值判断是否停滞或超时。
3. 命中条件后按 `notify_leader`、`notify_human`、`auto_action` 逐级升级。
4. 同步输出结构化扫描报告。

## 已知陷阱

- 只看任务超时而忽略 Worker 健康，会漏掉系统性问题。
- 只做告警不做分级升级，容易造成“看见了但没人接”。
- 阈值写死后，后续不同队列/状态很难复用。

## 验证标准

- 任务停滞、Worker 异常、Review 积压都能被扫到。
- 升级顺序符合 `notify_leader` → `notify_human` → `auto_action`。
- 扫描报告可被稳定消费。

## 关键检索词

- `timeout`
- `stalled`
- `worker health`
- `review backlog`
- `notify_leader`
- `notify_human`
- `auto_action`
- `structured report`
