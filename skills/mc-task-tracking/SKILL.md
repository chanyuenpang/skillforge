---
name: mc-task-tracking
version: 1.0.0
description: "MC 任务追踪器 | 追踪和管理 Mission Control 任务状态，提供查询、统计和报表能力。触发词：MC任务、任务追踪、task tracking、任务查询、状态追踪。"
metadata:
  openclaw:
    emoji: "📊"
    priority: medium
    type: skill
---

# MC Task Tracking

你负责追踪和管理 Mission Control 中任务的**全生命周期状态**，包括状态查询、变更记录、统计汇总和报表生成。为 Leader 和人类管理员提供实时的任务视图。

## 核心能力

| 能力 | 说明 |
|------|------|
| 任务查询 | 按状态、优先级、Worker、时间范围等条件查询任务 |
| 状态追踪 | 追踪任务状态变更历史，生成时间线 |
| 统计汇总 | 按维度统计任务数量、分布、平均处理时长 |
| 报表生成 | 生成看板状态快照和周期报表 |
| 依赖分析 | 分析任务间的依赖关系和阻塞链 |

## 任务状态集合

| 状态 | 含义 |
|------|------|
| `inbox` | 待处理池，任务已创建但未分配 |
| `planning` | 任务拆分中 |
| `in_progress` | 执行中 |
| `blocked` | 阻塞中（含阻塞原因） |
| `review` | 审查中 |
| `done` | 已完成 |
| `cancelled` | 已取消 |
| `archived` | 已归档 |

## 数据模型（查询字段）

```
Task {
  id: UUID
  title: string
  description: string
  status: enum
  priority: low | medium | high | urgent
  board_id: UUID
  parent_task_id: UUID | null
  deliverable_spec: JSON
  deliverable: JSON
  review_report: JSON
  executor_agent_id: string
  review_round: int
  rejection_reason: string | null
  blocked_reason: string | null
  blocked_by: UUID[]
  blocked_at: timestamp | null
  cancellation_reason: string | null
  assignee_history: JSON[]
  created_at: timestamp
  updated_at: timestamp
  status_changed_at: timestamp
}
```

## 查询模式

### 按状态查询
```
GET /api/tasks?status=in_progress         # 查询执行中的任务
GET /api/tasks?status=blocked             # 查询阻塞中的任务
GET /api/tasks?status=inbox&limit=20      # 查询待分配任务（前20条）
```

### 按 Worker 查询
```
GET /api/tasks?assignee=agent-x           # 查询某 Worker 的任务
GET /api/tasks?assignee=agent-x&status=in_progress  # 查询某 Worker 的活跃任务
```

### 按时间查询
```
GET /api/tasks?created_after=2026-04-01&created_before=2026-04-30  # 查询某时间范围创建的任务
GET /api/tasks?status_changed_before=2026-04-14T00:00:00Z          # 查询长时间未变更的任务
```

### 按优先级查询
```
GET /api/tasks?priority=urgent            # 查询紧急任务
GET /api/tasks?priority=high&status=inbox # 查询高优先级待分配任务
```

### 依赖查询
```
GET /api/tasks/{task_id}/children         # 查询某任务的所有子任务
GET /api/tasks?parent_task_id={uuid}      # 查询指定父任务下的子任务
GET /api/tasks?blocked_by_contains={uuid} # 查询被某任务阻塞的任务列表
```

## 统计与报表

### 看板状态快照

```json
{
  "board_id": "uuid",
  "snapshot_time": "ISO 时间戳",
  "status_distribution": {
    "inbox": 5,
    "planning": 2,
    "in_progress": 8,
    "blocked": 3,
    "review": 4,
    "done": 15,
    "cancelled": 1,
    "archived": 20
  },
  "priority_distribution": {
    "urgent": 2,
    "high": 5,
    "medium": 12,
    "low": 8
  },
  "overdue_tasks": 3,
  "avg_completion_time_hours": 6.5
}
```

### 周期报表（日报/周报）

输出结构化 Markdown 报表，包含：

1. **摘要**：本期新增任务数、完成任务数、阻塞任务数
2. **状态分布**：各状态任务数量及占比
3. **超时任务**：超时任务列表（状态、负责人、超时时长）
4. **阻塞链**：阻塞关系图（被谁阻塞、阻塞了谁）
5. **Worker 负载**：各 Worker 当前任务数及状态
6. **趋势**：与上一周期对比（新增、完成、积压变化）

### Worker 负载分析

```
Worker      Active  Inbox  Review  Blocked  Total
agent-a     2       1      0       1        4
agent-b     1       0      1       0        2
agent-c     0       2      0       0        2
```

## 异常处理

| 场景 | 处理方式 |
|------|----------|
| 查询条件返回空结果 | 返回空列表，不报错 |
| 任务 ID 不存在 | 返回 404，记录查询尝试 |
| 时间范围过大 | 限制最大返回数量（默认 100），警告用户 |
| API 超时 | 缩小查询范围或分页重试 |

## API 调用

```
GET /api/tasks                        # 查询任务列表（支持多条件过滤）
GET /api/tasks/{task_id}              # 查询单个任务详情
GET /api/tasks/{task_id}/history      # 查询任务状态变更历史
GET /api/boards/{board_id}/stats      # 看板统计
GET /api/boards/{board_id}/report     # 生成看板报表
GET /api/agents/{agent_id}/tasks      # 查询 Worker 任务分配情况
```

## 相关技能

- `mc-board-event-handler` — 事件驱动更新任务状态
- `mc-progress-monitor` — 超时检测，为报表提供超时数据
- `mc-worker-dispatcher` — Worker 分配信息，用于负载分析

## 变更历史

- **v1.0.0** (2026-04-14): 初始版本，定义任务追踪和报表能力
