# record-learning - 记录知识工具

将新知识写入知识库，支持项目级和全局存储，并同步到向量库。

- **项目知识**：写入 `.projects/{project}/.knowledge/`
- **全局知识**：写入 `.knowledge/`

## 使用方法

### 基本用法

```javascript
recordLearning({
  type: "learning",  // learning | error | feature_request | pattern | collaboration
  category: "best_practice",
  title: "网络请求超时时应使用指数退避重试",
  description: "在使用 playwright 抓取动态页面时发现...",
  solution: "增加重试次数到 5 次，使用指数退避",
  priority: "medium",
  relatedSkills: ["web-fetch", "api-client"],
  relatedFiles: ["/path/to/file"]
});
```

### 参数说明

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| type | string | 是 | 条目类型 |
| category | string | 否 | 分类 |
| title | string | 是 | 标题（简短摘要） |
| description | string | 是 | 问题描述 |
| solution | string | 否 | 解决方案 |
| priority | string | 否 | 优先级：critical, high, medium, low |
| project | string | 否 | 关联项目名称，指定则写入项目级知识库 |
| relatedSkills | string[] | 否 | 关联的技能列表 |
| relatedFiles | string[] | 否 | 相关文件路径 |

### 类型映射

**全局知识**（无 project 参数）：

| type | 目标文件 |
|------|----------|
| learning | `.knowledge/shared-learnings.md` |
| error | `.knowledge/shared-errors.md` |
| feature_request | `.knowledge/feature-requests.md` |
| pattern | `.knowledge/shared-patterns.md` |
| collaboration | `.knowledge/agent-collaboration.md` |

**项目知识**（有 project 参数）：

| type | 目标文件 |
|------|----------|
| learning | `.projects/{project}/.knowledge/learnings.md` |
| error | `.projects/{project}/.knowledge/errors.md` |
| pattern | `.projects/{project}/.knowledge/patterns.md` |

### 分类选项

**学习类型 (learning)**：
- `correction` - 用户纠正
- `best_practice` - 最佳实践
- `knowledge_gap` - 知识缺口

**错误类型 (error)**：
- `command` - 命令执行错误
- `api` - API 调用错误
- `integration` - 集成错误
- `logic` - 逻辑错误

## 执行流程

1. **生成条目 ID**
   - 格式：TYPE-YYYYMMDD-XXX
   - 例如：LRN-20260316-001

2. **确定目标文件**
   - 根据 `project` 参数决定 scope：
     - 有 `project` → 写入 `.projects/{project}/.knowledge/`
     - 无 `project` → 写入 `.knowledge/`
   - 根据类型选择具体文件

3. **写入 Markdown**
   - 使用标准格式写入
   - 追加到文件末尾

4. **同步到向量库**
   - 使用 `update_memory` MCP 工具
   - 类型前缀为 `knowledge_`

## 示例

### 记录学习

```javascript
recordLearning({
  type: "learning",
  category: "best_practice",
  title: "CSS 选择器在动态页面中应使用备选方案",
  description: "使用 playwright 抓取动态页面时，单一选择器经常失效",
  solution: "1. 优先使用稳定的 ID 选择器\n2. 准备多个备选选择器\n3. 添加等待机制",
  priority: "medium",
  relatedSkills: ["adaptive-announcement-scraper", "playwright"]
});

// 生成内容：
// ### [LRN-20260316-001] CSS 选择器在动态页面中应使用备选方案
//
// - **类别**: best_practice
// - **优先级**: medium
// - **来源**: feishu-organizer
// - **发现时间**: 2026-03-16 10:30
// - **相关技能**: adaptive-announcement-scraper, playwright
//
// #### 问题描述
// 使用 playwright 抓取动态页面时，单一选择器经常失效
//
// #### 解决方案
// 1. 优先使用稳定的 ID 选择器
// 2. 准备多个备选选择器
// 3. 添加等待机制
```

### 记录错误

```javascript
recordLearning({
  type: "error",
  category: "api",
  title: "飞书 API 502 错误需要增加重试",
  description: "调用飞书 API 时偶发 502 Bad Gateway 错误",
  solution: "增加重试次数到 5 次，使用指数退避，初始间隔 2s",
  priority: "high",
  relatedSkills: ["feishu-doc", "feishu-drive"]
});

// 生成内容：
// ### [ERR-20260316-001] 飞书 API 502 错误需要增加重试
//
// - **类别**: api
// - **优先级**: high
// - **来源**: feishu-organizer
// - **发现时间**: 2026-03-16 11:00
// - **相关技能**: feishu-doc, feishu-drive
//
// #### 错误信息
// HTTP 502 Bad Gateway
//
// #### 建议修复
// 增加重试次数到 5 次，使用指数退避，初始间隔 2s
```

### 记录功能请求

```javascript
recordLearning({
  type: "feature_request",
  title: "支持自动生成日报摘要",
  description: "用户希望能够自动生成每日任务的摘要报告",
  priority: "medium",
  relatedSkills: ["task-status-tracker"]
});

// 生成内容：
// ### [FEAT-20260316-001] 支持自动生成日报摘要
//
// - **优先级**: medium
// - **来源**: 用户
// - **发现时间**: 2026-03-16 14:00
// - **相关技能**: task-status-tracker
//
// #### 需求描述
// 用户希望能够自动生成每日任务的摘要报告
```

### 记录项目级知识

```javascript
// 项目特定知识 - 写入项目级知识库
recordLearning({
  type: "learning",
  category: "best_practice",
  project: "math-explainer",  // 指定项目名称
  title: "数学解释器应使用 LaTeX 渲染公式",
  description: "在 math-explainer 项目中，发现使用纯文本展示数学公式效果不佳",
  solution: "使用 KaTeX 库渲染 LaTeX 公式，提升可读性",
  priority: "high",
  relatedSkills: ["math-renderer"]
});

// 生成内容写入：.projects/math-explainer/.knowledge/learnings.md
// ### [LRN-20260316-001] 数学解释器应使用 LaTeX 渲染公式
//
// - **类别**: best_practice
// - **优先级**: high
// - **来源**: coding-agent
// - **项目**: math-explainer
// - **发现时间**: 2026-03-16 10:30
// - **相关技能**: math-renderer
//
// #### 问题描述
// 在 math-explainer 项目中，发现使用纯文本展示数学公式效果不佳
//
// #### 解决方案
// 使用 KaTeX 库渲染 LaTeX 公式，提升可读性
```

### 记录项目级错误

```javascript
// 项目特定错误 - 写入项目级知识库
recordLearning({
  type: "error",
  category: "integration",
  project: "feishu-bot",  // 指定项目名称
  title: "飞书机器人 webhook 频率限制",
  description: "feishu-bot 项目频繁调用飞书 webhook 时触发频率限制",
  solution: "添加请求队列，控制发送频率为每秒最多 5 条",
  priority: "critical",
  relatedSkills: ["feishu-webhook"]
});

// 生成内容写入：.projects/feishu-bot/.knowledge/errors.md
// ### [ERR-20260316-001] 飞书机器人 webhook 频率限制
//
// - **类别**: integration
// - **优先级**: critical
// - **来源**: feishu-engineer
// - **项目**: feishu-bot
// - **发现时间**: 2026-03-16 11:00
// - **相关技能**: feishu-webhook
//
// #### 错误信息
// 飞书 webhook 返回 429 Too Many Requests
//
// #### 建议修复
// 添加请求队列，控制发送频率为每秒最多 5 条
```

## 自动触发检测

以下情况应自动调用此工具：

| 触发词/模式 | 建议类型 | 建议类别 |
|-------------|----------|----------|
| "不，那不对..." | learning | correction |
| "实际上，应该是..." | learning | correction |
| "你错了..." | learning | correction |
| "你还能..." | feature_request | - |
| "我希望你能..." | feature_request | - |
| 命令返回非零退出码 | error | command |
| 异常或堆栈跟踪 | error | api/integration |

## 向量库同步

记录时自动同步到 shared.sqlite：

```javascript
await update_memory({
  intent: "add_knowledge",
  content: {
    id: entry.id,
    type: `knowledge_${entry.type}`,
    summary: entry.title,
    metadata: {
      fullContent: entry.content,
      category: entry.category,
      scope: entry.project ? `project:${entry.project}` : 'global',
      project: entry.project || null,
      sourceAgent: getCurrentAgent(),
      relatedSkills: entry.relatedSkills?.join(','),
      status: 'active',
      priority: entry.priority
    }
  }
});
```

## 最佳实践

1. **立即记录** - 问题发生后立即记录，上下文最新鲜
2. **具体明确** - 描述要具体，便于未来理解
3. **包含解决方案** - 不仅描述问题，还要记录解决方案
4. **关联相关技能** - 便于分类检索
5. **设置合适优先级** - 帮助后续处理排序
