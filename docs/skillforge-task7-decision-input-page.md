# SkillForge Task7 验收裁决输入页（负责人/用户拍板前）

> 定位：这是一页“裁决输入材料”，用于负责人/用户亲自做最终判断。
> 口径：当前结论仅为**已具备提交负责人裁决的条件**，不是“已验收通过”。

## 0) 裁决范围（只看 Task4/5/6/7 核心链路）

- Task4：LLM Skill 语义抽取中间产物是否可稳定产出并可被下游消费
- Task5：是否基于真实样本产出高价值 workflow / plan suggestion
- Task6：是否基于上游产物产出高价值 prompt guidance
- Task7：是否已用真实 session 样本证明以上三项在真实链路中可用、且能减轻主 agent 认知负担

---

## 1) 核心功能三项是什么

1. **Skill 语义抽取中间产物（Task4）**
   - 从不规则 skill md 注册后，产出可消费的 semanticAsset（knowledge / constraints / norms / guidance / workflow skeleton 等）
   - 质量门禁要求：`quality.passed=true`，并保留 extractor 与 model 来源信息

2. **betterWorkflow / betterPlan suggestion（Task5）**
   - 以 goal/context/constraints + semanticAsset 生成 milestones、atomic tasks、依赖关系建议
   - 不只是“写个计划壳”，而是要减少主 agent 的拆解负担

3. **betterPrompt guidance（Task6）**
   - 基于 semanticAsset + workflow/plan suggestion 生成更短、更稳、可执行的 prompt guidance
   - 目标是减少主 agent 自行拼接上下文与 skill 原文的负担

---

## 2) 当前真实样本主证据（Task7 文档）

主证据来源：`docs/skillforge-task7-session-samples.md`

- **高质量 sessions_spawn 证据**：SF-T7-001 / 002 / 003
  - 特征：目标、边界、输出格式一次写清，子任务可直接执行
- **高质量 plan_write 主链证据**：SF-T7-004
  - 特征：用户规则→计划目标→约束→任务拆解→工具回执完整可追溯
- **成对样本（plan_write + sessions_spawn + 后续执行）**：SF-T7-005
  - 特征：先建回归任务 plan，再下发 research，后续 coder/verify 链路可见，形成闭环
- **低分边界反例**：SF-T7-008
  - 特征：同主题重复写 plan、路径漂移、最终定稿锚点弱，认知减负不稳定

---

## 3) 高质量正例 / 成对样本 / 低分反例

### A. 高质量正例（单工具强样本）
- **SF-T7-004（plan_write）**
  - 优点：规则明确、任务拆解清楚、工具回执完整，执行方向稳定
- **SF-T7-001/002/003（sessions_spawn）**
  - 优点：下发 prompt 结构化强，边界与输出格式明确，二次沟通成本低

### B. 成对样本（闭环主证据）
- **SF-T7-005（plan_write + sessions_spawn）**
  - 价值：证明“计划定义”和“原子下发”不是割裂动作，而是连续可执行链路

### C. 低分反例（边界）
- **SF-T7-008**
  - 价值：提醒我们即使单次文本看似合格，若出现多次重写/路径漂移/定稿不清，仍会拉高主 agent 负担

---

## 4) 为什么内部认为“已具备提交负责人裁决条件”

1. **三项核心功能都有真实链路证据，不只合成样本**
   - Task4/5/6 在主计划中已有最小实现与样本验证记录
   - Task7 文档补上了 sessions 中的真实证据卡

2. **已有高质量正例 + 成对闭环 + 低分反例**
   - 不只有“成功案例展示”，也有反例用于界定边界

3. **可回答负责人最关键问题：是否在减负**
   - 高质量样本显示：目标与边界一次明确、执行指令结构稳定、回执可追溯
   - 反例显示：当定稿锚点缺失时会增加负担（即识别到了失败模式）

> 结论口径：**已具备提交负责人裁决的条件**。

---

## 5) 仍保留的风险 / 不确定点

1. **跨 agent 的 plan_write 强样本仍偏少**
   - 当前高强度 `plan_write` 证据更集中在 organizer 线
2. **部分样本中 plan_write 直接原文命中不足**
   - 如 SF-T7-001/002/003 的 `plan_write` 片段标注“待补”
3. **“最终定稿锚点”机制在低分场景下仍不稳定**
   - SF-T7-008 显示重复写入/路径漂移会侵蚀认知减负

---

## 6) 必须由负责人/用户亲自验证后才能拍板的点

1. **主观价值判断**：这些 suggestion/guidance 是否达到“好用到非用不可”
2. **真实工作流适配度**：在你最常用的任务类型下，是否明显减少来回澄清与二次拆解
3. **容错可接受性**：对 SF-T7-008 这类边界情况，现有风险是否在你可接受范围
4. **通过门槛口径**：是按“当前可用即通过”，还是按“跨 agent 证据更均衡后再通过”

---

## 7) 给负责人/用户的裁决选项（建议）

- **A. 通过（Pass）**：认可当前证据已满足 Task7 最低门槛
- **B. 条件通过（Pass with conditions）**：先通过，但要求补齐指定缺口（如跨 agent plan_write 样本）
- **C. 暂不通过（Partial/No）**：要求先补充证据后再裁决

> 本页不代替裁决，仅提供可追溯输入。最终结论以负责人/用户亲自判断为准。