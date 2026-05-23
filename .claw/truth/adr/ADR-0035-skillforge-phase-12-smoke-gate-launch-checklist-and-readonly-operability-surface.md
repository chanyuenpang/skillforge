# ADR: SkillForge Phase 12 smoke gate 作为发布前统一闸门，并保持 operability surface 只读

## Status

accepted

## Context

Phase 12 进入交付与稳定发布收口时，已有最小真实链路可用，但还没有一条统一的“能不能发”检查面。此前的 `scripts/skillforge-status.mjs` 与 `scripts/skillforge-operate.mjs` 已分别提供观察面与最小操作面，但它们是分散入口，不能直接代表发布前闸门。

该阶段需要先把发布判断收口到一个最小 smoke gate，再决定是否继续扩展 packaging、runbook、rollback 或更重的 operability 套件。

## Decision

Phase 12 的第一刀固定为最小发布闸门（smoke gate），统一串起现有 `skillforge-status.mjs` 与 `skillforge-operate.mjs`，并以单一结论 `SMOKE GATE: PASS/FAIL` 作为发布前判断。

同时，`scripts/skillforge-status.mjs` 继续作为只读观察面，`scripts/skillforge-operate.mjs` 继续作为最小 operator surface；这两个入口的职责不扩张为完整 launch system。

## Alternatives Considered

- 继续先补 packaging、runbook 或 rollback：被拒绝，因为这会把 Phase 12 的重点从“先判断能不能发”拉回到周边完备性。
- 直接建设完整 launch system：被拒绝，因为当前阶段更需要一个稳定、统一、低成本的发布前闸门，而不是一次性做大而全。
- 回头重做前面阶段的产品链功能：被拒绝，因为 Phase 12 应该收口在 operability 与发布判定，不应重新展开前序链路。

## Related Code

| Path | Role |
| --- | --- |
| `scripts/skillforge-smoke-gate.mjs` | Phase 12 新增的统一发布前闸门脚本，串联现有观察面与操作面。 |
| `scripts/test-skillforge-smoke-gate.mjs` | smoke gate 的独立验证入口。 |
| `scripts/skillforge-status.mjs` | 只读观察面入口。 |
| `scripts/skillforge-operate.mjs` | 最小 operator surface 入口。 |

## Consequences

- 发布前判断有了统一、可复用的 smoke gate，不再依赖零散检查。
- `status` 与 `operate` 的边界更清晰，避免观察面和操作面在 Phase 12 早期膨胀成完整 launch system。
- 当前只覆盖最小发布闸门，尚未包含 packaging、runbook、rollback、环境健康检查和权限/网络预检。

## Search Terms

- `SkillForge Smoke Gate`
- `SMOKE GATE: PASS`
- `skillforge-status.mjs`
- `skillforge-operate.mjs`
- `scripts/test-skillforge-smoke-gate.mjs`
