# ADR: Phase 10 generator productization 先收口最小端到端生成链，再接 status handoff

## Status

accepted

## Context

Phase 10 的计划不是继续扩 `marketplace`、`multi-tenant` 或复杂协作，而是把 generator 从“若干独立 compile 件”推进成一条可持续生成完整可用 skill 的产品流。计划的真实完成结果已经证明：`
workflowSource -> SkillSpec -> SkillManifest -> SKILL.md skeleton`
这条链路已经从散件收口为可 import、可验证、可观察的最小生成路径。

计划还明确了推进顺序：先做 `workflow-source -> SkillSpec compile`，再做 `SkillSpec -> SkillManifest compile`，再做 `SkillManifest -> SKILL.md skeleton`，最后才把 generator 接回 `skillforge-status.mjs` 做 `Generator Status` 观察面。这个顺序本身就是一个长期有效的架构决策：生成闭环必须先成立，观察面才能可靠存在。

## Decision

决定将 Phase 10 的 generator 产品化路径固定为以下顺序：

1. 先建立最小可导入的生成链：`workflowSource -> SkillSpec -> SkillManifest -> SKILL.md skeleton`。
2. 再用最小 orchestrator 串联这三段 compile，形成端到端生成路径。
3. 最后才把生成结果接入 `scripts/skillforge-status.mjs`，作为 `Generator Status` 的可观察入口。

具体约束如下：

- 第一刀必须是 `workflow-source -> SkillSpec compile`，而不是 handoff 展示或 UI surface。
- `SkillManifest -> SKILL.md skeleton` 必须先于 orchestrator 之外的产品化构件。
- `status handoff` 只能放在生成闭环之后，不能让观察先于能力。
- 当前阶段只承认最小端到端生成链，不把 Phase 10 一上来扩成 `marketplace`、`multi-tenant`、复杂协作或完整发布流。

## Alternatives Considered

- 先做 handoff / status surface：拒绝。没有先形成稳定生成闭环，观察面会变成空壳。
- 先做 `marketplace` / `multi-tenant`：拒绝。明显超出 Phase 10 的首轮产品化边界。
- 继续只做单点 compile，不串成 orchestrator：拒绝。散件能跑不等于产品化，缺少最小端到端路径。

## Related Code

| Path | Role |
| ---- | ---- |
| `src/skillforge/generator-workflow-to-spec.mjs` | `workflowSource -> SkillSpec` 的首个 compile 入口。 |
| `src/skillforge/generator-spec-to-manifest.mjs` | `SkillSpec -> SkillManifest` 的 compile 入口。 |
| `src/skillforge/generator-manifest-to-skill-md.mjs` | `SkillManifest -> SKILL.md skeleton` 的 compile 入口。 |
| `src/skillforge/generator-orchestrator.mjs` | 串联最小端到端生成链的 orchestrator。 |
| `scripts/skillforge-status.mjs` | 接入 `Generator Status` 的现有观察面。 |
| `scripts/test-generator-workflow-to-spec.mjs` | `workflow-source -> SkillSpec` 的独立验证脚本。 |
| `scripts/test-generator-spec-to-manifest.mjs` | `SkillSpec -> SkillManifest` 的独立验证脚本。 |
| `scripts/test-generator-manifest-to-skill-md.mjs` | `SkillManifest -> SKILL.md skeleton` 的独立验证脚本。 |
| `scripts/test-generator-orchestrator.mjs` | 最小 orchestrator 的独立验证脚本。 |

## Consequences

- 正向：generator 不再只是几个映射模块，而是有了真实的最小产品流。
- 正向：`skillforge-status.mjs` 的 `Generator Status` 建立在真实生成闭环之上，观察可信度更高。
- 正向：每一段 compile 都有独立验证脚本，后续回归更容易定位。
- 取舍：这仍不是完整 generator 产品，暂不包含多输入、多 skill、真实落盘、registry/publish、runtime binding、错误恢复或 CI 集成。
- 取舍：后续要增强观察语义时，必须在生成闭环成立的前提下再细化 `Generator Status`。
- 验证锚点：计划 retrospective 明确确认了当前交付是“可 import、可验证、可观察”的最小生成链，而不是完整产品。

## Search Terms

- `compileWorkflowToSpec`
- `compileSpecToManifest`
- `compileManifestToSkillMd`
- `runGeneratorPipeline`
- `skillforge-status.mjs`
- `Generator Status`
- `workflowSource -> SkillSpec -> SkillManifest -> SKILL.md skeleton`
