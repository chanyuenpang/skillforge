# LEARNINGS.md - 开发经验记录

## 2026-03-15: Stage 2 规则生成闭环实现

### 问题背景

每日公告抓取流水线的 Stage 2 长期被跳过，导致：
- 25 个网站中 14 个因缺少规则文件在 Stage 1 直接失败
- 每次运行都重复失败，永远不会自动恢复
- 规则文件只能手动创建，无法自动积累

### 遇到的核心问题

#### 问题 1: 原设计无法处理复杂页面

**现象**：最初尝试用纯 Python 脚本 (`stage2_auto.py`) 实现选择器发现，复用 `semantic_strategy` 的启发式匹配。

**问题**：启发式匹配只能处理标准页面结构（~10 个预设选择器），对于非标准结构的站点完全无能为力。而真正需要 Stage 2 处理的，恰恰是这些非标准站点。

**根因**：如果启发式匹配能找到选择器，Stage 1 的 semantic fallback 就已经找到了。Stage 2 的价值在于处理 Stage 1 处理不了的情况。

**解决**：改为 Agent 编排架构，让 AI Subagent 用浏览器访问页面，理解 DOM 结构，智能分析并生成规则。

#### 问题 2: SKILL.md 多步骤编排未被正确执行

**现象**：修改了 SKILL.md 为多步骤流程，但主 Agent spawn 的 Subagent 收到的任务描述还是旧版本。

**问题**：主 Agent 没有按 SKILL.md 的新流程执行，而是用自己记忆中的旧版本生成任务描述。

**根因**：SKILL 内容在 session 开始时被注入到 context 中，后续修改文件不会影响已存在的 session。

**解决**：
1. 简化 SKILL.md 为单一 `sessions_spawn` 调用，把完整任务描述写在一个地方
2. 在任务描述中加明确警告：`"关键！禁止跳过！"` 和 `"无规则文件是技术问题，必须生成规则文件解决"`

#### 问题 3: Session 缓存导致 SKILL 更新不生效

**现象**：多次修改 SKILL.md，但主 Agent 始终使用旧版本的任务描述。

**问题**：主 Agent 的 session 是长对话，SKILL 内容在 session 开始时缓存，之后不会重新读取。

**解决**：清理 feishu-organizer 的 session 文件，强制主 Agent 开始新 session 并重新读取 SKILL.md。

```bash
rm -rf ~/.openclaw/agents/feishu-organizer/sessions/*
```

### 最终解决方案

#### 架构变更

```
旧架构（有缺陷）:
SKILL → spawn executor → run_pipeline.py（单体脚本，Stage 2 跳过）

新架构（Agent 编排）:
SKILL → spawn executor → 
  1. Stage 1: crawl_batch.py（脚本）
  2. Stage 2: AI 分析页面 → save_rule.py（Agent）
  3. Stage 3: merge_results.py（脚本）
  4. Stage 4: incremental_analysis.py（脚本）
```

#### 新增文件

| 文件 | 用途 |
|------|------|
| `scripts/stage2_prepare.py` | 从 Stage 1 失败结果生成任务清单 |
| `scripts/stage2_collect.py` | 收集 Subagent 输出合并为 stage2_auto.json |

#### 修改文件

| 文件 | 变更 |
|------|------|
| `scripts/save_rule.py` | 新增 `--source` 参数，记录规则来源 |
| `scripts/run_pipeline.py` | 更新注释说明 Stage 2 由 SKILL 编排 |
| `SKILL.md` | 重写为单一 spawn 调用，明确 Stage 2 不可跳过 |

### 验证结果

| 指标 | 修改前 | 修改后 |
|------|--------|--------|
| Stage 1 成功 | 11 | 11 |
| Stage 2 恢复 | 0 | **9** |
| 最终成功 | 16 | **19** |
| 总公告 | 363 | **492** |
| 规则文件 | 25 | **34** |

### 关键经验

1. **Agent 编排 vs 纯脚本**：需要 AI 智能分析的场景，不能用启发式脚本替代
2. **SKILL 更新生效条件**：修改 SKILL.md 后需要清理 session 才能生效
3. **任务描述要明确**：避免模糊指令如"如果需要，用 Agent 处理"，改为明确步骤
4. **标准接口设计**：`save_rule.py` 作为 Subagent 的输出接口，保证规则文件格式一致

---

## 经验索引

| 日期 | 标签 | 关键词 |
|------|------|--------|
| 2026-03-15 | stage2, rule-generation, agent-orchestration | 闭环, session缓存, SKILL更新 |

---

*版本: 0.2.0 | 更新时间: 2026-03-15*
