# Phase 3 follow-up: runtime replay real-implementation readiness reassessment

> 状态：docs-only reassessment / implementation-readiness gate
> 目的：在 Phase 3 contract-first closeout 之后，重新评估是否已经具备承接真实 runtime replay / provider-backed execution / transcript persistence 的最小实施入口。
> 重要边界：本文**不是实现交付**，不代表真实 runtime replay、provider integration、transcript persistence、scoring、sandbox、multi-case 或 passed path 已实现；也不把 contract closeout 误写成 runtime 完成。

## 1. 当前已经具备的事实

在 contract-first closeout 后，Phase 3 已经具备以下可复用事实：

- **preflight / runtime draft 的独立 contract 入口已存在**：
  - `docs/preflight-contract-and-artifacts-design.md`
  - `docs/runtime-replay-protocol-lightweight-design.md`
  - `docs/validator-contract.md`
- **provider adapter seam 已冻结为 contract-first 接缝**：
  - adapter / runner / observed mapper / report 的 truth lineage 已收紧为单一路径
  - provider-backed reserved seam 的字段边界已被显式钉死
- **provenance 口径已收口**：
  - `docs/phase-3-provenance-contract.md` 已明确 synthetic / reserved / provider-less 的 disclosure boundary
  - `metadata.provenanceSummary` 仅是 informational disclosure，不参与 decision
- **provider-backed reserved slot 的 implementation-prep 清单已存在**：
  - `docs/phase-3-provider-backed-slot-contract-checklist.md`
- **runtime draft / contract tests 已把“不要误读”写死**：
  - `summary.passed` 固定为 `false`
  - provider-backed slot 仍是 reserved/unimplemented
  - non-provider-backed 路径仍必须回落 `null` / unavailable
- **当前主计划已经明确 closeout 事实**：
  - `docs/roadmap.md` 与 `docs/phase-3-provenance-contract.md` 都把 synthetic/provenance 这一波工作写成 contract-first closeout，而不是继续扩面

## 2. 仍未达成的真实实现目标

以下目标仍然没有完成，不能被当前文档读成已实现：

- 真实 provider-backed runtime replay
- provider call / provider evidence / provider transcript capture
- transcript persistence / retrieval
- scoring / rubric engine
- sandbox enforcement
- multi-case orchestration
- passed path / runtime pass
- 将 runtime 结果接入正式 validate 主链路

换句话说：现在已经有足够的 **合同边界**，但还没有真实 **执行链路**。

## 3. 是否适合现在进入真实 runtime replay 实施承接

**判断：可以进入，但只能以 very small implementation cut 承接，不能直接开大。**

原因很简单：

- contract 边界已经够清楚，继续堆文档收益递减；
- 真实实现最缺的不是“更多解释”，而是一个能开始落地的最小切口；
- 但现阶段仍然不具备完整 runtime，所以必须先从最窄的承接面切入。

## 4. 推荐的最小 implementation 切口

如果现在要接真实实现，最小切口应当是：

1. **单 fixture / 单 case runtime replay 执行入口**
2. **provider-backed execution metadata 的真实回填路径**
3. **transcript persistence 的最小落点**
4. **runtime replay report 的最小 evidence 记账**

这个切口的顺序建议是：

```text
single-case runner
-> execution metadata
-> transcript persistence
-> replay report evidence
```

### 为什么是这个切口
- 它最贴近当前已有的 contract seam；
- 它最能验证“真实 provider call 是否真的接通”；
- 它不会一开始就把 multi-case、UI、publish 一起拖进来；
- 它能把“是否已进入真实 runtime”从文档判断，变成可复核的执行证据。

## 5. 如果还不适合，下一步先补什么

如果团队认为现在还不适合开真实 runtime，那么下一步应先补下面两项，而不是继续扩实现面：

- **补一个更窄的 implementation readiness checklist**：把真实 provider call、transcript persistence、scoring、sandbox、multi-case 的依赖顺序写成一页最小准入表；
- **补一个 single-case runtime acceptance note**：只针对“单 fixture / 单 case / provider-backed reserved seam 真实接通”写清楚验收门槛，避免一上来就做全量矩阵。

## 6. 这页的结论

- **当前可以承接真实 runtime replay 的实施准备**；
- **但只能以最小单 case / 单 fixture 切口推进**；
- **不应把 Phase 3 contract closeout 误写成 runtime 已完成**。

## 7. Related

- `docs/phase-3-provenance-contract.md`
- `docs/phase-3-provider-backed-slot-contract-checklist.md`
- `docs/runtime-replay-protocol-lightweight-design.md`
- `docs/preflight-contract-and-artifacts-design.md`
- `docs/phase-3-runtime-report-runner-plan.md`
- `docs/phase-3-runtime-draft-cli-plan.md`
- `docs/validator-contract.md`
- `docs/roadmap.md`
