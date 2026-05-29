# ADR: SkillForge 验证计划采用 SkillForge 流程与原子化派发

## Status

accepted

## Context

本次完成的 `SkillForge：验证计划` 不只是一次普通验证，而是把 SkillForge 自身的使用方式收敛为一条长期可复用的验证主线。计划明确要求：

- 必须显式使用 SkillForge 流程：收集测试资产 → 设计分组验证 → 执行验证 → 汇总质量结论。
- 每次派发 subagent 前要先做 prompt 收敛，确保任务原子化。
- 验证任务与修复任务分离，先记录证据，再决定是否进入修复。
- 验证必须覆盖 CLI help、`betterPrompt` 真输入、`betterPlan` 真输入、端到端流程与质量检查。
- 优先复用项目里已有测试样例、truth、retro、脚本与命令，不凭记忆臆造用例。

计划状态已收口为 `end.completed`，且 `done` 任务表明验证资产收集与 CLI help 验证已经完成，因此这条流程约束可以作为长期使用规范沉淀下来。

## Decision

决定将 SkillForge 的验证与派发默认方式固定为：

1. **验证必须按 SkillForge 流程分层推进**
   - 先收集与归类已有测试资产。
   - 再按验证类型分组执行。
   - 最后汇总质量结论与后续动作。
   - 不允许把“收集、执行、修复、汇报”混成一个不可拆分的大任务。

2. **派发 subagent 前必须先做 prompt 收敛**
   - 下发前先把任务压缩到单目标、单输出、单验收。
   - prompt 只保留当前子任务必需上下文，不提前混入修复结论或后续分支。
   - 这样可以降低偏题、漏约束和返工概率。

3. **验证与修复分离**
   - 验证阶段先只做证据收集和质量判断。
   - 发现问题时先记录证据，不直接把验证任务变成修复任务。
   - 进入修复前需要再次明确问题边界与修复目标。

4. **验证范围固定为五类**
   - `CLI help`
   - `betterPrompt` 真输入链路
   - `betterPlan` 真输入链路
   - 端到端流程
   - 质量检查
   - 这五类必须都覆盖，不能只测基础入口。

5. **验证输入优先使用真实项目资产**
   - 优先复用 `scripts/test-*.mjs`、`pnpm validate*`、`fixture replay-cases.yaml`、`skill-spec.yaml`、`docs/acceptance.md` 等已有资产。
   - 不凭记忆补造样例，不把临时想法当作验证基线。

## Alternatives Considered

- **只测 CLI help，不做真实链路验证**：被拒绝。计划已明确必须覆盖真实输入与端到端流程，否则只能证明命令能跑，不能证明能力可用。
- **把验证和修复混成一个任务**：被拒绝。这样会丢失证据链，也会让问题定位与责任边界变模糊。
- **直接派大而全的综合 subagent**：被拒绝。计划要求原子化派发，避免一个任务同时承担调研、验证、修复和汇报。
- **脱离已有样本临时造用例**：被拒绝。会降低验证可信度，也容易把偶然样本误判为通用结论。

## Related Code

| Path | Role |
| ---- | ---- |
| `plan.json` | 本次验证计划源记录，包含 `SkillForge` 流程要求、五类验证范围与原子化派发约束。 |
| `scripts/test-*.mjs` | 既有验证脚本资产，是本次优先复用的测试入口。 |
| `pnpm validate*` | 验证命令族，作为 CLI 与质量检查的执行锚点。 |
| `fixture replay-cases.yaml` | 真实样例回放资产，用于验证真实输入链路。 |
| `skill-spec.yaml` | 技能规范样例，用于分组验证与回归。 |
| `docs/acceptance.md` | 质量验收参考。 |

## Consequences

- 正向：后续验证会先收集资产，再按层推进，不容易陷入只测 help 的假完整。
- 正向：subagent 派发更聚焦，prompt 更短，返工率更低。
- 正向：验证与修复分离后，证据链更清楚，问题更好追踪。
- 取舍：前置收敛会增加一点准备成本，但能换来更稳定的执行质量。
- 风险：如果后续派发时偷懒跳过 prompt 收敛，流程会迅速退化回“裸派发”。
- 验证锚点：本次计划已完成 `CLI help` 验证，且资产清单已确认覆盖五类验证范围。

## Search Terms

- `SkillForge`
- `review plan`
- `prompt optimize`
- `atomic task`
- `CLI help`
- `betterPrompt`
- `betterPlan`
- `replay-cases.yaml`
- `skill-spec.yaml`
- `validate`
