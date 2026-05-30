# auto_revert

功能测试失败时回滚到已知良好状态。

## 使用时机

当功能测试失败且无法快速修复时，使用此工具回滚到上一个稳定状态。

## 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| reason | 是 | 回滚原因，记录到 progress.txt |
| commits | 否 | 回滚的提交数量，默认 1 |
| method | 否 | 回滚方式：`revert`（默认）或 `reset` |
| stashChanges | 否 | 是否先 stash 未提交修改，默认 true |

## 回滚方式对比

| 方式 | 命令 | 特点 | 适用场景 |
|------|------|------|----------|
| revert | `git revert` | 创建新提交，保留历史 | 已推送到远程的提交 |
| reset | `git reset --hard` | 删除提交，不保留历史 | 仅本地提交，确认要删除 |

## 执行步骤

### 1. 记录回滚原因

```bash
# 记录到 progress.txt
echo "## 回滚记录 - $(date '+%Y-%m-%d %H:%M:%S')" >> progress.txt
echo "原因: $reason" >> progress.txt
echo "回滚方式: ${method:-revert}" >> progress.txt
echo "回滚提交数: ${commits:-1}" >> progress.txt
echo "" >> progress.txt
```

### 2. 检查当前状态

```bash
git status --porcelain
```

### 3. 保存未提交修改（如果有）

```bash
if [ -n "$(git status --porcelain)" ] && [ "$stashChanges" = "true" ]; then
  git stash push -m "WIP: 回滚前保存 - $(date '+%Y%m%d%H%M%S')"
  echo "已保存未提交修改到 stash"
fi
```

### 4. 执行回滚

#### 方式 A：git revert（推荐）

```bash
# 回滚最近 1 个提交
git revert --no-edit HEAD

# 回滚多个提交
git revert --no-edit HEAD~3..HEAD
```

#### 方式 B：git reset（谨慎使用）

```bash
# 回滚到上一个提交（丢弃最近 1 个提交）
git reset --hard HEAD~1

# 回滚多个提交
git reset --hard HEAD~3
```

### 5. 确认回滚结果

```bash
# 查看当前状态
git status

# 查看最近提交
git log --oneline -5
```

## 完整示例

### 基本 revert 回滚

```bash
# 场景：登录功能测试失败
reason="登录验证逻辑错误，需要重新实现"
commits=1
method="revert"

# 1. 记录原因
echo "## 回滚记录 - $(date '+%Y-%m-%d %H:%M:%S')" >> progress.txt
echo "原因: 登录验证逻辑错误，需要重新实现" >> progress.txt

# 2. 检查状态
git status --porcelain

# 3. 保存未提交修改
git stash push -m "WIP: 回滚前保存"

# 4. 回滚
git revert --no-edit HEAD

# 5. 确认
git log --oneline -3
# 输出：
# abc123 [feature-auth-001] Revert "添加用户登录验证"
# def456 [feature-auth-000] 初始认证模块
```

### 多提交回滚

```bash
# 场景：最近 3 个提交都有问题
reason="API 重构方案不可行，需要回退"
commits=3
method="revert"

# 回滚多个提交（从旧到新）
git revert --no-edit HEAD~3 HEAD~2 HEAD~1

# 或者使用范围
git revert --no-edit HEAD~3..HEAD
```

### reset 方式（仅本地）

```bash
# 场景：本地实验性代码不成功
reason="实验性重构失败"
method="reset"

# 1. 记录
echo "## 回滚记录 - $(date)" >> progress.txt
echo "原因: 实验性重构失败" >> progress.txt
echo "方式: reset（硬回滚）" >> progress.txt

# 2. 确认没有推送
git log origin/main..HEAD --oneline
# 如果有输出，说明有未推送提交

# 3. 回滚
git reset --hard HEAD~1

# 4. 确认
git log --oneline -3
```

## 错误处理

### Revert 冲突

```bash
git revert HEAD
# 错误：CONFLICT (content): Merge conflict in src/auth.js

# 选项 1：解决冲突后继续
git status  # 查看冲突文件
# 手动解决冲突
git add .
git revert --continue

# 选项 2：放弃 revert
git revert --abort
```

### Stash 恢复

```bash
# 回滚完成后，恢复之前保存的修改
git stash list
git stash pop

# 如果有冲突
git stash pop
# 解决冲突后
git add .
```

### 无法回滚

```bash
# 没有提交历史
git revert HEAD
# 错误：fatal: empty commit set passed

# 处理：检查是否有提交
git log --oneline
```

## 回滚后操作

回滚成功后，建议：

1. **分析根因**
   ```
   为什么测试失败？
   - 设计问题？
   - 实现问题？
   - 测试环境问题？
   ```

2. **更新计划**
   ```
   记录到 progress.txt：
   - 失败原因
   - 教训总结
   - 修正计划
   ```

3. **重新开始**
   ```bash
   # 确认状态干净
   git status
   
   # 开始新功能（新 feature ID）
   # feature-auth-002
   ```

## 返回

- 成功：返回回滚后的状态和最近提交
- 失败：返回错误原因和解决建议

```
✅ 回滚成功

回滚信息:
- 方式: revert
- 提交数: 1
- 已保存未提交修改: 是 (stash: stash@{0})

当前状态:
- 分支: main
- 状态: 干净
- 最近提交: def456 [feature-auth-000] 初始认证模块

下一步建议:
1. 分析失败原因
2. 制定修正计划
3. 开始新功能开发
```
