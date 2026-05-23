# ADR-0038: SkillForge 最小恢复点基于三段链持久化，执行记录留待后续

## Status

accepted

## Context

Phase 14 已完成 `ReviewRecord → PublishPrep → RegistryEntry` 三段对象的 JSON Lines 持久化底座（review-store.mjs / prep-store.mjs / registry-store.mjs），并全部接入 `skillforge-operate.mjs` 和 `skillforge-status.mjs`。

在此底座上，系统有了可判断"能否继续运行"的数据锚点——每个登记对象的持久化状态可以作为恢复判断的依据。但需要决定：

1. 恢复点到什么粒度才算"最小可用"？
2. 执行记录（execution log / operation audit trail）是否应该在本阶段一并实现？

## Decision

### 1. 最小恢复点基于三段链持久化状态

新增 `src/skillforge/recovery-checkpoint.mjs`，提供：

- **`lastCheckpoint(fixtureId)`**：返回指定 fixture 的最近操作快照，包含三段链的最新对象。
- **`canResume(fixtureId)`**：基于持久化状态判断是否可以继续运行（有未结 review 或未结 prep 时不可恢复）。

恢复判断不依赖独立持久化的事务日志，而是直接查询 review-store / prep-store / registry-store 的当前状态，符合"已有数据锚点是恢复条件"的原则。

### 2. 执行记录（execution log）明确后移

本阶段**不做**执行记录持久化。理由：

- execution log 的核心价值是审计和运行追踪，不是当前阶段的最小恢复面。
- 当前已有三段链持久化 + store 可观察性（`skillforge-status.mjs`）已覆盖"有状态、可观察、可判断恢复点"的目标。
- execution log 更适合作为 Phase 15 的审计/运行治理增强项。

### 3. recovery-checkpoint 集成到 skillforge-status.mjs

`skillforge-status.mjs` 新增 **Recovery Checkpoint Status** 区域，展示最近的 checkpoint 和 resume 能力状态，使恢复判断在只读状态面中可观察。

## Alternatives Considered

- **本阶段同时做 execution log 持久化**：拒绝。Scope 过大，execution log 是横向追踪工具，对当前恢复面的构建不构成前置依赖。
- **建立独立的事务日志做恢复**：拒绝。当前阶段的三段链状态已经能为恢复提供足够的数据锚点，无需引入事务日志这一新的基础设施。

## Related Code

| Path | Role |
| ---- | ---- |
| `src/skillforge/recovery-checkpoint.mjs` | 最小恢复点实现：`lastCheckpoint()` / `canResume()` |
| `scripts/test-recovery-checkpoint.mjs` | 恢复点验证入口（10 项检查全部通过） |
| `scripts/skillforge-status.mjs` | 集成 Recovery Checkpoint Status 观察区 |
| `src/skillforge/review-store.mjs` | 恢复判断依赖的上游 store |
| `src/skillforge/prep-store.mjs` | 恢复判断依赖的中间 store |
| `src/skillforge/registry-store.mjs` | 恢复判断依赖的终端 store |

## Consequences

- 正向：最小恢复点建立在实际持久化数据锚点上，不依赖模拟或占位数据。
- 正向：`skillforge-status.mjs` 可直接展示恢复能力，降低运维心智负载。
- 正向：execution log 明确后移，Phase 14 收口干净，不欠 scope drift 债。
- 取舍：恢复点粒度是"依据 store 当前状态推断"，而非完整操作回放——适合"能否恢复"判断，不适合"如何恢复"的逐步骤回放。
- 留存：当 review/prep/registry 三段链都已持久化时，最小恢复点可以先于 execution log 成立；execution log 更适合作为审计/运行治理增强项。
- 验证锚点：`node scripts/test-recovery-checkpoint.mjs` 输出全部 10 项检查通过；`skillforge-status.mjs` 的 Recovery Checkpoint Status 集成成立。

## 后续修正

Phase 16 将 execution log 从 deferral 状态提升为实际实现（`src/skillforge/execution-log-store.mjs`），采用与三段链 store 一致的 JSON Lines 窄接口模式，接入`skillforge-operate.mjs` 完成路径和 `skillforge-status.mjs` 展示面。

这**不否定** Phase 14 的 deferral 决策正确性：恢复点在 Phase 14 收口时确实只需要三段链状态，execution log 不是最小恢复面的前置依赖。execution log 在 Phase 16 才实现，是因为 Phase 16 以「桥接证据与审计轨迹」为统一主题，正好由 transcript store 和 execution log store 共同承载。如果未来再遇到类似的 deferred 项，Phase 14 仍然是正确的切口选择——defer 后是否提前实现取决于后续阶段的职责边界是否天然对齐。

## Search Terms

- `recovery-checkpoint.mjs`
- `lastCheckpoint`
- `canResume`
- `test-recovery-checkpoint.mjs`
- `Recovery Checkpoint Status`
- `execution log deferred`
- `Phase 14`
