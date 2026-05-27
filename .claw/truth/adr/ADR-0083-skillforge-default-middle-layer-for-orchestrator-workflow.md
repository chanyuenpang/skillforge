# ADR: SkillForge 作为负责人默认工作流中间层——review plan + optimize prompt + 再 spawn

## Status

accepted

## Context

此前负责人推进项目时的标准操作为：直接裸写 plan、直接裸 spawn subagent。缺少 plan 评审与 prompt 优化两道上游防护，导致以下问题：

1. plan 的结构性与完整性依赖负责人单次判断，缺少系统性质量门禁。
2. spawn 时的 prompt 未经优化直接下发，易出现偏题、缺失约束或指令冗余。
3. 结果回流缺乏中间层的记录与校验咬合，无法形成"写 plan→spawn→review→回写"的闭环。

Milestone N 通过负责人裁决、规则层与 workflow 层三层分离，确定了将 SkillForge 从展示/观察层推进为负责人日常工作流的默认中间层。四条主线任务全部 `done`，milestone 以 `end.completed` 收口。

## Decision

负责人推进项目的默认流程由「裸写 plan → 裸 spawn」正式切换为：

**意图 → review plan → 回写 → optimize subagent prompt → spawn → 结果回流**

其中 SkillForge 承担两道强制中间步骤：

1. **review plan**：在 plan 落地前，经过 SkillForge 的 plan review，确认结构完整性、任务边界与 done criteria。
2. **prompt optimize**：在 spawn 之前，经过 SkillForge 的 prompt 优化，确保指令精准、约束完整。
3. **结果回流**：spawn 完成后，结果经 SkillForge 收口，必要时更新 plan。

### 例外规则

以下三种情况允许跳过 SkillForge 中间层：

- **极小任务**：改动范围可在一句话内描述清楚的原子任务（如改一个配置项、提一条 PR comment）。
- **纯同步确认**：只需负责人确认状态或表达观点，不需要 spawn minion 的任务。
- **紧急止血**：线上事故或阻断级异常，需要立即派发修复的紧急情况。

### 规则层与 workflow 层分离

为保持主 plan 不膨胀，该决策下沉为两层 artifact：

- **规则层**：12 条规则，仅覆盖"什么时候必须 review plan、什么时候必须 optimize prompt、跳过条件与补记录要求、spawn 前最小校验清单、结果回流收口、偏差重定责与规则沉淀"。
- **Workflow 层**：仅覆盖主路径、失败重试路径、快速任务例外路径与重规划回路的执行顺序、分支和回流，不承载规则定义。

### 主 plan 保持高层

Milestone plan 本身只记录关键决策、引用规则层与 workflow 层锚点，细则不下沉到 plan 正文。

## Alternatives Considered

- 保持原有裸写 plan → 裸 spawn 流程：被拒绝，因为缺少 plan 质量门禁与 prompt 前置优化，偏题与返工率高。
- 只在规则层约束，不引入 workflow：被拒绝，因为规则层只回答"什么条件"，不回答"什么顺序"，执行路径仍依赖负责人自由发挥，容易被绕过。
- 把规则与 workflow 全量写在主 plan 里：被拒绝，因为主 plan 会膨胀成执行手册，破坏高层抽象，后续维护成本上升。
- 只做 review plan，不做 prompt optimize：被拒绝，因为 prompt 质量是 spawn 执行准确性的直接因子，只有 review 没有 optimize 是半个闭环。

## Related Code

| Path | Role |
| --- | --- |
| `plan.json` (Milestone N) | 本决策的源 plan 记录，包含裁决、规则层、workflow 层与回写说明 |
| 规则层 artifact | 12 条规则，覆盖 review、optimize、跳过、回流、偏差追责 |
| workflow 层 artifact | 主路径、失败重试、快速例外、重规划回路的执行路径说明 |

## Consequences

- 正向：每个 plan 在落地前经过 review，结构完整性与 done criteria 获得系统性检查。
- 正向：spawn 前 prompt 经过优化，减少偏题与指令缺失，降低返工率。
- 正向：结果回流形成闭环，plan 可随执行逐步完善。
- 正向：规则层与 workflow 层分离后，主 plan 保持高层不膨胀，便于多期项目积累。
- 取舍：极小任务和紧急止血的例外边界需要负责人主观判断，初期可能被过度使用。
- 取舍：增加两步中间动作，单次任务的调度延迟略有上升。
- 风险：若例外规则被频繁使用，SkillForge 中间层可能重新沦为可选装饰而非默认流程。
- 验证锚点：Milestone N 四条任务全部 done，plan 以 end.completed 收口；后续自举式试运行以真实项目为验证场景。

## Search Terms

- `review plan`
- `prompt optimize`
- `SkillForge 中间层`
- `裸 plan → 裸 spawn`
- `规则层`
- `workflow 层`
- `极小任务`
- `紧急止血`
- `结果回流`
- `Milestone N`
