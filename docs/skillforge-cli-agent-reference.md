# SkillForge CLI 工具使用文档

> 面向其他 Agent 的调用手册。写清安装、环境、命令格式、输入输出、典型样例、错误处理和 OpenClaw hook 接入点。

---

## 1. 概述

SkillForge CLI 是本项目核心工具链的命令行入口，提供两类能力：

| 工具 | 功能 | 适用场景 |
|------|------|----------|
| `betterprompt` | 把原始 prompt 规范化为七区块模板 | 任务派发前优化 prompt |
| `betterplan` | 把计划文本结构化输出 task skeleton | 复杂任务分解为可执行骨架 |
| `skillforge-status` | 只读状态报告（注册/校验/阶段/门槛） | CI / 运行中心 / 健康检查 |

---

## 2. 安装

### 前置条件

- **Node.js ≥ 24**（当前环境：v24.15.0）
- **pnpm ≥ 10**
- 已配置 LLM API key（用于 betterplan 的 LLM 调用；betterprompt 本地评估不需要）

### 安装步骤

```bash
cd /home/yankeeting/.openclaw/projects/workflow-kit
pnpm install --frozen-lockfile
```

### 环境变量

| 变量名 | 用途 | 必填 |
|--------|------|------|
| `OPENAI_API_KEY` | LLM 调用（betterplan 需要） | betterplan 必填 |
| `Z_AI_API_KEY` | Kimi / vision-agent 备选 | 可选 |

---

## 3. 命令一览

```bash
# === 独立入口（推荐） ===
node scripts/skillforge-operate-betterprompt.mjs --prompt "..."
node scripts/skillforge-operate-betterplan.mjs --plan "..." [--goal-hint "..."]

# === 管道模式（stdin 输入） ===
echo "prompt" | node scripts/skillforge-operate-betterprompt.mjs
echo "plan" | node scripts/skillforge-operate-betterplan.mjs --goal-hint "..."

# === 状态报告 ===
node scripts/skillforge-status.mjs
```

---

## 4. betterprompt 详细说明

### 功能

接收原始 subagent 派发说明，输出 **七区块规范化模板**：

- `goal` / `boundaries` / `execution_skeleton` / `constraints` / `acceptance` / `delivery` / `output_requirements`

### 输入

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--prompt` | string | ✅ | 原始 prompt 文本 |
| `--goal-hint` | string | 可选 | 目标提示，如 "code review" |

### 输出格式

```jsonc
{
  "version": "betterprompt.v1",
  "contract": { "input": "...", "output": "seven-section-template" },
  "input": { "prompt": "...", "goal_hint": "..." },
  "output": {
    "sections": {
      "goal": "...",
      "boundaries": ["..."],
      "execution_skeleton": ["..."],
      "constraints": ["..."],
      "acceptance": ["..."],
      "delivery": ["..."],
      "output_requirements": ["..."]
    }
  },
  "qc": {
    "pass": true,
    "score": 100,
    "tags": ["ready-for-downstream"],
    "checks": [
      { "name": "seven_sections", "pass": true, "detail": "七区块完整" },
      { "name": "goal_present", "pass": true, "detail": "目标已规范化" }
    ]
  },
  "fallback": {
    "fallback_used": false,
    "fallback_reason": null
  },
  "package": {
    "package_id": "betterprompt-v1-...",
    "source_skill_ref": "default-general",
    "selected_skills": ["..."],
    "intent": { "goal": "...", "done_definition": ["..."] }
  }
}
```

### 典型调用

```bash
# 基础调用
node scripts/skillforge-operate-betterprompt.mjs --prompt "写 Python 脚本读 CSV 输出前 10 行"

# 带目标提示
node scripts/skillforge-operate-betterprompt.mjs --prompt "审查 auth 模块" --goal-hint "security audit"

# 从 stdin
echo "重构 user service 数据库层" | node scripts/skillforge-operate-betterprompt.mjs

# 保存结果
node scripts/skillforge-operate-betterprompt.mjs --prompt "..." > optimized.json
```

### 退出码

| 码 | 含义 |
|----|------|
| `0` | 成功（含 fallback） |
| `1` | 缺少必填参数或运行异常 |

### 错误处理

betterprompt **始终会返回结果**（即使输入很弱）。调用方应检查 `qc.pass` / `qc.score` 判断质量：
- `qc.pass === true` → 可用，可直接作为下游输入
- `fallback.fallback_used === true` → 降级处理，质量可能偏低
- `qc.tags` 不含 `"ready-for-downstream"` → 不建议直接用于生产派发

---

## 5. betterplan 详细说明

### 功能

通过 LLM 把自然语言计划文本结构化输出为 **可执行 task skeleton**（milestones + atomic tasks）。

### 输入

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--plan` | string | ✅ | 计划文本 |
| `--goal-hint` | string | 可选 | 目标提示 |

支持 **stdin 传入 plan**：
```bash
echo "你的计划" | node scripts/skillforge-operate-betterplan.mjs
cat plan_write.json | node scripts/skillforge-operate-betterplan.mjs --goal-hint "milestone"
```

### 输出格式

```jsonc
{
  "version": "betterplan.v1",
  "output": {
    "goal": "用户原始目标",
    "milestones": [
      {
        "title": "里程碑",
        "objective": "目标说明",
        "atomicTasks": [
          { "title": "任务名", "description": "描述", "outputs": ["产出"] }
        ]
      }
    ]
  },
  "meta": {
    "llmCalled": true,
    "llmDurationMs": 1234,
    "model": "deepseek/deepseek-v4-pro",
    "validationPassed": true,
    "fallbackUsed": false,
    "warnings": []
  }
}
```

### 典型调用

```bash
# 基础调用
node scripts/skillforge-operate-betterplan.mjs --plan "实现登录注册，含 JWT 和密码加密"

# 带 hint
node scripts/skillforge-operate-betterplan.mjs --plan "shared baseline 加 nightly" --goal-hint "CI pipeline"

# 从 stdin + 输出到文件
echo "搭建任务调度器" | node scripts/skillforge-operate-betterplan.mjs > skeleton.json
```

### 退出码

| 码 | 含义 |
|----|------|
| `0` | LLM 成功且验证通过 |
| `1` | 缺少 plan / LLM 失败 / fallback 触发 |

### 错误处理

```jsonc
// LLM 调用失败时
{ "error": "ALL_MODELS_FAILED", "meta": { "fallbackUsed": true } }
// 退出码 = 1
```

> ⚠️ LLM 超时/调用失败时 `fallbackUsed=true`，调用方应重试或记录失败。

---

## 6. OpenClaw Hook 接入方案

### 推荐 hook 点

```
OpenClaw 事件链
  │
  ├─ sessions_spawn 前
  │   └─ 调用 betterprompt 优化 task 文本
  │      输入：原始 task
  │      输出：七区块优化 prompt → 替换 task
  │
  ├─ agent_end 后
  │   └─ 调用 betterplan 提取下一步骨架
  │      输入：原始 plan + 执行结果摘要
  │      输出：task skeleton
  │
  └─ 定时（如 nightly）
      └─ 调用 skillforge-status 做健康检查
```

### 最小集成命令

```bash
# Hook 1：派发前优化 prompt
cd /home/yankeeting/.openclaw/projects/workflow-kit && \
node scripts/skillforge-operate-betterprompt.mjs --prompt "$TASK_TEXT" --goal-hint "$GOAL_HINT"

# Hook 2：完成后提取骨架
cd /home/yankeeting/.openclaw/projects/workflow-kit && \
echo "$PLAN_TEXT" | node scripts/skillforge-operate-betterplan.mjs --goal-hint "$GOAL_HINT"

# Hook 3：定期健康检查
cd /home/yankeeting/.openclaw/projects/workflow-kit && \
node scripts/skillforge-status.mjs
```

### 数据采集点

| hook 位置 | 采集数据 | 用途 |
|-----------|---------|------|
| `sessions_spawn` 前 | prompt 优化前后对比 | 评估规范化效果 |
| `agent_end` | skeleton vs 实际执行 | 评估计划准确性 |
| 定时 | status 输出 | 监控健康度 |

---

## 7. 快速参考卡

```bash
# 工作目录（所有命令的前提）
cd /home/yankeeting/.openclaw/projects/workflow-kit

# 优化派发 prompt（最常用）
node scripts/skillforge-operate-betterprompt.mjs --prompt "你的任务"

# 结构化计划（LLM 调用，需 API key）
node scripts/skillforge-operate-betterplan.mjs --plan "你的计划"

# 管道模式
echo "内容" | node scripts/skillforge-operate-betterprompt.mjs --goal-hint "hint"
echo "内容" | node scripts/skillforge-operate-betterplan.mjs --goal-hint "hint"

# 状态检查
node scripts/skillforge-status.mjs

# 检查退出码
echo $?  # 0=成功 1=失败
```
