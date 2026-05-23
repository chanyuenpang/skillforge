# ADR: Phase 7 generator 仅先承接 skeleton-only 最小链路

## Status

accepted

## Context

Phase 7 的子计划把 generator 的首次真实实施范围收得很窄：只允许单个 `workflow/spec` → `SkillSpec` → `SkillManifest` → `SKILL.md` skeleton → static validation 的最小链路，不进入全量 workflow、multi-skill、UI、publish、registry 或 runtime binding。

计划的 retrospective 已把这一点固定为可复用结论：先固定唯一输入锚点，再按 G2→G5 逐层冻结边界，generator 才能获得一条“能生成、能静态验证、并诚实记账”的最小链路。

这条决策值得沉淀，因为它定义了 generator 第一阶段的长期实现边界：它不是完整技能生成系统，只是 skeleton-only 的最小可执行骨架；后续任何扩张都必须在此边界之上重新开口。

## Decision

决定将 Phase 7 的 generator 首刀固定为 `skeleton-only` 最小链路。

具体规则如下：

- generator 只承接 `workflow/spec` → `SkillSpec` → `SkillManifest` → `SKILL.md` skeleton → `static validation` 这条最小链路。
- 只允许先冻结唯一的单一 `workflow/spec` 输入锚点，再逐层推进字段映射与生成边界。
- `SKILL.md` 第一阶段只生成章节化骨架，不得把 skeleton 误当成 fully-authored skill 文档。
- `generation run record` 的第一阶段只记录“生成了什么骨架、延后了什么、禁止扩了什么”，不用于伪装完整能力交付。
- 不把这一阶段扩展为全量 workflow、multi-skill、UI、publish、registry 或 runtime binding。

## Alternatives Considered

- 直接做全量 generator：拒绝。计划明确要求只收最窄单条链，过早扩张会让边界漂移。
- 先做 UI / publish / registry：拒绝。这些都超出 Phase 7 第一刀的承接范围。
- 把 skeleton 当成完整 skill 文档交付：拒绝。计划 retrospective 明确提醒 skeleton-only 不能伪装成 fully-authored skill 文档。

## Related Code

| Path | Role |
| ---- | ---- |
| `docs/phase-7-generator-real-implementation-entry-hub.md` | Phase 7 正式入口 hub。 |
| `docs/phase-7-generator-real-implementation-subplan-task-index.md` | Phase 7 第一层任务索引。 |
| `docs/phase-4-generator-real-implementation-entry-plan.md` | 早期 generator 真实实现入口计划。 |
| `docs/phase-4-generator-minimal-executable-chain-entry.md` | 最小 executable chain 的历史入口。 |
| `docs/phase-4-generator-implementation-task-breakdown.md` | 相关实现拆解参考。 |
| `fixtures/release-notes-assistant/workflow-source.yaml` | Phase 7 选定的唯一输入锚点。 |

## Consequences

- 正向：generator 的第一阶段边界极清楚，后续可以稳定承接映射、生成、验证三件事。
- 正向：避免把 skeleton 误写成完整技能文档，降低 truth 污染风险。
- 正向：`generation run record` 只记录事实，不夸大能力，便于后续审计。
- 取舍：短期内不会得到完整正文填充、runtime binding、publish 或 registry 能力。
- 取舍：后续若要扩展生成能力，必须显式跨出 skeleton-only 边界并新建/更新相应 ADR。
- 验证锚点：Phase 7 retrospective 已确认链路收口到 `G1` 固定输入锚点、`G2`~`G5` 逐层冻结边界，并明确当前仍停留在 skeleton-only 生成链路。

## Search Terms

- `workflow/spec`
- `SkillSpec`
- `SkillManifest`
- `SKILL.md skeleton`
- `static validation`
- `generation run record`
- `single workflow/spec sample`
- `skeleton-only`
