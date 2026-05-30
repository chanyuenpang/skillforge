# EVOLUTION.md - 自我进化规则

## 概述

本 skill 使用 skill-self-evolution-enhancer 机制实现自我进化。

---

## 快速参考

| 触发条件 | 动作 |
|----------|------|
| 成功抓取新网站 | 记录选择器到 LEARNINGS.md |
| 选择器失效 | 记录到 ERRORS.md，分析原因 |
| 发现新 URL 模式 | 记录 url_pattern 到 LEARNINGS.md |
| 用户反馈问题 | 记录到 LEARNINGS.md，标记为 user_feedback |

---

## Review → Apply → Report 循环

### 任务前
- 读取 `.learnings/LEARNINGS.md` 相关条目
- 筛选适用于当前任务的 tags、areas
- 记录要使用的经验

### 任务中
- 应用学到的选择器策略
- 如使用经验，标注 "参考了 [LRN-xxx]"

### 任务后
- 总结：使用了哪些经验、效果如何
- 如有新发现，写入 LEARNINGS.md

---

## 经验提升规则

当同一类经验出现 3 次以上：
1. 提炼成最佳实践
2. 更新 targets.json 中的配置
3. 标记原条目为 superseded

---

## 激活条件

- 用户说"测试抓取"
- 用户说"随机抓取3个"
- 定时任务触发
- 任何需要提取公告的任务

---

## 经验失效规则

当用户再次纠正（与之前经验矛盾）：
1. 在原条目添加 `Contradicted-By: LRN-YYYYMMDD-XXX`
2. 标记 `Status: superseded`
3. 新条目记录新方案

---

## 定期回顾

- 时间：每周末
- 内容：
  1. 统计本周成功率
  2. 淘汰无效选择器
  3. 更新本文件

---

---

## 相关文档

- [LEARNINGS.md](./LEARNINGS.md) - 开发经验记录，包含问题排查和解决方案

---

*版本: 0.2.0 | 更新时间: 2026-03-15*