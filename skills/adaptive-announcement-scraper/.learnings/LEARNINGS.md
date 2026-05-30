# LEARNINGS.md - 自适应公告抓取器经验库

## 记录格式

每条经验格式：
```markdown
## [LRN-YYYYMMDD-XXX] 类别名称

**Logged**: YYYY-MM-DDTHH:MM:SSZ
**Priority**: high | medium | low
**Status**: pending | applied | superseded
**Area**: selector | structure | anti-crawl | strategy | url_pattern

### Summary
一句话总结

### Details
详细描述：尝试了什么、结果如何、学到了什么

### Applied
- [ ] 未应用
- [x] 已应用（标记时间和效果）

### Metadata
- Source: test | user_feedback | error
- Related Target: 网站名
- Tags: tag1, tag2

---
```

---

## 2026-03-14 经验总结

### [LRN-20260314-001] URL模式 - 厦门科技局

**Logged**: 2026-03-14T16:30:00Z
**Priority**: high
**Status**: applied
**Area**: url_pattern

### Summary
厦门科学技术局主站 (sti.xm.gov.cn) 访问超时，需要使用 /xxgk/tzgg/ 子路径

### Details
- 主站 http://sti.xm.gov.cn/ 超时
- 公告列表实际在 http://sti.xm.gov.cn/xxgk/tzgg/
- 解决方案：优先尝试 /xxgk/tzgg/ 路径

### Applied
- [x] 2026-03-14 已应用到 targets.json

### Metadata
- Source: test
- Related Target: 厦门科学技术局
- Tags: url_pattern, timeout

---

### [LRN-20260314-002] URL模式 - 福建省科技厅

**Logged**: 2026-03-14T16:30:00Z
**Priority**: high
**Status**: applied
**Area**: url_pattern

### Summary
福建省科技厅公告实际发布在福建省政府网，而非科技厅官网

### Details
- kjt.fujian.gov.cn 可能是旧站或跳转
- 实际公告在 www.fujian.gov.cn/xwdt/fjyw/
- 需要同时监控多个域名

### Applied
- [x] 2026-03-14 已更新目标URL

### Metadata
- Source: test
- Related Target: 福建省科技厅
- Tags: url_pattern, redirect

---

### [LRN-20260314-003] 选择器经验

**Logged**: 2026-03-14T16:30:00Z
**Priority**: medium
**Status**: applied
**Area**: selector

### Summary
政府网站常用选择器总结

### Details
常用选择器：
- `.list` - 列表容器（厦门人社局）
- `.main` - 主体内容区（厦门科技局、福建科技厅）
- `.clearflx` - 清除浮动容器
- `a[href*="/tzgg/"]` - 公告链接筛选

### Applied
- [x] 2026-03-14 已在测试中使用

### Metadata
- Source: test
- Tags: selector, css

---

### [LRN-20260314-004] 页面结构选择器

**Logged**: 2026-03-14T17:00:00Z
**Priority**: high
**Status**: applied
**Area**: selector

### Summary
3个政府网站公告列表的CSS选择器实测结果

### Details
| 网站 | 列表容器 | 公告项 | 标题元素 |
|------|----------|--------|----------|
| 厦门市人社局 | `div.list` | `li.b-free-read-leaf` | `span` |
| 厦门科技局 | `div.list_base` | `li` | `a` |
| 福建省科技厅 | `div.gl_list3` | `li.b-free-read-leaf` | `a` |

关键发现：
- 人社局和福建科技厅都用 `b-free-read-leaf` class
- 厦门科技局结构最简单清晰
- 标题可能在 span 或 a 标签内

### Applied
- [x] 2026-03-14 已验证

### Metadata
- Source: test
- Tags: selector, css, structure

---

### [LRN-20260314-005] 工作流整合

**Logged**: 2026-03-14T17:20:00Z
**Priority**: high
**Status**: applied
**Area**: strategy

### Summary
一次任务同时产出公告列表和页面结构分析

### Details
- 原因：查看同一个页面，同时获取公告内容和结构
- 产出：
  1. 公告列表.md - 标题+日期+链接
  2. 页面结构分析.md - CSS选择器+层级
- 转换为Word后发送到飞书群

### Applied
- [x] 2026-03-14 已更新 SKILL.md

### Metadata
- Source: user_feedback
- Tags: workflow, efficiency

---

### [LRN-20260314-006] 任务指令要明确工具

**Logged**: 2026-03-14T17:33:00Z
**Priority**: high
**Status**: pending
**Area**: strategy

### Summary
派任务时要明确指定工具，不要让小弟自己猜

### Details
- 问题：小弟看到工作区有 scrape.py 就用了，而不是用 Playwright
- 原因：任务指令只说"执行公告抓取"，没指定方法
- 解决：指令中明确写"使用 Playwright"

### Metadata
- Source: user_feedback
- Tags: delegation, workflow

---

### [LRN-20260314-007] 产出格式规范

**Logged**: 2026-03-14T17:39:00Z
**Priority**: high
**Status**: pending
**Area**: strategy

### Summary
公告列表产出格式不对：数量少、缺日期、缺链接、非表格

### Details
正确格式应该是：
| # | 标题 | 发布日期 | 链接 |
|---|------|----------|------|

问题：
- 只显示5条，应该是全部或10条
- 日期字段为空
- 链接不是完整URL（相对路径）
- 不是标准Markdown表格

### Suggested Fix
在任务指令中明确输出格式要求

### Metadata
- Source: user_feedback
- Tags: output_format, quality

---

### [LRN-20260314-009] 输出要完整

**Logged**: 2026-03-14T18:45:00Z
**Priority**: high
**Status**: pending
**Area**: output

### Summary
产出文档不完整：只有数字统计，没有完整公告列表；只有1家数据

### Details
- MD文件：只写了"共28条"，没有具体列表
- Word文件：只写了火炬高新区，中招国际和思明区没写
- 正确做法：每个网站的每条公告都要写入

### Metadata
- Source: user_feedback
- Tags: output_format, completeness

---

### [LRN-20260314-010] 用已有skill转换，不要自己写代码

**Logged**: 2026-03-14T19:06:00Z
**Priority**: high
**Status**: pending
**Area**: tools

### Summary
MD转Word应该用已有的docx-cn skill，不应该自己写Python脚本

### Details
- 问题：自己写python代码转doc
- 正确：使用 docx-cn skill 或派小弟用skill
- 同样适用于其他工具：先查已有skill

### Metadata
- Source: user_feedback
- Tags: tools, skill_usage

---

### [LRN-20260314-012] 用工具前先查skill

**Logged**: 2026-03-14T19:17:00Z
**Priority**: high
**Status**: pending
**Area**: tools

### Summary
使用工具前应该先查对应skill，避免用不可用的工具

### Details
- 问题：直接用 web_search (Kimi) 失败
- 正确做法：先查 multi-search-engine skill
- 它有 fallback 方案：优先用国内引擎（百度、Bing）

### Metadata
- Source: user_feedback
- Tags: tools, skill_usage

---

### [LRN-20260314-011] 链接是必填字段

**Logged**: 2026-03-14T19:06:00Z
**Priority**: high
**Status**: pending
**Area**: output

### Summary
公告列表的链接字段不能为空

### Details
- 问题：Word中缺少链接
- 规范：| # | 标题 | 日期 | 链接 | - 链接必填

### Metadata
- Source: user_feedback
- Tags: output_format

---

## 触发条件

**学习触发**（记录到 LEARNINGS.md）：
- 成功提取了新的网页结构
- 发现有效的 CSS 选择器
- 遇到新的反爬虫措施
- URL 模式新发现
- 用户反馈提取结果不对

**错误触发**（记录到 ERRORS.md）：
- 页面加载失败
- 提取内容为空
- 选择器失效

---

## 经验领域 (Areas)

| Area | 说明 |
|------|------|
| selector | CSS/XPath 选择器经验 |
| structure | 页面层级结构特点 |
| anti-crawl | 反爬虫措施及绕过 |
| strategy | 整体抓取策略改进 |
| url_pattern | URL 规律和变体模式 |

---

## 定期回顾

每周末回顾本周经验：
1. 统计各网站成功率
2. 淘汰无效选择器
3. 更新最佳实践到 EVOLUTION.md