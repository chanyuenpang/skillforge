# auto_commit

功能完成后自动提交 Git commit，遵循 Git Discipline 规范。

## 使用时机

当完成一个功能并测试通过后，立即调用此工具提交。

## 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| featureId | 是 | 功能 ID，格式如 `auth-001`、`api-002` |
| description | 是 | 简短描述，不超过 50 字符 |
| files | 否 | 指定要提交的文件列表，默认提交所有修改 |
| testStatus | 否 | 测试状态：`passed`、`failed`、`skipped` |
| details | 否 | 详细说明，多行文本 |

## 执行步骤

### 1. 检查 Git 状态

```bash
git status --porcelain
```

确认有待提交的修改。如果没有修改，询问用户功能是否真的完成。

### 2. 检查敏感文件

```bash
# 检查是否包含敏感文件
git diff --cached --name-only | grep -E '\.(env|cred|pem|key)$|credentials/|secrets/'
```

如果包含敏感文件，**停止提交**，提醒用户排除这些文件。

### 3. 添加文件

```bash
# 如果指定了文件
git add file1.md file2.js

# 如果未指定文件，添加所有修改
git add -A
```

### 4. 生成 Commit Message

```bash
# 格式：[feature-<id>] <描述>
# 例如：[feature-auth-001] 添加用户登录验证

COMMIT_MSG="[feature-${featureId}] ${description}"

# 如果有详细说明或测试状态
if [ -n "$details" ] || [ -n "$testStatus" ]; then
  COMMIT_MSG="${COMMIT_MSG}

## 修改内容
$(git diff --cached --stat)

## 测试状态
- ${testStatus:-未指定}
"
fi
```

### 5. 执行提交

```bash
git commit -m "$COMMIT_MSG"
```

### 6. 确认提交结果

```bash
git log -1 --oneline
```

## 完整示例

### 基本提交

```bash
# 功能：添加用户登录
featureId="auth-001"
description="添加用户登录验证"

# 检查状态
git status --porcelain

# 添加文件
git add -A

# 提交
git commit -m "[feature-auth-001] 添加用户登录验证"

# 确认
git log -1 --oneline
# 输出：abc123 [feature-auth-001] 添加用户登录验证
```

### 带详细信息的提交

```bash
featureId="api-002"
description="实现 REST API 端点"
testStatus="passed"
details="实现了 GET /users 和 POST /users 两个端点"

git add -A

git commit -m "[feature-api-002] 实现 REST API 端点

## 修改内容
 src/api/users.js | 45 +++++++++++++++++++++++++++++++++++++++++
 src/routes/index.js | 3 ++-

## 测试状态
- passed
"

git log -1 --oneline
```

### 指定文件提交

```bash
featureId="ui-003"
description="修复导航栏样式"
files=("src/components/Navbar.css" "src/components/Navbar.jsx")

git add "${files[@]}"
git commit -m "[feature-ui-003] 修复导航栏样式"
```

## 错误处理

### 没有修改

```bash
git status --porcelain
# 输出为空

# 处理：询问用户
echo "警告：没有待提交的修改。请确认功能是否已完成。"
```

### 合并冲突

```bash
git commit
# 错误：error: commit is not possible because you have unmerged files

# 处理：解决冲突
git status  # 查看冲突文件
# 手动解决冲突
git add <resolved-files>
git commit
```

### 敏感文件

```bash
# 检测到 .env 文件
echo "错误：检测到敏感文件 .env"
echo "请从暂存区移除：git reset HEAD .env"
git reset HEAD .env
```

## 返回

- 成功：返回提交 hash 和 commit message
- 失败：返回错误原因和建议操作

```
✅ 提交成功
Hash: abc123def456
Message: [feature-auth-001] 添加用户登录验证

文件统计:
 2 files changed, 45 insertions(+), 3 deletions(-)
```
