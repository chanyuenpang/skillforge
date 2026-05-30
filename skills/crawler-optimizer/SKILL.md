---
name: crawler-optimizer
version: 1.0.0
description: "爬虫规则优化器。分析连续失败的规则，尝试策略降级/升级，调整反爬参数；页面分析与验证通过 browseros-cli 执行。"
metadata:
  openclaw:
    emoji: "🔧"
    priority: "normal"
    triggers: ["优化爬虫规则", "crawler-optimizer", "规则优化"]
---

# 爬虫规则优化器

## 概述

这是 Stage 4 的独立 Skill，负责分析和优化爬虫规则。

**核心职责**：
1. 分析连续失败的规则，尝试策略降级
2. 分析稳定的 description 规则，尝试策略升级
3. 调整反爬参数（超时、等待时间、UA）
4. 标记需要人工审查的 URL

## 触发时机

- 每日抓取完成后由主 Agent 调用
- 用户手动请求："优化爬虫规则"

## 项目位置

```
~/.openclaw/workspace/projects/daily-news-crawler/
├── config/
│   ├── urls.json          # URL 状态（包含 consecutiveFailures）
│   └── rules/             # Per-URL 规则文件
└── output/
    └── {date}/
        └── 日报.md        # 包含失败信息和 Agent 分析
```

---

## 渐进式规则进化

规则从"粗糙但灵活"进化为"精确但脆弱"，失效时自动降级：

```
Level 0: 无规则 → subagent 冷启动分析
    ↓
Level 1: description 策略 → agent 解释执行（灵活但慢）
    ↓
Level 2: anchor 策略 → 半结构化（较稳定）
    ↓
Level 3: css/xpath 策略 → 精确选择器（快速但脆弱）
    ↓ 网站改版导致失败
回退到 Level 1 或 Level 0，重新进化
```

---

## 优化工作流程

```
读取 urls.json 获取每个 URL 的状态
    ↓
对每个 URL:
├── 连续失败 >= 3 次
│   ├─ 当前策略 css → 尝试降级为 anchor
│   ├─ 当前策略 anchor → 尝试降级为 description
│   ├─ 当前策略 description → 删除规则文件，标记需冷启动
│   └─ 调整反爬参数（增加等待时间、换 UA）
│
├── 连续成功 >= 5 次 且 策略 description
│   └─ 尝试升级为 anchor 或 css
│
└── 其他情况
    └─ 保持现状
```

---

## 优化策略表

| 场景 | 优化动作 |
|------|---------|
| 首次分析，有明确 class | 生成 css 策略 |
| 首次分析，有栏目标题 | 生成 anchor 策略（更稳定） |
| css 失效 | 尝试用 anchor 替代 |
| anchor 失效（标题文本变了） | 通过 browseros-cli 重新抓样本与 DOM 后，尝试 xpath 层级 |
| 全部失效 | 用 semantic 兜底 + 标记重新分析 |
| 反爬拦截 | 调整 antiCrawl 参数 |
| 超时 | 增加 timeout + waitAfterLoad |
| 连续失败 >= 3 次 | 标记需要人工审查 |

> 页面分析、抓样本、DOM 检查、规则验证改为通过 **browseros-cli** 执行，不再使用旧 BrowserOSMCP / MCP 直连入口。

---

## 执行指令

**Subagent Prompt**:
```
你是爬虫规则优化专家。请执行以下任务:

0. 先确认 browseros-cli 可用
   - python3 -m browseros_cli --help
   - python3 -m browseros_cli tools list

1. 读取 ~/.openclaw/workspace/projects/daily-news-crawler/config/urls.json
   获取每个 URL 的 consecutiveFailures 状态

2. 读取 ~/.openclaw/workspace/projects/daily-news-crawler/config/rules/*.json
   获取每个 URL 的当前策略

3. 对每个需要优化的 URL:
   a. 连续失败 >= 3 次:
      - 如果策略是 css，尝试降级为 anchor
      - 如果策略是 anchor，尝试降级为 description
      - 如果策略是 description，删除规则文件（下次冷启动）
      - 增加 antiCrawl.waitAfterLoad（+1000ms）
      - 需要页面分析、抓样本、DOM 检查或规则验证时，通过 browseros-cli 执行
        例如：python3 -m browseros_cli call <tool> --args '<json>'
   
   b. 连续成功 >= 5 次且策略是 description:
      - 分析日报中的 Agent 分析结果
      - 需要页面结构复核时，通过 browseros-cli 执行页面分析与验证
      - 如果有明确的锚点文本，升级为 anchor
      - 如果有明确的 CSS 选择器，升级为 css

4. 更新规则文件的 version, updatedAt 字段

5. 输出优化报告:
   - 降级的 URL 列表
   - 升级的 URL 列表
   - 需要人工审查的 URL 列表
```

### browseros-cli 调用约束

- 页面分析 / 抓样本 / DOM 检查 / 规则验证：通过 browseros-cli 执行。
- 若能力依赖工具调用，统一使用：
  - `python3 -m browseros_cli call <tool> --args '<json>'`
- 工具名与参数以 `python3 -m browseros_cli tools list` 的实际输出为准。

---

## 规则文件更新示例

**降级示例**（css → anchor）:
```json
{
  "siteId": "xm_hrss",
  "version": 2,
  "updatedAt": "2026-03-15",
  "strategy": "anchor",
  "confidence": 0.7,
  "anchor": {
    "text": "通知公告",
    "scope": "parent",
    "depth": 2,
    "listTag": "li"
  },
  "metadata": {
    "source": "downgraded_from_css",
    "previousStrategy": "css",
    "downgradeReason": "css 选择器连续失败 3 次"
  }
}
```

**升级示例**（description → anchor）:
```json
{
  "siteId": "xm_sme",
  "version": 2,
  "updatedAt": "2026-03-15",
  "strategy": "anchor",
  "confidence": 0.75,
  "anchor": {
    "text": "通知公告",
    "scope": "parent",
    "depth": 2
  },
  "metadata": {
    "source": "upgraded_from_description",
    "previousStrategy": "description",
    "upgradeReason": "description 连续成功 5 次，Agent 发现稳定锚点"
  }
}
```

---

## 完成标准

- [ ] 连续失败的规则已降级
- [ ] 稳定的 description 规则已升级
- [ ] 规则文件的 version, updatedAt 已更新
- [ ] 优化报告已生成

---

## 手动触发

```bash
# 用户请求
"优化爬虫规则"

# 或指定 URL
"优化 xm_hrss 的爬虫规则"
```