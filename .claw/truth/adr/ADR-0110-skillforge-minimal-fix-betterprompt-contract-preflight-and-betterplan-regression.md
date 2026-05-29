# ADR: SkillForge 最小修复以恢复 `betterPrompt` 合约、preflight 入口与 `betterPlan` 最小回归

## Status

accepted

## Context

本次 `SkillForge：最小修复计划` 已完成收口，目标不是扩展能力，而是先把可验证性和核心质量恢复到可持续状态。计划记录显示，最初的阻塞集中在三类长期有效的问题上：

1. `betterPrompt` 存在导入名漂移，测试脚本仍在引用 `buildBetterPromptPackage` / `buildBetterPromptFromRawText`，而实际导出为 `buildBetterPromptV1`。
2. `betterPrompt` 的 contract 还缺少必填字段，尤其是 `decomposition` 非空和 `traces.semantic_summary`。
3. `preflight` fixture 最小字段不完整，`coding-agent-workflow` 的 replay-cases 需要补齐 `type` / `intent` / `expectedBehavior`。
4. `betterPlan` 在常见输入下存在 `keyPoints` / `gaps` 为空洞的问题，影响最小回归判断。

计划采用的策略不是先扩大验证面，而是先按 SkillForge 流程把问题收敛为“结构性修复 → 质量修复 → 最小回归包”。最终 `end.completed`，且 Task 1、2、3、4、5、6 均为 `done`，说明这些修复已经形成可复用的长期约束。

## Decision

决定将这条线上的长期处理规则固定为：

1. **先恢复可验证性，再恢复质量**
   - 先修 `betterPrompt` 的导入/导出名一致性，避免测试与实现继续漂移。
   - 再补齐 `betterPrompt` contract 的最小必填字段，保证输出可被下游消费。
   - 之后再修 `preflight` fixture 的最小字段，恢复入口层的基础验证能力。
   - 最后再处理 `betterPlan` 的 `keyPoints` / `gaps` 空洞问题。

2. **`betterPrompt` 必须保持统一命名与最小 contract**
   - 测试脚本与实际导出名必须对齐到 `buildBetterPromptV1`。
   - `decomposition` 不能为空。
   - `traces.semantic_summary` 必须存在。
   - 相关别名只允许作为兼容层，不允许继续制造命名分叉。

3. **`preflight` fixture 的最小字段必须完整**
   - `coding-agent-workflow` 的 replay-cases 不能再依赖隐含字段。
   - `type`、`intent`、`expectedBehavior` 是最小字段集，缺一会破坏 preflight 的可验证性。

4. **`betterPlan` 的质量修复以最小回归包验证**
   - 重点不只是“能出结果”，而是 `keyPoints` / `gaps` 不能在常见输入下系统性为空。
   - 修复后必须用最小回归包确认 contract、bundle softref、betterPlan v1 与 preflight 入口都恢复正常。

5. **验证必须收缩到最小回归包**
   - 只对已修复点做对应最小回归，不把修复任务重新扩大成全量 E2E。
   - 最终判断以最小回归结果为准，确认零阻塞后再决定是否另开计划恢复更大范围 E2E。

## Alternatives Considered

- **直接扩大到全量 E2E 再说**：被拒绝。计划明确要求先恢复可验证性，扩大验证面只会把漂移问题和空洞问题继续放大。
- **只修 `betterPrompt` 不管 `preflight` 与 `betterPlan`**：被拒绝。三者共同构成最小可验证闭环，缺一项都会让回归结果失真。
- **把命名漂移当作局部兼容问题放过去**：被拒绝。命名漂移会持续污染测试与实现边界，必须统一到稳定导出名。

## Related Code

| Path | Role |
| ---- | ---- |
| `plan.json` | 本次最小修复计划源记录，包含任务拆分、完成态与复盘。 |
| `buildBetterPromptV1` | `betterPrompt` 的稳定导出名，命名统一的核心锚点。 |
| `fixtures/coding-agent-workflow/replay-cases.yaml` | `preflight` 最小字段补齐的验证资产。 |
| `node scripts/test-betterplan-v1.mjs` | `betterPlan` 最小回归锚点。 |
| `test-plan-prompt-spawn-integration` | 最小回归包中的集成验证项。 |
| `test-betterprompt-raw-evidence-gate` | 最小回归包中的 `betterPrompt` 合约验证项。 |
| `skillforge-milestone-f-gray-acceptance` | 最小回归包中的里程碑验收项。 |
| `test-betterprompt-builder` | 最小回归包中的构建验证项。 |

## Consequences

- 正向：`betterPrompt` 的导入/导出边界稳定了，测试与实现不再继续漂移。
- 正向：`betterPrompt` contract 的最小字段恢复后，下游消费链条更稳定。
- 正向：`preflight` fixture 最小字段补齐后，入口验证不再因字段缺失失败。
- 正向：`betterPlan` 的 `keyPoints` / `gaps` 不再系统性为空，最小回归更有判断力。
- 正向：最小回归包 4 项全绿，说明当前修复闭环已收口。
- 取舍：短期不扩大 E2E，优先守住可验证性与核心质量。
- 风险：如果后续再次引入命名分叉或字段缺失，问题会以同类形式复发。
- 验证锚点：计划已 `end.completed`，且最小回归四项全绿：`test-plan-prompt-spawn-integration`、`test-betterprompt-raw-evidence-gate`、`skillforge-milestone-f-gray-acceptance`、`test-betterprompt-builder`。

## Search Terms

- `buildBetterPromptV1`
- `buildBetterPromptPackage`
- `buildBetterPromptFromRawText`
- `decomposition`
- `traces.semantic_summary`
- `replay-cases.yaml`
- `keyPoints`
- `gaps`
- `test-betterprompt-builder`
