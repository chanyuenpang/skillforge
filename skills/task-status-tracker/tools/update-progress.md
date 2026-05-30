# update-progress

更新任务进度。

## 使用时机

Sub-Agent 在处理任务过程中，定期调用此工具更新进度。

## 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| taskId | 是 | 任务 ID |
| progress | 是 | 进度百分比 (0-100) |
| message | 否 | 当前状态消息 |

## 执行命令

```bash
TASK_ID="{{taskId}}"
PROGRESS="{{progress}}"
MESSAGE="{{message}}"
TASK_FILE="$HOME/.openclaw/workspace/status/tasks/${TASK_ID}.json"

if [ -f "$TASK_FILE" ]; then
  # 使用 Python 更新 JSON（更可靠）
  python3 -c "
import json
with open('$TASK_FILE', 'r') as f:
    data = json.load(f)
data['progress'] = 
data['message'] = '$MESSAGE'
data['updatedAt'] = '2026-03-13T20:50:38+08:00'
if  >= 100:
    data['status'] = 'completed'
with open('$TASK_FILE', 'w') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
print('进度已更新: '$PROGRESS'%')
"
else
  echo "任务不存在: $TASK_ID"
fi
```

## 注意

- progress 达到 100 时，状态自动变为 completed
- 建议每完成 10-20% 更新一次
