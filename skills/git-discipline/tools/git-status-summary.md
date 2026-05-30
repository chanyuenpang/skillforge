# git-status-summary

生成当前 Git 仓库状态的摘要报告。

## 使用时机

- **开始新功能前**（必须）：确认工作区干净
- **会话结束时**（必须）：确认无未提交修改
- **需要了解当前状态时**：快速查看仓库状态

## 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| format | 否 | 输出格式：full/short/json，默认 full |
| check_remote | 否 | 是否检查远程状态，默认 false |

## 执行命令

```bash
FORMAT="{{format:-full}}"
CHECK_REMOTE="{{check_remote:-false}}"

# 检查是否在 Git 仓库中
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "错误: 当前目录不是 Git 仓库"
  echo "提示: 请先运行 'git init' 或切换到正确的目录"
  exit 1
fi

# 获取基本信息
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "detached")
CURRENT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "none")
CURRENT_COMMIT_MSG=$(git log -1 --pretty=format:"%s" 2>/dev/null || echo "no commits")

# 检查工作区状态
STAGED=$(git diff --cached --numstat 2>/dev/null | wc -l)
MODIFIED=$(git diff --numstat 2>/dev/null | wc -l)
UNTRACKED=$(git ls-files --others --exclude-standard 2>/dev/null | wc -l)
STASH_COUNT=$(git stash list 2>/dev/null | wc -l)

# 判断状态
TOTAL_CHANGES=$((STAGED + MODIFIED + UNTRACKED))
if [ "$TOTAL_CHANGES" -eq 0 ]; then
  STATUS="CLEAN"
  STATUS_EMOJI="✓"
else
  STATUS="DIRTY"
  STATUS_EMOJI="✗"
fi

echo "========================================"
echo "Git 状态摘要"
echo "========================================"
echo ""
echo "分支: $CURRENT_BRANCH"
echo "提交: $CURRENT_COMMIT - $CURRENT_COMMIT_MSG"
echo "状态: $STATUS_EMOJI $STATUS"
echo ""

if [ "$TOTAL_CHANGES" -gt 0 ]; then
  echo "待处理修改:"
  [ "$STAGED" -gt 0 ] && echo "  已暂存: $STAGED 个文件"
  [ "$MODIFIED" -gt 0 ] && echo "  未暂存: $MODIFIED 个文件"
  [ "$UNTRACKED" -gt 0 ] && echo "  未跟踪: $UNTRACKED 个文件"
  echo ""
  
  echo "修改详情:"
  git status --short
  echo ""
fi

if [ "$STASH_COUNT" -gt 0 ]; then
  echo "暂存列表: $STASH_COUNT 个"
  git stash list | head -3
  echo ""
fi

# 远程状态检查
if [ "$CHECK_REMOTE" = true ]; then
  echo "远程状态检查..."
  REMOTE=$(git remote 2>/dev/null | head -1)
  if [ -n "$REMOTE" ]; then
    git fetch "$REMOTE" --quiet 2>/dev/null
    
    AHEAD=$(git rev-list --count @{upstream}..HEAD 2>/dev/null || echo "0")
    BEHIND=$(git rev-list --count HEAD..@{upstream} 2>/dev/null || echo "0")
    
    echo "  本地领先: $AHEAD 个提交"
    echo "  本地落后: $BEHIND 个提交"
    echo ""
  else
    echo "  没有配置远程仓库"
    echo ""
  fi
fi

# 状态建议
echo "----------------------------------------"
if [ "$STATUS" = "CLEAN" ]; then
  echo "建议: 工作区干净，可以开始新功能"
else
  echo "建议: 有未提交的修改，请先处理:"
  if [ "$STAGED" -gt 0 ]; then
    echo "  - 使用 'git commit' 提交已暂存的修改"
  fi
  if [ "$MODIFIED" -gt 0 ]; then
    echo "  - 使用 'git add' 暂存或 'git checkout' 放弃修改"
  fi
  if [ "$UNTRACKED" -gt 0 ]; then
    echo "  - 使用 'git add' 跟踪新文件或添加到 .gitignore"
  fi
fi
echo "========================================"
```

## 返回格式

### 工作区干净时

```
========================================
Git 状态摘要
========================================

分支: main
提交: abc123 - [feat-001] 实现用户登录功能
状态: ✓ CLEAN

----------------------------------------
建议: 工作区干净，可以开始新功能
========================================
```

### 有未提交修改时

```
========================================
Git 状态摘要
========================================

分支: feature/auth
提交: def456 - [feat-002] 添加注册功能
状态: ✗ DIRTY

待处理修改:
  已暂存: 2 个文件
  未暂存: 1 个文件
  未跟踪: 3 个文件

修改详情:
M  src/auth/login.ts
M  src/auth/register.ts
 M src/utils/helper.ts
?? src/new-feature/
?? test-file.txt

----------------------------------------
建议: 有未提交的修改，请先处理:
  - 使用 'git commit' 提交已暂存的修改
  - 使用 'git add' 暂存或 'git checkout' 放弃修改
========================================
```

## 使用示例

### 标准用法

```bash
# 查看完整状态
git-status-summary

# 简短输出
git-status-summary --format short

# 包含远程检查
git-status-summary --check_remote true
```

### 工作流集成

```bash
# 开始新功能前
git-status-summary
# 如果 CLEAN -> 开始功能开发
# 如果 DIRTY -> 先处理未提交的修改

# 会话结束时
git-status-summary
# 如果 CLEAN -> 可以结束
# 如果 DIRTY -> 必须提交或 stash
```

## 状态说明

| 状态 | 含义 | 下一步 |
|------|------|--------|
| **CLEAN** | 无未提交修改 | 可以开始新功能 |
| **DIRTY** | 有未提交修改 | 需要先提交或 stash |

## 注意事项

1. **会话开始必须调用** - 确保从干净状态开始
2. **会话结束必须调用** - 确保无遗留修改
3. **自动提供建议** - 根据状态给出下一步操作建议
