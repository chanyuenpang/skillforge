# mc-board-event-handler：看板事件驱动处理

## 结论

`mc-board-event-handler` 的长期价值在于把看板事件统一收敛成“轻量信号 → 主动拉取 → 决策执行”的幂等流程，避免把事件 payload 当作唯一真相。

## 长期行为 / 规则

- 事件处理应保持幂等、无状态，重复投递同一事件不应放大副作用。
- 事件只负责提示“发生了什么”，真正的上下文应在处理时按需拉取。
- 适合覆盖的事件类型包括 `task.created`、`status_changed`、`stalled`、`completed`、`agent provisioned` 等。
- 当事件类型增加时，优先复用统一的拉取与决策框架，而不是为每个事件复制独立逻辑。

## 关联代码

| 路径 | 作用 |
| ---- | ---- |
| `SKILL.md` | 技能骨架入口，定义事件处理原则与使用方式。 |

## 真实调用链路

1. 外部系统投递轻量事件信号。
2. `mc-board-event-handler` 先识别事件类型，再主动拉取所需上下文。
3. 基于最新状态做幂等决策，最后执行对应动作。

## 已知陷阱

- 不要把事件 payload 当作完整状态源，容易造成重复处理或状态漂移。
- 不要把“事件已到达”误当成“任务已完成”。
- 若直接把业务逻辑绑死在单个事件类型上，后续扩展会变脆。

## 验证标准

- 同一事件重复触发时，结果应保持稳定且不重复放大副作用。
- 新增事件类型时，能否复用统一拉取/决策框架。

## 关键检索词

- `task.created`
- `status_changed`
- `stalled`
- `completed`
- `agent provisioned`
- `event-driven`
- `lightweight signal`
- `pull on demand`
