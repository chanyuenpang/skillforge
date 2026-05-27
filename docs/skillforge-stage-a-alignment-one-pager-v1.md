# SkillForge 阶段A对象对齐清单（One Pager）

## 目标
仅对齐阶段 A 的对象定义、命名、承载位、验证状态与阶段边界，为后续 PromptDraft / StepPlan / Skeleton / Registry spec 定稿提供统一起点。

## 对象-承载位（当前）
1. **Task Prompt Spec**：定义于 `docs/skillforge-product-charter-v1.md`；治理要求位于 `docs/skillforge-roadmap-and-doc-governance-v1.md`（阶段A需定稿）。
2. **PromptDraft**：定义于 `docs/skillforge-web-ia-and-module-layering-v1.md` 对象映射；归属运行中心编排。
3. **StepPlan**：定义于 `docs/skillforge-web-ia-and-module-layering-v1.md` 对象映射；归属运行中心编排。
4. **Skeleton**：定义于 `docs/skillforge-product-charter-v1.md`，落位于知识与资产，治理要求位于 roadmap。
5. **Run**：定义于 `docs/skillforge-product-charter-v1.md`，承载于运行中心。
6. **Approval**：定义于 `docs/skillforge-product-charter-v1.md`，承载于审批与风控。
7. **Knowledge Asset**：承载于知识与资产模块，子域 spec 待独立化。
8. **Registry**：定义于 `docs/skillforge-product-charter-v1.md`，子域 spec 待独立化。

## 命名统一规则（阶段A必须完成）
1. 固定 **Task Prompt Spec（规范态） / PromptDraft（编辑态）** 的上下位关系。
2. 固定主名为 **Skeleton**；`Workflow Skeleton / Plan Template` 仅作别名注释。
3. 固定主名为 **Run**；`ExecutionRun` 仅作实现层命名。
4. 区分对象名 **Knowledge Asset** 与导航名 **知识与资产**。
5. 明确 **Approval（父）- ApprovalRequest / ApprovalDecision（子）** 层级。

## 验证状态口径（阶段A）
- **已验证**：
  - Run 最小非空样本（见 `.claw/truth/skillforge-第二阶段增强真相.md`）
  - `skill-fixture` 命令样例抽测（见 `.claw/truth/skillforge-第二阶段增强真相.md`）
- **未验证 / 待固化**：
  - Task Prompt Spec 独立结构定稿
  - PromptDraft / StepPlan 可操作闭环
  - Skeleton 结构规范与应用链路
  - Registry 子域 spec

## 阶段边界声明
- **阶段A**：完成对象定义与文档承载位收敛，并形成最小可追溯闭环。
- **阶段B**：在阶段A已收敛基础上推进可编辑、可提交、可追溯的运行与资产操作闭环。
- **禁止跨界表述**：不得把“定义存在/代码存在”表述为“全量验证完成”。
