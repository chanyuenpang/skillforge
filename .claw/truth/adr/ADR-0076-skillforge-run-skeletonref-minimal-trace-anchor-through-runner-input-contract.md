# ADR: Run 侧通过 `runtime-runner-contract.mjs` 暴露 `skeletonRef` 最小追溯锚点

## Status

accepted

## Context

E2-C 之前，run 侧虽然已经有回看入口与执行证据链的基础，但 `skeletonRef` 仍只停留在文档或上游对象层，没有形成可只读追到 runner input contract 的最小追溯锚点。这样会导致 run 相关的版本/证据回看只能看到结果，不能稳定说明其对应的 skeleton 来源与版本。

本次收口确认：`skeletonRef` 不是额外的 UI 装饰字段，而是 run 输入合同上的最小追溯锚点，必须能从上游 `options` / `preflightReport` / `caseRecord` / `fixture` 链路只读归一化出来。

## Decision

决定将 `skeletonRef` 的最小追溯锚点收敛到 `runtime-runner-contract.mjs`，并以 runner input contract 作为唯一主暴露面。

具体规则如下：

1. `runtime-runner-contract.mjs` 中新增 `normalizeSkeletonRef(source)`，负责把上游来源归一化为统一的 `skeletonRef` 结构。
2. `buildRuntimeRunnerInput(...)` 必须按 `options` > `preflightReport` > `caseRecord` > `normalizedFixture` > `loadedFixture.skillManifest` > `loadedFixture.manifest` 的优先级透传 `skeletonRef`。
3. 最终在 input contract 上暴露 `skeletonRef: { skeletonId, skeletonVersion } | null`，缺失时明确返回 `null`，而不是伪造占位值。
4. 这条链路的目标是只读追溯，不引入 Retro 回沉执行或 UI 大改；如需对称扩展，只允许在相邻的 orchestrator 透传层做最小辅助。

## Alternatives Considered

- 继续把 `skeletonRef` 只放在文档层：被拒绝，因为这样无法形成 run 侧可验证的只读追溯锚点。
- 把锚点散落在多个 report / UI 层：被拒绝，因为会增加链路复杂度，也容易让来源优先级失真。
- 在运行结果中伪造默认 `skeletonRef`：被拒绝，因为追溯字段必须真实表达来源，不应补造空值。

## Related Code

| Path | Role |
| --- | --- |
| `runtime-runner-contract.mjs` | 主落点：`normalizeSkeletonRef(source)` 与 `buildRuntimeRunnerInput(...)` 的 `skeletonRef` 归一化透传 |
| `runtime-draft-orchestrator.mjs` | 可选辅助透传层：仅在需要时做对称转发 |

## Consequences

- 正向：run 侧终于有了最小真实的 `skeletonRef` 只读追溯锚点。
- 正向：上游 `options` / `preflightReport` / `caseRecord` / `fixture` 到 runner input contract 的链路被固定，后续实现不易漂移。
- 正向：缺失时返回 `null`，避免把未知来源伪装成有效锚点。
- 取舍：`skeletonRef` 的最小实现仅覆盖 runner input contract，尚未扩展到更宽的 report 面。
- 验证锚点：最小调用样本已验证 `options.skeletonRef` 透传、优先级正确、缺失时为 `null`。

## Search Terms

- `runtime-runner-contract.mjs`
- `normalizeSkeletonRef`
- `buildRuntimeRunnerInput`
- `skeletonRef`
- `skeletonId`
- `skeletonVersion`
