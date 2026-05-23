# ADR: SkillForge Phase 13 先补 release packaging + operator runbook，recovery 后移到下一阶段

## Status

accepted

## Context

Phase 13 进入交付与恢复能力收口时，已经有了可运行的单一 release packaging / delivery entry：`scripts/skillforge-release.mjs` 可以把 `skillforge-smoke-gate.mjs` 串起来，并汇总 `smoke gate: ok`、`status: ok`、`operate: ok`、`overall: ready-for-release`。随后又补了 `scripts/skillforge-launch-procedure.mjs` 作为最小可执行 launch procedure，并用 `scripts/test-skillforge-launch-procedure.mjs` 做独立验证。

在这个阶段的决策点上，系统仍然是纯脚本、纯内存，没有持久化状态。也就是说，当前最缺的不是一个“看起来有恢复”的壳，而是把人如何安全地按步骤完成发布与操作这件事先收口成最小 runbook。

## Decision

决定在 Phase 13 的推进顺序上，**先补 operator runbook / launch procedure 的最小可执行入口，再考虑 recovery / rollback**。

具体规则如下：

- 先把单一 `release packaging / delivery entry` 固化为发布入口，再围绕它补最小可执行的 `launch procedure`。
- `scripts/skillforge-launch-procedure.mjs` 作为本阶段优先级高于 recovery 的 operator runbook 入口，负责把发布与操作步骤串成可执行流程。
- `recovery` 不在 Phase 13 里强行做成空壳占位；在当前系统仍无持久化状态、无真实可恢复对象时，直接后移到下一阶段。
- Phase 13 的收口点是“真实可运行的 release + runbook 闭环”，而不是补一个表面上完整、实际没有恢复对象的 recovery 模块。

## Alternatives Considered

- 先做 recovery / rollback minimal path：被拒绝。当前系统没有持久化状态，强行做 recovery 只会形成空壳。
- 直接扩成完整运维平台：被拒绝。当前阶段只需要最小可操作发布闭环，不需要企业化流程。
- 继续停留在 smoke gate，不补 runbook：被拒绝。发布判定有了，但人如何安全执行仍然缺口明显。

## Related Code

| Path | Role |
| --- | --- |
| `scripts/skillforge-release.mjs` | 单一 release packaging / delivery entry。 |
| `scripts/test-skillforge-release.mjs` | release delivery entry 的独立验证入口。 |
| `scripts/skillforge-launch-procedure.mjs` | 最小可执行 launch procedure / operator runbook 入口。 |
| `scripts/test-skillforge-launch-procedure.mjs` | launch procedure 的独立验证入口。 |
| `scripts/skillforge-smoke-gate.mjs` | 发布前统一闸门，作为 release entry 的前置基础。 |
| `scripts/skillforge-operate.mjs` | 最小 operator surface，作为 launch procedure 的组成部分。 |

## Consequences

- 正向：Phase 13 先形成了真实可运行的 release + runbook 闭环，而不是停留在判断能不能发。
- 正向：`launch procedure` 成为围绕发布入口的最小操作指引，减少人肉拼接各入口的成本。
- 正向：在当前纯脚本、纯内存条件下，避免把 recovery 做成无状态空壳。
- 取舍：`recovery` 被明确后移到下一阶段，Phase 13 不追求“看起来完整”的恢复能力。
- 取舍：本阶段只解决最小交付与操作闭环，尚未进入真正有状态、可恢复的产品层。
- 验证锚点：`node scripts/skillforge-launch-procedure.mjs` 输出 `Procedure summary`、`release: ok`、`operate: ok`、`final: READY`；`scripts/test-skillforge-launch-procedure.mjs` 输出 `✅ PASS`。

## Search Terms

- `scripts/skillforge-release.mjs`
- `scripts/test-skillforge-release.mjs`
- `scripts/skillforge-launch-procedure.mjs`
- `scripts/test-skillforge-launch-procedure.mjs`
- `Procedure summary`
- `final: READY`
- `recovery`
- `rollback`
- `smoke gate`
