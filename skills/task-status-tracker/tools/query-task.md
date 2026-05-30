# query-task

查询任务状态。

## 使用时机

用户询问任务进度时，或需要检查任务状态时调用。

## 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| taskId | 否 | 任务 ID，不提供则查询当前用户的所有任务 |

## 执行命令

### 查询指定任务

```bash
TASK_ID="{{taskId}}"
TASK_FILE="$HOME/.openclaw/workspace/status/tasks/${TASK_ID}.json"

if [ -f "$TASK_FILE" ]; then
  cat "$TASK_FILE"
else
  echo "任务不存在: $TASK_ID"
fi
```

### 查询当前用户的所有任务

```bash
USER_ID="{{当前用户的 ID}}"
TASK_DIR="$HOME/.openclaw/workspace/status/tasks"

# 查找该用户的所有活跃任务
find "$TASK_DIR" -name "task-*.json" -exec grep -l "\"userId\": \"$USER_ID\"" {} \; | while read f; do
  echo "=== $(basename $f) ==="
  cat "$f"
  echo ""
done
```

## 返回格式

```json
{
  "taskId": "task-20260313100000-12345",
  "name": "分析日志文件",
  "status": "running",
  "progress": 60,
  "message": "正在统计错误...",
  "createdAt": "2026-03-13T10:00:00+08:00",
  "updatedAt": "2026-03-13T10:05:00+08:00"
}
```

## 友好回复示例

"你的【分析日志文件】任务已完成 60%，正在统计错误，预计还需 2 分钟。"
