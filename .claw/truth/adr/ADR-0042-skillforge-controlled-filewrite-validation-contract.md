# ADR: SkillForge 受控 fileWrite 需要被 validator 识别为正式可验证能力

## Status

accepted

## Context

决定先行：SkillForge 的 validator 不能把所有 `fileWrite` 一律当成危险失败。`daily-diary` 这次被映射成最小 SkillForge fixture 后，首轮静态验证暴露出一个真实边界：工具型 skill 里存在受控写文件能力，它不是开放式文件写入，也不应直接触发 P0 fail。

来源计划的完成态给出了稳定结论：先将 `~/.openclaw/skills/daily-diary/SKILL.md` 映射成 `fixtures/daily-diary` 的最小制品，再运行 `validate:fixture`，确认问题根因是 validator 对受控 `fileWrite` 的判定过于粗暴。随后通过最小改造让 `validate:fixture` 从 16/17 提升到 17/17 全通过。

这条决策需要沉淀，因为它改变了后续所有需要写文件的 skill 的契约边界：受控 `fileWrite` 必须作为正式能力进入验证模型，而不是被当成统一的高风险失败面。

## Decision

决定将受控 `fileWrite` 作为 SkillForge validator 的正式可验证能力处理，并区分开放式写文件与受控写文件。

具体规则如下：

- `fileWrite: true` 不能被默认等同为危险失败。
- validator / schema / normalize 必须能区分开放式写文件与受控写文件。
- 对受控写入，要配套边界字段、路径约束与操作类型约束，而不是只看一个布尔值。
- `daily-diary` 的 fixture 声明需要同步表达受控写入边界，才能通过验证。
- 后续更多需要写文件的 skills，应复用同一套受控写入契约，而不是重复发明临时例外。

## Alternatives Considered

- 继续把所有 `fileWrite` 都判成 P0 fail：拒绝。这样会把真实工具型 skill 的合法能力误伤掉。
- 仅在 fixture 层手工绕过 `fileWrite`：拒绝。这样会让契约失真，问题会在别的 skill 上再次出现。
- 只改 fixture，不改 validator：拒绝。这样只能修一例，不能形成长期规则。
- 直接扩成完整路径/操作白名单体系：暂不采用。当前只需要最小支持，先把受控写入和开放式写入分开。

## Related Code

| Path | Role |
| ---- | ---- |
| `tasks/daily-diary-转-skillforge-fixture-并做首轮验证/plan.json` | 来源计划记录，包含完成任务、首轮验证结果与 retrospective。 |
| `fixtures/daily-diary/skill-spec.yaml` | 受控写入声明的 fixture 锚点。 |
| `fixtures/daily-diary/skill-manifest.yaml` | 受控写入边界的 manifest 锚点。 |
| `fixtures/daily-diary/validation-result.yaml` | 回归验证结果锚点。 |
| `validate:fixture` | 触发本次边界暴露与修复验证的入口。 |

## Consequences

- 正向：validator 不再把受控 `fileWrite` 误判为统一 P0 fail，`daily-diary` 可以稳定通过验证。
- 正向：后续需要写文件的 skill 能共享同一套受控写入契约，减少重复特判。
- 正向：验证规则更贴近真实 skill 能力模型，避免静态契约与实际工具能力脱节。
- 取舍：这只是最小支持，后续仍需要更细的路径、操作类型与风险分级约束。
- 风险：如果受控边界字段不继续补强，别的 skill 可能再次出现“看起来可写、实际上不该写”的灰区。
- 验证锚点：计划 retrospective 明确写出 `validate:fixture` 从 `16/17` 提升到 `17/17`，并指出当前受控 `fileWrite` 仍需更细的结构化约束与测试覆盖。

## Search Terms

- `fileWrite`
- `validate:fixture`
- `daily-diary`
- `skill-spec.yaml`
- `skill-manifest.yaml`
- `validation-result.yaml`
- `17/17`
- `16/17`
- `受控写入`
