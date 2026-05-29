# ADR: 保留 `extract-session-tool-samples.mjs` 的专项分析能力

## Status

accepted

## Context

本次计划评估的是 `scripts/extract-session-tool-samples.mjs` 与 `scripts/README-extract-session-tool-samples.md` 是否应作为阶段性残留清理掉。计划经过用途侦察、替代性比对与专项验证后，结论不是“再删一个历史文件”，而是确认这套工具仍承担独立的专项分析职责。

仓库里虽然存在 `extract-samples.mjs` 这类全局统计抽样工具，但它缺少 `extract-session-tool-samples.mjs` 的关键能力：`sessionKey` 定向提取、时间过滤，以及 `result` 片段导出。若把这类专项脚本误当成废稿删除，后续就会丢失按会话维度做离线样本提取的能力。

## Decision

决定保留 `scripts/extract-session-tool-samples.mjs` 及其说明文档，不将其视为可直接清理的历史废稿。

保留理由固定为以下规则：

1. **专项脚本只要具备不可替代能力，就应保留**
   - 该脚本提供 `sessionKey` 维度、时间窗过滤和 `result` 片段导出，这些都是全局抽样工具不具备的能力。
   - 只要这些能力仍有分析价值，就不能仅因为它不是正式流程入口就删除。

2. **不能用 `extract-samples.mjs` 直接替代专项会话提取**
   - 替代性比对已经确认两者能力边界不同。
   - 全局抽样只能覆盖统计层面的分析，无法覆盖会话定向提取的场景。

3. **未被正式流程引用不等于应该删除**
   - 该工具未被正式流程或 `npm scripts` 引用，但这只能说明它是按需运行的离线分析工具。
   - 对于离线样本提取类脚本，是否保留应以能力价值为准，而不是只看主链引用。

4. **清理规则应改为“识别不可替代能力后保留”**
   - 后续遇到类似脚本，不应先入为主地按“历史残留”处理。
   - 先验证真实用途与替代性，再决定删或留。

## Alternatives Considered

- **直接删除**：被拒绝。因为它包含 `sessionKey` 定向提取、时间过滤和 `result` 片段导出能力，`extract-samples.mjs` 无法替代。
- **仅保留脚本、删除说明文档**：被拒绝。说明文档本身也是该离线工具的使用边界与入口说明，删除会降低可维护性。
- **把它并入全局抽样工具**：被拒绝。会模糊专项分析与全局统计抽样的职责边界。

## Related Code

| Path | Role |
| ---- | ---- |
| `scripts/extract-session-tool-samples.mjs` | 专项会话样本提取工具，承担 `sessionKey` 定向提取、时间过滤与 `result` 片段导出。 |
| `scripts/README-extract-session-tool-samples.md` | 该专项工具的使用说明与边界说明。 |
| `extract-samples.mjs` | 全局统计抽样工具，但不具备专项会话提取所需的关键能力。 |
| `plan.json` | 本次评估计划源记录，包含侦察、替代性比对与保留结论。 |

## Consequences

- 正向：保留了按会话维度做离线样本提取的独立能力。
- 正向：避免把专项分析脚本误删成“历史垃圾”，减少未来排障和分析时的能力缺口。
- 正向：后续清理类似脚本时，必须先做用途侦察与替代性比对，而不是靠文件名猜测。
- 取舍：该脚本继续占用仓库中的一个低频工具位，需要维护其说明与可发现性。
- 风险：如果未来 `extract-samples.mjs` 扩展出同等能力，可能再进入合并或收敛评估。
- 验证锚点：本次计划已完成用途侦察、替代性比对和最小验证，结论是保留不删且不影响项目主链。

## Search Terms

- `extract-session-tool-samples.mjs`
- `README-extract-session-tool-samples.md`
- `extract-samples.mjs`
- `sessionKey`
- `time filter`
- `result fragment`
- `offline analysis`
- `specialized sample extractor`
