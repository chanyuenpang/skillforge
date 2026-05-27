# ADR: SkillForge 100% 产品终态推进必须先 `review plan`、再 `optimize`、再通过主计划回写与回压

## Status

accepted

## Context

SkillForge 的新总计划不是单个 milestone，而是面向“100% 产品终态”的主计划。该计划把目标从阶段性碎片规划收束为完整产品态定义，并明确所有后续里程碑都不能直接裸 spawn，而必须先经过 SkillForge 的 plan review，再回写关键结论，随后优化子计划 prompt，最后才允许派发。

这条约束的价值不在于一次性推进某个任务，而在于把“从主计划到子计划”的默认治理顺序固定下来，避免在完整产品态推进过程中出现目标漂移、上下文断裂、子计划失控或主计划沦为流水账。

## Decision

SkillForge 的 100% 产品终态推进，必须遵循以下固定链路：

**主计划意图 → `review plan` → 回写主计划 → `optimize` 子计划 prompt → spawn 子计划 → 结果回流主计划**

并且主计划层必须持续承担回压职责：

1. 每个 milestone 在进入子计划前，必须先由 SkillForge review 当前主计划状态。
2. review 之后必须把关键结论回写到主计划，再进入 prompt 优化。
3. 子计划派发前必须先优化 prompt，不能直接裸 spawn。
4. 每个 milestone 完成后，必须先回写主计划，再进入下一 milestone。
5. 主计划内部应保留强制规则，禁止跳过 review / optimize / 回写这三道门禁。

这意味着 100% 产品终态不是“写一个大计划然后逐步执行”，而是“主计划始终作为治理中枢，子计划始终在 review 与回写的约束下被派发”。

## Alternatives Considered

- 直接裸写主计划并持续裸 spawn：被拒绝，因为缺少 plan 质量门禁与 prompt 前置优化，复杂推进时更容易偏题和返工。
- 只在某个 milestone 入口做一次 review / optimize：被拒绝，因为后续 milestone 仍可能脱离主计划约束。
- 把所有细则都塞进主计划正文：被拒绝，因为主计划会膨胀成执行手册，失去“高层终态定义”的作用。
- 只做子计划派发，不要求回写主计划：被拒绝，因为无法形成主计划对全局推进的持续回压。

## Related Code

| Path | Role |
| --- | --- |
| `plan.json` | 100% 产品终态主计划源记录，包含总目标、里程碑、强制规则与引用锚点 |
| `docs/skillforge-execution-rules-v1.md` | 规则层锚点，承载必须 review / optimize / 回写 / 跳过条件等约束 |
| `docs/skillforge-execution-workflow-v1.md` | workflow 层锚点，承载主路径、例外路径与回流顺序 |
| `skills/planning/` | 负责计划拆解、评审与回写的能力入口 |
| `skills/spawn/` | 负责 prompt 优化、派发校验与结果回流的能力入口 |

## Consequences

- 正向：主计划始终保持对全局推进的治理能力，不会退化成单纯任务清单。
- 正向：每个 milestone 都经过 review / optimize / 回写，降低偏题、漏约束和子计划漂移风险。
- 正向：主计划与子计划之间形成持续回压闭环，便于后续追踪和复盘。
- 取舍：每次 milestone 推进前都要多做几道门禁，单次推进速度会变慢。
- 取舍：主计划的规则层会更严格，负责人需要更明确地管理例外边界。
- 风险：如果 review / optimize 被频繁跳过，100% 产品终态的治理链路会失效。
- 验证锚点：源计划中已明确“每一个 milestone 都必须以 SkillForge review plan → optimize prompt → spawn 子计划的方式推进，不允许裸 spawn”。

## Search Terms

- `review plan`
- `optimize`
- `spawn`
- `100% 产品终态`
- `主计划`
- `子计划`
- `回写`
- `回压`
- `milestone`
- `裸 spawn`
