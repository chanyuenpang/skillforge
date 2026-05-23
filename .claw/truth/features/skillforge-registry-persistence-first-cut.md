# SkillForge `RegistryEntry` 持久化第一刀

## 结论

`ReviewRecord → PublishPrep → RegistryEntry` 三段对象链里，第一刀应优先落在 `RegistryEntry` 的持久化，而不是先做执行记录、发布过程或恢复点。原因很简单：`RegistryEntry` 是这条链的终端可检索结果；先把它落盘，才能让后续的 `skillforge-status.mjs`、`skillforge-operate.mjs` 和更上游的对象链拥有稳定的数据锚点。

## 长期规则

- 第一优先级是 `RegistryEntry` 持久化；`ReviewRecord` 和 `PublishPrep` 仍然可以继续纯内存构造，但它们只有在终端记录可持久化后才真正形成可回溯链路。
- 持久化切口应下沉到 `src/skillforge/`，不要把持久化逻辑塞进 `scripts/` CLI 层。
- 更适合的最小实现形态是独立的 store 模块，例如 `registry-store.mjs`，对外提供 `save()`、`loadById()`、`list()`、`delete()` 这类窄接口。
- 存储媒介建议优先采用 JSON Lines 文件，便于和当前纯 JS 风格保持一致，并且适合按条追加与检索。
- 在 `RegistryEntry` 仍未持久化前，去做执行记录或恢复点只会缺少可锚定的终端数据，价值闭环不完整。

## 关联代码

### 主锚点

- `src/skillforge/registry-entry.mjs`：`RegistryEntry` 的终端对象与状态约束主实现。
- `scripts/skillforge-operate.mjs`：当前已明确提示 `not implemented: file persistence`，说明 CLI 设计上已经在等待持久化层。

### 关联锚点

| 路径 | 作用 |
| ---- | ---- |
| `src/skillforge/review-record.mjs` | 上游审阅对象，纯内存链路的起点。 |
| `src/skillforge/publish-prep.mjs` | 上游交接对象，承接 `ReviewRecord` 并为 `RegistryEntry` 提供 readiness。 |
| `src/skillforge/schema.mjs` | 对象 schema 注册入口，后续持久化实现仍应复用这里的类型边界。 |
| `scripts/skillforge-status.mjs` | 只读状态面，未来最直接受益于可检索的历史 `RegistryEntry`。 |

## 真实调用链路

1. `src/skillforge/review-record.mjs`：生成 `ReviewRecord`。
2. `src/skillforge/publish-prep.mjs`：把 review 结果整理成 `PublishPrep`。
3. `src/skillforge/registry-entry.mjs`：产出终端 `RegistryEntry`。
4. `src/skillforge/registry-store.mjs`（计划中的第一刀）：负责把 `RegistryEntry` 落盘，并提供 `save/loadById/list/delete`。
5. `scripts/skillforge-status.mjs` / `scripts/skillforge-operate.mjs`：消费持久化后的历史记录，形成可检索的运营面。

## 不要改错的位置

- 不要把持久化切口先做在 `ReviewRecord` 或 `PublishPrep` 上；它们不是这条链的终端锚点。
- 不要把持久化逻辑绑死在 `scripts/`；脚本层应只是调用方。
- 不要一上来就扩成 SQLite 或完整 registry platform；第一刀的目标是先形成可持久化、可检索的最小闭环。
- 不要把执行记录、发布过程或恢复点当成比终端登记更优先的切入点。

## 验证标准

后续真正落地持久化时，至少要确认：

- `RegistryEntry` 能稳定写入并按 ID 读取。
- `skillforge-status.mjs` 可以开始展示历史成功登记条目。
- CLI 层仍保持轻量，只负责调用 store，不负责承载持久化细节。
- `ReviewRecord → PublishPrep → RegistryEntry` 的三段职责边界没有被重新揉在一起。

## 关键检索词

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
