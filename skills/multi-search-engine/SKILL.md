---
name: multi-search-engine
version: 1.0.0
description: "多搜索引擎 | 集成17个搜索引擎（8国内+9国际），支持高级搜索、时间过滤、站内搜索。触发词：搜索、搜索引擎、多引擎。"
metadata:
  openclaw:
    emoji: "🔎"
    priority: high
    type: skill
---

# Multi Search Engine v2.2.0

使用 Playwright MCP 工具进行多引擎搜索，绕过反爬虫机制。

## 搜索引擎优先级

**按流行程度预排序**，目标成功 3 个引擎，失败则顺位继续。

| 优先级 | 引擎 | 状态 |
|--------|------|------|
| 1 | Baidu | ✅ |
| 2 | Bing CN | ✅ |
| 3 | Bing INT | ✅ |
| 4 | Google HK | ✅ |
| 5 | Toutiao | ✅ |
| 6 | WeChat | ✅ |
| 7 | 360 | ✅ |
| 8 | Sogou | ✅ |
| 9 | Ecosia | ✅ |
| 10 | WolframAlpha | ✅ |
| 11 | Jisilu | ✅ |
| 12-17 | Google/DuckDuckGo/Yahoo/Startpage/Brave/Qwant | ❌ 不可用 |

## 工作流程

```
输入关键词 → 取前3个可用引擎 → Playwright MCP 搜索 → 失败则顺位继续 → 合并去重结果
```

**Playwright MCP 步骤**：
1. `browser_navigate` 打开搜索页
2. `browser_snapshot` 等待加载
3. `browser_evaluate` 提取结果

## 搜索结果选择器

| 引擎 | 结果容器 | 标题 | 摘要 |
|------|----------|------|------|
| Baidu | `.result.c-container` | `h3` | `.c-abstract` |
| Bing | `.b_algo` | `h2` | `.b_caption p` |
| Google | `.g` | `h3` | `[data-sncf]` |

## 搜索引擎 URL

**国内**：Baidu, Bing CN, Bing INT, 360, Sogou, WeChat, Toutiao, Jisilu

**国际**：Google, Google HK, DuckDuckGo, Yahoo, Startpage, Brave, Ecosia, Qwant, WolframAlpha

## 示例

```javascript
// 百度搜索
browser_navigate({ url: "https://www.baidu.com/s?wd=python" })
browser_snapshot({})
browser_evaluate({ script: `
  const r = [];
  document.querySelectorAll('.result.c-container').forEach(i => {
    r.push({ title: i.querySelector('h3')?.textContent, url: i.querySelector('a')?.href });
  });
  return JSON.stringify(r);
` })
```

## 高级搜索

| 操作符 | 示例 | 说明 |
|--------|------|------|
| `site:` | `site:github.com python` | 站内搜索 |
| `filetype:` | `filetype:pdf report` | 文件类型 |
| `""` | `"machine learning"` | 精确匹配 |
