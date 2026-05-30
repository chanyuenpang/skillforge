# vector-search - 向量检索工具

使用 shared.sqlite 向量数据库进行语义检索。

## 使用方法

### 基本用法

```javascript
const results = await searchKnowledge({
  query: "如何处理网络请求超时",
  threshold: 0.7,
  limit: 10,
  types: ["knowledge_learning", "knowledge_error"]
});
```

### 参数说明

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| query | string | 是 | 搜索查询（自然语言描述） |
| threshold | number | 否 | 相似度阈值，默认 0.7（范围 0-1） |
| limit | number | 否 | 结果数量限制，默认 10 |
| types | string[] | 否 | 类型过滤，可选 |
| scope | string | 否 | 范围过滤：`global`、`project` 或 `project:{name}` |
| project | string | 否 | 指定项目名称，只搜索该项目知识 |

### 返回结果

```javascript
[
  {
    id: "LRN-20260316-001",
    type: "knowledge_learning",
    summary: "网络请求超时时应使用指数退避重试",
    similarity: 0.89,
    scope: "global",
    sourceAgent: "feishu-organizer"
  },
  {
    id: "LRN-20260316-002",
    type: "knowledge_error",
    summary: "飞书机器人 webhook 频率限制",
    similarity: 0.85,
    scope: "project:feishu-bot",
    project: "feishu-bot",
    sourceAgent: "feishu-engineer"
  },
  // ...
]
```

### 类型前缀

| 类型前缀 | 说明 |
|----------|------|
| knowledge_learning | 学习记录 |
| knowledge_error | 错误记录 |
| knowledge_pattern | 模式记录 |
| knowledge_collaboration | 协作经验 |

## 使用场景

### 1. 任务开始前检索

在开始新任务时，检索相关的历史经验：

```javascript
// 检索相关学习
const learnings = await searchKnowledge({
  query: "任务描述或关键词",
  types: ["knowledge_learning"]
});

// 检索相关错误（避免重复犯错）
const errors = await searchKnowledge({
  query: "任务描述或关键词",
  types: ["knowledge_error"]
});

// 汇总并应用
if (learnings.length > 0) {
  console.log("找到相关学习：");
  learnings.forEach(l => console.log(`- ${l.summary}`));
}
```

### 2. 检测重复条目

在添加新条目前，检查是否已存在相似内容：

```javascript
const similar = await searchKnowledge({
  query: newEntry.summary,
  threshold: 0.85  // 高相似度阈值
});

if (similar.length > 0) {
  console.log("发现相似条目：", similar);
  // 决定是否合并或链接
}
```

### 3. 跨月份检索

检索所有月份的相关知识：

```javascript
const allRelated = await searchKnowledge({
  query: "委派策略",
  limit: 20  // 获取更多结果
});
```

### 4. 精确类型过滤

只检索特定类型的知识：

```javascript
// 只检索模式
const patterns = await searchKnowledge({
  query: "任务执行",
  types: ["knowledge_pattern"]
});

// 只检索错误
const errors = await searchKnowledge({
  query: "失败",
  types: ["knowledge_error"]
});
```

### 5. Scope 过滤

按知识范围过滤：

```javascript
// 只搜索全局知识
const globalLearnings = await searchKnowledge({
  query: "网络请求",
  scope: "global"
});

// 只搜索项目知识（所有项目）
const projectLearnings = await searchKnowledge({
  query: "API 集成",
  scope: "project"
});

// 搜索特定项目知识
const feishuKnowledge = await searchKnowledge({
  query: "webhook",
  scope: "project:feishu-bot"
});

// 或使用 project 参数
const mathKnowledge = await searchKnowledge({
  query: "LaTeX 渲染",
  project: "math-explainer"
});
```

## 最佳实践

1. **任务前检索**：执行任务前先检索相关经验
2. **避免重复**：添加新条目前检查相似内容
3. **合理阈值**：根据场景调整相似度阈值
4. **类型过滤**：使用类型过滤缩小结果范围
5. **结果验证**：检索结果需要验证是否真正相关

## 与 MCP 工具的关系

本工具封装了 `search_memory` MCP 工具：

```javascript
// 内部实现
async function searchKnowledge(options) {
  const results = await search_memory({
    query: options.query,
    threshold: options.threshold || 0.7,
    limit: options.limit || 10
  });
  
  // 过滤知识类型
  let filtered = results.filter(r => {
    if (!options.types) return r.type?.startsWith('knowledge_');
    return options.types.includes(r.type);
  });
  
  // 过滤 scope
  if (options.scope) {
    if (options.scope === 'global') {
      filtered = filtered.filter(r => !r.project);
    } else if (options.scope === 'project') {
      filtered = filtered.filter(r => r.project);
    } else if (options.scope.startsWith('project:')) {
      const projectName = options.scope.replace('project:', '');
      filtered = filtered.filter(r => r.project === projectName);
    }
  }
  
  // 过滤指定项目
  if (options.project) {
    filtered = filtered.filter(r => r.project === options.project);
  }
  
  return filtered;
}
```
