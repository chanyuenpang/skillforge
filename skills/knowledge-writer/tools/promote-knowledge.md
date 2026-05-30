# promote-knowledge - 知识提升工具

将高频学习提升到主文档（AGENTS.md, MEMORY.md）。

## 使用方法

### 基本用法

```javascript
promoteKnowledge({
  entryId: "LRN-20260316-001",
  target: "AGENTS.md",
  reason: "出现 3 次以上，适用于所有 Agent"
});
```

### 参数说明

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| entryId | string | 是 | 要提升的条目 ID |
| target | string | 是 | 提升目标：AGENTS.md, MEMORY.md |
| reason | string | 是 | 提升原因 |
| condensed | string | 否 | 精简后的规则文本（可选，不提供则自动提取） |

### 提升规则

| 提升目标 | 适用条件 |
|----------|----------|
| AGENTS.md | Agent 工作流相关，适用于所有 Agent |
| MEMORY.md | 用户偏好相关，需要长期记住 |

### 提升条件

| 条件 | 优先级 |
|------|--------|
| 出现 3 次以上相似学习 | 自动建议 |
| 用户强调要记住 | 立即提升 |
| 跨 2 个 Agent 出现 | 考虑提升 |
| critical 级别错误 | 立即提升 |

### 执行流程

1. **读取原始条目**
   - 从知识库中读取完整内容
   - 提取核心规则

2. **精简内容**
   - 将学习转化为简洁的规则
   - 保留关键信息，移除冗余上下文

3. **写入目标文件**
   - 追加到目标文件的适当部分
   - 保持文件结构一致

4. **更新原始条目**
   - 状态改为 `promoted`
   - 添加 `Promoted: target` 元数据

## 示例

### 提升到 AGENTS.md

```javascript
promoteKnowledge({
  entryId: "LRN-20260316-001",
  target: "AGENTS.md",
  reason: "连续 3 次任务验证了此模式的有效性",
  condensed: "网络请求失败时使用指数退避重试，最大重试 5 次，初始间隔 1s"
});
```

### 提升到 MEMORY.md

```javascript
promoteKnowledge({
  entryId: "LRN-20260316-002",
  target: "MEMORY.md",
  reason: "用户明确表示这是重要偏好",
  condensed: "用户偏好使用中文回复，技术术语保留英文"
});
```

### 自动检测并提升

```javascript
// 检测是否满足提升条件
const duplicates = await detectDuplicates(entry.summary);
if (duplicates.length >= 3) {
  // 自动建议提升
  suggestPromotion({
    entryId: entry.id,
    duplicates: duplicates,
    recommendation: "发现 3+ 相似条目，建议提升为共享知识"
  });
}
```
