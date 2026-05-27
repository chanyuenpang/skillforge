# ADR: SkillForge 受控 fileRead/fileWrite 规则需要可复用到多路径工作流样本

## Status

accepted

## Context

先把结论说清楚：SkillForge 的受控文件操作规则不能只停留在 `daily-diary` 这类单样本上，它必须能覆盖更复杂的多路径读写工作流。否则 validator 虽然能识别“受控写入”这个门类，但一遇到更复杂的 skill 结构就会再次退回成临时特判。

这次完成的计划把 `memory-processor-workflow` 映射成 workflow-kit 可验证的 SkillForge fixture，并做了首轮静态验证。结果确认：受控 `fileRead` / `fileWrite` 的边界规则可以迁移到更复杂的多路径场景，且静态验证最终达到通过。

## Decision

决定将受控 `fileRead` / `fileWrite` 规则视为可复用的正式契约，而不是仅针对某个单一 skill 的局部例外。

具体要求如下：

- 受控文件操作能力必须能映射到 SkillForge fixture，而不是只存在于源 skill 的自然语言描述里。
- validator 需要支持多路径读写场景中的受控边界表达，不能把“多路径”直接等价为“不可信”。
- 当一个 skill 的文件操作是受控、限定来源且路径集合明确时，应沿用统一验证模型，不再为新样本发明临时规则。
- `memory-processor-workflow` 这类更复杂样本应作为复用验证的锚点，用来检验规则是否真的跨样本成立。

## Alternatives Considered

- 继续只把规则绑定在 `daily-diary` 单样本上：拒绝。这样会把可复用契约退化成样本特判。
- 把多路径读写直接判定为高风险失败：拒绝。这样会误伤真实工具型 skill。
- 仅在 fixture 层补洞，不提升 validator 能力：拒绝。这样无法形成长期规则。

## Related Code

| Path | Role |
| ---- | ---- |
| `tasks/memory-processor-workflow-转-skillforge-fixture-并做首轮验证/plan.json` | 来源计划记录，包含完成任务与 retrospective 结论。 |
| `skills/memory-processor-workflow/SKILL.md` | 源 skill 定义，提供受控多路径读写边界。 |
| `projects/workflow-kit/fixtures/memory-processor-workflow` | 目标 fixture 落点。 |
| `validate:fixture` | 首轮静态验证入口。 |
| `fixtures/daily-diary/skill-spec.yaml` | 先前已验证的受控写入样本锚点。 |

## Consequences

- 正向：validator 对受控 `fileRead` / `fileWrite` 的契约不再局限于单一样本，后续更复杂 skill 可以复用同一规则。
- 正向：`daily-diary` 推动出的受控写入规则被证明可以扩展到多路径工作流，减少后续重复特判。
- 正向：fixture 映射策略更贴近真实 skill 能力模型，避免静态验证与实际工具能力脱节。
- 取舍：当前仍有一个非阻塞 warning，说明 replay 上下文的最小信息还可以继续补强。
- 验证锚点：计划 retrospective 明确记录验证结果为 `16 pass / 1 warn / 0 fail`，并指出静态验证已 `passed`。

## Search Terms

- `fileRead`
- `fileWrite`
- `memory-processor-workflow`
- `validate:fixture`
- `fixtures/memory-processor-workflow`
- `16 pass / 1 warn / 0 fail`
- `passed`
- `受控写入`
