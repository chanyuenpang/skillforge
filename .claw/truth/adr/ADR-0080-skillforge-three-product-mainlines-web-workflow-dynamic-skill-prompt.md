# ADR: SkillForge 三条产品主线：网页管理、workflow 规划骨架与动态 skill prompt 组装

## Status

accepted

## Context

这次计划不是在做一次性收尾，而是在重新定义产品主线：用户明确要求的最终形态，已经收敛为三条必须长期存在的能力链——网页管理页面、workflow 骨架帮助规划 plan、以及 spawn subagent 时按当前任务动态组装 skill prompt。

如果继续把它们拆成各自的临时补丁，就会再次回到“页面能看、workflow 能跑、subagent 能发，但三者彼此脱节”的状态。那种状态只能证明局部可用，不能证明产品主线成立。

## Decision

决定将 SkillForge 的后续主线固定为三条并行但彼此可联动的长期能力链：

1. **网页管理页面**必须从展示壳推进到可承载真实管理动作链的入口，而不是只做结果展示。
2. **workflow 骨架帮助规划 plan**必须成为主链的一部分，workflow / plan 之间要能形成可用的规划骨架，而不是只停留在静态说明或一次性生成。
3. **spawn subagent 时动态 skill prompt 组装**必须成为默认行为：subagent 入口要能按当前任务自动拼装 prompt，并注入相关 skill，而不是依赖人工手工拼接。
4. 这三条主线不是彼此独立的演示点，而是同一产品主线的三个面；后续推进必须以它们的真实落点、链路位置和缺口级别来裁决。
5. 本次计划的推进顺序以“先盘点现状与缺口，再分别推进三条主线”为准，避免直接把未收敛的能力写成已完成。

## Alternatives Considered

- 继续按说明层收尾：被拒绝，因为用户要求的是产品主线重建，不是文档层总结。
- 只推进网页管理页面：被拒绝，因为这会遗漏 workflow 规划与 subagent prompt 组装这两条同样重要的主线。
- 只做 workflow 规划骨架：被拒绝，因为网页入口和 subagent 动态 prompt 组装仍会继续脱节。
- 只做 subagent prompt 组装：被拒绝，因为没有主页面与 workflow 规划主链承接，能力仍是散点。

## Related Code

| Path | Role |
| --- | --- |
| `plan.json` | 本次主计划的任务骨架与三条主线来源。 |
| `web-server.mjs` | 网页管理入口与后续管理动作链的潜在承载点。 |
| `web/src/api.js` | 网页侧协议适配层，若管理动作接入页面通常会先经过这里。 |
| `src/spawn-subagent.mjs` | subagent 启动与 prompt 组装的入口锚点。 |
| `src/workflow` | workflow 与 plan 规划链路的实现聚合位置。 |

## Consequences

- 正向：后续不再把网页、workflow、subagent 三条线拆成孤立补丁，而是按同一主线推进。
- 正向：`spawn subagent` 的 prompt 组装会从人工拼接转向任务感知的动态组装，减少错配。
- 正向：workflow 与 plan 的关系被纳入主链裁决，避免规划能力长期停留在说明层。
- 取舍：这三条主线都需要真实链路和缺口盘点，短期不会以“看起来能用”作为完成标准。
- 风险：如果后续再次把页面、workflow 和 subagent 入口分开推进，产品会重新碎片化。
- 验证锚点：本计划的任务骨架、现状盘点结果以及后续三项主线的落地结果将作为长期验证锚点。

## Search Terms

- `网页管理页面`
- `workflow`
- `plan`
- `spawn subagent`
- `dynamic skill prompt`
- `prompt assembly`
- `skill`
- `subagent`
