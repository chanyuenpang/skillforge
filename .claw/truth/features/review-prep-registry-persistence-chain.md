# ReviewRecord → PublishPrep → RegistryEntry 持久化链路

## 结论

`ReviewRecord`、`PublishPrep` 和 `RegistryEntry` 现在已经不是只停留在内存里的三段对象了；`skillforge-operate.mjs` 会把这三层对象一起落到各自的 JSON Lines store 中，`skillforge-status.mjs` 也会同时暴露三者的 store 状态。未来排查“运营链路重启后是否还能恢复上下文”时，先看这条三段持久化链路。

## 长期行为 / 规则

- 三段对象的持久化顺序是固定的：先 `ReviewRecord`，再 `PublishPrep`，最后 `RegistryEntry`。
- 运营命令不应只写终端登记对象；如果只持久化 `RegistryEntry`，会丢失上游 review / prep 语义。
- 每一段对象都应有独立的 JSON Lines store、`save()` / `loadById()` / `list()` 这类基础检索能力，方便在重启后按链路回溯。
- `skillforge-status.mjs` 的状态展示应同时反映三层 store，而不是只看最终登记对象。
- 这条链路的长期价值不在于“这次写入成功”，而在于后续能通过最后完成的链段重新找回整条 review→prep→registry 上下文。

## 关联代码

### 主锚点

- `scripts/skillforge-operate.mjs`：运营主入口，负责把 `ReviewRecord` → `PublishPrep` → `RegistryEntry` 一起持久化。
- `scripts/skillforge-status.mjs`：状态展示入口，汇总三层 store 的可用性。

### 关联锚点

| 路径 | 作用 |
| ---- | ---- |
| `src/skillforge/review-store.mjs` | `ReviewRecord` 的 JSON Lines 持久化层，提供 `save/loadById/list`。 |
| `src/skillforge/prep-store.mjs` | `PublishPrep` 的 JSON Lines 持久化层，提供 `save/loadById/list`。 |
| `src/skillforge/registry-store.mjs` | `RegistryEntry` 的既有持久化层，三段链路的终点。 |
| `scripts/test-review-and-prep-store.mjs` | `ReviewRecord` 与 `PublishPrep` store roundtrip 回归锚点。 |
| `scripts/test-skillforge-operate.mjs` | 运营链路回归锚点，验证三层 store 都会被写入。 |

## 真实调用链路

1. `scripts/skillforge-operate.mjs`：执行运营流程时，先写 `ReviewRecord`，再写 `PublishPrep`，最后写 `RegistryEntry`。
2. `src/skillforge/review-store.mjs` / `src/skillforge/prep-store.mjs` / `src/skillforge/registry-store.mjs`：分别承接三段对象的 JSON Lines 持久化与回读。
3. `scripts/skillforge-status.mjs`：查询三层 store 状态，向外暴露完整生命周期是否可检索。
4. `scripts/test-review-and-prep-store.mjs`、`scripts/test-skillforge-operate.mjs`：分别覆盖 store roundtrip 与整条运营写入链路。

## 不要改错的位置

- 不要把“只要 `RegistryEntry` 能恢复就够了”当成完整恢复策略；上游 `ReviewRecord` / `PublishPrep` 同样是恢复语义的一部分。
- 不要把 store 只当成测试辅助；这里是运营链路的长期可检索事实来源。
- 不要让 `skillforge-status.mjs` 只展示终端对象状态，否则会掩盖上游链路是否真的持久化。

## 验证标准

后续改这条链路时，至少要确认：

- 三个 store 都能独立 roundtrip。
- `skillforge-operate.mjs` 写入后，`skillforge-status.mjs` 能同时看到三层 store 状态。
- 整条链路仍保持 `ReviewRecord → PublishPrep → RegistryEntry` 顺序，不出现跳层或只写终点。

## 关键检索词

- `ReviewRecord`
- `PublishPrep`
- `RegistryEntry`
- `review-store.mjs`
- `prep-store.mjs`
- `registry-store.mjs`
- `skillforge-operate.mjs`
- `skillforge-status.mjs`
- `save/loadById/list`
- `JSON Lines`
