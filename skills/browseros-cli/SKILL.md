---
name: browseros-cli
version: 1.0.0
description: "BrowserOS CLI 的极简机制说明：它是什么、如何工作、最小命令面与分工边界。"
metadata:
  openclaw:
    emoji: "🦞"
    priority: medium
    type: skill
---

# browseros-cli

## 它是什么
`browseros-cli` 是浏览器能力的 **统一命令行入口**：
- 对上提供稳定的浏览器命令面（查能力、诊断、页面操作、工具调用）
- 对下封装 BrowserOS 的驱动/会话/通信细节

它讲的是「CLI 怎么直接用」，不是完整浏览器任务流程。

## 它如何工作（3-5 条）
1. **直接执行 CLI**：默认直接用 `browseros-cli ...`，不需要额外包一层 `python3 -m ...`。  
2. **先诊断、再探活、再动作**：遇到浏览器不可用时，先跑 `doctor` / `health`，不要盲目直接开页面。  
3. **命令面就是主入口**：页面、工具、标签页、窗口、history、bookmark 都通过统一 CLI 子命令完成。  
4. **工具调用仍是核心路径之一**：可以先 `tools` 看能力，再用 `call` 或更高层的 `page/tab/window/action` 命令做实际操作。  
5. **统一输出观测**：成功/失败都给统一结构；机器消费时优先加 `--json`。

## 最小命令面（只放关键）
```bash
browseros-cli --help
browseros-cli doctor
browseros-cli health
browseros-cli tools list
browseros-cli call <tool_name> --args '{"key":"value"}'
```

### 现场验证结论
已现场验证：
- `browseros-cli --help` 可直接执行并正常输出命令帮助
- `browseros-cli doctor` 当前返回 `no_ready_endpoint`
- `browseros-cli health` 需要在有可用 endpoint 时再检查

这说明：
- **CLI 入口本身是通的**
- 当前问题更可能是 **BrowserOS 服务端/endpoint 没 ready**，不是“必须用 Python 模块形式才能运行”

> 默认建议优先 `browseros-cli ...` 形式；需要机器读取时加 `--json`。

## 何时转去 browser-agent-workflow
以下情况直接切到 `browser-agent-workflow`：
- 你要执行完整网页任务（导航、定位、点击、输入、抓取、截图）
- 你需要标准化步骤（先探活、先观测、逐步验证、失败留证据）
- 你在做端到端浏览器自动化交付，而不是仅理解 CLI 机制

一句话分工：
- **browseros-cli**：解释 CLI 怎么运作、最小怎么用。  
- **browser-agent-workflow**：指导浏览器任务怎么落地执行。
