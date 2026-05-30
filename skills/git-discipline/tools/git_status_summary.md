# git_status_summary

生成当前 Git 仓库状态的完整摘要。

## 使用时机

- 开始新功能前检查状态
- 会话结束时确认工作区干净
- 需要了解当前 Git 状态时

## 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| showStash | 否 | 是否显示 stash 列表，默认 true |
| showRemote | 否 | 是否显示远程仓库状态，默认 true |
| recentCount | 否 | 显示最近多少条 commit，默认 5 |

## 执行步骤

### 1. 获取当前分支

```bash
current_branch=$(git branch --show-current)
echo "当前分支: $current_branch"
```

### 2. 获取工作区状态

```bash
# 状态摘要
git status --porcelain

# 统计
modified=$(git status --porcelain | grep -c "^ M\|^M ")
added=$(git status --porcelain | grep -c "^A \|^??")
deleted=$(git status --porcelain | grep -c "^ D\|^D ")
untracked=$(git status --porcelain | grep -c "^??")
```

### 3. 检查冲突

```bash
conflicts=$(git status --porcelain | grep -c "^UU\|^AA\|^DD")
if [ "$conflicts" -gt 0 ]; then
  conflict_files=$(git status --porcelain | grep "^UU\|^AA\|^DD" | awk '{print $2}')
  echo "⚠️ 存在冲突文件: $conflict_files"
fi
```

### 4. 检查 Stash

```bash
stash_count=$(git stash list | wc -l)
if [ "$stash_count" -gt 0 ]; then
  echo "Stash 数量: $stash_count"
  git stash list | head -5
fi
```

### 5. 获取最近提交

```bash
git log --oneline -${recentCount:-5}
```

### 6. 检查远程状态

```bash
# 获取远程分支
remote_branch=$(git for-each-ref --format='%(upstream:short)' "$(git symbolic-ref -q HEAD)")

if [ -n "$remote_branch" ]; then
  # 获取差异统计
  ahead=$(git rev-list --count @{upstream}..HEAD 2>/dev/null || echo "0")
  behind=$(git rev-list --count HEAD..@{upstream} 2>/dev/null || echo "0")
  
  echo "远程分支: $remote_branch"
  echo "领先 $ahead 个提交，落后 $behind 个提交"
fi
```

## 输出格式

```
📊 Git 状态摘要

分支信息:
├── 当前分支: main
├── 远程分支: origin/main
└── 同步状态: 领先 2 个提交，落后 0 个提交

工作区状态:
├── 修改文件: 3
├── 新增文件: 1
├── 删除文件: 0
├── 未跟踪: 2
└── 冲突: 0

状态判定: ⚠️ 有未提交修改

Stash 列表 (2):
├── stash@{0}: WIP on main: abc123 上次保存的工作
└── stash@{1}: WIP on feature: def456 实验性代码

最近 5 条提交:
├── abc123 [feature-auth-003] 实现权限验证
├── def456 [feature-auth-002] 添加登录 API
├── ghi789 [feature-auth-001] 初始化认证模块
├── jkl012 [feature-base-001] 项目初始化
└── mno345 Initial commit

待处理文件:
├── M  src/auth/login.js
├── M  src/auth/permissions.js
├── M  config/routes.yaml
├── A  src/utils/helper.js
├── ?? notes.txt
└── ?? temp.log
```

## 完整脚本

```bash
#!/bin/bash
# git_status_summary.sh

showStash="${showStash:-true}"
showRemote="${showRemote:-true}"
recentCount="${recentCount:-5}"

echo "📊 Git 状态摘要"
echo ""

# 分支信息
current_branch=$(git branch --show-current)
echo "分支信息:"
echo "├── 当前分支: $current_branch"

if [ "$showRemote" = "true" ]; then
  remote_branch=$(git for-each-ref --format='%(upstream:short)' "$(git symbolic-ref -q HEAD)" 2>/dev/null)
  if [ -n "$remote_branch" ]; then
    echo "├── 远程分支: $remote_branch"
    
    ahead=$(git rev-list --count @{upstream}..HEAD 2>/dev/null || echo "0")
    behind=$(git rev-list --count HEAD..@{upstream} 2>/dev/null || echo "0")
    
    echo "└── 同步状态: 领先 $ahead 个提交，落后 $behind 个提交"
  else
    echo "└── 远程分支: 未设置"
  fi
else
  echo "└── (远程检查已跳过)"
fi

echo ""

# 工作区状态
status_output=$(git status --porcelain)
modified=$(echo "$status_output" | grep -cE "^.M|^M " || echo "0")
added=$(echo "$status_output" | grep -cE "^A |^M" || echo "0")
deleted=$(echo "$status_output" | grep -cE "^.D|^D " || echo "0")
untracked=$(echo "$status_output" | grep -c "^??" || echo "0")
conflicts=$(echo "$status_output" | grep -cE "^UU|^AA|^DD" || echo "0")

echo "工作区状态:"
echo "├── 修改文件: $modified"
echo "├── 新增文件: $added"
echo "├── 删除文件: $deleted"
echo "├── 未跟踪: $untracked"
echo "└── 冲突: $conflicts"
echo ""

# 状态判定
total_changes=$((modified + added + deleted + untracked + conflicts))
if [ "$total_changes" -eq 0 ]; then
  echo "状态判定: ✅ 工作区干净"
else
  echo "状态判定: ⚠️ 有未提交修改 ($total_changes 个文件)"
fi
echo ""

# Stash
if [ "$showStash" = "true" ]; then
  stash_count=$(git stash list | wc -l)
  if [ "$stash_count" -gt 0 ]; then
    echo "Stash 列表 ($stash_count):"
    git stash list | head -5 | while read -r line; do
      echo "├── $line"
    done
    echo ""
  else
    echo "Stash: 无"
    echo ""
  fi
fi

# 最近提交
echo "最近 $recentCount 条提交:"
git log --oneline -"$recentCount" | while read -r line; do
  echo "├── $line"
done
echo ""

# 待处理文件详情
if [ "$total_changes" -gt 0 ]; then
  echo "待处理文件:"
  echo "$status_output" | while read -r line; do
    echo "├── $line"
  done
fi
```

## 使用示例

### 开始功能前检查

```bash
# 检查状态
git_status_summary

# 如果不干净，处理：
if [ 有未提交修改 ]; then
  echo "请先处理未提交修改："
  echo "1. 如果修改属于上一个功能 → auto_commit"
  echo "2. 如果修改未完成 → git stash 或继续完成"
fi
```

### 会话结束检查

```bash
# 会话结束前
git_status_summary

# 确认状态：
# ✅ 工作区干净 → 可以结束会话
# ⚠️ 有未提交修改 → 必须处理
```

### 快速检查

```bash
# 只检查是否有修改
if [ -n "$(git status --porcelain)" ]; then
  echo "有未提交修改"
else
  echo "工作区干净"
fi
```

## 返回值

返回一个状态码，便于脚本判断：

| 状态码 | 含义 |
|--------|------|
| 0 | 工作区干净 |
| 1 | 有未提交修改 |
| 2 | 有冲突 |
| 3 | 有未推送提交 |
| 4 | 有 stash |

```bash
# 综合状态码
status=0
[ "$total_changes" -gt 0 ] && status=1
[ "$conflicts" -gt 0 ] && status=2
[ "$ahead" -gt 0 ] && status=3
[ "$stash_count" -gt 0 ] && status=4

exit $status
```
