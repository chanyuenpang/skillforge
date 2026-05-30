---
name: git-discipline
version: 1.0.0
description: "Git 纪律管理 | 强制 Agent 遵循 Git 最佳实践：功能完成后自动提交、失败时回滚、会话结束时无未提交修改。触发词：git、commit、回滚、提交。"
metadata:
  openclaw:
    emoji: "🔐"
    priority: critical
    type: skill
---

# Git Discipline Skill

## 核心理念

**Git 纪律是长期运行 Agent 成功的关键。**

基于 Anthropic 的长期运行 Agent 最佳实践，Agent 应该：
1. 每完成一个功能后自动提交 Git commit
2. 代码出问题时支持回滚到已知良好状态
3. 会话结束时确保工作区干净

---

## 强制纪律规则

### 规则 1：功能完成即提交

> **每完成一个功能，必须立即执行 git commit。不允许在多个功能完成后才批量提交。**

```
✅ 正确做法：
实现功能 A → 测试通过 → git commit
实现功能 B → 测试通过 → git commit
实现功能 C → 测试通过 → git commit

❌ 错误做法：
实现功能 A → 实现功能 B → 实现功能 C → git commit
```

### 规则 2：Commit Message 必须包含功能 ID

> **Commit message 必须包含功能 ID。格式：`[feature-<id>] <描述>`**

```
✅ 正确格式：
git commit -m "[feature-auth-001] 添加用户登录验证"
git commit -m "[feature-api-002] 实现 REST API 端点"
git commit -m "[feature-ui-003] 修复导航栏样式问题"

❌ 错误格式：
git commit -m "添加登录"
git commit -m "fix: 修复问题"
```

### 规则 3：新功能前确认状态干净

> **在开始新功能之前，必须确认 git status 是干净的（无未提交修改）。**

```
开始新功能前：
1. git status → 检查是否干净
2. 如果不干净 → 先提交或 stash
3. 确认干净后 → 开始新功能
```

### 规则 4：测试失败优先回滚

> **如果功能测试失败，优先使用 git revert 回滚到上一个已知良好状态。**

```
功能测试失败时：
1. 记录失败原因到 progress.txt
2. git revert 回滚最近的提交
3. 分析问题，重新实现
```

### 规则 5：会话结束无遗留

> **每个会话结束时，不允许留下未提交的修改。要么 commit，要么 stash。**

```
会话结束前检查：
git status → 有修改？
├── 有 → 是否值得保留？
│   ├── 是 → git commit
│   └── 否 → git stash 或 git checkout -- .
└── 无 → 完成
```

---

## 可用工具

| 工具 | 用途 | 文档 |
|------|------|------|
| `auto_commit` | 功能完成后自动提交 | [tools/auto_commit.md](tools/auto_commit.md) |
| `auto_revert` | 功能测试失败时回滚 | [tools/auto_revert.md](tools/auto_revert.md) |
| `git_status_summary` | 生成 Git 状态摘要 | [tools/git_status_summary.md](tools/git_status_summary.md) |

---

## 工作流程

### 标准功能开发流程

```
1. 开始功能前
   └─→ 调用 git_status_summary 确认状态干净
   └─→ 如果不干净，处理未提交修改

2. 实现功能
   └─→ 编写代码
   └─→ 测试功能

3. 功能完成
   └─→ 测试通过 → 调用 auto_commit 提交
   └─→ 测试失败 → 调用 auto_revert 回滚

4. 继续下一个功能
   └─→ 回到步骤 1
```

### 紧急回滚流程

```
发现问题：
1. 记录问题到 progress.txt
2. 调用 auto_revert
3. 分析根因
4. 制定修复计划
```

---

## Commit Message 详细规范

### 格式模板

```
[feature-<功能ID>] <简短描述>

# 可选的详细说明
## 修改内容
- 文件1: 修改说明
- 文件2: 修改说明

## 测试状态
- 单元测试: 通过/失败/跳过
- 集成测试: 通过/失败/跳过
```

### 功能 ID 命名规范

| 类型 | 前缀 | 示例 |
|------|------|------|
| 新功能 | feature | feature-auth-001 |
| Bug 修复 | fix | fix-login-002 |
| 重构 | refactor | refactor-api-003 |
| 文档 | docs | docs-readme-004 |
| 测试 | test | test-unit-005 |

---

## 与其他技能的集成

### 与 orchestrator-constraint 配合

当使用 orchestrator-constraint 委派任务时，Subagent 完成任务后应自动提交：

```
sessions_spawn({
  task: "实现用户登录功能，完成后使用 auto_commit 提交，功能ID: feature-auth-001",
  agentId: "executor"
})
```

### 与 task-status-tracker 配合

长任务完成时，先更新状态，再提交：

```
1. update-progress({ taskId, progress: 100, status: "completed" })
2. auto_commit({ featureId: "...", description: "..." })
```

---

## 错误处理

### 无法提交时

```
git commit 失败：
├── 合并冲突 → 解决冲突后重新提交
├── 没有修改 → 确认功能是否真的完成
└── 权限问题 → 检查仓库权限配置
```

### 无法回滚时

```
git revert 失败：
├── 有未提交修改 → 先 stash，再 revert
├── 合并冲突 → 手动解决或使用 git reset --hard
└── 没有历史 → 确认是否是初始提交
```

---

## 安全检查

在执行 Git 操作前，检查以下安全规则：

| 检查项 | 规则 |
|--------|------|
| 敏感文件 | 不要提交 .env、credentials、密钥文件 |
| 大文件 | 确认是否应该使用 Git LFS |
| 分支保护 | 不要 force push 到 main/master |
| 子模块 | 确认子模块状态 |

---

## 快速参考

```bash
# 检查状态
git status

# 快速提交
git add -A && git commit -m "[feature-xxx] 描述"

# 回滚最近提交
git revert HEAD

# 保存未完成工作
git stash push -m "WIP: 功能描述"

# 恢复保存的工作
git stash pop
```
