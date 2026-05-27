# Responsible View Contract

## 目标

本契约定义负责人在 Web 端查看审批记录与运行记录时必须具备的人类可读字段，确保负责人能够回答以下 6 个问题：

1. 这是什么？
2. 它为什么出现？
3. 它由什么输入/需求触发？
4. 它会影响什么？
5. 风险为什么是这个等级？
6. 最后产出了什么结果？

---

## 一、审批记录负责人视图字段

| 字段名 | 类型 | 语义说明 | 示例值 | 数据来源策略 |
| --- | --- | --- | --- | --- |
| `title` | string | 审批对象的人类主标题，负责人第一眼看到的名称 | `技能生命周期测试：过期审批流` | 优先取业务标题；无则取 summary 生成；再无则从 fixtureId 提取可读部分 |
| `objectType` | string | 该审批对象属于什么类型 | `技能审批` / `运行审批` / `外部访问审批` | 优先取显式对象类型；无则按 risk/source 推断 |
| `purpose` | string | 该审批为什么会出现，核心目的是什么 | `验证过期技能的审批处理逻辑` | 优先取 summary/description；无则按 fixture/risk 模板生成 |
| `sourceRequirement` | string | 该审批由什么需求、任务或输入触发 | `生命周期测试 fixture` | 优先取 source/input requirement；无则从 source 路径和关联运行生成 |
| `inputSummary` | string | 输入内容的简述 | `触发一条过期技能审批记录用于验证审批状态机` | 优先取运行输入摘要；无则从 sourceRequirement/purpose 合成 |
| `impactScope` | string[] | 它会影响什么对象或状态 | `["审批状态", "风险记录", "运行门禁"]` | 优先取显式影响范围；无则按 riskType/approvalType 模板推断 |
| `riskLevel` | string | 风险等级 | `high` / `medium` / `low` | 直接取 severity，标准化映射 |
| `riskExplanation` | string | 为什么是这个风险等级 | `该操作会改变审批状态并影响后续执行放行` | 优先取风险说明；无则按 riskType + severity 模板生成 |
| `statusNarrative` | string | 当前状态的人类叙述 | `待审批，尚未做出人工决策` | 由 approvalStatus/reviewStatus 映射生成 |
| `outputSummary` | string | 审批完成后将产出或已经产出的结果 | `生成审批决策并更新历史记录` | 优先取 output/result；无则按审批类型模板生成 |
| `resultSummary` | string | 当前已知结果摘要 | `当前仍待审批，尚未产生最终决策` | 由 approvalStatus + reviewStatus + output 合成 |
| `traceHint` | string | 追踪入口提示，便于负责人继续下钻 | `可继续查看关联运行、风险事件与证据锚点` | 固定提示 + 关联对象信息 |

---

## 二、运行记录负责人视图字段

| 字段名 | 类型 | 语义说明 | 示例值 | 数据来源策略 |
| --- | --- | --- | --- | --- |
| `title` | string | 运行记录的人类主标题 | `E3A 正向验证：审批通过场景` | 优先取运行标题/workflow 标题；无则用 source + runId/fixtureId 生成 |
| `objectType` | string | 运行对象类型 | `工作流运行` / `技能运行` / `验证运行` | 优先取 workflow/skill 类型；无则按 source 推断 |
| `purpose` | string | 这次运行的目的 | `验证审批通过后的执行闭环` | 优先取 workflow 说明 / run summary；无则模板生成 |
| `sourceRequirement` | string | 触发该运行的来源需求 | `负责人从运行中心发起 E3A 验证` | 优先取 source + 关联请求；无则从 source 字段映射 |
| `inputSummary` | string | 运行输入摘要 | `输入为一条正向审批样本，预期执行成功并写回结果` | 优先取 input；对象则摘要化；无则根据上下文生成 |
| `impactScope` | string[] | 会影响哪些对象 | `["运行状态", "审批链路", "结果记录"]` | 优先取 step/effect 描述；无则按 source/status 模板推断 |
| `riskLevel` | string | 本次运行的风险等级 | `medium` | 优先取关联审批/运行风险；无则 `none/low` |
| `riskExplanation` | string | 风险等级原因 | `本次运行会穿过审批与执行链路，但不直接修改生产业务数据` | 优先取显式说明；无则模板生成 |
| `statusNarrative` | string | 当前运行状态的人类叙述 | `已完成，执行过程无失败步骤` | 由 run status + step summary 生成 |
| `outputSummary` | string | 运行产物摘要 | `生成执行结果、步骤记录与证据锚点` | 优先取 output/result；无则按运行类型模板生成 |
| `resultSummary` | string | 当前结果摘要 | `运行成功，输出已写入结果记录` | 由 status + output/result 合成 |
| `traceHint` | string | 负责人下一步可查看什么 | `可查看步骤详情、审批链路与结果证据` | 固定提示 + 关联对象信息 |

---

## 三、统一兜底规则

### 1. 标题生成规则

优先级：
1. 显式业务标题
2. summary/description 生成标题
3. source requirement 提炼标题
4. fixtureId / runId 提取可读部分

禁止直接把原始 `fixtureId` / `runId` 作为主标题，除非没有任何其他信息，并且需要经过可读化处理。

### 2. 风险解释规则

不能只展示 `high / medium / low` 或 `code_change / privilege_escalation`。
必须同时给出一句负责人能理解的话，例如：
- `高风险：该操作会影响审批状态并改变后续是否放行执行`
- `中风险：该运行会穿过真实执行链路，但不会直接修改生产数据`
- `低风险：该操作仅用于只读验证或证明链路可达`

### 3. 输入/输出摘要规则

若原始 `input` / `output` 为对象：
- 页面主视图显示摘要文本
- 详情页允许展开原始结构
- 摘要必须先说目的，再说关键对象，再说结果

### 4. 负责人视图优先级规则

页面主区只展示负责人字段，不把内部字段作为主信息区内容。
内部字段（如 `fixtureId` / `runId` / `lastEventId`）只能放在 trace / technical details 区域。

---

## 四、最小字段总数

- 审批记录负责人视图：12 个字段
- 运行记录负责人视图：12 个字段
- 核心共享语义：`title / objectType / purpose / sourceRequirement / inputSummary / impactScope / riskLevel / riskExplanation / statusNarrative / outputSummary / resultSummary / traceHint`
