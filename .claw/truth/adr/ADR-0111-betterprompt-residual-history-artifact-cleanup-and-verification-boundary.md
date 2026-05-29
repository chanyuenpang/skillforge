# ADR: betterPrompt 残余历史产物清理与验证边界

## Status

accepted

## Context

`betterPrompt` 的历史 `raw optionsBag` 调用面已经收口，上一轮还明确清掉了高风险残留。当前计划继续处理的是更低风险的历史产物清理与验证收口，重点对象是 `tmp/step36-verify.mjs`、`runs/*.json` 以及目录级检索噪声。

这次计划的长期价值不在于“再做一次删除”，而在于把清理边界收口为明确规则：先确认残余是否只是历史产物，再做最小删除，最后用专项验证确认调用面没有回退。这样可以避免未来把临时脚本、历史运行结果当成可维护资产继续保留。
## Decision

决定将 `betterPrompt` 相关残余历史产物的处理规则固定为：

1. **以目录级收口为目标，而不是追求“再删一批”**
   - 本轮的判断标准是工作区是否已经只剩运行态或合规保留项，而不是必须发生实际删除动作。
   - 如果扫描后确认目标残留已经不存在，也视为完成收口。
1. **仅删除已确认的低风险历史残留**
   - 只处理明确属于历史产物、且不再承担功能职责的文件。
   - 本轮聚焦 `tmp/step36-verify.mjs` 与 `runs/*.json` 这类噪声，不扩大到无关文件。

2. **删除前必须先确认边界**
   - 先扫描残余分布与用途，再决定删除清单。
   - 未确认其仅为历史产物前，不作为删除对象。

3. **删除后必须做专项验证**
   - 验证 `buildBetterPromptFromRawText` / `buildBetterPromptV1` 的调用面仍维持正确。
   - 同时确认历史检索噪声按目标收敛，避免删除后出现行为回退或误删。

5. **保留 `buildBetterPromptFromRawText` 的受限 raw adapter 边界不变**
   - 残余清理只是收口历史文件，不改变 `betterPrompt` 的契约中心与白名单治理规则。

6. **`tmp/agent_feishu_*.json` 暂视为运行态文件**
   - 它们不纳入本轮历史垃圾清理范围。
   - 只要未被证实是过期垃圾，就按运行态保留。
## Alternatives Considered

- **保留所有历史产物以便回溯**：被拒绝。会让检索噪声持续存在，也容易混淆长期资产与临时脚本。
- **直接批量删除，不做边界确认**：被拒绝。风险过高，可能误伤仍有用途的文件。
- **只删不验收**：被拒绝。无法证明调用面和检索噪声真的收口。

## Related Code

| Path | Role |
| ---- | ---- |
| `plan.json` | 本次残余历史产物清理计划源记录，包含边界确认、删除与验证要求。 |
| `tmp/step36-verify.mjs` | 计划中点名的临时验证脚本残留。 |
| `runs/*.json` | 计划中点名的历史运行结果残留与检索噪声来源。 |
| `tmp/agent_feishu_*.json` | 本轮验证确认的运行态文件，暂不纳入历史垃圾清理。 |
| `buildBetterPromptV1` | `betterPrompt` 的标准契约中心，验证时需确认调用面未回退。 |
| `buildBetterPromptFromRawText` | 受限 raw adapter，验证时需确认其边界未被扩大。 |

## Consequences

- 正向：历史脚本与运行产物不再污染仓库检索结果。
- 正向：清理动作被绑定到边界确认与专项验证，减少误删风险。
- 正向：`betterPrompt` 的契约中心与 raw adapter 边界保持稳定。
- 正向：目录级收口后，工作区不再因为这批历史产物持续产生检索噪声。
- 取舍：临时脚本与历史结果不再作为默认可见资产保留，回看需要依赖更明确的证据来源。
- 风险：如果后续有人重新引入类似临时产物而不做标记，噪声可能再次出现。
- 验证锚点：计划要求在清理后复查 `buildBetterPromptFromRawText` 调用点，并执行最小专项验证，确认历史检索噪声收敛且调用面不回退。
## Search Terms

- `betterPrompt`
- `tmp/step36-verify.mjs`
- `runs/*.json`
- `buildBetterPromptV1`
- `buildBetterPromptFromRawText`
- `raw optionsBag`
- `history artifact`
- `verification boundary`
