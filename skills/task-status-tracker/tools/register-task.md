# register-task

注册一个新任务，返回 taskId。

## 使用时机

当你开始执行一个需要较长时间的任务时（预计超过 30 秒），先调用此工具注册任务。

## 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| name | 是 | 任务名称，如 "分析日志文件" |
| description | 否 | 任务详细描述 |
| estimatedSeconds | 否 | 预计需要多少秒 |

## 执行命令

```bash
TASK_ID="task-20260313205012-17822"
USER_ID="{{当前用户的 ID}}"
CHANNEL="{{当前通道}}"
TASK_DIR="$HOME/.openclaw/workspace/status/tasks"

mkdir -p "$TASK_DIR"

cat > "$TASK_DIR/${TASK_ID}.json" << TASKEOF
{
  "taskId": "$TASK_ID",
  "name": "{{name}}",
  "description": "{{description}}",
  "userId": "$USER_ID",
  "channel": "$CHANNEL",
  "status": "running",
  "progress": 0,
  "message": "任务已启动",
  "createdAt": "2026-03-13T20:50:12+08:00",
  "updatedAt": "2026-03-13T20:50:12+08:00"
}
TASKEOF

echo "任务已注册: $TASK_ID"
```

## 返回

返回 taskId，后续用此 ID 更新进度或查询状态。
