# auto-commit

功能完成后自动执行规范的 Git commit。

## 使用时机

- **功能完成并通过验证后**（必须）
- **每个独立功能完成后立即提交**
- **不允许多个功能完成后批量提交**

## 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| feature_id | 是 | 功能ID，如 "feat-001" 或 "feature-auth-001" |
| description | 是 | 简短描述功能内容 |
| details | 否 | 详细说明（多行） |
| test_status | 否 | 测试状态：passed/failed/skipped |

## 执行命令

```bash
FEATURE_ID="{{feature_id}}"
DESCRIPTION="{{description}}"
DETAILS="{{details}}"
TEST_STATUS="{{test_status}}"

# 检查是否在 Git 仓库中
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "错误: 当前目录不是 Git 仓库"
  exit 1
fi

# 检查是否有修改
if [ -z "$(git status --porcelain)" ]; then
  echo "警告: 没有待提交的修改"
  echo "提示: 请确认功能是否真正完成"
  exit 0
fi

# 显示待提交文件
echo "========================================"
echo "待提交的修改"
echo "========================================"
git status --short
echo ""

# 安全检查：检查是否有敏感文件
SENSITIVE_FILES=$(git status --porcelain | grep -E '\.(env|key|pem|p12|crt)$|credentials|secrets|password' || true)
if [ -n "$SENSITIVE_FILES" ]; then
  echo "警告: 检测到可能的敏感文件:"
  echo "$SENSITIVE_FILES"
  echo ""
  echo "请确认这些文件应该被提交。"
fi

# 构建 commit message
COMMIT_MSG="[${FEATURE_ID}] ${DESCRIPTION}"

# 如果有测试状态，添加到 commit message
if [ -n "$TEST_STATUS" ]; then
  if [ "$TEST_STATUS" = "passed" ]; then
    COMMIT_MSG="${COMMIT_MSG}

Tests: passed"
  elif [ "$TEST_STATUS" = "failed" ]; then
    COMMIT_MSG="${COMMIT_MSG}

Tests: failed (requires attention)"
  fi
fi

echo "========================================"
echo "即将提交"
echo "========================================"
echo "Commit message:"
echo "----------------"
echo "$COMMIT_MSG"
echo "----------------"
echo ""

# 添加所有修改并提交
git add -A
git commit -m "$COMMIT_MSG"

if [ $? -eq 0 ]; then
  COMMIT_HASH=$(git rev-parse --short HEAD)
  echo ""
  echo "========================================"
  echo "提交成功"
  echo "========================================"
  echo "Commit: $COMMIT_HASH"
  echo "Feature: $FEATURE_ID"
  echo ""
  echo "提示: 可以使用 'git show $COMMIT_HASH' 查看详情"
else
  echo "错误: 提交失败"
  exit 1
fi
```

## 使用示例

### 基本用法

```bash
# 最简单的用法
auto-commit --feature_id feat-001 --description "实现用户登录功能"

# 带测试状态
auto-commit --feature_id feat-002 --description "添加注册功能" --test_status passed
```

## Commit Message 格式

```
[feature-<ID>] <简短描述>

Tests: passed/failed
```

## 执行前检查清单

```
□ 功能已完整实现
□ 功能已通过验证测试
□ 工作区有待提交的修改
□ 没有敏感文件（.env, credentials 等）
```

## 注意事项

1. **功能完成即提交** - 不要等完成多个功能后才提交
2. **必须包含功能ID** - commit message 格式必须遵守
3. **敏感文件检查** - 自动检测 .env、.key 等敏感文件
4. **自动 add -A** - 自动添加所有修改
