# ADR-0037: SkillForge `RegistryEntry` 持久化第一刀落在终端登记对象

## Status

accepted

## Context

`ReviewRecord → PublishPrep → RegistryEntry` 已经是 SkillForge Product Surface 的稳定三段对象链，但 Phase 13 结束时实现仍停留在纯内存构造。`scripts/skillforge-operate.mjs` 旁边已经明确出现 `not implemented: file persistence` 的信号，说明 CLI 层下一步最自然的收口点就是把终端登记对象先落盘。

这里需要一个明确的切口选择，因为可选项很多：可以先持久化执行记录、可以先持久化发布过程、也可以先做恢复点。但这些切口都不如 `RegistryEntry` 本身更适合作为第一刀。

Phase 14 实际完成时，持久化底座不仅覆盖了 `RegistryEntry`，还向上完整覆盖了 `ReviewRecord` 和 `PublishPrep`，形成了 review-store.mjs / prep-store.mjs / registry-store.mjs 三模块统一格局，并全部接入 `skillforge-operate.mjs` 与 `skillforge-status.mjs`。

## Decision

决定将 Phase 14 的第一刀固定为：**优先实现 `RegistryEntry` 持久化**，而不是先做执行记录、发布过程或恢复点。

具体规则如下：

1. **终端对象优先**
   - `RegistryEntry` 是三段链的终端登记结果，也是最有检索价值的稳定产物。
   - 先持久化它，才能让整条链具备可回溯的数据锚点。

2. **持久化逻辑下沉到 `src/skillforge/`**
   - 不把持久化实现塞进 `scripts/` CLI。
   - CLI 只做入口和调用，真正的 store 逻辑应独立成模块，例如 `registry-store.mjs`。

3. **采用最小存储面**
   - 第一刀优先考虑 JSON Lines 文件这类轻量媒介。
   - 对外只暴露窄接口：`save()`、`loadById()`、`list()`、`delete()`。

4. **后续复用同一持久化模式（已验证，已执行）**
   - 一旦 `RegistryEntry` 的存储模式固定，`ReviewRecord` 和 `PublishPrep` 后续可以复用同类模式。
   - **Phase 14 实际交付已验证了这一扩展路径**：`registry-store.mjs` 的 JSON Lines 窄接口模式被对等地复用到 `review-store.mjs` 和 `prep-store.mjs`，无差异引入新基础设施。

## Alternatives Considered

- **先持久化执行记录**：拒绝。执行记录偏运维回放，没有 `RegistryEntry` 这个终端结果作锚点时，数据闭环不完整。
- **先持久化发布过程**：拒绝。发布过程是更重的长事务状态机，复杂度更高，不适合作为第一刀。
- **先做恢复点**：拒绝。恢复点依赖已有持久化数据，没有终端登记对象落盘，恢复语义没有稳定目标。

## Related Code

| Path | Role |
| ---- | ---- |
| `src/skillforge/registry-store.mjs` | `RegistryEntry` JSON Lines 持久化 store，最小窄接口。 |
| `src/skillforge/prep-store.mjs` | `PublishPrep` JSON Lines 持久化 store，复用同一模式。 |
| `src/skillforge/review-store.mjs` | `ReviewRecord` JSON Lines 持久化 store，复用同一模式。 |
| `src/skillforge/registry-entry.mjs` | `RegistryEntry` 的终端对象与状态约束主实现。 |
| `scripts/skillforge-operate.mjs` | 已接入三段 store 持久化的 CLI 入口。 |
| `scripts/skillforge-status.mjs` | 消费三段 store 持久化历史数据的只读状态面。 |
| `src/skillforge/review-record.mjs` | 上游审阅对象。 |
| `src/skillforge/publish-prep.mjs` | 上游交接对象。 |
| `src/skillforge/schema.mjs` | 对象 schema 注册入口。 |

## Consequences

- 正向：先把最有价值、最可检索的终端登记对象落盘，形成最小可回溯闭环。
- 正向：`skillforge-status.mjs` 和 `skillforge-operate.mjs` 未来可以直接围绕持久化登记数据扩展，而不是从零造一整套平台。
- 正向：持久化模式一旦确定，已成功复用到 `ReviewRecord` 和 `PublishPrep`（review-store.mjs / prep-store.mjs），全链无差异。
- 取舍：这还不是完整 registry platform，也不是恢复系统；它只是持久化链路的第一块砖。
- 取舍：执行记录和全量恢复点的实现后移，不应抢占持久化链路的第一阶段位置。
- 验证锚点：`scripts/skillforge-operate.mjs` 的三段 real-store 操作链（review → prep → registry）全部通过；`not implemented: file persistence` 注释已不再存在。

## Search Terms

- `RegistryEntry`
- `registry-store.mjs`
- `save()`
- `loadById()`
- `list()`
- `delete()`
- `JSON Lines`
- `not implemented: file persistence`
- `skillforge-operate.mjs`
- `skillforge-status.mjs`
