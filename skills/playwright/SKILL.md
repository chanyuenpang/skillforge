---
name: playwright
slug: playwright
version: 1.0.0
homepage: https://clawic.com/skills/playwright
description: "浏览器自动化工具 | 通过 browseros-cli 调用浏览器工具完成导航、点击、表单填写、截图与数据提取。触发词：浏览器、自动化、截图、表单、测试。"
metadata:
  openclaw:
    emoji: "P"
    priority: high
    type: skill
    requires:
      bins: ["python3"]
    os: ["linux", "darwin", "win32"]
---

# Playwright - 浏览器自动化工具

## 何时使用

适用于真实浏览器任务：JS 渲染页面、多步骤表单、截图或 PDF、UI 调试、Playwright 测试编写，以及从渲染页面提取结构化数据。

当静态获取不足，或任务依赖于浏览器事件、可见 DOM 状态、认证上下文、上传或下载、用户面向的渲染时，优先使用此技能。

## 快速开始

### CLI 主入口（browseros-cli）
```bash
python3 -m browseros_cli --help
python3 -m browseros_cli tools list
```

优先通过 `browseros-cli` 发现可用浏览器工具，再用 tool call 方式执行具体页面操作。

### 常用浏览器 tool call

```bash
python3 -m browseros_cli call browser_navigate --args '{"url":"https://example.com"}'
python3 -m browseros_cli call browser_snapshot --args '{}'
python3 -m browseros_cli call browser_click --args '{"selector":"text=登录"}'
python3 -m browseros_cli call browser_type --args '{"selector":"input[name=account]","text":"demo"}'
```

> 说明：
> - 工具名与参数以 `python3 -m browseros_cli tools list` 的实际输出为准。
> - 若参数结构不确定，先查看该工具的参数说明，再执行 `call <tool> --args '<json>'`。
### 常见浏览器任务

| 目标 | 典型操作 |
|------|----------|
| 打开并检查网站 | 导航、等待、检查、截图 |
| 完成表单 | 导航、点击、填写、选择、提交 |
| 捕获证据 | 截图、PDF、下载、追踪 |
| 提取页面数据 | 导航、等待渲染、提取 |
| 复现 UI 问题 | 有头模式、追踪、控制台或网络检查 |

### 典型流程模板（CLI-only）
```bash
# 1) 导航
python3 -m browseros_cli call browser_navigate --args '{"url":"https://example.com"}'

# 2) 等待/检查页面状态（按实际工具能力选择）
python3 -m browseros_cli call browser_snapshot --args '{}'

# 3) 交互：点击、输入、选择
python3 -m browseros_cli call browser_click --args '{"selector":"text=Sign in"}'
python3 -m browseros_cli call browser_type --args '{"selector":"input[name=email]","text":"user@example.com"}'

# 4) 取证：截图或结构化提取
python3 -m browseros_cli call browser_screenshot --args '{"fullPage":true}'
python3 -m browseros_cli call browser_evaluate --args '{"expression":"document.title"}'
```

### 说明
- 本 skill 聚焦“通过 CLI 发起浏览器工具调用”来完成网页自动化。
- 若任务目标是维护仓库内已有 Playwright 测试代码，可在对应项目流程中单独执行测试命令；本 skill 不再把测试 runner 作为主入口。
## 方案选择

| 场景 | 最佳方案 | 原因 |
|------|----------|------|
| 静态 HTML 或简单 HTTP 响应足够 | 先使用更轻量的获取方式 | 更快、更便宜、更稳定 |
| 需要真实浏览器渲染与交互 | `browseros-cli` + `call <tool> --args '<json>'` | 统一入口，便于复用与审计 |
| 一次性浏览器自动化、截图、下载或渲染提取 | `browseros-cli` 工具调用链 | 命令清晰、步骤可回放 |
| 需要定位器验证与流程排查 | 先 `tools list` 明确可用能力，再逐步调用 | 降低参数猜测和无效调用 |
| 仓库已有 E2E 体系且目标是改测试代码 | 跟随仓库既有测试流程 | 避免在 skill 中引入额外入口分叉 |

## 核心规则

### 1. 测试用户可见行为
- 不要用 Playwright 测试单元测试或 API 测试可以更便宜覆盖的实现细节
- 当成功依赖于渲染 UI、可操作性、认证、上传/下载、导航或浏览器专属行为时使用 Playwright

### 2. 保持运行隔离
- 保持测试和脚本独立，以便重试、并行和重新运行不会继承隐藏状态
- 在从头创建新的测试结构之前，先扩展仓库现有的 Playwright 配置和 fixtures

### 3. 先侦察后行动
- 在锁定选择器或断言之前，打开、等待并检查渲染状态
- 使用 `codegen`、有头模式或追踪来发现稳定的定位器

### 4. 优先使用弹性定位器
- 在 CSS 或 XPath 之前使用 role、label、text、alt text、title 或 test ID
- 使用 Playwright 断言来断言用户可见的结果

### 5. 等待可操作性和应用状态
- 让 Playwright 的可操作性检查为你工作，而不是使用任意等待
- 优先使用 `expect`、URL 等待、响应等待和明确的应用就绪信号

### 6. 控制你不拥有的
- 每当目标是验证你的应用时，模拟或隔离第三方服务
- 对于渲染提取，在驱动完整浏览器之前优先使用文档化的 API 或普通 HTTP 路径

### 7. 保持认证和生产访问明确
- 默认不持久化保存的浏览器状态
- 仅当仓库已标准化或用户明确要求会话重用时才重用认证状态

## 常见陷阱

- 从源码猜测选择器或使用 `first()`、`last()`、`nth()` 来消除歧义 → 自动化一次成功后就失败
- 在仓库已有配置时创建新的 Playwright 结构 → 新流程与现有框架冲突
- 测试内部实现细节而非可见结果 → 套件通过但用户路径仍损坏
- 在修改服务端数据的并行测试中共享一个认证状态 → 失败变得顺序依赖且难以信任
- 在理解覆盖层、禁用状态或可操作性之前使用 `force: true` → 测试隐藏了真正的 bug
- 对频繁通信的 SPA 等待 `networkidle` → 分析、轮询或套接字使页面保持"忙碌"
- 当 HTTP 或 API 可以回答问题时驱动完整浏览器 → 更多成本、更多不稳定、更少信号

## 安全与隐私

**离开机器的数据**：
- 发送到用户要求自动化的网站的请求
- 安装 Playwright 工具时可选的 npm 包安装流量

**保留在本地的数据**：
- 源代码、追踪、截图、视频、PDF 和临时浏览器状态

## 相关 Skill

- `explorer-agent` - 网页探索和信息收集
- `multi-search-engine` - 多搜索引擎搜索
