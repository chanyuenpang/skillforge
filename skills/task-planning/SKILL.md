---
name: task-planning
version: 1.0.0
description: "任务规划技能 - 指导 Leader Agent 进行复杂任务的分解、调度与执行规划"
metadata:
  openclaw:
    emoji: "📋"
    priority: high
    type: skill
---

# Task Planning - 任务规划技能

## 技能定位

本技能是 **Leader Agent 的规划能力补充**，在复杂任务场景下被激活。

### "先侦察再行动"原则

派发实施任务前，必须确认外部集成点已被**现场验证**，不依赖记忆假设：

| 外部依赖 | 验证方式 |
| ---- | ---- |
| CLI 工具 | 运行 `--help` 确认参数语法 |
| 外部 API | 确认实际请求/响应格式 |
| 运行环境 | 检查工具位置、版本、PATH |

> ⚠️ 基于记忆假设外部接口行为是导致任务失败的主要原因之一。

***

## 任务分解方法论

### 原子性原则

| 职责类型 | 处理方式 |
| ---- | ---- |
| 实现（写代码） | 独立任务 |
| 验证（测试/lint） | 独立任务 |
| 审查（Code Review） | 独立任务 |

**禁止**在一个任务中混合多种职责。

> ⚠️ subagent 无法二次拆分任务，要基于这个认知来派遣 subagent

### 任务定义模板

```yaml
objective: "这个任务要达成什么"           # 必填
scope:
  include: "覆盖哪个模块/功能区域"
  exclude: "明确非目标"
inputs: "执行此任务需要的前置信息或产物"
expected_output: "任务完成后应交付什么"
done_criteria: "如何判断任务真正完成"
dependencies: ["task-id-1"]              # blockedBy 关系
```

### 分解粒度判断

* **多专家原则**：任务需要 ≥2 个不同领域专家 → 继续分解
* **描述长度原则**：任务描述 >3 句话 → 考虑细化
* **共享基础件优先**：公共工具、配置、数据模型 → 独立任务优先

### 需求拆解 5 步流程

```
1. 理解意图边界
      ↓
2. 识别涉及模块/文件
      ↓
3. 找出共享依赖和基础件
      ↓
4. 按"基础件 → 核心逻辑 → 集成 → 验证"组织
      ↓
5. 标注阻塞关系（blockedBy）
```

### 依赖图构建

```
基础任务（无依赖）
    │
    ├──► 任务A（依赖基础）
    │       │
    │       └──► 任务C（依赖A）
    │
    └──► 任务B（依赖基础）  ←── 可与 A 并行
```

***

## 调度编排策略

### 并行 vs 串行决策

| 条件 | 策略 |
| --- | --- |
| 不同模块、无共享文件 | ✅ 并行派遣 |
| 同一模块、不同文件 | ⚠️ 评估风险后决定 |
| 可能触及同一文件 | ❌ 强制串行 |
| 不确定是否有冲突 | ❌ 默认串行 |

### 批量派发时机

```
每轮任务板检查：
  1. 识别所有 blockedBy 已满足的任务
  2. 按模块分组，排除冲突
  3. 同一轮全部派发（减少调度延迟）
```

### 冲突预防检查项

* [ ] 并行 Coding 专家负责不同模块？
* [ ] 无两个专家修改同一文件？
* [ ] 共享区域（如配置文件）已串行化？
* [ ] API 契约已定义并共享给所有相关专家？

### API 契约对齐实操

```typescript
// 在每个相关专家的 prompt 中逐字写入相同的契约
interface ApiContract {
  endpoint: "/api/v1/resource";
  method: "POST";
  request: { field: string; /* ... */ };
  response: { id: string; /* ... */ };
}
```

***

## 动态调整与重规划

### 重规划触发条件

* [ ] 新需求出现或需求变更
* [ ] 意外阻塞无法局部修复
* [ ] 调研结果推翻之前假设
* [ ] 范围变更导致任务分解不合理

### 重规划操作流程

```
1. 审计当前状态
   └── 查看所有任务状态和运行中 agent

2. 显式更新任务状态
   └── 取消的任务标记 cancelled，不默默丢弃

3. 与运行中 agent 沟通
   └── 范围变更时发送明确指令

4. 保护已完成工作
   └── 已 completed 的任务保持不变
   └── 除非用户明确要求或新依赖使之无效

5. 正确设置新任务依赖
   └── 新任务的 blockedBy 必须正确
```

### 阻塞处理决策

| 情况 | 操作 |
| --- | --- |
| 运行中 agent 即将解决阻塞 | 等待 |
| 运行中 agent 范围与修复重叠但可调整 | 发送修订指令 |
| 运行中 agent 工作已被失败结果废弃 | 发送停止指令，派发替代 |

***

## 规划输出与计划文档结构

先按下面这套结构思考“一个好的执行计划长什么样”，再把它落成 `plan_write` / `plan_edit` 所需的 JSON。也就是说：**推荐的计划模板，就是 PlanDocument 的语义展开版**，不是上面写 Markdown、下面再单独拼另一套 JSON。

### 推荐的计划结构

一个完整执行计划通常包含以下信息：

```markdown
# 执行计划：[任务名称]

## 复杂度评估
- 评分：X 分（简单/中等/复杂）
- 判断依据：[文件数、模块数、依赖关系等]

## 涉及模块
| 模块 | 文件 | 说明 |
|------|------|------|
| auth | src/auth/*.ts | 认证模块 |

## 任务依赖图
[Mermaid 图或文字描述]

## 任务列表

### Task-1: [任务名称]
- status: pending
- objective: ...
- scope: include: ... | exclude: ...
- inputs: ...
- expected_output: ...
- done_criteria: ...
- dependencies: []
- assigned_to: Coding Agent

### Task-2: [任务名称]
- status: blocked
- dependencies: [1]
- ...

## 共享基础件
- [ ] 公共类型定义：...
- [ ] 配置文件修改：...

## API 契约
[如有跨模块协作，定义接口契约]

## 风险点
| 风险 | 应对策略 |
|------|----------|
| ... | ... |

## 预期流水线
[根据变更类型选择的标准流程]
```

其中可以分成两层理解：

* **文档级信息**：计划标题、整体状态、复杂度评估、涉及模块、依赖图、共享基础件、API 契约、风险点、预期流水线、阶段性总结
* **任务级信息**：每个 Task 的 id、标题、状态，以及 objective / scope / inputs / expected_output / done_criteria / dependencies / assigned_to / detail 等执行说明

### 如何映射到 `plan_write` 的 JSON

正式写入时，以上结构要收敛为 `PlanDocument`。最小可用结构如下：

```json
{
  "title": "项目 TODO 功能",
  "status": "active",
  "summary": "复杂度中等；先完成基础件，再推进核心逻辑与验证。",
  "tasks": [
    {
      "id": 1,
      "title": "扩展 plan_edit 支持 appendTasks",
      "status": "pending",
      "detail": "objective: 支持通过 appendTasks 追加任务；scope: include plan_edit 参数解析，exclude 旧文本替换模式；dependencies: []"
    },
    {
      "id": 2,
      "title": "补充回归验证",
      "status": "blocked",
      "detail": "expected_output: 验证 appendTasks 生效；done_criteria: 用例通过；dependencies: [1]"
    }
  ]
}
```

对应关系如下：

| 推荐计划结构 | PlanDocument 字段映射 |
| --- | --- |
| `# 执行计划：[任务名称]` | `title` |
| 计划整体阶段/完成情况 | `status` |
| 复杂度评估、涉及模块、依赖图、共享基础件、API 契约、风险点、预期流水线、阶段性总结 | `summary` |
| `### Task-N: [任务名称]` | `tasks[].id` + `tasks[].title` |
| 任务当前状态 | `tasks[].status` |
| objective / scope / inputs / expected_output / done_criteria / dependencies / assigned_to 等细节 | `tasks[].detail` |

### PlanDocument schema（最小可用）

字段要求：

* `title`: 非空字符串
* `status`: `active` / `completed` / `cleared`
* `tasks`: 非空数组
* `tasks[].id`: 正整数，且唯一
* `tasks[].title`: 非空字符串
* `tasks[].status`: `pending` / `in_progress` / `done` / `blocked`
* `summary`、`tasks[].detail` 为可选字段

### 计划编写工具

Leader Agent 在制定执行计划时，应使用以下专用工具：

| 工具 | 用途 | 使用场景 |
| --- | --- | ---- |
| `plan_write` | 创建新的计划文档 | 首次制定执行计划时 |
| `plan_edit` | 编辑现有计划文档 | 需要更新、调整计划内容时 |

**使用原则**：

* 所有计划文档必须通过这两个工具写入，确保计划的结构化和可追溯性
* 计划文档存放在 task 文件夹中
* 正式规划时，`plan_write` 的 `content` **必须是 JSON 字符串**，并符合 `PlanDocument` schema
* 写计划时，优先先按上面的推荐结构把内容想清楚，再压缩映射到 `title` / `status` / `summary` / `tasks[]`
* 使用 `plan_edit` 调整计划时，应保持已有 completed 任务不变，仅更新待执行或受阻的任务

### 工具调用约定

* `plan_write`: `{ filePath, content }`，其中 `content` 为完整 JSON 字符串
* `plan_edit`:
    * 更新任务状态：`{ filePath, taskId, status }`
    * 追加任务：`{ filePath, appendTasks: [{ title, detail? }] }`
    * 两种模式可兼容同次调用，但不再支持旧的 `oldText/newText` 文本替换模式

***

## 快速参考卡

```
复杂度评估 ──────► 简单 → 直接派遣
                 中等 → 轻量规划
                 复杂 → 正式规划

任务分解 ────────► 基础件 → 核心逻辑 → 集成 → 验证

并行条件 ────────► 不同模块 + 无共享文件

流水线选择 ──────► 微小：Code→Verify
                 多模块：独立流水线 + 统一Review
```

***

> **工具权限说明**：Leader 自身没有代码文件写入权限，但可以通过 `plan_write` 和 `plan_edit` 工具在 task 文件夹中写入和管理计划文档。