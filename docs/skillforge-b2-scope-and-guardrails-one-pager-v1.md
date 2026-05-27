# SkillForge B2 范围与边界守门说明（一页版）

## 一句话定位
B2 仅用于固化“任务编排独立路径产品化”的问题陈述与边界口径，不扩展为后续阶段能力承诺。

## 本阶段只解决
- PromptDraft / StepPlan 的独立路径边界说明
- 与 Approval / Run 前后关系的口径统一
- 任务编排可操作主链叙述一致性
- `已实现 / 已验证 / 未验证` 的状态分层与证据锚点规范

## 明确不做
- 自动 prompt 生成、自动步骤拆解、自动策略优化
- 复杂可视化编排器、跨任务智能推荐
- Skeleton 深能力、评分推荐、场景化推荐
- 跨域深联动、规模化治理承诺
- 提前包装 B3 / B4 的结果为 B2 已交付内容

## 状态口径规则
### 已实现
代码 / 路由 / API / 对象定义已存在或已接入，但不代表该路径已充分验证。

### 已验证
有真实样本或明确测试动作证明闭环可用，不是仅代码存在。

### 未验证
分支已实现但未完成独立抽测，或仅空数据闭环未覆盖业务数据 happy path。

### 红线
必须区分 `已实现 / 已验证 / 未验证`，禁止混写成单一“已完成”。

## 禁用表述清单
- B2 已完成任务编排能力闭环 / 全量上线
- PromptDraft / StepPlan 已可稳定支撑生产级编排
- 运行中心能力已全面验证（含业务数据）
- 代码已实现 = happy path 已验证通过
- 第一刀成立 = 模块成熟可规模化运营
- 已具备智能编排 / 自动优化 / 自动推荐能力
- Skeleton 已完成质量评分与场景推荐
- B2 已覆盖跨域深治理与对象全链自动联动

## 证据锚点最小集
- `docs/skillforge-roadmap-and-doc-governance-v1.md`
- `docs/skillforge-run-center-domain-spec-v0.1.md`
- `docs/skillforge-b1-first-batch-workbench-actions-v1.md`
- `docs/skillforge-web-ia-and-module-layering-v1.md`
- 必要时参考：`docs/skillforge-product-charter-v1.md`

## 收口句
B2 对外只承诺“边界清晰、口径一致、状态可审计”，不承诺 B3 / B4 结果。