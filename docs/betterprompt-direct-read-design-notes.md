# betterPrompt 直接读取技能原文设计笔记

更新时间：2026-05-28

## 背景

本轮围绕 betterPrompt 的核心问题进行了多次纠偏。最初的问题并不是“结构化字段不够多”，而是：

1. 页面现场看到的内容仍然是 JSON 本体，而不是可读文档。
2. betterPrompt 的输出逻辑仍然在暴露技能名称，例如 `Coding Agent Workflow`、`Prompt Design`。
3. betterPrompt 的内容经常停留在“建议/模板”层，而不是一步到位、可直接扔给 subagent 的 prompt。

在现场修复展示问题之后，讨论逐渐收敛到 betterPrompt 的真实设计目标。

---

## 当前共识

### 1. betterPrompt 的真正目标

betterPrompt 的真正 output，不应该是一堆细碎的结构化数据块，而应该是一段：

- 可以一步到位使用
- 可以直接扔给 subagent 执行
- 不暴露内部技能名称
- 尽量减少用户和 main agent 的二次加工

也就是说，最终产物应当更像一个“高质量目标 prompt”，而不是一个“供人再拼装的半成品”。

### 2. 技能名称不应暴露给下游

当前明确的设计要求：

- 下游 prompt 正文中 **不应出现任何技能名称**。
- 技能名称是内部资产，不应作为最终交付的一部分暴露给第三方 agent。
- 即使内部选中了 skill，最终也应该把 skill 的内容转换成对下游可直接使用的执行规范，而不是说“请使用某某技能”。

### 3. tag 是一等产物

tag 不是附带 metadata，而是系统的重要维护产物。

原因：

- skill 入库时需要用 tag 表达 skill 的核心能力、适用场景、领域和约束
- 搜索 skill 时，LLM 需要依据相同语义空间的 tag 去做匹配
- skill 拆分和 skill 搜索，依赖的是同一套 tag 语义

因此：

- tag 需要被维护
- tag 语义需要稳定
- skill 入库和 prompt 搜索必须共用同一套 tag 语义空间

### 4. 中间产物不是必选层

曾经的设想是：

- 从 skill 中先拆出 workflow skeleton、knowledge、constrain 等中间产物
- 再基于这些中间产物重组 prompt

但最新共识是：

> 中间产物提取不是目标，只是手段。

它存在的唯一理由，是：

1. 降低对 LLM 能力的要求
2. 降低 token 成本
3. 提高生成稳定性

如果达不到这些收益，那么完全可以跳过这一步。

也就是说，理论上如果 LLM 足够强，那么可以直接：

```text
命中 skill
→ 直接读取 skill 原文
→ 结合原始 prompt + law prompt
→ 直接生成 output prompt
```

这条 direct-read 主链，在理论上就已经成立。

因此，中间产物层的正确定位应该是：

- **不是前置依赖**
- **而是可选优化层**

---

## 当前推荐路线

### 第一优先级：验证 direct-read 主链

优先验证：

```text
命中 skill
+ 直接读取 SKILL.md 原文
+ 原始 prompt
+ law prompt
→ 直接生成高质量 output prompt
```

这里要验证的是：

- 质量是否已经足够好
- 是否足够自包含
- 是否没有技能名称泄露
- token 是否还能接受
- 是否真的能直接扔给 subagent

### 第二优先级：再决定是否引入中间产物层

只有当 direct-read 主链被证明存在明显问题时，才考虑增加中间产物层，例如：

- prompt 太长
- 噪声太多
- skill 原文中与当前任务无关的内容太多
- LLM 重组稳定性不够

届时中间产物层的价值才成立。

---

## 期望中的完整 betterPrompt 流程

### 基础版（当前优先）

```text
注册 skill
→ 自动打 tag
→ 用户输入 prompt
→ LLM 分析 prompt，产出语义 tag
→ 根据 tag 匹配 skill
→ 直接读取命中的 SKILL.md
→ 结合原始 prompt + law prompt
→ 生成最终 output prompt
```

### 增强版（可选优化）

```text
注册 skill
→ 自动打 tag
→ 按需提取 workflow / knowledge / constrain 中间产物
→ 用户输入 prompt
→ LLM 分析 prompt，产出语义 tag
→ 匹配 skill + 中间产物
→ 基于材料重组最终 output prompt
```

增强版是否值得做，取决于：

- 是否明显降低 token
- 是否明显提升稳定性
- 是否减少噪声
- 是否让最终 prompt 更接近用户想要的“一步到位”

---

## 关于 main agent / subagent 上下文差异的风险

一个重要风险点是：

- main agent 在正常路由 subagent 时，可能拥有更多路由表上下文
- betterPrompt 独立工作时，可能缺失这部分上下文

为缓解这个风险，建议 API 允许 main agent 传入一个：

- **可选的 subagent 身份提示**

这个身份提示：

- 不是完整的 subagent 定义
- 不是路由表
- 只是一个附加上下文，用来帮助检索和 prompt 重组

这样可以减少“输出 prompt 很好，但跟目标 subagent 的工作方式不贴合”的风险。

---

## 当前判断标准

后续判断 betterPrompt 是否成功，不应只看字段多不多，而应看：

1. **是否不再暴露技能名称**
2. **是否能让下游 agent 直接执行**
3. **是否明显减少用户/主代理的二次加工**
4. **是否真的比直接把 skill 名塞进去更值钱**
5. **是否在质量、稳定性和 token 成本之间取得合理平衡**

---

## 下一步建议

1. 先完成 direct-read 主链的现场验证与质量判断
2. 明确 direct-read 的优点、问题和唯一缺口
3. 只有在 direct-read 明显不足时，再考虑设计中间产物层
4. 同时尽快把 tag schema 设计成共享语义空间，以便 skill 入库与 skill 搜索共用

---

## 一句话总结

> betterPrompt 的目标不是“把 skill 解释给人听”，而是“把 skill 消化后，直接吐出一段可执行 prompt”。
>
> 中间产物不是信仰，只在它确实能降低 LLM 负担、降低 token 成本、提升稳定性时才值得引入。
