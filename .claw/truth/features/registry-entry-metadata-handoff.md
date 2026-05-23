# RegistryEntry metadata handoff 对象

## 结论

`RegistryEntry` 是发布前注册阶段的稳定手递对象，不允许把 `published` 混进注册态枚举里。它只接受已经满足发布准备条件的 `PublishPrep`，并把 `reviewRecordRef`、`reviewDecision`、`publishPrepRef` 和 `provenance` 这三层追溯关系稳定串起来，供后续注册、回溯与排障使用。

## 长期行为 / 规则

- `REGISTRY_STATUS_VALUES` 只应包含 `registered`、`pending-publish`、`failed`，刻意排除 `published`。
- `createRegistryEntry(publishPrep, registryInputs)` 只接受 `readiness.overall=ready` 或 `handoffMeta.status=ready` 的 `PublishPrep`。
- 如果传入的 `PublishPrep` 不合法，构造函数应直接抛出 `TypeError`，而不是静默降级为伪记录。
- `publishPrepRef` 必须直接指向 `reviewRecordRef`，不要把发布前后的引用链切断。
- `reviewDecision` 需要保留 `reviewRecordRef`、`evidenceRefs`、`sourceLinks`，作为从 review 到 registry 的反向追溯入口。
- `provenance.chain` 需要继承 `PublishPrep` 的完整 back-reference 链条，并在合并后去重。
- 非法或未知的 registry 状态要回退到 `registered`，但不能扩展出 `published` 之类的新公共态。
- `review`、`publish-prep`、`registry` 三段的 `kind` 与 `status` 含义要严格分开，不要混用。

## 关联代码

### 主锚点

- `src/skillforge/registry-entry.mjs`：`RegistryEntry` 工厂、状态约束与校验主实现。

### 关联锚点

| 路径 | 作用 |
| ---- | ---- |
| `src/skillforge/publish-prep.mjs` | `PublishPrep` 的上游手递对象与 readiness 门槛。 |
| `src/skillforge/review-record.mjs` | `ReviewRecord` schema、factory 与验证逻辑。 |
| `src/skillforge/schema.mjs` | schema registry，注册全部 4 种类型。 |
| `scripts/test-registry-entry-contracts.mjs` | `RegistryEntry` contract 回归锚点，覆盖 35 条边界与不变式。 |

## 真实调用链路

1. `src/skillforge/review-record.mjs`：先形成 `ReviewRecord`，提供 `reviewRecordRef` 与 review 侧证据。
2. `src/skillforge/publish-prep.mjs`：基于 review 产出 `PublishPrep`，并保留 readiness 与 back-reference。
3. `src/skillforge/registry-entry.mjs`：消费合法 `PublishPrep`，构造 `RegistryEntry`，同步继承 `reviewDecision`、`publishPrepRef` 与 `provenance.chain`。
4. `src/skillforge/schema.mjs`：把四类 schema 统一注册到 schema registry，供后续校验与分发使用。

## 不要改错的位置

- 不要把 `RegistryEntry` 当成 `published` 的最终态容器；`published` 不属于这层公共状态。
- 不要只在测试里修 `published` 反例，而忽略 `REGISTRY_STATUS_VALUES` 与 validate 入口。
- 不要把 `reviewDecision` 简化成单一字符串；它本质上是可追溯对象。
- 不要把 `provenance.chain` 当成一次性日志；它是稳定的反向链路锚点。

## 验证标准

后续修改这条链路时，至少要确认：

- 合法 `PublishPrep` 才能构造 `RegistryEntry`，非法输入会抛 `TypeError`。
- `published` 仍然不在 `REGISTRY_STATUS_VALUES` 内。
- `reviewDecision`、`publishPrepRef`、`provenance.chain` 的继承关系没有被打断。
- `registryMeta` 同步与状态 fallback 仍按约定工作。
- `scripts/test-registry-entry-contracts.mjs` 的 35 条 contract 用例继续通过。

## 关键检索词

- `RegistryEntry`
- `createRegistryEntry(publishPrep, registryInputs)`
- `validateRegistryEntry(record)`
- `REGISTRY_STATUS_VALUES`
- `pending-publish`
- `failed`
- `published`
- `reviewDecision`
- `publishPrepRef`
- `provenance.chain`
- `readiness.overall=ready`
- `handoffMeta.status=ready`
- `TypeError`
