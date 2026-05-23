# ADR-0034: SkillForge Phase 11 交互产品面首刀采用 Review -> PublishPrep -> RegistryEntry 的 CLI 操作链

## Status

accepted

## Context

Phase 11 需要把已落地的 `Runtime Replay`、`Generator`、`Product Surface` 三条最小真实链路，推进到可操作的最小产品面与 operator workflow。此前的 `skillforge-status.mjs` 只是只读观察面，适合查看，不适合执行。

在确定 Phase 11 的第一刀时，存在几个明确约束：

- 不能直接扩成 full dashboard 或复杂 UI 框架，否则会过早引入前端耦合。
- `Generator` 与 `Runtime Replay` 的 operator workflow 应该后置，先让当前最小入口稳定。
- 主计划只保留里程碑，细粒度执行下沉到 subplan。
- 第一刀必须选择成熟度最高、切口最小、且不依赖 provider/runtime 的链路。

子计划已完成（`end.completed`），任务 1-5 全部 `done`，因此下面的结论可视为已冻结事实。

## Decision

决定将 Phase 11 的首个真实交互入口固定为 **`Review -> PublishPrep -> RegistryEntry` 的 CLI 操作链**，并以此作为最小可操作产品面。

具体规则如下：

1. **唯一主 workflow 优先**
   - 首先围绕 `ReviewRecord -> PublishPrep -> RegistryEntry` 这条主链路做最小可操作入口。
   - 不在这一阶段扩展为完整 dashboard、复杂 UI 或更宽的 operator suite。

2. **CLI 先于更重的交互层**
   - 通过 `scripts/skillforge-operate.mjs` 提供最小 CLI 交互层。
   - 该入口要能真实构造并校验 `ReviewRecord`、`PublishPrep`、`RegistryEntry` 三段对象链。

3. **最小参数化输入先落地**
   - CLI 先支持最小必需参数：`--fixture-id`、`--version`、`--evidence`、`--source-link`。
   - 参数化目标是让 operator 能以最小输入进入真实对象链，而不是只看 demo 输出。

4. **验证入口要与操作入口并存**
   - `scripts/test-skillforge-operate.mjs` 作为独立验证入口，确保操作链可被单独验证。
   - 验证目标是确认 CLI 输出包含 `SkillForge Operator CLI`、`validation: PASS`、`status: OK`。

5. **后续增强延后**
   - `Generator` 与 `Runtime Replay` 的 operator workflow 后置，等当前第一刀稳定后再进入。
   - 对输出整洁度问题，如 `PublishPrep` 中 `evidenceRefs/sourceLinks` 的重复，不作为当前收口阻塞项。

## Alternatives Considered

- 直接做 full dashboard：拒绝。会过早引入复杂 UI 框架和前端耦合。
- 先做 `Generator` operator workflow：拒绝。当前第一刀应优先选择成熟度最高、无外部 provider 依赖的主链路。
- 先做 `Runtime Replay` operator workflow：拒绝。同样不是当前切口最小、成熟度最高的入口。
- 继续等待更完整的交互体系再收口：拒绝。当前 CLI 已足以形成最小可操作闭环。

## Related Code

| Path | Role |
| ---- | ---- |
| `scripts/skillforge-operate.mjs` | Phase 11 的最小 CLI 操作入口，驱动 `ReviewRecord -> PublishPrep -> RegistryEntry` 链路 |
| `scripts/test-skillforge-operate.mjs` | 独立验证入口，确认 CLI 输出与状态闭环 |
| `scripts/skillforge-status.mjs` | 只读观察面入口，作为 Phase 11 前置基线 |
| `docs/phase-5-product-surface-ui-planning-skeleton-v0.md` | Product Surface / UI 规划骨架 |
| `docs/phase-5-contract-index.md` | Product contract 索引 |

## Consequences

- 正向：Product Surface 第一次具备面向操作者的最小执行入口，而不只是后端对象集合。
- 正向：`ReviewRecord -> PublishPrep -> RegistryEntry` 这条主链路被真实 CLI 驱动并可独立验证。
- 正向：最小参数化输入让该入口从“能跑”升级为“可被最小使用”。
- 取舍：这还不是完整交互产品，尚未包含复杂参数体系、持久化、registry 发布动作、交互 prompt、多用户/权限体系与更强 UX polish。
- 取舍：`Generator` 与 `Runtime Replay` 的 operator workflow 需要等待后续阶段，不在本次收口范围内。
- 验证锚点：`node scripts/skillforge-operate.mjs` 输出 `chain: ReviewRecord → PublishPrep → RegistryEntry` 与 `status: OK`；`scripts/test-skillforge-operate.mjs` 输出 `SkillForge Operator CLI`、`validation: PASS`、`status: OK`。

## Search Terms

- `scripts/skillforge-operate.mjs`
- `scripts/test-skillforge-operate.mjs`
- `ReviewRecord`
- `PublishPrep`
- `RegistryEntry`
- `SkillForge Operator CLI`
- `validation: PASS`
- `status: OK`
- `--fixture-id`
- `--version`
- `--evidence`
- `--source-link`
