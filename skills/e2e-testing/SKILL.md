---
name: e2e-testing
slug: e2e-testing
version: 1.0.0
description: "E2E 端到端测试规范 | 指导 Agent 在功能完成后进行端到端测试验证，确保功能真正可用。触发词：e2e、端到端测试、功能验证、测试用例。"
metadata:
  openclaw:
    emoji: "E2E"
    priority: high
    type: skill
    requires:
      bins: ["bash", "jq"]
    os: ["linux", "darwin"]
---

# E2E 端到端测试规范

## 何时使用

在完成任何功能实现后，必须遵循此技能进行端到端测试验证。仅做单元测试或 curl 验证是不够的，必须通过 E2E 测试确保功能在真实场景下可用。

## 核心规则

### 1. 功能实现后必须创建 E2E 测试用例

每个功能完成后，必须创建对应的 E2E 测试用例文件：

```bash
# 测试文件位置
/home/yankeeting/.openclaw/workspace/e2e-tests/{feature_id}_e2e.json

# 例如
/home/yankeeting/.openclaw/workspace/e2e-tests/feature_001_e2e.json
```

测试用例模板参考：
```json
{
  "featureId": "feat-XXX",
  "name": "功能名称",
  "description": "测试描述",
  "preconditions": [...],
  "steps": [...],
  "verifications": [...],
  "cleanup": [...]
}
```

### 2. 必须运行 E2E 测试并确认通过

在将功能标记为 `passes: true` 之前，必须运行 E2E 测试并确认通过：

```bash
# 运行指定功能的 E2E 测试
/home/yankeeting/.openclaw/workspace/scripts/run-e2e-tests.sh --feature feat-001

# 运行所有 E2E 测试
/home/yankeeting/.openclaw/workspace/scripts/run-e2e-tests.sh --all

# 列出所有可用的测试
/home/yankeeting/.openclaw/workspace/scripts/run-e2e-tests.sh --list
```

### 3. 测试失败时必须先修复问题

**绝对不允许跳过失败的测试**。如果测试失败：

1. 分析失败原因
2. 修复功能代码或测试用例
3. 重新运行测试
4. 确认通过后才能标记为完成

### 4. 测试应像真实用户一样验证功能

E2E 测试不仅仅是 API 调用，应该：

- **模拟真实用户操作**：点击按钮、填写表单、上传文件
- **验证 UI 状态**：检查元素可见性、文本内容、样式变化
- **验证端到端流程**：从用户输入到系统响应的完整链路
- **验证副作用**：数据库变化、文件创建、消息发送等

## 测试用例结构

### 前置条件 (preconditions)

确保测试环境就绪：

```json
{
  "preconditions": [
    {"check": "service_running", "service": "web-server"},
    {"check": "feature_exists", "featureId": "feat-XXX"},
    {"check": "test_file_exists", "path": "/tmp/test-file.txt"}
  ]
}
```

### 测试步骤 (steps)

定义具体的用户操作：

```json
{
  "steps": [
    {
      "step": 1,
      "action": "访问登录页面",
      "tool": "browser",
      "command": "navigate to http://localhost:3000/login",
      "timeout": 10,
      "expected": "页面加载成功，显示登录表单"
    },
    {
      "step": 2,
      "action": "输入用户名",
      "tool": "browser",
      "command": "type username input with 'testuser'",
      "timeout": 5,
      "expected": "用户名显示在输入框中"
    }
  ]
}
```

### 验证点 (verifications)

定义通过标准：

```json
{
  "verifications": [
    {
      "check": "element_visible",
      "target": "welcome-message",
      "expected": "true",
      "description": "验证欢迎消息可见"
    },
    {
      "check": "api_response_status",
      "target": "POST /api/login",
      "expected": "200",
      "description": "验证登录 API 返回 200"
    }
  ]
}
```

### 清理 (cleanup)

测试完成后恢复环境：

```json
{
  "cleanup": [
    "删除测试用户",
    "清理会话数据",
    "重置测试状态"
  ]
}
```

## 测试工具类型

| 工具类型 | 用途 | 示例场景 |
|---------|------|---------|
| `bash` | 执行 shell 命令 | 检查文件、运行脚本 |
| `browser` | 浏览器自动化 | UI 测试、表单填写、点击操作 |
| `api` | API 调用 | REST API 验证、响应检查 |

## 验证类型

| 验证类型 | 说明 |
|---------|------|
| `element_visible` | 验证 UI 元素可见 |
| `element_text` | 验证元素文本内容 |
| `api_response_status` | 验证 API 响应状态码 |
| `api_response_contains` | 验证 API 响应包含特定内容 |
| `file_exists` | 验证文件存在 |
| `database_contains` | 验证数据库包含特定记录 |

## 工作流程

```
功能实现完成
    ↓
创建 E2E 测试用例
    ↓
运行 E2E 测试
    ↓
测试通过？
    ↓ 否
修复问题 → 重新测试
    ↓ 是
标记功能 passes: true
```

## 最佳实践

### 1. 测试独立性
- 每个测试用例应该独立运行
- 不要在测试之间共享状态
- 使用清理步骤恢复环境

### 2. 明确的验证点
- 每个测试应该有明确的通过标准
- 验证用户可见的结果，而非实现细节
- 包含负面测试场景

### 3. 合理的超时设置
- 根据操作复杂度设置超时时间
- 网络操作：10-30 秒
- UI 操作：5-15 秒
- 简单命令：5 秒

### 4. 详细的描述
- 每个步骤和验证点都要有清晰的描述
- 便于理解测试意图
- 失败时快速定位问题

## 示例：完整的 E2E 测试流程

```bash
# 1. 功能实现完成后，创建测试用例
cat > /home/yankeeting/.openclaw/workspace/e2e-tests/feature_002_e2e.json << 'EOF'
{
  "featureId": "feat-002",
  "name": "用户注册功能 E2E 测试",
  "description": "验证新用户可以成功注册账户",
  "preconditions": [
    {"check": "service_running", "service": "web-server"}
  ],
  "steps": [
    {
      "step": 1,
      "action": "访问注册页面",
      "tool": "browser",
      "command": "navigate to http://localhost:3000/register",
      "timeout": 10,
      "expected": "显示注册表单"
    },
    {
      "step": 2,
      "action": "填写注册信息",
      "tool": "browser",
      "command": "fill form with test data",
      "timeout": 10,
      "expected": "表单填写完成"
    },
    {
      "step": 3,
      "action": "提交注册",
      "tool": "browser",
      "command": "click submit button",
      "timeout": 15,
      "expected": "显示注册成功消息"
    }
  ],
  "verifications": [
    {
      "check": "element_visible",
      "target": "success-message",
      "expected": "true",
      "description": "验证成功消息可见"
    },
    {
      "check": "api_response_status",
      "target": "POST /api/register",
      "expected": "201",
      "description": "验证注册 API 返回 201"
    }
  ],
  "cleanup": [
    "删除测试用户",
    "清理浏览器会话"
  ]
}
EOF

# 2. 运行测试
/home/yankeeting/.openclaw/workspace/scripts/run-e2e-tests.sh --feature feat-002

# 3. 确认通过后，标记功能完成
# 在功能规范中设置: passes: true
```

## 相关资源

- 测试模板：`/home/yankeeting/.openclaw/workspace/e2e-tests/templates/test-template.json`
- 示例测试：`/home/yankeeting/.openclaw/workspace/e2e-tests/feature_001_e2e.json`
- 测试脚本：`/home/yankeeting/.openclaw/workspace/scripts/run-e2e-tests.sh`
- Playwright 技能：`/home/yankeeting/.openclaw/workspace/skills/playwright/SKILL.md`
