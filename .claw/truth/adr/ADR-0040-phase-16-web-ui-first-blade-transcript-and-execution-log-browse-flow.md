# ADR: Phase 16 Web UI 第一刀采用 transcript 与 execution log 的可浏览闭环

## Status

accepted

## Context

Phase 16 已完成首个最小但真实可用的 Web UI 产品面，不是先补大而全的仪表盘，而是先把真实数据做成能浏览、能看详情、能操作的最小闭环。子计划记录显示，当前已经形成：首页 `replay/operate` 入口、`/history` execution log 列表页、`/transcripts` transcript 列表页，三页之间可以互相导航。

这意味着 Phase 16 的产品面不应继续停留在“有入口但看不到结果”，也不应把重心转向详情页或复杂交叉跳转；当前可接受的收口线是先把“能触发、能看结果、能翻记录”的闭环固定下来，再进入下一阶段。

## Decision

决定将 Phase 16 的 Web UI 第一刀固定为 **`transcript` 与 `execution log` 的可浏览闭环**，并以此作为当前阶段的收口线。

具体规则如下：

1. **先保留最小真实闭环**
   - 首页提供 `replay/operate` 入口，且必须真实接到后端。
   - `/history` 负责展示 `execution log` 列表。
   - `/transcripts` 负责展示 `transcript` 列表。
   - 三页之间保持基础导航互通即可。

2. **把浏览和可见性放在第一优先级**
   - 当前阶段的核心不是复杂交互，而是让真实执行数据能被浏览、能被检索、能形成操作结果闭环。
   - 详情页与更复杂的交叉跳转可后置为 UI 增强，不作为 Phase 16 收口前的必需项。

3. **界面必须依赖真实数据底座**
   - UI 只消费已经接好的 `transcript` 与 `execution log` 数据，不回退到空壳展示。
   - 这条约束延续了 Phase 16 前半段先补数据底座再做 UI 的策略。

4. **阶段收口条件明确**
   - 当首页入口、`/history`、`/transcripts` 三页已经形成可用闭环时，Phase 16 可以收口并进入下一阶段。
   - 继续扩详情页、交叉跳转或更强的产品增强，不属于本阶段必做项。

## Alternatives Considered

- **继续补详情页和交叉跳转**：延后。虽然有价值，但不是当前收口线，容易把阶段目标扩散成更重的 UI 工程。
- **先做更完整的产品仪表盘**：拒绝。会偏离“最小但真实可用”的原则，并增加不必要的前端复杂度。
- **只保留列表、不做首页入口**：拒绝。没有操作入口，列表只能是陈列柜，无法形成产品闭环。

## Related Code

| Path | Role |
| ---- | ---- |
| `scripts/skillforge-web-ui.mjs` | Web UI 单文件实现，承载首页入口、`/history`、`/transcripts` 的最小闭环。 |
| `scripts/run-runtime-draft.mjs` | 真实执行入口，作为 `replay/operate` 的后端锚点。 |
| `scripts/skillforge-operate.mjs` | 操作入口，驱动真实后端并产生可浏览结果。 |
| `scripts/skillforge-status.mjs` | 只读观察面，继续提供状态查看能力。 |
| `src/skillforge/execution-log-store.mjs` | `execution log` 的持久化底座。 |
| `src/skillforge/transcript-store.mjs` | `transcript` 的持久化底座。 |

## Consequences

- 正向：Phase 16 拥有了首个真实可用的 Web UI 闭环，不再只是数据底座或静态入口。
- 正向：`transcript` 与 `execution log` 可以被直接浏览，用户能看到操作结果与历史记录。
- 正向：阶段收口边界清晰，后续 UI 增强可以在不破坏当前闭环的前提下继续推进。
- 取舍：当前阶段不追求详情页和复杂交叉跳转，视觉和交互的完整性要等后续阶段补齐。
- 验证锚点：计划完成记录明确写出首页 `replay/operate` 入口、`/history`、`/transcripts` 三页已互通，并形成“能触发、能看结果、能翻记录”的最小产品闭环。

## Search Terms

- `scripts/skillforge-web-ui.mjs`
- `replay/operate`
- `/history`
- `/transcripts`
- `transcript`
- `execution log`
- `Phase 16`
- `能触发`
- `能看结果`
- `能翻记录`
