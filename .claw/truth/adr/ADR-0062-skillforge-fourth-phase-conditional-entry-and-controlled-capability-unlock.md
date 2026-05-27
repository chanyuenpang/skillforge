# ADR: SkillForge 第四阶段条件化启动与受控能力解锁

## Status

accepted

## Context

第四阶段不是第三阶段结论的自动上升，也不是把补证、验证和候选能力写成默认已批准的后续动作。当前主计划明确承接 `docs/skillforge-owner-decision-page-v1.md` 的负责人裁决口径，先把“条件化启动、补证优先、回归先行、风险留边、候选能力受控解锁”收成新的治理边界，避免把阶段推进误写成阶段已成立。

如果继续沿用“上一阶段收口即下一阶段默认开启”的写法，后续会把未验证池、候选能力和回退条件混写成既成事实，导致阶段边界与实施约束失真。

## Decision

决定将 SkillForge 第四阶段的负责人级主线固定为“条件化启动与受控能力解锁”，并按以下规则推进：

1. 第四阶段只能在负责人裁决页所定义的附加条件与补证要求成立后启动，不能把第三阶段收口输入自动解释为第四阶段已批准深执行。
2. 第四阶段的入口边界必须显式锁定补证闸门、回归先行规则与回退条件，后续推进先看条件是否成立，再看任务是否展开。
3. 自动化、规模化、稳定性相关的未验证项要拆成受控优先级队列；哪些先补证、哪些继续挂账、哪些仍属远期候选，必须分开表达。
4. `自动回写`、`自动优化`、`自动推荐`、`规模化治理` 等候选能力只能按解锁条件受控推进，不得混写为默认后续任务。
5. 高价值补证链路与验证样本策略要围绕样本、异常、稳定性和回归前置展开，先形成可验证主线，再谈能力放开。
6. 第四阶段的收口目标是形成新的负责人级事实包：四元组事实、覆盖边界、未验证池与风险保留要可回收、可裁决、可复用。

## Alternatives Considered

- 直接把第四阶段写成自动进入的后续阶段：被拒绝，因为这会把裁决口径偷换成阶段自动切换。
- 先承诺更高阶段候选能力再补证：被拒绝，因为当前仍需要先把补证、回归和边界条件收紧。
- 只记录任务拆分，不定义能力解锁边界：被拒绝，因为这样会把候选能力变成默认承诺。

## Related Code

| Path | Role |
| --- | --- |
| `docs/skillforge-owner-decision-page-v1.md` | 负责人裁决口径来源 |
| `docs/skillforge-b8-phase-c-entry-framework-v1.md` | 上一阶段入口判定与承接锚点 |
| `docs/skillforge-b8-owner-closeout-criteria-v1.md` | 收口与裁决边界锚点 |
| `docs/skillforge-b8-boundary-freeze-and-banlist-review-v1.md` | 边界冻结与禁用表述锚点 |
| `plan.json` | 第四阶段主计划的任务骨架与推进约束来源 |

## Consequences

- 正向：第四阶段的推进口径从“自动上升”改为“条件化启动”，阶段边界更清晰。
- 正向：补证优先、回归先行与回退条件被固定为入口闸门，后续执行不容易越界。
- 正向：候选能力的解锁条件被显式化，避免把远期能力误写成默认承诺。
- 取舍：当前仍保留较强的治理约束，推进速度会慢于直接放开式写法。
- 风险：如果后续把未验证池和候选能力重新混成默认主线，第四阶段的边界会再次失真。
- 验证锚点：`docs/skillforge-owner-decision-page-v1.md`、`docs/skillforge-b8-phase-c-entry-framework-v1.md`、`docs/skillforge-b8-owner-closeout-criteria-v1.md`、`docs/skillforge-b8-boundary-freeze-and-banlist-review-v1.md`、`plan.json`。

## Search Terms

- `skillforge-owner-decision-page-v1.md`
- `条件化启动`
- `补证优先`
- `回归先行`
- `回退条件`
- `自动回写`
- `自动优化`
- `自动推荐`
- `规模化治理`
