# ADR-0039: SkillForge 真实 provider replay 先从 provider adapter 和最小执行入口切入

## Status

accepted

## Context

Phase 15 已完成首个真实 provider 可执行闭环的第一刀。计划记录明确给出：

- 第一刀先落在 `provider adapter`，因为 `transcript capture`、真实 replay 执行入口、结果评分和观测输出都依赖真实 provider 先成立；在 provider 未接通前先做这些，只会停留在 `synthetic/stub` 层。
- 第二刀确认先补真实 replay 执行入口，而不是先做 `transcript capture`；因为 transcript 的价值建立在已经发生真实 provider 执行之后。
- 本次完成的最小闭环已经把 `provider adapter`、`runtime runner`、`run-runtime-draft` 入口和合同测试接起来，并通过 `node scripts/verify-provider-adapter.mjs` 与 `node scripts/test-runtime-contracts.mjs` 验证了最小链路。

这意味着后续进入真实 provider replay 时，必须先把 provider 接入点和执行入口打通，再谈 transcript capture、评分、报表扩展或多 provider 平台化。

## Decision

决定将 SkillForge Phase 15 的真实 replay 推进顺序固定为：**先接入首个真实 `provider adapter`，再打通最小真实 replay 执行入口**；`transcript capture`、全面评分、报表扩展和多 provider 平台化都后移。

具体规则如下：

- 真实 replay 的第一刀必须先落在 `provider adapter`，让 provider 能力先成为真实数据源，再让 replay、观测和报告围绕这个数据源展开。
- 真实 replay 的第二刀必须是最小执行入口，确保 `CLI/runner` 在提供 API key 时能触发真实 provider 调用；在缺 key 时必须保持诚实失败，而不是伪装成已执行。
- `transcript capture` 不作为第一优先级切口；只有在真实 provider 执行已成立后，transcript 才有真正的证据基础。
- 当前阶段不扩成多 provider 平台，不把完整 UI、全面评测体系或团队协作塞进来。
- 跑偏判断不可采信；如果 subagent 没有回答当前唯一问题，主 Agent 必须直接纠偏并继续推进。
- 真实 provider 路径必须以当前项目根 `projects/workflow-kit` 为硬约束，避免把实现散到其他工作区。

## Alternatives Considered

- 先做 `transcript capture` 再接真实 provider：拒绝。计划结论明确指出 transcript 的价值建立在真实 provider 执行之后，先做只会围着 `synthetic/stub` 数据打转。
- 先扩成多 provider 平台：拒绝。当前阶段明确要求先让一个真实 provider 路径成立，不先扩平台。
- 先做完整 UI 或全面评测体系：拒绝。计划明确排除这些范围，避免本阶段摊太大。
- 继续停留在 `synthetic/stub` replay：拒绝。这样无法形成真实数据源，也无法支撑后续的证据、评分与可观测性。

## Related Code

| Path | Role |
| ---- | ---- |
| `src/skillforge/runtime-provider-openai-adapter.mjs` | 首个真实 `provider adapter`，真实 replay 第一刀的接入点。 |
| `src/skillforge/runtime-provider-adapter-contract.mjs` | provider adapter contract 与请求/响应适配锚点。 |
| `src/skillforge/runtime-runner.mjs` | 最小真实 replay 执行入口的 runner 边界。 |
| `scripts/run-runtime-draft.mjs` | 最小 CLI/runner 触发入口。 |
| `scripts/verify-provider-adapter.mjs` | 真实 provider adapter 验证锚点。 |
| `scripts/test-runtime-contracts.mjs` | replay contract 回归锚点。 |
| `scripts/skillforge-status.mjs` | 当前 replay 观察面锚点。 |

## Consequences

- 正向：真实 provider replay 的第一层依赖关系被固定，后续能力不会在 `transcript capture`、评分或报表上先发散。
- 正向：最小执行入口已经能在有 API key 时触发真实 provider 调用，在缺 key 时诚实失败，减少“看起来能跑、实际上没执行”的误判。
- 正向：`provider adapter` 先成立后，后续的 `transcript capture`、评分和可观测输出都有真实事实源可依。
- 取舍：当前只打通了最小真链路，尚未进入 transcript capture、全面评分或多 provider 平台。
- 取舍：真实 HTTP 调用仍依赖环境中的 `OPENAI_API_KEY`，因此本阶段仍有明显的环境门槛。
- 验证锚点：计划记录确认 `node scripts/verify-provider-adapter.mjs` 输出 `All 89 checks passed`，`node scripts/test-runtime-contracts.mjs` 输出 `Runtime contract tests passed: 110/110 cases.`

## Search Terms

- `provider adapter`
- `runtime-provider-openai-adapter.mjs`
- `runtime-provider-adapter-contract.mjs`
- `runtime-runner.mjs`
- `run-runtime-draft.mjs`
- `verify-provider-adapter.mjs`
- `test-runtime-contracts.mjs`
- `OPENAI_API_KEY`
- `transcript capture`
- `real provider replay`
