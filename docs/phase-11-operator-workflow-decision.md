# Phase 11 First-Cut Operator Workflow Decision

> 决定：以 **Review→PublishPrep→RegistryEntry** 三条链作为 Phase 11 的第一个可操作入口。最小切口为 CLI 交互层，不扩 UI/dashboard/协作。

## 1. 决策背景

Phase 11 的目标是把当前只读 surface 推进到可操作的产品面。三条候选 operator workflow：

| 候选流 | Schema 成熟度 | 产品面 | 切口大小 | 依赖 |
|---|---|---|---|---|
| **Review→PublishPrep→RegistryEntry** | 3 schema 均已注册/校验，create+validate 函数完整 | 高 — operator 核心视图 | 小 — 只需 CLI 交互层 | 无外部依赖，纯数据链 |
| Generator 生成流 | pipeline constructible，status=unknown | 中 — 偏 backend | 大 — 需真实 provider 链路 | 依赖 provider execution |
| Runtime Replay 验证流 | report synthetic，无真实 provider 执行 | 低 — 只可观察不可操作 | 大 — 需真实 runtime | 依赖 provider runtime |

## 2. 决策结论

**第一刀：Review→PublishPrep→RegistryEntry 三条链的 CLI 交互层。**

### 为什么选这条

1. **成熟度最高** — `review-record`、`publish-prep`、`registry-entry` 三种 schema 均已注册、校验、实现 create/validate 完整函数，`skillforge-status.mjs` 的三级链式构造已通过验证
2. **产品面最直接** — operator 的核心职责就是 review skill → approve → prep for publish → register。这条链就是产品核心流的缩影
3. **切口最小** — 不需要真实 provider、不需要 runtime、不需要 UI 框架。只需要一个交互式 CLI 脚本，复用现有函数
4. **门控条件已定义** — 每个 step 的 enter/exit gate 已在 schema.validate 中定义（如 review 必须 approved+approve 才能进 publish-prep）
5. **独立可交付** — 即使 generator 和 runtime replay 仍处于 early/synthetic 状态，operator workflow 可独立运作

### 为什么不选另外两条

- **Generator**：Pipeline 虽可构造，但 `observed_status=unknown`，还没有真实生成链路。把它作为 operator workflow 入口意味着要先补 generator 的 backend 缺项，扩大了切口范围
- **Runtime Replay**：Report 虽然可构造但目前是 synthetic，没有真实 provider-backed runtime。把它作为交互入口意味着要先接 provider，超出 Phase 11 的最小可操作边界

### 什么不做（out of scope）

- 不做 full UI / dashboard
- 不做多用户协作
- 不做权限系统
- 不做 registry 平台化
- 不提前承诺 Web/MCP 交互入口

## 3. 最小可操作链定义

```
operator 选择 fixture
  → 查看当前 review-record 状态
  → 执行 approve/reject
  → 确认门控通过
  → 自动构造 publish-prep
  → 自动构造 registry-entry
  → 展示结果总览
```

### 关键设计约束

- 所有 step 复用现存的 `createReviewRecord`、`createPublishPrep`、`createRegistryEntry` 及 validate 函数，不改后端语义
- state 持久化使用轻量 JSON 文件，不引入数据库
- 操作提示和 human-readable 输出在 CLI 层实现
- gate 阻断时给清晰错误 + 修复指引

## 4. 交付物清单

| # | 交付物 | 说明 |
|---|---|---|
| 1 | `scripts/skillforge-operate.mjs` | CLI 交互脚本，走通 approve→publish-prep→registry-entry 链 |
| 2 | `src/skillforge/state-store.mjs` | 轻量 JSON 状态持久化层 |
| 3 | `docs/phase-11-operator-workflow-guide.md` | 操作说明文档 |
| 4 | E2E 验证证据 | release-notes-assistant fixture 完整链路走通 |

## 5. 验证完成的判断标准

- [ ] `scripts/skillforge-operate.mjs` 可交互走通 approve→publish-prep→registry-entry 完整链
- [ ] 门控条件正确阻断非法操作（如未 approve 直接 publish-prep）
- [ ] 状态跨 session 可读取恢复
- [ ] 操作结果 human-readable，不依赖手读 JSON
- [ ] 文档清晰，新 operator 可独立操作
