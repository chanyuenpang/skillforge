---
name: task-planning
version: 1.0.0
description: "当用户需要拆解复杂任务、规划 blockedBy 依赖或调度执行顺序时使用该技能，支持 Leader Agent 输出结构化任务计划。"
metadata:
  openclaw:
    emoji: "📋"
    priority: high
    type: skill
---

# Task Planning - 任务规划技能

## 技能定位

本技能是 Leader Agent 的规划能力补充，在复杂任务场景下被激活。

### "先侦察再行动"原则

派发实施任务前，必须确认外部集成点已被现场验证，不依赖记忆假设。

| 外部依赖 | 验证方式 |
| ---- | ---- |
| CLI 工具 | 运行 `--help` 确认参数语法 |
| 外部 API | 确认实际请求/响应格式 |
| 运行环境 | 检查工具位置、版本、PATH |

## 任务分解方法论

### 原子性原则

| 职责类型 | 处理方式 |
| ---- | ---- |
| 实现（写代码） | 独立任务 |
| 验证（测试/lint） | 独立任务 |
| 审查（Code Review） | 独立任务 |

**禁止**在一个任务中混合多种职责。

### 任务定义模板

```yaml
objective: "这个任务要达成什么"
scope:
  include: "覆盖哪个模块/功能区域"
  exclude: "明确非目标"
inputs: "执行此任务需要的前置信息或产物"
expected_output: "任务完成后应交付什么"
done_criteria: "如何判断任务真正完成"
dependencies: ["task-id-1"]
```

### 风险点

- 外部依赖能力若未现场验证，计划会误判。
- 任务粒度过大时会破坏原子性。
- 共享文件未串行化会产生调度冲突。
