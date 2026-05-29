# ADR: betterPrompt direct-read 主链与 tag 一等语义空间

## Status

accepted

## Context

本次子计划完成后，`betterPrompt` 的关键问题已经从“能不能做”收敛为“哪条链路应当成为默认主链”。计划验证的核心是：先命中 skill，再直接读取 `SKILL.md` 原文，结合原始 prompt 与 law prompt，让 LLM 直接产出可交给 subagent 的自包含 output prompt。

早先也评估过把 `workflow` / `knowledge` / `constrain` 先抽成中间产物再组装 prompt 的做法，但这会额外引入一层语义加工与维护成本。计划的完成态已经证明，在当前 LLM 能力下，direct-read 主链的质量、稳定性与 token 成本都已经足够好，因此没有必要把中间产物层提前固化为默认架构。

同时，计划还把 `tag` 确认成一等产物：`tag-schema.json` 已创建，`skill-tagger` 的入库与搜索共用同一语义空间。这个决定会直接影响后续 skill 注册、检索与 prompt 组装的一致性，因此需要沉淀为长期约束。

## Decision

`betterPrompt` 的默认实现固定为 **direct-read 主链**：

1. 先完成 skill 命中与标签匹配。
2. 直接读取命中的 `SKILL.md` 原文。
3. 结合原始 prompt 与 law prompt，由 LLM 直接提取所需内容并内联重组。
4. 最终输出必须是**无技能名泄露**、可直接交给 subagent 的自包含 prompt。

并且：

- `tag` 必须作为一等产物维护。
- `skill-tagger` 入库与搜索必须共用同一套 tag 语义空间。
- `workflow` / `knowledge` / `constrain` 中间产物层**不是默认必选层**，只在 direct-read 主链被证明不足时再评估引入。

## Alternatives Considered

- **先抽中间产物，再组装 prompt**：被拒绝。会增加额外抽象层与维护成本，而当前 direct-read 已经足够。
- **继续暴露技能名，让 subagent 自己理解技能引用**：被拒绝。这样产物不自包含，独立执行性会变差。
- **把 tag 当成附属元数据，不作为一等产物**：被拒绝。这样入库与搜索语义容易分叉，后续检索与组装会出现歧义。

## Related Code

| Path | Role |
| ---- | ---- |
| `plan.json` | 本次 `betterPrompt` 子计划的完成态来源，记录了 direct-read 主链与 tag 语义空间的结论。 |
| `tag-schema.json` | 已创建的 tag 语义定义文件，是 tag 一等产物的落点。 |
| `skill-tagger` | skill 入库与搜索共用的 tag 语义消费端。 |

## Consequences

- 正向：`betterPrompt` 的默认链路更短，减少中间态，整体更简单。
- 正向：最终 prompt 保持自包含，不暴露技能名，更适合直接扔给 subagent。
- 正向：tag 入库与搜索统一语义空间，后续 skill 注册和检索的一致性更强。
- 取舍：如果后续遇到更复杂的 prompt 场景，可能仍需要重新评估中间产物层，但那应是基于证据的增量决策，不是默认架构。
- 风险：若 `SKILL.md` 的内容质量不足，direct-read 主链会直接暴露源材料问题，因此 skill 入库质量要求会更高。
- 验证锚点：本次子计划已 `end.completed`；任务 1、2、3 全部 `done`，并已确认 direct-read 在当前 LLM 能力下达标，中间产物层暂不引入。

## Search Terms

- `betterPrompt`
- `direct-read`
- `SKILL.md`
- `tag-schema.json`
- `skill-tagger`
- `workflow`
- `knowledge`
- `constrain`
- `自包含 prompt`
