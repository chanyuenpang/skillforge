# list-tasks

列出所有活跃任务。

## 使用时机

管理员查看系统当前所有任务，或用户查看自己的所有任务。

## 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| all | 否 | 是否列出所有用户的任务（默认只列出当前用户） |

## 执行命令

### 列出当前用户的任务

```bash
USER_ID="{{当前用户的 ID}}"
TASK_DIR="$HOME/.openclaw/workspace/status/tasks"

echo "=== 你的任务列表 ==="
for f in "$TASK_DIR"/task-*.json; do
  if [ -f "$f" ]; then
    TASK_ID=$(basename "$f" .json)
    STATUS=$(python3 -c "
import json
with open('$f', 'r') as f:
    data = json.load(f)
if data.get('userId') == '$USER_ID':
    print(f\"{data['name']} - {data['status']} ({data['progress']}%) - {data['message']}\")
")
    if [ -n "$STATUS" ]; then
      echo "$STATUS"
    fi
  fi
done
```

### 列出所有任务（管理员）

```bash
TASK_DIR="$HOME/.openclaw/workspace/status/tasks"

echo "=== 所有活跃任务 ==="
for f in "$TASK_DIR"/task-*.json; do
  if [ -f "$f" ]; then
    python3 -c "
import json
with open('$f', 'r') as file:
    data = json.load(file)
print(f\"{data['taskId']}: {data['name']} - {data['status']} ({data['progress']}%) - 用户: {data['userId']}\")
"
  fi
done
```

## 清理过期任务

```bash
# 删除 24 小时前完成的任务
TASK_DIR="$HOME/.openclaw/workspace/status/tasks"
find "$TASK_DIR" -name "task-*.json" -mtime +1 -exec rm {} \;
echo "已清理过期任务"
```
