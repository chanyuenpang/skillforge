# SkillForge Task 7 Session 真实样本库

> 目的：沉淀 Task 7 验收所需的 OpenClaw sessions 真实样本，后续可直接复用，不必每次临时收集。
>
> 使用范围：优先用于验收 `plan_write` 文本质量、`sessions_spawn` 下发质量，以及它们是否真正降低主 agent 的认知负担。

## 使用规则

- 主证据优先级：OpenClaw sessions 真实样本 > 仓库脚本样本 > 推断
- 每次新增样本时，至少记录：输入、输出、评分、简评
- 输入重点保留：真实 `plan_write` 文本、真实 `sessions_spawn` 文本、必要的原始 task 描述
- 输出重点保留：生成的计划文本、subagent 任务文本、执行/验收回执
- 评分统一使用 1-5 分制：清晰度 / 可执行性 / 认知减负 / 总分

## 样本模板

### 样本 ID
- 来源会话：
- 来源时间：
- 任务主题：

#### 输入
- 原始 task / 用户要求：
- `plan_write` 文本：
- `sessions_spawn` 文本：

#### 输出
- 计划产物：
- 下发产物：
- 执行/验收回执：

#### 评分
- 清晰度：/5
- 可执行性：/5
- 认知减负：/5
- 总分：/5

#### 简评
-

---

## 已收集样本

### 样本 SF-T7-001
- 来源会话：`agent:feishu-mingyue:feishu:direct:ou_38ed998822b057fd474cab3a65367915`
- 来源时间：2026-05-28
- 任务主题：P0-01 命名重对齐 research 下发
- 最小溯源：`sessions_history(...includeTools=true)` 命中 `sessions_spawn`，label=`p0-01-naming-realign-以资源编辑器命名重对齐`

#### 输入
- 原始 task / 用户要求：用户明确“当前不存在 location 命名，只有 settlement”，要求后续命名以资源编辑器真实命名为准。
- `sessions_spawn` 文本（原文节选）：
  - 工作目录：`/home/yankeeting/.openclaw/projects/tiny-world`
  - 任务目标：`把 P0-01 当前草案里的命名，按“资源编辑器真实命名”重新对齐，不改代码、不写计划文件。`
  - 强约束：
    - `命名必须以现有资源编辑器为准`
    - `当前不存在 location 命名，只有 settlement`
  - 输出要求：
    - `事实来源 / 真实命名清单 / 需要回退修正的占位命名 / 对 P0-01 的影响 / 建议的下一步`
- `plan_write` 文本：本次抽到的真实会话片段里未直接命中，待补

#### 输出
- 下发产物：形成了一个边界清楚的 research prompt，只做事实校正，不改代码、不写计划文件。
- 执行/验收回执：后续返回了结构化“命名重对齐清单”与事实来源说明，用于修正 P0-01 命名口径。

#### 评分
- 清晰度：5/5
- 可执行性：5/5
- 认知减负：5/5
- 总分：5/5

#### 简评
- 这是高质量 `sessions_spawn` 原文级样本：工作目录、上下文、只做什么/不做什么、输出结构都一次写清，主 agent 基本不用二次加工。

---

### 样本 SF-T7-002
- 来源会话：`agent:feishu:feishu:direct:ou_6c99bdd79dcac29f0dec7fa8fe187882`
- 来源时间：2026-05-28
- 任务主题：Task 7 真实样本验收续推进
- 最小溯源：`sessions_history(...includeTools=true)` 命中 `sessions_spawn`，label=`SkillForge Task 7 真实样本验收续推进`

#### 输入
- 原始 task / 用户要求：继续推进主计划，不中断任务链；对 Task 4/5/6 做负责人可用的验收复核。
- `sessions_spawn` 文本（原文节选）：
  - 工作目录：`/home/yankeeting/.openclaw/projects/workflow-kit`
  - 任务目标：`你这次只做 Task 7 的原子验收推进`
  - 验收焦点：`是否已经达到“高价值 guidance / suggestion，能明显减少主 agent 认知负担”的最低门槛`
  - 输出格式：
    - `Task4 verdict: pass / partial / fail + 证据`
    - `Task5 verdict: pass / partial / fail + 证据`
    - `Task6 verdict: pass / partial / fail + 证据`
    - `总体验收结论`
    - `最小缺口清单（最多 3 条）`
- `plan_write` 文本：本次抽到的真实会话片段里未直接命中，待补

#### 输出
- 下发产物：一个非常标准的“负责人验收 prompt”，把范围、口径、输出结构、停止边界一次锁死。
- 执行/验收回执：虽然该子任务后续因模型/连接问题未成功完成，但 prompt 本身已清楚展示出可执行验收结构。

#### 评分
- 清晰度：5/5
- 可执行性：4/5
- 认知减负：5/5
- 总分：5/5

#### 简评
- 即便执行失败，这条 `sessions_spawn` 文本仍是优质验收样本：它很好地体现了如何把“验什么、怎么判、不要发散到哪”一次说明白。

---

### 样本 SF-T7-003
- 来源会话：`agent:feishu:feishu:direct:ou_6c99bdd79dcac29f0dec7fa8fe187882`
- 来源时间：2026-05-28
- 任务主题：Task 7 Session 真实样本验收卡整理
- 最小溯源：`sessions_history(...includeTools=true)` 命中 `sessions_spawn`，label=`SkillForge Task7 Session真实样本验收卡整理`

#### 输入
- 原始 task / 用户要求：用户明确要求每组样本必须给出“测试输入 / 工具输出 / 我的评分”。
- `sessions_spawn` 文本（原文节选）：
  - 主证据要求：`必须来自 OpenClaw sessions 的真实样本，尤其是几个飞书 agent 的真实 plan_write 文本与 sessions_spawn 文本`
  - 最低样本数：`至少抽 3 组真实样本`
  - 评分维度：
    - `清晰度`
    - `可执行性`
    - `认知减负`
    - `总分（1-5）`
  - 输出格式：`### 样本 1 ... ### 汇总结论`
- `plan_write` 文本：本次抽到的真实会话片段里未直接命中，待补

#### 输出
- 下发产物：一个结构极强的“验收卡整理”prompt，直接把负责人所需卡片格式固定成模板。
- 执行/验收回执：成功产出了一版 Task 7 负责人验收卡草案，并明确给出“部分通过 + 最小缺口”。

#### 评分
- 清晰度：5/5
- 可执行性：5/5
- 认知减负：5/5
- 总分：5/5

#### 简评
- 这是目前最接近“可复用验收模板”的真实样本：输入结构、评分维度、总结格式都能直接复用。

---

### 样本 SF-T7-004
- 来源会话：`agent:feishu-organizer:feishu:direct:ou_a7956f92a580fdd3eea132985f93b295`
- 来源时间：2026-05-28
- 任务主题：修复子任务 done 不应自动完成计划（真实 `plan_write`）
- 最小溯源：`sessions_history(...includeTools=true)` 命中 `plan_write`，`filePath="fix-plan-task-done-should-not-auto-complete-plan/plan.json"`；后续同链路可见 `toolResult(plan_write)`、`switch_task`、`plan_edit`、`sessions_spawn`

#### 输入
- 原始 task / 用户要求：`理论上不管把子任务标记成多少次完成，它都不应该自动把这个计划给关闭掉。` 随后用户明确：`好的，把这个结论写到计划里面，然后去修复吧`
- `plan_write` 文本（原文节选）：
  - `filePath`: `fix-plan-task-done-should-not-auto-complete-plan/plan.json`
  - `title`: `修复子任务 done 不应自动完成计划`
  - `status`: `prepare.requirements`
  - `goal.text`: `修复 plan/task 状态机：无论子任务被标记 done 多少次，都不能自动把整份计划推进到 end.completed，也不能因此自动清掉 task scope。只有显式设置 planStatus=end.completed/end.closed/end.leave 时，计划才进入终态并触发对应收口逻辑。`
  - `rules` 节选：
    - `禁止通过 PlanTask.status 推断出 plan end.completed/end.closed/end.leave。`
    - `只有显式 planStatus=end.completed/end.closed/end.leave 才允许触发终态与 clearActiveTaskBinding。`
  - `tasks` 节选：
    - `确认现有自动完成链路与受影响场景`
    - `修复计划状态推断与终态触发逻辑`
    - `补充验证与回归`
- `sessions_spawn` 文本：同链路后续存在，但本样本主焦点是 `plan_write`

#### 输出
- 计划产物：成功创建任务 `修复子任务 done 不应自动完成计划`
- 工具输出（原文节选）：
  - `status: success`
  - `taskCreated: 修复子任务 done 不应自动完成计划`
  - `planStatus: prepare.requirements`
  - `nextAction: collect_requirements`
  - `instruction: Collect requirements first... Edit goal/rules/references/tasks, then set planStatus to process.active/process.wait/process.discussing.`
- 后续链路：同一会话继续出现 `switch_task`、`plan_edit`、`sessions_spawn`，证明这不是孤立写 plan，而是可执行主链的一部分。

#### 评分
- 清晰度：5/5
- 可执行性：5/5
- 认知减负：5/5
- 总分：5/5

#### 简评
- 这是当前最强的 `plan_write` 真样本之一：用户规则 → 计划目标 → 约束 → 任务拆解 → 工具回执，全链清楚，而且完全贴合“把结论写进计划再去修复”的真实使用场景。

---

### 样本 SF-T7-005
- 来源会话：`agent:feishu-organizer:feishu:direct:ou_a7956f92a580fdd3eea132985f93b295`
- 来源时间：2026-05-28
- 任务主题：回归动态导入构建失败（真实 `plan_write` + `sessions_spawn` 成对样本）
- 最小溯源：`sessions_history(...includeTools=true)` 命中 `plan_write(filePath="回归动态导入构建失败/plan.json")`，随后同链路命中 `sessions_spawn(label="dynamic-import-fix-research")`

#### 输入
- 原始 task / 用户要求：`review 在拦我：这条新构建回归线不能硬塞进当前 plan。那就按你的意思处理成“回归任务”——单独开，不把脏东西混在老计划里。`
- `plan_write` 文本（原文节选）：
  - `filePath`: `回归动态导入构建失败/plan.json`
  - `title`: `回归动态导入构建失败`
  - `goal.text`: `修复 build:strict-smoke 中由动态导入与静态导入混用导致的 INEFFECTIVE_DYNAMIC_IMPORT 构建失败，并在整体编译通过后，最后增加一条用户确认，由用户决定是否重启。`
  - `rules` 节选：
    - `只修复当前 INEFFECTIVE_DYNAMIC_IMPORT 构建失败相关问题，不做无关重构。`
    - `编译验证必须覆盖 pnpm build:strict-smoke。`
    - `最终只做用户确认，不执行任何重启动作。`
  - `tasks` 节选：
    - `确认构建失败链路与导入边界`
    - `修复动态导入构建失败`
    - `执行整体编译回归验证`
    - `最后向用户确认是否重启`
- `sessions_spawn` 文本（原文节选）：
  - `label`: `dynamic-import-fix-research`
  - `agentId`: `code-researcher`
  - `cwd`: `/home/yankeeting/.openclaw/projects/openclaw-dev`
  - 任务目标：`定位 build:strict-smoke 失败中的 INEFFECTIVE_DYNAMIC_IMPORT 触发链，明确最小修复边界。`
  - 输出格式：`触发链 / 冲突点列表 / 推荐修复方案（按优先级） / 风险点`

#### 输出
- 计划产物：成功创建任务 `回归动态导入构建失败`
- `plan_write` 工具输出（原文节选）：
  - `status: success`
  - `taskCreated: 回归动态导入构建失败`
  - `planStatus: prepare.requirements`
- `sessions_spawn` 工具输出（原文节选）：
  - `status: accepted`
  - `childSessionKey: agent:code-researcher:subagent:0c735f2f-9b5e-4e63-a4a3-23fb698bb041`
  - `mode: run`
- 执行/验收回执：同链路后续又出现 `dynamic-import-fix-coder`、`dynamic-import-build-verify`，最终 `pnpm build:strict-smoke` 通过，并进入用户确认是否重启。

#### 评分
- 清晰度：5/5
- 可执行性：5/5
- 认知减负：4/5
- 总分：5/5

#### 简评
- 这是非常好的“`plan_write` + `sessions_spawn` 成对样本”：先把回归任务正式建 plan，再把 research 原子派发出去，工具输出也完整可见。认知负担略高只是因为问题本身较技术化，不是 prompt 质量差。

---

### 样本 SF-T7-008
- 来源会话：`agent:feishu:feishu:direct:ou_6c99bdd79dcac29f0dec7fa8fe187882`
- 来源时间：2026-05-27
- 任务主题：SkillForge Web UI 第二轮精修（多次 `plan_write` 重复写入）
- 最小溯源：`tmp/task7-samples.json` 的 `planWrite[]` 中同一会话同主题连续出现多次 `plan_write`（同构内容重复写入 `.../skillforge-web-ui-round-2/plan.json`、`plans/skillforge-web-ui-round-2.json`、`skillforge-web-ui-round-2.json`）

#### 输入
- 原始 task / 用户要求：围绕 Web UI 第二轮精修（ApprovalDetail 首屏可读化、RunCenterList 搜索扩展、KnowledgeAssetsPage 弱标题兜底）建立并推进计划。
- `plan_write` 文本（原文特征节选）：
  - 同一主题短时间重复调用 `plan_write`，核心 tasks 几乎相同（1~4：三项改动 + build 验证）
  - 多次写入目标路径不稳定：绝对路径与多个相对路径混用
  - `goalText` / `title` / `summary` 逐次压缩改写，但没有在样本中看到“为什么要重复写、哪次为最终版本”的明确执行回执绑定
- `sessions_spawn` 文本：本样本未稳定命中与其一一对应的下发链路证据（仅有 plan 反复重写证据）

#### 输出
- 计划产物：确实有计划文本落盘，但呈现“重复写 + 路径漂移 + 版本切换”特征。
- 下发产物：在该样本片段里缺少和每次重写 plan 对齐的稳定派发闭环证据。
- 执行/验收回执：可见的主要是 `plan_write` 连续成功；但“最终采用哪版 plan、是否因此减少主 agent 后续判断成本”证据较弱。

#### 评分
- 清晰度：3/5
- 可执行性：3/5
- 认知减负：2/5
- 总分：3/5

#### 简评
- 这是一个**低分边界样本**：单次 `plan_write` 文本本身并不差，但在真实链路里出现同主题多次重写、路径与版本口径漂移，且回执侧缺少“最终定稿锚点”。
- 因此它没有稳定实现“让主 agent 少思考”的目标，反而可能引入“该以哪版为准、是否需要再次对齐”的额外认知成本，适合作为与 SF-T7-004~007（高质量强闭环样本）对照的反例。

## 待补样本

1. 来自飞书明月或 engineer 线的第二组 `plan_write` 真样本（当前 `plan_write` 主强样本主要来自 organizer）
2. 若后续能拿到更完整的明月 `sessions_spawn` 原文全文，可补进本库作为跨任务风格对照

## 后续维护方式

- 每次遇到高质量真实样本，直接追加到本文件
- 如果某类样本成为固定验收基准，再拆到专门文档：
  - `docs/skillforge-plan-write-samples.md`
  - `docs/skillforge-sessions-spawn-samples.md`
  - `docs/skillforge-task7-acceptance-scorecard.md`
