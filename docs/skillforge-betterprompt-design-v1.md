# betterPrompt 设计文档 v1

## 1. 产品定位

betterPrompt 的本质是一个 **prompt optimizer pipeline**：

```
输入 prompt → 语义分析 → 检索命中的 skill → 直接读取 skill 原文 → 重组 → 输出 prompt
```

最终产物是一段**可直接扔给 subagent 执行的自包含 prompt**，不暴露内部技能名称、不输出细碎结构化数据块。

---

## 2. 核心设计原则

### 2.1 不暴露技能名称
最终 output prompt 中 0 处出现技能名称。拥有 skill 资产的一方不应向第三方 agent 泄露内部技能定义。

### 2.2 中间产物不是必选层
workflow skeleton / knowledge / constrain 的提取**不是必须的前置步骤**。它们的唯一意义是：降低对 LLM 能力的依赖、减少 token 消耗。如果 direct-read skill 原文已经足够产出高质量 output prompt，中间产物层可以完全跳过。

### 2.3 tag 是一等产物
tag 在系统中需要作为重要维护资产对待：
- skill 入库时打 tag
- prompt 搜索时产 tag
- 两边共用同一个 tag 语义空间（统一的 tag schema）
- tag 是 LLM 理解的桥梁，不是简单的关键词匹配

### 2.4 输出追求一步到位
最终 output 不是细碎的结构化数据块，而是一段可独立交付给 subagent 的完整 prompt。

---

## 3. 两条链路

### 3.1 基础链路（direct-read）
```
命中 skill → 直接读取 SKILL.md 原文 → 配合原始 prompt → LLM 直接重组 → output prompt
```
- 简单、不需维护中间产物
- token 消耗可能较大（全文读入）
- 对 LLM 能力要求稍高

### 3.2 增强链路（artifact-extraction）
```
命中 skill → 提取 workflow/knowledge/constrain → 配合原始 prompt → LLM 重组 → output prompt
```
- 仅当 direct-read 链路在质量/稳定性/token 成本上不够好时再引入
- 需维护提取规范与同步机制
- 可降低 token 并对低能力 LLM 更友好

---

## 4. tag 体系

### 4.1 设计
- 统一的 tag schema 定义文件
- tag 格式：英文小写 kebab-case，3-5 个
- 覆盖维度：能力（capability）、场景（scenario）、领域（domain）
- 入库和搜索共用同一份 tag 定义和 LLM prompt

### 4.2 入库链路
```
SKILL.md → LLM（已知 tag schema）→ 产出 tags → 写入 registry entry
```

### 4.3 搜索链路
```
input prompt → LLM（已知 tag schema）→ 产出 query tags → 匹配 skill tags → 返回候选
```

---

## 5. 关于 subagent 身份缺失的风险

main agent 通常通过路由表匹配 subagent 类型，有更多上下文信息。而我们缺少这层上下文。解决方案：
- API 允许传入可选的 **subagent 身份提示**（任意字符串，不需真正路由定义）
- 仅作为检索阶段的额外上下文信号
- 不参与实际路由决策

---

## 6. betterWorkflow 在 plan review 中的作用

betterWorkflow 应在审视一个 plan 时提供：
- goal 是否合理清晰
- 交付物是否明确可验收
- 是否需要额外 constrain
- 推荐用什么 workflow 推进
- 每个 task 是否 atomic（非 milestone 时不能是复合任务）

---

## 7. 当前状态（2026-05-28）

- ✅ 页面展示已从 JSON 本体升级为文档式结构
- ✅ betterPrompt 已实现 direct-read SKILL.md 内联（不暴露技能名）
- ✅ finalGuidance 已从输入复述升级为任务专属分析
- 🔄 tag 体系设计已完成，代码实现进行中
- ⬜ direct-read 主链质量验证待完成
- ⬜ 中间产物层评估待 direct-read 验证后决定
