# auto-revert

功能测试失败时回滚到上一个已知良好状态。

## 使用时机

- **功能测试失败时**：回滚最近的提交
- **发现问题需要撤销时**：安全地撤销提交
- **需要恢复到干净状态时**：撤销未提交的修改

## 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| reason | 是 | 回滚原因 |
| target | 否 | 回滚目标：last/N/commit_hash，默认 last |
| mode | 否 | 回滚模式：revert/reset，默认 revert（安全） |
| record_progress | 否 | 是否记录到 progress.txt，默认 true |

## 执行命令

```bash
REASON="{{reason}}"
TARGET="${TARGET:-last}"
MODE="${MODE:-revert}"
RECORD_PROGRESS="${RECORD_PROGRESS:-true}"

# 检查是否在 Git 仓库中
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "错误: 当前目录不是 Git 仓库"
  exit 1
fi

# 获取当前分支
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
CURRENT_COMMIT=$(git rev-parse --short HEAD)

echo "========================================"
echo "Git 回滚操作"
echo "========================================"
echo "当前分支: $CURRENT_BRANCH"
echo "当前提交: $CURRENT_COMMIT"
echo "回滚原因: $REASON"
echo "回滚模式: $MODE"
echo "目标: $TARGET"
echo ""

# 检查是否有未提交的修改
if [ -n "$(git status --porcelain)" ]; then
  echo "警告: 有未提交的修改"
  echo ""
  git status --short
  echo ""
  echo "处理方式: 暂存修改"
  
  echo "暂存未提交的修改..."
  git stash push -m "WIP: auto-stash before revert"
  STASHED=true
fi

# 执行回滚
case $MODE in
  revert)
    echo "使用 git revert 安全回滚..."
    git revert --no-edit HEAD
    if [ $? -eq 0 ]; then
      NEW_COMMIT=$(git rev-parse --short HEAD)
      echo ""
      echo "========================================"
      echo "回滚成功 (revert)"
      echo "========================================"
      echo "新提交: $NEW_COMMIT"
      echo "原提交: $CURRENT_COMMIT (已撤销)"
      echo ""
      echo "提示: 使用 'git log' 查看历史"
      echo "提示: 使用 'git revert --abort' 可以撤销此操作"
    else
      echo "错误: revert 失败"
      if [ "$STASHED" = true ]; then
        echo "恢复暂存的修改..."
        git stash pop
      fi
      exit 1
    fi
    ;;
  reset)
    echo "警告: 使用 git reset --hard 会丢失提交历史"
    
    git reset --hard HEAD~1
    if [ $? -eq 0 ]; then
      NEW_COMMIT=$(git rev-parse --short HEAD)
      echo ""
      echo "========================================"
      echo "回滚成功 (reset)"
      echo "========================================"
      echo "当前提交: $NEW_COMMIT"
      echo "原提交: $CURRENT_COMMIT (已丢失)"
      echo ""
      echo "警告: 原提交已从历史中移除"
      echo "提示: 使用 'git reflog' 可以恢复"
    else
      echo "错误: reset 失败"
      exit 1
    fi
    ;;
esac

# 恢复暂存的修改
if [ "$STASHED" = true ]; then
  echo ""
  echo "恢复暂存的修改..."
  git stash pop
fi

# 记录到 progress.txt
if [ "$RECORD_PROGRESS" = true ]; then
  PROGRESS_FILE="$HOME/.openclaw/workspace/progress.txt"
  TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
  
  cat >> "$PROGRESS_FILE" << EOF

========================================
[$TIMESTAMP] AUTO-REVERT
========================================
Reason: $REASON
Original commit: $CURRENT_COMMIT
Mode: $MODE

EOF
  
  echo "已记录到 progress.txt"
fi
```

## 使用示例

### 安全回滚（推荐）

```bash
# 回滚最近一次提交（使用 revert，保留历史）
auto-revert --reason "测试失败：登录验证不通过"

# 带更多参数
auto-revert --reason "功能实现有bug" --mode revert --record_progress true
```

### 强制回滚（谨慎使用）

```bash
# 使用 reset 模式（会丢失历史）
auto-revert --reason "完全错误的实现" --mode reset
```

## 回滚模式对比

| 模式 | 安全性 | 历史保留 | 适用场景 |
|------|--------|----------|----------|
| **revert** | 安全 | 是 | 大多数情况（推荐） |
| **reset** | 危险 | 否 | 完全错误的提交 |

## 回滚后操作

```
回滚完成
    │
    ▼
分析失败原因
    │
    ▼
修复问题
    │
    ▼
重新实现功能
    │
    ▼
测试通过
    │
    ▼
auto_commit 提交
```

## 注意事项

1. **优先使用 revert** - reset 会丢失历史，应谨慎使用
2. **自动处理未提交修改** - 会自动 stash 暂存
3. **记录到 progress.txt** - 默认会记录回滚操作
4. **保留原提交引用** - revert 后可以用 git show 查看原提交
