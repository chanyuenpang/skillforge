---
name: mc-progress-monitor
version: 1.0.0
description: "MC 进度监控器 | 监控 Mission Control 任务进度，检测超时与停滞，触发升级和提醒。触发词：MC进度、超时检测、停滞监控、progress monitor、任务超时。"
metadata:
  openclaw:
    emoji: "⏱️"
    priority: medium
    type: skill
---

# MC Progress Monitor

你负责监控 Mission Control 中所有任务的**进度健康度**，包括超时检测、停滞预警和升级触发。作为被动监控组件，由定时扫描或事件信号触发。

## 监控范围

| 维度 | 检测内容 | 触发动作 |
|------|----------|----------|
| 状态超时 | 任务在某个状态停留超过阈值 | 发布 `task.stalled` 事件 |
| Worker 无响应 | Worker 超过阈值未报告进度 | 标记 Worker 可疑，触发重新分配 |
| 子任务进度 | 子任务完成率低于预期 | 提醒父任务负责人 |
| Review 积压 | Review 队列长时间未处理 | 通知 Reviewer 或重新分配 |

## 超时阈值配置

从 Board Rules 读取各状态的超时阈值（单位：分钟）：

| 状态 | 默认阈值 | 警告阈值 | 说明 |
|------|----------|----------|------|
| `inbox` | 120 | 60 | 待分配任务停留超时 |
| `planning` | 60 | 30 | 拆分阶段超时 |
| `in_progress` | 480 | 240 | 执行阶段超时 |
| `review` | 240 | 120 | 审查阶段超时 |
| `blocked` | 1440 | 720 | 阻塞状态超时 |

## 升级机制

支持三级升级策略（按 Board Rules 配置）：

```
Level 1: notify_leader       → 发送飞书通知给 Leader
Level 2: notify_human        → 发送飞书通知给人类管理员
Level 3: auto_action         → 自动执行预设动作（重新分配、取消等）
```

## 处理流程

### 超时检测（定时扫描触发）

1. 拉取所有非 `done`、`cancelled`、`archived` 状态的任务
2. 对每个任务计算状态停留时长：`duration = now - status_changed_at`
3. 对比 Board Rules 中对应状态的超时阈值
4. 如果超时 → 发布 `task.stalled` 事件并执行升级策略
5. 记录检测结果

### 停滞事件处理（被事件触发）

当收到 `task.stalled` 事件时：

1. 拉取任务详情，确认当前状态和停滞时长
2. 根据 Board Rules 的升级策略执行：
   - Level 1: 发送 Nudge 给当前负责 Worker
   - Level 2: 发送警报给人类管理员
   - Level 3: 执行自动动作（如重新分配 Worker）
3. 记录处理结果

### Worker 健康检查

1. 维护 Worker 最后活跃时间表
2. 如果 Worker 超过 `heartbeat_timeout`（默认 30 分钟）未报告
3. 标记 Worker 状态为 `suspect`
4. 将该 Worker 的活跃任务标记为停滞风险
5. 通知 Leader

### Review 积压监控

1. 检查 `review` 状态任务数量
2. 如果积压数量超过 Board Rules 中 `review_backlog_threshold`
3. 通知 Leader 增加 Reviewer 或调整分配

## 监控数据输出

每次监控周期完成后输出结构化报告：

```json
{
  "scan_time": "ISO 时间戳",
  "total_tasks": 42,
  "stalled_tasks": [
    { "task_id": "uuid", "status": "in_progress", "stalled_minutes": 500, "action": "nudge_sent" }
  ],
  "worker_health": [
    { "agent_id": "agent-x", "status": "suspect", "last_heartbeat": "ISO 时间戳" }
  ],
  "review_backlog": 3,
  "actions_taken": ["nudge_agent-x", "notify_leader_task-y"]
}
```

## 异常处理

| 场景 | 处理方式 |
|------|----------|
| Board Rules 未配置超时 | 使用默认阈值 |
| API 不可用 | 跳过当前扫描周期，记录错误 |
| Worker 列表为空 | 跳过 Worker 健康检查 |
| 升级动作执行失败 | 记录日志，尝试下一级升级 |

## API 调用

```
GET /api/tasks                     # 拉取任务列表（支持状态过滤）
GET /api/tasks/{task_id}           # 拉取任务详情
GET /api/boards/{board_id}/rules   # 获取 Board Rules（含超时配置）
GET /api/agents/status             # 获取 Agent 状态列表
POST /api/tasks/{task_id}/nudge    # 发送 Nudge 提醒
POST /api/tasks/{task_id}/reassign # 重新分配
POST /api/events/publish           # 发布事件
```

## 相关技能

- `mc-board-event-handler` — 事件接收与处理
- `mc-task-tracking` — 任务状态追踪
- `mc-worker-dispatcher` — Worker 重新分配

## 变更历史

- **v1.0.0** (2026-04-14): 初始版本，定义超时监控和升级机制
