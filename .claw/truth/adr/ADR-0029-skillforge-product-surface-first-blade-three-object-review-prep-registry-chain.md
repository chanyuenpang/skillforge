# ADR-0029: SkillForge Product Surface 首刀使用 ReviewRecord → PublishPrep → RegistryEntry 三段对象严格分离架构

## Status

accepted

## Context

Phase 8 是 SkillForge 首个真实的 Product Surface 实施阶段。此前 Phase 5 仅完成了 docs/contract 收口（参见 ADR-0026），并未进入实现层。

在决定第一条真实实施链路时，面临以下约束与风险：

- **不能从 UI 切入**：phase 4/5/7 的 retrospective 反复确认 full collaboration suite、full UI 会过早引入前端耦合，且在进入 UI 前必须先有稳定的后端对象。
- **不能从 full registry platform 切入**：注册平台涉及持久化、搜索、分发、版本管理等多个子能力，一上来就做全部会分散注意力。
- **必须有真实的端到端 handoff 链路**：如果只做单个孤立对象（如只做 ReviewRecord），无法验证对象间衔接是否可行。
- **approved != publish complete 是红线**：审阅通过 ≠ 发布完成，中间必须有可追溯的准备与登记阶段。如果 review 和 publish 之间没有明确的中间对象，容易被后续实现混为一谈。

来源计划 `Phase 8 Product Surface Real Implementation Subplan` 已完成（`end.completed`），tasks 1-7 全部 `done`，retrospective 固定了以下事实。

## Decision

决定将 Product Surface 的第一条真实实施链路固定为 **ReviewRecord → PublishPrep → RegistryEntry 三段对象严格分离的架构**。具体规则如下：

### 三段对象职责边界

| 对象 | 职责 | 关键约束 |
| ---- | ---- | -------- |
| **ReviewRecord** | 审阅状态机，5 种状态 + 3 种决策 + blocked gate | 只记录审阅信息，不询问发布准备状态 |
| **PublishPrep** | review → registry 之间的中间交接对象，聚合 readiness/provenance 证据 | handoffMeta 有自己的状态机（如 queued/ready/failed），不混入 review 状态 |
| **RegistryEntry** | 元数据登记对象，只做 registered/pending-publish | **刻意排除 `published`**，不假装实现完整发布系统 |

### 强制规则

1. **approved != publish complete** — 通过三层锁定强制执行：
   - 构造层面 throw：非法状态转换直接抛出 `TypeError`
   - 枚举排除：`REGISTRY_STATUS_VALUES` 只包含 `registered`、`pending-publish`、`failed`，不包含 `published`
   - contract test 回归护栏：确认 `published` 在任何变更后仍被排除

2. **三段必须独立可构建、可校验** — 每个对象有自己的工厂函数（`createReviewRecord`、`createPublishPrep`、`createRegistryEntry`）、校验函数（`validateReviewRecord` 等）和枚举常量，互不依赖对方内部实现。

3. **Object ownership 原则** — 每个对象通过 back-reference（`reviewRecordRef`、`publishPrepRef`、`provenance.chain` 继承）维护追溯关系，但不拥有上游对象的生命周期。删除上游不影响下游对象的存在。

4. **对象按 ReviewRecord → PublishPrep → RegistryEntry 顺序实现** — 先打好状态机底座，再建中间交接层，最后做终端登记对象。不可跳过中间层直接实现 registry。

### 不做的边界

- 不实现 `published` 状态
- 不实现 full UI、full collaboration suite、full registry platform
- 不实现持久化（当前阶段）
- 不实现端到端编排（ReviewRecord → PublishPrep → RegistryEntry 的一条龙调用，留待 Phase 9）

## Alternatives Considered

- 从 UI/view-model 切入 Product Surface：拒绝。Phase retrospective 多次确认 UI 应后置，先有稳定后端对象。
- 从 full registry platform 开始：拒绝。一次实现所有发布相关能力会导致 scope drift。
- 只做一个 ReviewRecord 对象，后续再接 publish 逻辑：拒绝。没有中间对象，容易把 review 批准误当作发布已完成。
- 把 RegistryEntry 做成含 `published` 状态的通用发布记录：拒绝。`published` 涉及完整发布系统的持久化、分发、版本管理等能力，第一阶段不应假装实现。

## Related Code

| Path | Role |
| ---- | ---- |
| `src/skillforge/review-record.mjs` | ReviewRecord 工厂、状态约束、校验实现 |
| `src/skillforge/publish-prep.mjs` | PublishPrep 手递对象与 readiness 聚合 |
| `src/skillforge/registry-entry.mjs` | RegistryEntry metadata handoff 对象，不包含 `published` |
| `src/skillforge/schema.mjs` | schema registry，注册全部三个对象 |
| `scripts/test-review-record-contracts.mjs` | ReviewRecord contract 回归锚点 |
| `scripts/test-publish-prep-contracts.mjs` | PublishPrep contract 回归锚点 |
| `scripts/test-registry-entry-contracts.mjs` | RegistryEntry contract 回归锚点，覆盖 35 条边界 |
| `scripts/validate-all.mjs` | 全量校验入口，三个对象均已通过 |
| `features/registry-entry-metadata-handoff.md` | RegistryEntry 行为规格文档 |

## 修改的先前决策

- **ADR-0026** 中 Phase 5 仅做 docs/contract 收口的承诺未变；本 ADR 是 Phase 5 之后正式的 Product Surface 真实实施起点。

## Consequences

- 正向：Product Surface 有了清晰的三层对象边界，每个对象的职责与状态机独立，不会互相污染。
- 正向：`approved != publish complete` 通过构造层、枚举层、test 层三重锁定，从根本上防止了审阅通过被误当作发布完成。
- 正向：每个对象都注册到 schema registry 并拥有独立的 contract tests，后续新增对象可以对齐此模式。
- 正向：三个对象虽独立，但通过 `publishPrepRef`、`reviewRecordRef`、`provenance.chain` 维护了完整的上下游追溯关系。
- 取舍：当前三个对象仍是独立单元，没有串成端到端的一次性调用（留待 Phase 9）。
- 取舍：没有持久化、没有 UI、没有发布时间表——只是 metadata 层的产能准备。
- 取舍：subagent 在无约束环境下容易跑偏（两次跑偏到 webhook 或回报 false positive），对于定义已冻结的小对象，主 Agent 直接写文件更可靠。
- 验证锚点：`scripts/validate-all.mjs` 通过；三个对象的 contract tests 独立全绿；`REGISTRY_STATUS_VALUES` 始终排除 `published`。

## Search Terms

- `ReviewRecord`
- `PublishPrep`
- `RegistryEntry`
- `createReviewRecord`
- `createPublishPrep`
- `createRegistryEntry`
- `REGISTRY_STATUS_VALUES`
- `published`
- `approved != publish complete`
- `publishPrepRef`
- `reviewRecordRef`
- `provenance.chain`
- `product surface first blade`
