# SkillForge B1 最小追溯证据位说明（v1）

## 1. 目的与边界
本文档只定义 B1 运行中心“最小可追溯展示”，不扩展到自动化、跨域治理看板或复杂追溯系统。

## 2. 口径声明
- 业务状态机用于描述对象所处业务阶段。
- `已实现 / 已验证 / 未验证` 用于描述证据层级，不替代业务状态机。

## 3. 最少状态位
### 3.1 对象状态位
- PromptDraft：`Draft / ReadyForPlan / LockedForApproval / ApprovedForRun / Superseded`
- StepPlan：`Draft / ReadyForApproval / LockedForApproval / ApprovedForRun / Executed / Superseded`

### 3.2 链路门禁状态位
- 是否满足“可提交审批包”
- 是否存在“关键字段变更待同步确认”
- 是否处于“锁定审批态”

### 3.3 证据口径状态位
- `已实现 / 已验证 / 未验证`

## 4. 最少版本位
### 4.1 对象版本锚点
- PromptDraft：`id + version + updatedAt + owner + taskRef`
- StepPlan：`id + version + updatedAt + owner + taskRef + promptDraftRef`

### 4.2 审批绑定版本锚点
- 审批通过的是哪个 PromptDraft 版本
- 审批通过的是哪个 StepPlan 版本

### 4.3 执行消费版本锚点
- Run 对应消费的 StepPlan 版本
- Run 关联的 PromptDraft 版本

## 5. 最少关联关系
- `Task ↔ PromptDraft ↔ StepPlan ↔ Approval ↔ Run`
- StepPlan 必须显式绑定 `promptDraftRef(版本级)`
- 审批对象需可识别为“PromptDraft + StepPlan 提交包”
- 审批完成后可稳定回跳到对应 run / task 上下文

## 6. B1 足够的最小证据卡片
1. 当前链路位置卡：编排 / 审批 / 执行 / 回看
2. 对象状态快照卡：PromptDraft / StepPlan 当前状态
3. 版本快照卡：当前版本、更新时间、责任人
4. 提交包快照卡：锁定的版本对（PD vX + SP vY）
5. 审批结论快照卡：通过 / 驳回 / 补充及对应版本对
6. 执行绑定快照卡：Run 绑定的获准版本对
7. 最小检查摘要卡：完整性 / 一致性 / 来源 / 状态 / 变更 / 可追溯检查结果

## 7. 暂不纳入 B1 的证据位
- 自动化差异分析与自动冲突修复证据
- 审批策略引擎细粒度命中解释树
- 深度可视化编排器级过程证据
- 执行结果自动反哺 Prompt / StepPlan 的智能闭环证据
- 跨任务 / 跨域治理看板级聚合证据
- Skeleton 评分推荐与全链路质量评分证据

## 8. 对外表述模板
- 已实现：B1 已建立最小追溯证据位定义。
- 已验证：当前已验证的是最小链路证据展示所需对象与状态口径。
- 未验证：复杂追溯系统、跨域治理聚合与自动化证据机制不在本阶段验证范围内。
