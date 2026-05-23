# ADR-0022: SkillForge multi-case orchestration 保持 reserved stub，`caseMode` 恒为 `single`，且不得引入动态 multi-case 传播

## Status

accepted

## Context

决定先行：在此前多份 runtime ADR 已反复把 multi-case orchestration 视为“尚未开放的未来 seam”之后，Phase 3 进一步把 **multi-case orchestration** 冻结为最小 reserved stub，并明确当前阶段只支持 single-case truth。

来源计划“Phase 3 multi-case orchestration reserved stub”已完成（`end.completed`）。计划中的 `done` 任务、review 与 retrospective 固定了以下事实：

- 已冻结 `CASE_MODES`、`buildMultiCaseStub`、`buildMultiCaseStubProviderReserved`、`assertMultiCaseStubContract` 四个 contract 相关符号。
- “收紧 multi-case same-source propagation” 任务已完成，review 明确“三层均无 multi-case 动态传播，无需改动”。
- retrospective 的 knowledge candidate 明确写死：`caseMode` 永远 `single`，`CASE_MODES` 只保留 `single` / `reserved-multi`，且 provider-backed reserved 也不升级为 multi-case。
- retrospective 同时明确：reporter 侧 `cases[0]` 取值是已知 tech debt；未来若真正支持多 case，必须改为聚合，而不是继续把单 case 下标当作长期接口。
- 已补 7 个新测试，总体验证达到 `91/91`。

这需要沉淀为 ADR，因为它定义了未来真实 multi-case orchestration 接入前的长期约束：系统可以保留 multi-case 的预留语义，但不得把 reserved slot、provider-backed reserved path 或当前单 case report 结构误写成“已经支持多 case”。

## Decision

决定将 SkillForge 当前阶段的 multi-case orchestration 合同冻结为 **reserved stub only**：在真实 multi-case planning、execution、aggregation 与 reporting 能力接通前，runtime/reporter 相关结构只能表达“当前仍是 single-case truth，另有未来 multi-case 保留槽位”，不能表达“当前已经支持多 case orchestration”。

当前阶段的具体规则如下：

- `caseMode` 当前必须恒为 `single`，不得因为 reserved slot、provider-backed reserved 路径或局部实现细节而暴露真实 multi-case 模式。
- `CASE_MODES` 当前只允许 `single` 与 `reserved-multi` 两种语义；其中 `reserved-multi` 仅代表未来扩展位，不代表当前 runtime 已具备 multi-case 编排能力。
- `buildMultiCaseStub`、`buildMultiCaseStubProviderReserved` 与 `assertMultiCaseStubContract` 共同定义 canonical reserved stub contract；后续若要开放真实 multi-case，必须显式扩展该 contract，而不能在现有 stub 语义上偷偷放宽。
- multi-case 相关字段必须继续遵守 same-source propagation；既有三层链路当前不引入动态 multi-case 传播，下游也不得自行推断“某个 reserved provider-backed path 等价于真实多 case”。
- reporter 当前使用 `cases[0]` 作为单 case 取值锚点，这被视为显式技术债；未来若实现多 case，必须切换到聚合表达，而不是继续沿用单元素下标作为伪多 case 接口。

## Alternatives Considered

- 让 provider-backed reserved path 直接升级为真实 multi-case 模式：拒绝。来源计划已明确“provider-backed reserved 也不升级为 multi-case”。
- 在当前阶段开放动态 multi-case same-source propagation：拒绝。来源计划已明确三层均无 multi-case 动态传播，且无需改动。
- 继续把 reporter `cases[0]` 视为可长期扩展的多 case 表达：拒绝。来源计划已把它标记为已知 tech debt，并明确未来应改为聚合。

## Related Code

| Path | Role |
| ---- | ---- |
| `CASE_MODES` | multi-case orchestration mode 的冻结入口。 |
| `buildMultiCaseStub` | canonical single-case reserved stub builder。 |
| `buildMultiCaseStubProviderReserved` | provider-backed reserved path 的 stub builder。 |
| `assertMultiCaseStubContract` | multi-case reserved stub contract 的断言锚点。 |
| `caseMode` | 当前必须恒为 `single` 的公共语义锚点。 |
| `cases[0]` | reporter 当前单 case 取值接口与未来聚合改造的技术债锚点。 |

## Consequences

- 正向：系统明确把 multi-case orchestration 限定为 reserved stub，避免 provider-backed reserved slot 或预留模式制造“已经支持多 case”的假象。
- 正向：`caseMode=single` 与 `CASE_MODES` 双模式冻结，让未来扩展边界清晰，同时保持当前 single-case truth 稳定。
- 正向：same-source propagation 继续维持保守语义，避免跨层自行拼装出伪 multi-case 行为。
- 取舍：当前仍然没有真实 multi-case planning、execution、aggregation 或 reporting；`reserved-multi` 只是未来扩展位，不代表 capability 已完成。
- 取舍：reporter 侧 `cases[0]` 仍是技术债；后续接入真实多 case 时必须显式改造聚合模型，而不是继续堆兼容补丁。
- 验证锚点：来源完成记录确认新增 7 个测试，总体验证 `91/91` 通过，且三层传播检查保持无动态 multi-case 传播。

## Search Terms

- `CASE_MODES`
- `buildMultiCaseStub`
- `buildMultiCaseStubProviderReserved`
- `assertMultiCaseStubContract`
- `caseMode`
- `single`
- `reserved-multi`
- `cases[0]`
- `same-source propagation`
- `multi-case orchestration reserved stub`
- `91/91`
