---
name: adaptive-announcement-scraper
version: 7.1.0
description: "公告抓取 | 每天06:00自动运行，或手动发送'抓取公告'触发"
metadata:
  openclaw:
    emoji: "📋"
    priority: "high"
    triggers: ["抓取公告", "每日爬虫", "daily-news-crawler", "公告抓取"]
---

# 公告抓取 Skill

## 触发方式

- Cron: 每天 06:00
- 手动: 飞书发送 "抓取公告"

---

## 执行命令

**必须 spawn 一个 executor 执行以下完整任务，不要跳过任何阶段：**

```
sessions_spawn({
  agentId: "executor",
  runtime: "subagent",
  // 不要设置 streamTo
  // 不要设置 runTimeoutSeconds（或设为 0）
  task: "执行完整的公告抓取流程（必须完成所有4个阶段，不可跳过）:

========================================
Stage 1: 批量抓取
========================================
cd ~/.openclaw/workspace/projects/daily-news-crawler
python3 scripts/crawl_batch.py --urls config/urls.json --output output/{today}/stage1_results.json

读取结果，汇报成功数和失败数。

========================================
Stage 2: 失败站点处理（关键！禁止跳过！）
========================================

**重要：'无规则文件'是技术问题，必须生成规则文件解决！**

1. 生成任务清单:
   python3 scripts/stage2_prepare.py --date {today}

2. 读取 output/{today}/stage2_tasks.json，对每个待处理站点执行:

   a) 访问站点 URL，分析页面 DOM，找到公告列表的 CSS 选择器
   b) 调用 save_rule.py 生成规则文件:
      python3 scripts/save_rule.py \\
        --site-id <站点ID> \\
        --site-name '<站点名称>' \\
        --url '<站点URL>' \\
        --strategy css \\
        --css-list '<列表选择器>' \\
        --css-title 'a' \\
        --link-prefix '<baseUrl>' \\
        --source stage2_subagent \\
        --overwrite
   c) 提取公告，保存到 output/{today}/stage2_site_<站点ID>.json

   说明：
   - Stage 2 的主流程仍以 `stage2_prepare.py` / `save_rule.py` / `stage2_collect.py` 这些既有 Python 脚本为准
   - 不要把整段 Stage 2 抽象改写成泛化的 `browseros-cli call <tool> --args '<json>'` 流程
   - 如果页面分析环节底层使用浏览器工具，也应视为实现细节，不要覆盖这里已经跑通的脚本主流程

3. 收集所有结果:
   python3 scripts/stage2_collect.py --date {today}

========================================
Stage 3: 合并 + 生成日报
========================================
python3 scripts/merge_results.py --date {today}
python3 scripts/generate_daily_report.py output/{today}/combined_results.json

========================================
Stage 4: 增量分析
========================================
python3 scripts/incremental_analysis.py --date {today}
pandoc output/{today}/增量日报.md -o output/{today}/增量日报.docx

========================================
Stage 5: 发送增量日报到飞书群
========================================
**重要：必须完成此步骤，否则用户收不到增量日报！**

1. 复制增量日报到工作目录:
   cp output/{today}/增量日报.docx /home/yankeeting/.openclaw/workspace/增量日报_{today}.docx

2. 发送到飞书群（必须使用 --account original）:
   openclaw message send --channel feishu --target "oc_00c2c690e5a60b6803a38b121568e4c1" --media /home/yankeeting/.openclaw/workspace/增量日报_{today}.docx --account original

3. 发送摘要消息:
   openclaw message send --channel feishu --target "oc_00c2c690e5a60b6803a38b121568e4c1" --text "📋 增量日报已生成，详见附件。今日新增 {新增公告数} 条公告。" --account original

========================================
最终汇报
========================================
汇报以下数据:
- 成功网站数
- 总公告数
- 新增公告数
- 生成规则数（Stage 2 生成的规则文件数量）"
})
```

---

## 输出文件

```
output/{date}/
├── stage1_results.json       # Stage 1 抓取结果
├── stage2_tasks.json         # Stage 2 任务清单
├── stage2_site_*.json        # 各站点分析输出
├── stage2_auto.json          # Stage 2 合并结果
├── combined_results.json     # Stage 3 合并结果
├── 日报.md                   # 全量日报
├── 增量日报.md               # 增量日报
└── 增量日报.docx             # 发飞书 ⭐
```

---

## 规则生成闭环

```
第 1 天: Stage 1 失败(无规则) → Stage 2 分析页面 → save_rule.py 生成规则
第 2 天: Stage 1 加载规则 → 直接成功 → 不需要 Stage 2
第 N 天: 网站改版导致规则失效 → Stage 2 重新分析 → 更新规则
```

---

## 错误处理

| 错误类型 | 处理方式 |
|---------|---------|
| DNS 解析失败 | stage2_prepare.py 标记为 skipped |
| 页面超时 | 记录失败，不生成规则 |
| 找不到公告列表 | 尝试 iframe/动态内容，仍失败则记录 |
