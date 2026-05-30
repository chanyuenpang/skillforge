---
name: mc-board-event-handler
version: 1.0.0
description: "MC 看板事件处理器 | 接收并处理 Mission Control 看板事件（轻量信号 → 主动拉取 → 决策执行）。触发词：MC事件、看板事件、board event、事件处理。"
metadata:
  openclaw:
    emoji: "🔔"
    priority: high
    type: skill
---

# MC Board Event Handler

你负责处理 Mission Control 看板推送的**轻量事件信号**。采用**信号接收 → 主动拉取详情 → 决策执行**的模式，不做轮询。

## 通信模式

```
MC Backend                          You (Board Event Handler)
   │                                       │
   │  事件信号（轻量）                      │
   │  ─────────────────────────────────>  │
   │  type: task.created                  │
   │  task_id: uuid                       │
   │                                       │
   │                      拉取详细信息      │
   │  <─────────────────────────────────  │
   │  GET /tasks/{task_id}                │
   │                                       │
   │  任务详情（完整）                      │
   │  ─────────────────────────────────>  │
   │                                       │
   │                         执行决策处理   │
   │                                       │
   │                       更新 Delivery   │
   │                                       │
   │  返回等待状态                          │
   │  <─────────────────────────────────  │
```

## 事件类型与处理流程

### task.created — 新任务创建

1. 收到信号 → 拉取任务详情（复杂度、标签、交付物要求）
2. 评估复杂度：
   - 简单任务 → 直接分配 Worker 执行
   - 复杂任务 → 触发拆分流程（分配 Worker 做 planning）
3. 通过 `mc_operation: assignTask` 分配 Worker
4. 记录分配结果

### task.status_changed — 任务状态变更

1. 收到信号 → 拉取任务详情（新状态、变更原因）
2. 处理不同状态变更：
   - `blocked` → 分析阻塞原因，决定是否需要 Leader 介入
   - `inbox` → 检查是否有可用 Worker，尝试分配
   - `review` → 检查 Review 是否超时
3. 必要时推送飞书通知

### task.stalled — 任务停滞超时

1. 收到信号 → 拉取任务详情（停滞时长、当前状态）
2. 根据超时阈值判断处理方式：
   - 轻微超时 → Nudge（提醒 Worker）
   - 严重超时 → 通知 Leader 重新分配
   - 紧急超时 → 自动重新分配（按 Board Rules）
3. 记录超时处理动作

### task.completed — 任务完成

1. 收到信号 → 拉取任务详情（交付物、检查清单）
2. 如果父任务存在 → 检查父任务的所有子任务是否全部完成
3. 全部完成 → 自动推进父任务到 review
4. 通知用户任务完成

### agent.provisioned / agent.offline — Agent 上下线

1. 更新内部 Worker 状态表
2. Agent 上线 → 检查是否有待分配任务
3. Agent 下线 → 重新分配该 Agent 的活跃任务

### board.tasks_unassigned — 未分配任务堆积

1. 拉取未分配任务列表（按优先级排序）
2. 按 `priority_score = dependency_boost × 1000 + explicit_priority × 100 - creation_time_order` 排序
3. 批量分派给可用 Worker

## 核心原则

1. **轻量信号 + 主动拉取**：只接收事件 ID，不接收完整 payload
2. **被动响应**：不做定时轮询，完全由事件驱动
3. **按需加载**：处理什么事件就拉取什么数据，不预加载全部
4. **幂等处理**：通过 `correlation_id` 去重，避免重复处理同一事件
5. **无状态**：不维护长期上下文，每次事件独立处理

## 异常处理

| 场景 | 处理方式 |
|------|----------|
| 拉取任务详情失败（404） | 记录日志，跳过该事件 |
| API 超时 | 重试 1 次，仍失败则报告 Leader |
| 事件去重命中 | 直接跳过，不重复处理 |
| 无可用 Worker | 报告 Leader，保持任务在队列中 |

## API 调用

```
GET /api/tasks/{task_id}              # 拉取任务详情
POST /api/tasks/{task_id}/assign     # 分配 Worker
POST /api/tasks/{task_id}/nudge      # 提醒 Worker
POST /api/tasks/{task_id}/reassign   # 重新分配
GET /api/agents/available             # 查询可用 Worker
GET /api/boards/{board_id}/rules     # 获取 Board Rules 配置
```

## 相关技能

- `mc-worker-dispatcher` — Worker 匹配与分配
- `mc-progress-monitor` — 超时检测与停滞监控
- `mc-task-tracking` — 任务状态追踪与查询管理

## 变更历史

- **v1.0.0** (2026-04-14): 初始版本，定义事件驱动通信模式和处理流程
