# ADR: Phase 3 synthetic/provenance contract-first closeout

## Status
Accepted

## Context
Phase 3 的 synthetic/provenance 工作已经完成了 contract-first 的边界收束：

- synthetic provider pipeline 的 contract 已落地
- acceptance provenance 的披露口径已落地
- final report `metadata.provenanceSummary` 的 disclosure boundary 已落地
- 当前不建议继续追加测试，也不应继续把边界往真实 provider execution 方向硬推

此时继续做实现切口，边际收益已经明显下降，且会继续触碰当前合同边界的上限。更合适的动作是把现状写回主计划和事实源，明确“已完成什么、明确不做什么、何时重新开启”。

## Decision
本轮 Phase 3 synthetic/provenance 进入 **contract-first closeout**。

具体采取：

1. 在主计划里把这一波工作标记为自然收口点
2. 在 provenance contract 文档里固化已完成边界与未完成边界
3. 明确后续重新开启条件，而不是继续扩实现面

## Why

### 已完成
- synthetic provider pipeline
- acceptance provenance
- `provenanceSummary`
- provenance contract 文档收口

### 不继续实现的原因
- 边际收益低：继续扩写只会增加文档噪音或小修小补
- 约束边界已触顶：当前 contract 已把可表达范围收紧到位
- 测试追加不划算：在当前阶段继续追加测试，无法显著提升决策质量

### 明确保留未完成项
- 真实 provider execution
- transcript capture
- persistence
- scoring
- sandbox
- multi-case
- passed path

## Consequences
- 文档现在必须诚实体现“到此收口”，避免误读为还能继续平推实现
- 任何后续新增的真实 provider 能力，都应作为下一阶段单独设计与验收
- 当前结论不是永久冻结，而是阶段性收口

## Reopen Conditions
满足以下任一条件时，可重新开启 Phase 3 后续实现：

1. 放松真实 provider 边界，允许接入真实 provider execution / transcript / persistence 链路
2. 进入下一阶段设计，需要在新的 contract 下重新拆分最小实现切口

## References
- `docs/roadmap.md`
- `docs/phase-3-provenance-contract.md`
- `docs/phase-3-runtime-report-runner-plan.md`
- `docs/phase-3-runtime-draft-cli-plan.md`
