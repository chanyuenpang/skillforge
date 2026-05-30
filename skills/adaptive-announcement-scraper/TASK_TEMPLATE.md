# 公告抓取任务模板

> 本模板用于派发给 Executor Subagent（小弟）执行
> 小弟只对**负责人**（我）负责，不直接发飞书

---

## 角色说明

- **负责人**：我（主Agent）- 负责读取URL、分配任务、验收、汇总、发飞书
- **小弟**：Executor Subagent - 只执行任务，汇报结果给负责人

---

## 任务目标

从指定网站抓取公告列表，并分析页面结构，**汇报给负责人**。

---

## 输入（负责人给小弟的）

- 目标网站名称
- 目标URL
- 输出目录路径

---

## 必须使用的工具

✅ **Playwright** - 使用 Python Playwright 库，不要用其他脚本

```python
from playwright.async_api import async_playwright
```

❌ 禁止使用：curl、requests、scrapy、或工作区中的任何 .py 脚本

---

## 输出要求

### 1. 公告列表 (data/公告列表-YYYY-MM-DD.md)

必须使用 Markdown 表格格式：

```markdown
# 公告列表

**抓取日期**: YYYY-MM-DD

---

## 网站名称

- **URL**: http://example.com

| # | 标题 | 发布日期 | 链接 |
|---|------|----------|------|
| 1 | 公告标题1 | 2026-03-14 | http://example.com/xxx.htm |
| 2 | 公告标题2 | 2026-03-13 | http://example.com/yyy.htm |
```

**要求：**
- 数量：至少10条/网站
- 日期：完整的 YYYY-MM-DD 格式
- 链接：**必须是完整的绝对URL**（不是相对路径）
- 每个网站独立一个章节

### 2. 页面结构分析 (data/页面结构分析-YYYY-MM-DD.md)

```markdown
# 页面结构分析

**分析日期**: YYYY-MM-DD

---

## 网站名称

**URL**: http://example.com

### 结构信息
| 元素类型 | 选择器 | 说明 |
|----------|--------|------|
| 列表容器 | div.list | 公告列表外层 |
| 列表项 | li | 单条公告 |
| 链接 | li a | 标题链接 |

### 关键发现
- 选择器：xxx
- 特点：xxx
```

---

## 执行步骤

### Step 1: 读取目标列表
从 `~/.openclaw/workspace/skills/adaptive-announcement-scraper/targets.json` 读取URL

### Step 2: 访问页面
使用 Playwright 异步访问：
```python
async with async_playwright() as p:
    browser = await p.chromium.launch(headless=True)
    page = await browser.new_page()
    await page.goto(url, timeout=30000)
    await page.wait_for_timeout(3000)
```

### Step 3: 提取公告
找到所有公告项，提取：
- 标题 (text)
- 发布日期 (text，需要解析)
- 链接 (href，必须是完整URL)

### Step 4: 分析结构
找到页面使用的 CSS 选择器

### Step 5: 生成文件
保存到 output/YYYY-MM-DD/data/ 目录

### Step 6: 转换Word
使用 python-docx 转换为 .docx 放到 docs/ 目录

### Step 7: 汇报给负责人
完成所有步骤后，向负责人汇报结果（不是直接发飞书！）

汇报格式：
```
✅ 任务完成

网站：[名称]
URL：[URL]
公告数：[X]条
结构分析：[选择器信息]
```

---

## 重要规则

1. **只用 Playwright** - 禁止用脚本
2. **只对负责人汇报** - 不要直接发飞书
3. **产出给负责人** - 文件保存在指定目录，负责人会处理
4. **遇到困难直接汇报** - 不要自己尝试解决！
   - 访问失败？→ 汇报"访问失败，原因：xxx"
   - 需要登录？→ 汇报"需要登录，无法抓取"
   - 格式不对？→ 汇报"格式异常，原因：xxx"
   - **不要自己尝试换URL或换方法**

---

## 验收标准

| 检查项 | 要求 |
|--------|------|
| 表格格式 | 必须是 \|col\|col\| 格式 |
| 日期 | YYYY-MM-DD，不能为空 |
| 链接 | 完整URL（http://或https://开头） |
| 数量 | 至少10条/网站 |
| 文件位置 | output/日期/data/*.md |
| Word文件 | output/日期/docs/*.docx |

---

## 常见问题处理

### 页面超时
- 尝试备用URL（参考 targets.json 中的 notes）
- 例如：sti.xm.gov.cn 超时 → 尝试 sti.xm.gov.cn/xxgk/tzgg/

### 需要登录
- 记录到输出中，标记为"需要登录"

### 相对路径
- 拼接完整URL：base_url + relative_path

---

*模板版本: 0.1.0 | 更新: 2026-03-14*