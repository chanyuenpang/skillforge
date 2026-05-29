# ADR: betterPrompt 历史 `raw optionsBag` 调用点清理与白名单守卫

## Status

accepted

## Scope

本次收口继续沿用既有决策：`betterPrompt` 的历史 `raw optionsBag` 调用面必须清理，且 `buildBetterPromptFromRawText(text, optionsBag)` 只能作为受限 raw adapter 存在，不允许把模糊配置语义扩展成正式入口。

## Context

`betterPrompt` 的历史调用面里，`buildBetterPromptFromRawText(text, optionsBag)` 曾被当作一个宽松适配器来使用，导致调用方容易把不属于白名单的字段塞进 `optionsBag`，或者依赖某些字段被“顺手”透传。这样会带来两个长期问题：

1. 调用方误以为字段已生效，但实际语义可能漂移或被静默吞掉。
2. `buildBetterPromptFromRawText` 的职责边界会从 raw adapter 滑向半隐式配置入口，破坏 `buildBetterPromptV1(input)` 作为标准契约中心的地位。

本次计划再次确认治理重点是“历史 raw optionsBag 调用点清理”。这不是单纯的代码整洁，而是面向长期契约稳定性的收口；本轮新增信息只是把遗留调用面继续往白名单契约收紧，没有改变原有 ADR 结论。
## Decision

决定将 `betterPrompt` 的历史 `raw optionsBag` 调用面固定为以下规则：

1. **`buildBetterPromptV1(input)` 是唯一真实契约中心**
   - 所有正式输入都应先落到标准对象形态，再进入核心实现。
   - 不允许把宽松配置当作主入口契约。

2. **`buildBetterPromptFromRawText(text, optionsBag)` 仅作为 raw adapter 存在**
   - 它的职责是把原始文本与允许的少量参数转换成标准输入对象。
   - 它不是独立业务入口，也不承担额外语义拼装责任。

3. **`optionsBag` 必须执行白名单校验，未知字段直接报错**
   - 白名单外字段不再静默忽略。
   - 这样可以阻止调用方继续依赖模糊语义，尽早暴露历史错配。

4. **历史 `raw optionsBag` 调用点需要持续清理**
   - 清理目标不是简单替换调用形式，而是消除对模糊 `optionsBag` 语义的依赖。
   - 只保留明确契约、明确字段、明确输入形态的调用方式。
   - 2026-05-29 的收口进一步确认：扫描结果里已没有生产路径高风险调用点，剩余点要么是合规脚本，要么是 tmp/ 下的历史残留；这强化了“只保留白名单字段调用”的执行边界，但不改变决策本身。

## Alternatives Considered

- **继续静默忽略未知字段**：被拒绝。会让调用方持续误判字段有效，长期更难排障。
- **把 `buildBetterPromptFromRawText` 升级成正式业务入口**：被拒绝。会削弱 `buildBetterPromptV1(input)` 的契约中心地位，扩大边界。
- **保留历史调用不清理，只靠文档说明**：被拒绝。旧调用面本身就是语义漂移源头，文档无法替代收口。

## Related Code

| Path | Role |
| ---- | ---- |
| `plan.json` | 本次清理计划源记录，包含 `raw optionsBag` 调用点治理与回归验证要求。 |
| `buildBetterPromptV1` | betterPrompt 的标准对象契约中心。 |
| `buildBetterPromptPackage` | `buildBetterPromptV1` 的 alias。 |
| `buildBetterPromptFromRawText` | raw adapter，负责文本与受限 `optionsBag` 的转换。 |

## Consequences

- 正向：调用契约更明确，减少 `optionsBag` 混用与静默语义残留。
- 正向：`buildBetterPromptV1(input)` 的主入口地位更稳定，后续扩展更可控。
- 正向：历史调用面清理后，问题更容易在入口处暴露，而不是在下游悄悄变形。
- 取舍：宽松调用方需要补齐字段与输入形态，短期可能产生 breakage。
- 风险：如果调用点清理不彻底，旧式 `optionsBag` 依赖会以隐性方式继续存在。
- 验证锚点：计划明确要求先做历史调用点扫描与风险分级，再做高风险调用清理，最后执行专项回归，确保入口行为不回退。
- 2026-05-29 复核锚点：合规点仅剩 `run_task4.mjs`、`test-betterprompt-raw-input.mjs`、`step36-verify.mjs`；违规点已集中为 `tmp/` 下的历史脚本并被删除，相关回归用例全绿。

## Search Terms

- `betterPrompt`
- `buildBetterPromptV1`
- `buildBetterPromptPackage`
- `buildBetterPromptFromRawText`
- `optionsBag`
- `white-list`
- `raw adapter`
- `whitelist校验`
- `step36-verify.mjs`
- `run_task4.mjs`
- `test-betterprompt-raw-input.mjs`
