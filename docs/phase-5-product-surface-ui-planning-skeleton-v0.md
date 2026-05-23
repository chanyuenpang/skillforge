# Phase 5 Product Surface & UI planning skeleton v0

## 1. 目标与边界

本阶段是 **Product Surface & UI planning skeleton**，只做展示层与规划层的契约冻结，不做真实实现。

### 目标
- 定义 Product Surface 的最小范围与语义边界
- 冻结 UI / view-model 的文档级 contract
- 明确 Phase 3 / Phase 4 的依赖边界
- 防止后续把“规划态 / 占位态 / pending”误宣称为已完成

### 明确不做
- 不做真实 UI 实现
- 不做 registry 实现
- 不做 runtime 实现
- 不做外部发布实现
- 不把规划文档当成可运行产品
- 不把 Validate 的 static validator evidence 误写成 runtime complete
- 不把 Validate 的 state-model contract 误写成 view-model contract
- 不把 Review 的 state-model-only contract 误写成 view-model / publish / replay / runtime 实现
- 不把 Review 的 view-model contract 误写成 publish / replay / runtime 实现
- 不把 History 的 state-model / view-model contract 误写成 UI / runtime / persistence / publish 实现

## 2. Product Surface 范围矩阵

| Surface | 作用 | 当前 contract status | 说明 |
|---|---|---|---|
| Input | 接收 workflow / 资料 / 需求 | pending | 仅定义输入展示与占位字段，不接真实摄取管线；Input 的 state-model contract 见 `docs/phase-5-input-state-contract.md`，view-model contract 见 `docs/phase-5-input-view-model-contract.md` |
| Generate | 规划生成结果展示 | pending | 仅展示规划产物，不代表真实生成器完成；Generate 的 state-model 真相层已单独冻结在 `docs/phase-5-generate-state-model-contract.md`，view-model contract 见 `docs/phase-5-generate-view-model-contract.md` |
| Validate | 静态/契约校验结果展示 | pass / fail / pending | state-model-only contract 已单独冻结于 `docs/phase-5-validate-state-model-contract.md`；view-model contract 见 `docs/phase-5-validate-view-model-contract.md`；这里只保留 surface 级总览，不碰 validate 主链路 |
| Replay | 回放结果展示 | deferred | 仅保留未来接口位，不声明真实 replay 已可用；state-contract 见 `docs/phase-5-replay-state-contract.md`，view-model contract 见 `docs/phase-5-replay-view-model-contract.md` |
| Review | 人工审核与变更意见 | state-model frozen | state-model-only contract 见 `docs/phase-5-review-state-model-contract.md`；view-model contract 见 `docs/phase-5-review-view-model-contract.md`；这里只保留 surface 级总览，不碰 publish / replay / runtime |
| Publish | 发布意图与发布状态 | deferred | 仅保留发布面板，不代表 registry/publish 已完成 |
| History | 历史版本与变更轨迹 | contract frozen | state-model 与 view-model contract 已冻结；这里只保留 surface 级总览，不接真实版本仓库或审计流 |
| Task | 待补单点 contract 的原子 surface 集合 | draft | 仅保留后续待补位，不在当前 planning skeleton 中预支实现结论 |
| Queue | 待补的编排 surface | contract frozen | Queue 的 docs-only contract 已冻结；这里只保留 surface 级总览，不接真实执行、队列或详情实现 |
| Detail | 待补的详情 surface | frozen | Detail 的 docs-only contract 已冻结；这里只保留 surface 级总览，不接真实执行、队列或详情实现 |

## 3. contract status 显示语义

### pass
- 表示某个 surface 对应的契约已被满足，并且展示层可以安全标记为通过
- 仅可用于已有证据的 contract result
- 对 Validate 来说，只能对应 static validator evidence 里的通过结果
- 不能被用于“看起来可用”的假通过，也不能被解释为 runtime complete

### fail
- 表示该 surface 的契约或检查失败
- 必须能追溯到明确失败原因
- 对 Validate 来说，必须能追溯到 blockingFailures / errors / check-level 证据
- 不能被包装成 warning 或 pending

### pending
- 表示当前仅为规划中、未验证、未落地或尚无足够证据
- 默认应偏保守显示
- 对 Validate 来说，表示 static validator evidence 还不足以诚实收敛为 pass/fail
- 不能被展示为 pass

### deferred
- 表示该 surface 被有意推迟到后续 phase
- 有明确边界说明，但当前不进入实现路线
- 不能被解释为“快完成了”

## 4. UI view-model 字段草案（文档级）

以下字段仅为文档级草案，不代表真实前端 schema 已实现。

```ts
type ProductSurfaceViewModel = {
  id: string
  name: string
  surface: 'Input' | 'Generate' | 'Validate' | 'Replay' | 'Review' | 'Publish' | 'History'
  status: 'pass' | 'fail' | 'pending' | 'deferred'
  statusReason?: string
  summary?: string
  evidenceRefs?: string[]
  dependencies?: string[]
  owner?: string
  lastUpdated?: string
  riskNotes?: string[]
  outOfScope?: string[]
}
```

### 字段口径
- `status`: 只反映 contract / planning 状态，不反映产品完成度幻觉
- `statusReason`: 解释为什么是该状态，尤其用于 pending / deferred
- `evidenceRefs`: 只挂已存在证据或文档链接，不能挂空的“未来承诺”
- `dependencies`: 仅列出 Phase 3 / Phase 4 / 后续依赖
- `riskNotes`: 明确风险与未完成点
- `outOfScope`: 显式列出禁止宣称的能力

## 5. 与 Phase 3 / Phase 4 的依赖边界

### Phase 3
- 可提供 contract-first 的 runtime / provider seam 语义参考
- 只能作为边界输入，不可被升级为真实 runtime 完成
- 任何 provider-backed / transcript / rawResponse 的表述都必须延续 Phase 3 的受限合同口径

### Phase 4
- 可提供 static-only / contract-test / packaging contract reconcile 的边界参考
- 只能作为已收口的静态契约基础
- 不可把 Phase 4 的 static result 误写成完整生成器或完整打包流水线

### Phase 5 planning skeleton 的位置
- Phase 5 只接收上述边界，不回写 Phase 3 / Phase 4 的事实状态
- Phase 5 的职责是规划展示层，而不是补实现层

## 6. 禁止误宣称清单

- 不把 `pending` 展示为 `pass`
- 不把 `static-only` 说成 `runtime complete`
- 不把 `registry/publish` 说成 `已完成`
- 不把规划文档写成产品实现
- 不把 placeholder / contract sketch 伪装成可交付 UI
- 不把 deferred 解释成已经排期完成
- 不把 Review 的 approved 写成 publish complete
- 不把 History 的 contract frozen 误写成 UI / runtime / persistence / publish 已完成
- 不把 Task 的 docs-only contract 冻结误写成 UI / runtime / persistence / publish 已完成
- 不把 Queue / Detail 的 draft 口径误写成已冻结 contract

## 7. out-of-scope

- 真实 UI 页面实现
- 真实前端路由、状态管理、数据请求
- registry / publish 后端实现
- runtime orchestration 实现
- 审批流、权限系统、通知系统
- 实际历史仓库同步或审计流接入
- 实际 History UI、runtime、persistence、publish 接入
- 任何外部发布自动化

## 8. 当前结论

Phase 5 在此文档中先冻结的是展示层 contract，而不是功能实现。Generate / Validate 的 state-model 已分别冻结，Review 的 state-model-only contract 也已独立冻结，History 也已补齐 state-model + view-model contract。后续若进入 UI 实现，必须先补齐真实数据源、真实状态流与验收口径，再允许把 `pending` 变成 `pass`，或把 `ready` 误写成发布完成。
