# ADR: SkillForge shared baseline v0 的上层消费 API 与 RunCenter 卡片接入

## Status

accepted

## Context

shared baseline v0 已经完成 `failure pool`、nightly / 回归首版和 Batch 2 / Batch 3 的基础链路，现在需要把结果以最小接口交给上层消费方。计划明确：消费侧应复用已有 `summary.json` 和 `failures.ndjson`，不要反过来要求底层为消费侧频繁改 schema；首版只做产品面 / 运行中心的最小读取与展示，不回头重构底层 runner、failure pool 或 nightly。

这一步的长期价值在于把“基线已成立”转成“上层可以稳定读取并使用”的真实消费能力，且保持底层契约不变，避免后续增强把 shared baseline v0 的产物协议再次打散。

## Decision

决定将 shared baseline v0 的上层消费固定为以下规则：

1. **消费侧优先复用既有产物，不改底层契约**
   - 上层消费直接读取 `summary.json`，必要时再接入 `failures.ndjson`。
   - 不要求底层为消费侧反复变更 schema。
   - `summary.json` + `failures.ndjson` 继续作为 shared baseline v0 的唯一稳定输入口径。

2. **上层首版采用最小接口 / 视图形态接入**
   - 产品面 / 运行中心以最小接口或卡片视图承接 baseline 结果。
   - 首版只保证“能稳定读取、能看到失败信息、能形成最小可用视图”。
   - 不把 Batch 2 / Batch 3 扩样、趋势看板或多版本治理一起塞入首版。

3. **RunCenter 作为默认消费落点之一**
   - 上层消费应优先挂接到现有 RunCenter 体系内，而不是另起一套平行展示面。
   - 让已有工作台直接消费 shared baseline v0 结果，减少新入口带来的心智负担。
   - 新增内容保持可回收、可扩展，但首版不扩成完整产品化平台。

4. **验证以“可稳定读取 + 最小视图成立 + 失败信息可消费”为准**
   - 必须验证消费侧能稳定读取 `summary.json`。
   - 必须验证失败信息可被消费侧读到。
   - 必须验证最小视图 / 接口确实成立，而不是只有文件落盘。

## Alternatives Considered

- **为消费侧再造一套平行协议**：被拒绝。会破坏 shared baseline v0 的统一契约。
- **继续只停留在 baseline 输出，不做上层消费**：被拒绝。这样基线虽然成立，但无法形成真正可用的上层能力。
- **把上层消费直接做成完整趋势平台**：被拒绝。首版只需要最小接入，不应扩大治理面。
- **要求底层为上层消费频繁改 schema**：被拒绝。会让 shared baseline v0 失去稳定口径。

## Related Code

| Path | Role |
| ---- | ---- |
| `baselines/shared/v0/results/summary.json` | 上层消费的主结果输入。 |
| `baselines/shared/v0/results/failures.ndjson` | 上层消费的失败信息输入。 |
| `.github/workflows/nightly-shared-baseline-v0.yml` | 产生上层消费输入的 nightly / 回归入口。 |
| `plans/subplan-5-plan.json` | 本次上层消费接入计划源记录。 |
| `adr/ADR-0114-skillforge-shared-baseline-v0-sample-protocol-runner-report-and-phase1-batches.md` | shared baseline v0 的样本协议与统一 runner 基线。 |
| `adr/ADR-0115-skillforge-shared-baseline-v0-mainline-judgement-and-follow-up-structure.md` | shared baseline v0 主线裁决与后续增强拆分口径。 |
| `adr/ADR-0116-skillforge-shared-baseline-v0-failure-pool-failures-ndjson-contract.md` | `failures.ndjson` 的统一失败契约。 |
| `adr/ADR-0117-skillforge-shared-baseline-v0-nightly-regression-first-cut-and-dual-artifact-upload.md` | nightly / 回归首版双产物上传规则。 |

## Consequences

- 正向：shared baseline v0 的结果能被上层稳定读取，不再只停留在底层产物。
- 正向：RunCenter 或产品面可复用同一份 baseline 结果，避免平行协议。
- 正向：`summary.json` / `failures.ndjson` 契约继续稳定，底层不会为消费侧反复改 schema。
- 取舍：首版只做最小接口与卡片视图，暂不覆盖趋势看板、多版本治理和复杂分析。
- 风险：如果后续把更多消费逻辑塞回底层，统一契约会再次被稀释。
- 验证锚点：消费侧必须能稳定读取 `summary.json`，并把失败信息纳入最小可用视图。

## Search Terms

- `summary.json`
- `failures.ndjson`
- `RunCenter`
- `产品面`
- `运行中心`
- `最小接口`
- `卡片视图`
- `shared baseline`
- `baseline v0`
- `失败信息`
