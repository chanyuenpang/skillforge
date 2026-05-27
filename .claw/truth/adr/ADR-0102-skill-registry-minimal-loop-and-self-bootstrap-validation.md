# ADR: Skill Registry 最小闭环与自举验证

## Status

accepted

## Context

Skill Registry 需要从“能识别技能”推进到“能持续产出可查询结果”的最小可用链路。此前如果只停留在单点实现，`source`、`scan`、`artifact`、`refresh`、`index`、`query` 之间很容易出现字段语义不一致、版本边界不清、以及验证样本脱离真实目录的问题。

本次子计划明确把 Registry MVP 收口为一条研发可执行闭环，并要求全程持续使用 SkillForge 自身能力和真实样本来验证，避免只靠理想化 mock 推进。

## Decision

Skill Registry 的 MVP 采用固定闭环：`source -> scan -> artifact -> refresh -> index -> query`。

同时，验证策略必须以内置真实样本为中心：

- `source` 以本地 `skills/` 目录为主要输入面。
- `scan` 产出可落盘的 `artifact`，作为后续 `refresh` 与 `index` 的唯一消费输入。
- `refresh` 负责维护最新指针与变更差异，保证增量与幂等语义清晰。
- `index` 与 `query` 只基于 `artifact` 工作，不回读源文件作为主路径。
- 全链路验证必须持续使用 SkillForge 自身目录与真实运行样本，形成“设计即运行”的反馈回路。

## Alternatives Considered

- 只做 `source -> scan` 的轻量链路：能验证识别能力，但无法支撑可查询结果，不足以成为 MVP。
- 直接从源文件查询：会把扫描、缓存与索引边界揉在一起，后续难以稳定演进。
- 依赖大量 mock 样本验证：反馈快，但容易掩盖真实目录结构、异常样本和高变更场景。

## Related Code

| Path | Role |
| ---- | ---- |
| `skills/` | 真实样本来源与自举验证基准。 |
| `plans/subplan-8-skillforge-registry-mvp-subplan.json` | 本次闭环与验证要求的来源计划。 |

## Consequences

- Registry 的实现边界更清晰，后续可按阶段分别落地 `scan`、`refresh`、`index`、`query`。
- 真实样本驱动会提高方案可信度，也更容易暴露边界问题。
- `artifact` 成为链路核心中间层后，必须额外关注版本命名、幂等刷新和消费兼容性。

## Search Terms

- `Skill Registry`
- `source -> scan -> artifact -> refresh -> index -> query`
- `artifact`
- `refresh`
- `index`
- `query`
- `skills/`
- `SkillForge`
