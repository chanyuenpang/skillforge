---
name: task-status-tracker
version: 1.0.0
description: "任务状态跟踪 | 跟踪长任务进度，支持跨 Session 查询和进度通知。触发词：进度、跟踪、状态。"
metadata:
  openclaw:
    emoji: "📊"
    priority: high
    type: skill
---

# Task Status Tracker

跟踪长任务的进度，支持跨 Session 查询和进度通知。

## 使用场景

当你需要执行一个可能需要较长时间的任务时（如分析大文件、批量处理、复杂计算），使用本 skill：

1. **注册任务** -> 获得 taskId
2. **启动 Subagent** 处理任务（选择合适的 agentId）
3. **定期更新进度** -> Subagent 调用 update-progress
4. **用户查询进度** -> 任何窗口都可以查询

## 工作流程

```
用户: "帮我分析这个 1GB 的日志文件"

Orchestrator:
1. 调用 register-task -> taskId: "task-20260313-001"
2. 回复: "好的，我开始分析。任务ID: task-20260313-001，预计5分钟。"
3. sessions_spawn({ task: "分析日志文件...", agentId: "executor", label: "analyze-log" })
4. Subagent 定期调用 update-progress (20%, 40%, 60%...)
5. 用户在任何窗口问进度 -> query-task 返回当前状态
```

## 状态文件

存储位置: `workspace/status/tasks/{taskId}.json`

## 与 orchestrator-constraint 的集成

此 Skill 与 orchestrator-constraint Skill 配合使用：

1. **register-task** - Orchestrator 注册任务
2. **sessions_spawn** - Orchestrator 委派给对应 Subagent（通过 agentId 指定）
3. **update-progress** - Subagent 更新进度
4. **query-task** - Orchestrator 查询状态并回复用户

## 可委派的 Subagent 类型

| agentId | 适用场景 |
|---------|----------|
| `executor` | 文件操作、命令执行、批量处理 |
| `explorer-agent` | 文件搜索、代码分析、网络搜索、信息收集 |
| `task-planning` | 任务规划与分解 |
| `docx-converter-agent` | Word 文档生成和转换 |
