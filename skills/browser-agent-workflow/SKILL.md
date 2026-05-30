---
name: browser-agent-workflow
version: 1.2.0
description: "浏览器/DOM/页面操作统一入口。所有浏览器自动化与页面分析任务一律通过 browseros-cli 执行。"
metadata:
  openclaw:
    emoji: "🦞"
    priority: high
    type: skill
    requires:
      bins: ["python3"]
---

# browser-agent-workflow

BrowserOS CLI 统一入口工作流（纯 CLI 流程）

## 适用场景
当任务涉及浏览器、DOM、页面交互或页面信息提取时，优先使用本技能，包括：
- 打开网页与页面导航
- DOM/页面结构观察、元素定位、状态确认
- 点击、输入、抓取、截图、脚本评估等页面动作
- 健康检查、连通性诊断与失败排查

本技能是浏览器能力的**统一入口/总规范**：
- 只面向 `browseros-cli`
- 不提供 BrowserOSMCP/MCP 直连路径
- 不并行维护“同功能多入口”指令集

---

## 核心原则
1. **CLI 唯一入口**：所有浏览器/DOM/页面动作都通过 `browseros-cli`。
2. **先探活再操作**：先确认 CLI 与服务可用，再进入页面交互。
3. **先观测后动作**：先读状态，再做点击/输入/抓取，避免盲操作。
4. **小步验证**：每次动作后都要立刻检查结果。
5. **失败留证据**：保留命令、输出、错误信息与关键页面结果。
6. **禁止重复造轮子**：新需求优先在本 skill 扩展，不新增同层泛化 skill。

---

## 标准执行流程（browseros-cli）

### 1) 明确任务目标
执行前先确认：
- 目标网页或入口 URL
- 要完成的动作
- 成功判据
- 需要返回的结果（文本、截图、文件、链接等）

### 2) 检查 CLI 是否可用
优先跑这些命令：
- `python3 -m browseros_cli --help`
- `python3 -m browseros_cli doctor`
- `python3 -m browseros_cli health`
- `python3 -m browseros_cli ping`

用途：
- `--help`：确认当前版本可用命令
- `doctor`：做环境诊断
- `health`：检查服务健康状态
- `ping`：验证基础连通性

### 3) 先看可用工具
在真正操作页面前，先看当前版本支持哪些工具：
- `python3 -m browseros_cli tools list`

如果需要结构化输出，优先加：
- `python3 -m browseros_cli --json tools list`

### 4) 执行浏览器动作
统一通过工具调用来做实际动作：
- `python3 -m browseros_cli call <tool_name> --args '<json>'`

执行方式要求：
- 先确认工具名和参数
- 参数必须是合法 JSON
- 一次只做一个清晰动作
- 动作后立刻检查返回结果

### 5) 结果验证
每步执行后至少验证一项：
- 返回结果是否成功
- 页面标题、URL、关键文本是否符合预期
- 截图或导出文件是否真实落地
- 工具输出中的状态字段、错误字段是否正常

### 6) 汇总交付
完成后返回：
- 完成状态
- 关键结果
- 执行过的关键命令
- 证据或输出摘要
- 如果失败，说明失败点与下一步建议

---

## CLI 常用命令

### 查看帮助
```bash
python3 -m browseros_cli --help
```
适用：第一次使用、确认当前版本支持哪些命令。

### 环境诊断
```bash
python3 -m browseros_cli doctor
```
适用：怀疑本地环境、依赖或服务状态异常时。

### 健康检查
```bash
python3 -m browseros_cli health
```
适用：确认浏览器服务是否处于可用状态。

### 连通性验证
```bash
python3 -m browseros_cli ping
```
适用：做最小连通性探活。

### 查看工具列表
```bash
python3 -m browseros_cli tools list
```
或
```bash
python3 -m browseros_cli --json tools list
```
适用：确认当前能调用哪些浏览器工具。

### 调用具体工具
```bash
python3 -m browseros_cli call <tool_name> --args '{"key":"value"}'
```
适用：执行任意浏览器动作，是默认的实际操作入口。

---

## 命令使用约定
- 文档、回复、执行记录里，优先使用 `python3 -m browseros_cli ...` 形式。
- 如果本机 PATH 已配置好，也可以使用 `browseros-cli ...`。
- 默认优先 `--json`，便于结构化读取与复核。
- 参数中的 JSON 必须完整、可直接复现。
- 遇到复杂动作时，拆成多次 `call`，不要一条命令塞太多步骤。

---

## 排障手册（CLI 视角）

### 问题 1：命令不可用或帮助打不开
处理顺序：
1. 运行 `python3 -m browseros_cli --help`
2. 检查 `browseros-cli` 是否在 PATH 中
3. 确认当前 Python 环境中包已安装
4. 必要时重新安装或切回可用环境

### 问题 2：health / ping 失败
处理顺序：
1. 先跑 `python3 -m browseros_cli doctor`
2. 再跑 `python3 -m browseros_cli health`
3. 再跑 `python3 -m browseros_cli ping`
4. 根据报错决定是环境问题、服务问题还是参数问题

### 问题 3：找不到可用工具
处理顺序：
1. 跑 `python3 -m browseros_cli tools list`
2. 确认目标工具名是否真实存在
3. 确认当前版本是否只提供骨架命令或部分能力
4. 不要猜工具名，按实际输出为准

### 问题 4：call 执行失败
处理顺序：
1. 检查工具名拼写
2. 检查 `--args` JSON 是否合法
3. 缩小动作范围，先做最小调用
4. 保留原始报错，不要吞错

### 问题 5：流程偶发失败
处理顺序：
1. 开启 `--json` 观察结构化结果
2. 将大动作拆成多个小调用
3. 每步都做结果确认
4. 只对可恢复错误重试

---

## 示例流程（抽象模板）

### 示例 A：先探活再执行动作
1. `python3 -m browseros_cli --help`
2. `python3 -m browseros_cli health`
3. `python3 -m browseros_cli tools list`
4. `python3 -m browseros_cli call <tool_name> --args '<json>'`
5. 检查输出结果并决定下一步

### 示例 B：排查一次失败调用
1. `python3 -m browseros_cli doctor`
2. `python3 -m browseros_cli ping`
3. `python3 -m browseros_cli tools list`
4. 用更小的参数重新执行 `call`
5. 汇总错误信息与修复建议

---

## 输出规范
执行完成后的汇报应包含：
- 完成状态：成功 / 部分成功 / 失败
- 关键命令：实际执行了哪些 CLI 命令
- 关键结果：字段、文件、链接、截图、文本摘要
- 异常与处理：发生了什么、如何定位、如何恢复
- 若失败：下一步最小可执行建议

---

## 边界与限制
- 遇到验证码、短信、人机校验等需要人工介入的步骤：暂停并明确提出介入点。
- 涉及高风险动作（删除、批量提交、权限变更）：执行前必须再次核对目标。
- 不对外泄露账号、Cookie、令牌、个人敏感信息。
- 如果当前 CLI 尚未提供某类高阶封装命令，就使用 `tools list` + `call` 作为默认路径，不要凭空发明不存在的命令。

---

## 与其他 Skills 的关系（统一入口约束）
- 本 skill 是浏览器任务入口；`playwright`、`scraper-agent-workflow`、`crawler-optimizer` 等涉及页面分析/DOM/交互时，执行层统一遵循本规范。
- 其他 skill 可描述业务流程，但浏览器执行命令应复用本 skill 的约定（`tools list` + `call`）。
- 发现命令风格分叉时，优先收敛到本 skill，而非新增平行入口文档。

## 当前最小可用能力
当前 skill 依赖的最小可用命令集：
1. `doctor`
2. `health`
3. `ping`
4. `tools list`
5. `call`

如果后续补齐更高层的页面、标签页、窗口或动作封装命令，再把流程进一步细化到专门子命令。当前版本先以 **`tools list` + `call`** 作为标准工作路径。