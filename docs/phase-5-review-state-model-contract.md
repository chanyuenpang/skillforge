# Phase 5 Review state-model-only contract v0

## 1. 目标与边界

- **status**: frozen
- **scope**: Review 的 state-model-only contract
- **non-goals**: 不做 view-model，不碰 publish / replay / runtime 实现；不把 approved 误写成 publish complete
- **depends-on**: `docs/phase-5-generate-state-model-contract.md`、`docs/phase-5-validate-state-model-contract.md`、`docs/phase-5-review-view-model-contract.md`

本文件只冻结 **Review 的 state-model-only contract**。它只描述审阅态的状态语义与迁移边界，不做 view-model，不碰 publish / replay / runtime 实现。

> Review 的展示层投影闭环见 `docs/phase-5-review-view-model-contract.md`；本文件只提供 state-model 真相层。

### 目标
- 定义 Review 的最小诚实状态集合
- 明确 Review 进入与退出的文档级条件
- 冻结 `blockingReasons` 与 `decision` 的最小枚举
- 防止把 `review approved` 误写成 `publish complete`
- 给后续 view-model 仅提供单向投影依据

### 明确不做
- 不做真实 UI 实现
- 不做 view-model contract
- 不做持久化 / 存储实现
- 不做 publish 实现
- 不做 replay 实现
- 不做 runtime 实现
- 不把 planning 态写成实现态

## 2. 最小状态集合

Review 采用最小诚实状态集合：`idle / ready / blocked / approved / rejected`。

### idle
- 尚未形成可审阅的真相层输入
- 只表示 Review 还没有满足进入审阅的前置条件
- 不能被解释为“已通过、已发布、已完成”

### ready
- 已满足进入 Review 的前置条件
- 表示可进行人工审阅或审阅结论冻结
- 只代表审阅输入可读，不代表发布完成

### blocked
- Review 需要的前置证据或门禁信息不足
- 需要先补齐明确 gate / evidence 才能继续
- 不能被包装成 pending，也不能被暗示为“快通过了”

### approved
- 审阅结论为通过
- 只表示 Review 结论通过，不表示 publish complete
- 不能反向证明发布、回放或运行时已完成

### rejected
- 审阅结论为拒绝
- 只表示审阅未通过或需要回退
- 不能被改写为“只是暂缓”或“稍后自动完成”

## 3. 进入 Review 的前置条件

Review 只允许基于 **已冻结的 Generate / Validate 产物或状态** 进入。

### 可引用的前置输入
- Generate 的已冻结 state-model 结论
- Validate 的已冻结 state-model 结论
- 与上述产物直接对应的文档级证据

### 进入条件
- Generate 至少已收敛到可读的状态语义
- Validate 至少已收敛到 `pass / fail / pending` 的诚实结论
- Review 不得自行补造 Generate / Validate 不存在的信息

### 不能作为前置条件的内容
- 未冻结的 UI 草图
- 未冻结的发布状态
- 未冻结的 replay / runtime 结果
- 任何“未来会补齐”的承诺

## 4. blockingReasons 与 decision 的最小枚举

### blockingReasons
最小枚举建议如下：
- `missing_generate_evidence`
- `missing_validate_evidence`
- `generate_not_frozen`
- `validate_not_frozen`
- `conflicting_evidence`
- `insufficient_review_input`

### decision
最小枚举建议如下：
- `approve`
- `reject`
- `hold`

### 口径
- `blockingReasons` 只描述为什么 Review 现在不能诚实进入或收敛
- `decision` 只描述 Review 的文档级结论，不描述发布或执行结果
- `hold` 仅表示审阅结论暂不收口，不等于通过

## 5. 允许 / 禁止状态迁移（文档级）

### 允许的迁移
- `idle -> ready`：前置条件已满足
- `idle -> blocked`：发现证据缺失或 gate 未满足
- `ready -> blocked`：审阅过程中发现关键证据缺失
- `ready -> approved`：审阅通过
- `ready -> rejected`：审阅拒绝
- `blocked -> ready`：阻塞原因被补齐且证据已冻结
- `blocked -> rejected`：确认无法补齐或审阅结论明确拒绝
- `approved -> blocked`：新冲突证据出现，原结论需重新审阅
- `approved -> rejected`：新证据推翻原通过结论
- `rejected -> blocked`：需要补证据后重新进入审阅
- `rejected -> ready`：拒绝原因已消除且重新收口

### 禁止的迁移
- `idle -> approved`：跳过审阅前置条件
- `idle -> rejected`：未形成可审阅输入就直接定结论
- `blocked -> approved`：未补齐 gate / evidence 直接通过
- `approved -> publish complete`：状态偷换，`publish complete` 不属于 Review state-model
- `rejected -> publish complete`：拒绝不能伪装成发布完成
- `blocked -> publish complete`：阻塞不能越过审阅直接进入发布完成

## 6. invariants

1. `review approved` 不能被说成 `publish complete`
2. `blocked` 必须能追溯到明确 gate / evidence 缺失
3. `ready` 只表示可审阅，不表示已发布
4. `approved` 只表示审阅通过，不表示 runtime complete
5. `rejected` 只表示审阅拒绝，不表示后续一定失败
6. 任何 `decision` 都不能代替 publish / replay / runtime 结论
7. `blockingReasons` 必须能指向具体缺失或冲突，不得是空泛情绪词
8. Review 不得补写 Generate / Validate 没有声明的事实

## 7. 误宣称红线

以下说法一律禁止写入 Review 的 state-model 结论中：
- 不把 `approved` 说成 `publish complete`
- 不把 `blocked` 说成“只是暂时卡住，很快自动通过”
- 不把 `ready` 说成已发布、已回放或已运行
- 不把 `rejected` 说成“其实已经通过，只是还没更新状态”
- 不把未冻结的 Generate / Validate 产物当成已冻结证据
- 不把 review decision 偷换成 publish decision
- 不把 planning / skeleton / placeholder 说成真实实现
- 不把 review state-model 误写成 view-model contract

## 8. 手工核对 checklist

1. 当前状态是否只落在 `idle / ready / blocked / approved / rejected` 内
2. 是否只引用了已冻结的 Generate / Validate 产物或状态
3. `blockingReasons` 是否都能追溯到明确 gate / evidence 缺失
4. `decision` 是否只表达审阅结论，不表达发布结论
5. 是否存在把 `approved` 说成 `publish complete` 的措辞
6. 是否存在把 `blocked` 说成“快好了”的措辞
7. 是否把未冻结的输入当成已冻结证据
8. 是否把 planning 态写成了实现态

## 9. 当前结论

Review 在本阶段冻结的是 **state-model-only** 语义：它只承认从已冻结的 Generate / Validate 产物中收口出来的审阅状态，并用 `idle / ready / blocked / approved / rejected` 与最小 `blockingReasons` / `decision` 集合表达审阅真相。任何 publish / replay / runtime 说法，都不在这个 contract 范围内。