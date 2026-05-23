# SkillForge transcript store 与 execution log store：增补型持久化底座

## 结论

Phase 16 在已有三段链持久化（review-store / prep-store / registry-store）之外，新增了两个增补型持久化 store：**transcript store** 记录 provider 调用结果，**execution log store** 记录 operate 操作记录。二者沿用与三段链 store 一致的 JSON Lines 模式，但职责不同：三段链存储业务登记对象，这两个 store 存储执行证据与审计轨迹。

## 长期行为 / 规则

### 通用规则（两 store 共享）

- 都采用 JSON Lines 文件作为存储媒介，路径在 `~/.skillforge/`（通过 `SKILLFORGE_*_DIR` 环境变量可覆盖）。
- 都暴露窄接口：`save()`、`loadById()`、`list()`、`count()`。execution log store 额外暴露 `recent(n)`。
- 均提供 `build*Record` 工厂函数和 `validate*Record` 校验函数，后接单元测试锁住字段完整性。
- `save()` 调用是**非致命的安全调用**：错误被 `try/catch` 捕获并 `console.error` 输出，不阻塞主调用方（provider adapter 或 operate CLI）。
- validate 逻辑覆盖空对象、null、缺少必填字段、非法 status 值等边界。

### Transcript store（`src/skillforge/transcript-store.mjs`）

- `buildTranscriptRecord({ input, output, usage, finishReason, model, executionTimeMs })` 构造一条转录记录。
- 必填字段：`transcriptId`（自动生成）、`input`（请求体摘要）、`output`（响应体摘要）、`usage`（令牌用量）、`finishReason`、`model`。
- `executionTimeMs` 当前预留为 `null`，因为 adapter 层保持最小侵入，不测量实际耗时。
- 已接入 `runtime-provider-openai-adapter.mjs` 的成功执行路径：当 `apiKey` 存在且调用成功后，自动调用 `transcriptStore.save()`。
- 真实 capture 需要 `OPENAI_API_KEY` 实际可用；缺 key 时 adapter 直接返回 error，不触发 capture。

### Execution log store（`src/skillforge/execution-log-store.mjs`）

- `buildExecutionLogEntry({ source, action, status, fixtureId })` 构造一条操作记录。
- 必填字段：`executionId`（自动生成）、`source`（调用源，如 `skillforge-operate`）、`action`（操作名，如 `review` / `prep` / `registry`）、`status`（`completed` 或 `failed`）、`fixtureId`、`startedAt`、`completedAt`。
- 已接入 `skillforge-operate.mjs` 的完成路径：三段链操作（review → prep → registry）全部成功后写入 `completed` 记录。
- 只记录**完整执行完成**的操作。失败路径（如 validation 失败导致 `process.exit()`）不写 execution log——这符合设计，只有完整执行的 operate 才产生审计记录。

## 与已有持久化底座的关系

| Store | 职责 | 写入方 | 写入时机 |
| ----- | ---- | ------ | -------- |
| review-store.mjs | 审阅记录持久化 | operate (review) | review 完成后 |
| prep-store.mjs | 发布准备持久化 | operate (prep) | prep 完成后 |
| registry-store.mjs | 登记记录持久化 | operate (registry) | registry 完成后 |
| **transcript-store.mjs** | provider 调用证据持久化 | provider adapter | adapter 调用成功后（需真实 API key） |
| **execution-log-store.mjs** | operate 操作审计轨迹 | operate (completion) | operate 三段链全部完成后 |

三段链 store 和两个增补 store 都使用同一 JSON Lines 模式、同一窄接口风格，无基础设施差异。后续新增持久化应继续遵循此模式。

## 关联代码

### 主锚点

| 路径 | 作用 |
| ---- | ---- |
| `src/skillforge/transcript-store.mjs` | Transcript JSON Lines 持久化 store，工厂 + 校验 + CRUD |
| `src/skillforge/execution-log-store.mjs` | Execution log JSON Lines 持久化 store，工厂 + 校验 + CRUD |
| `src/skillforge/runtime-provider-openai-adapter.mjs` | transcript capture 的写入方：成功路径调用 `transcriptStore.save()` |

### 关联锚点

| 路径 | 作用 |
| ---- | ---- |
| `scripts/skillforge-operate.mjs` | execution log 的写入方：三段链完成后调用 `executionLogStore.save()` |
| `scripts/skillforge-status.mjs` | 展示 Transcript Store 与 Execution Log 两个新 section |
| `scripts/test-skillforge-transcript-store.mjs` | transcript store 验证脚本，锁定字段完整性 |
| `scripts/test-skillforge-execution-log-store.mjs` | execution log store 验证脚本，锁定字段完整性 |

## 已知陷阱

- **Transcript store 不是实时证据**：当前 transcript capture 只在 `apiKey` 存在时触发，没有真实 API key 时 store 保持为空。不要因为 store 存在就假定已有 transcript 数据。
- **Execution log 只记录成功操作**：失败路径（pre-validation exit）不写 log，因此 execution log 的 `failed` 状态在实际运行中不会出现（已预留为 future 通道）。不要用 execution log 做全量错误统计。
- **`executionTimeMs` 为 null**：当前不测量实际耗时，`executionTimeMs` 设计上必须接受 `null`（表示"未采集"），不要把它当成必填正整数。
- **两 store 与三段链 store 职责混淆**：transcript / execution log 是增补型存储，不是三段链的替代或扩展。review → prep → registry 仍然是最核心的业务登记链路。

## 验证标准

- `node scripts/test-skillforge-transcript-store.mjs` 全部通过：build → validate → save → loadById → list → count。
- `node scripts/test-skillforge-execution-log-store.mjs` 全部通过：build → validate → save → loadById → list → recent → count，以及三种 entry 变体（completed / failed / minimal）validation。
- `node scripts/skillforge-operate.mjs --fixture-id ...` 完成后，execution log store 可见新 `completed` 记录。
- `node scripts/skillforge-status.mjs` 能展示 Transcript Store Status 和 Execution Log Status 两个 section，且各自的 count 和 recent 正确。

## 关键检索词

- `transcript-store.mjs`
- `buildTranscriptRecord`
- `validateTranscriptRecord`
- `execution-log-store.mjs`
- `buildExecutionLogEntry`
- `validateExecutionLogEntry`
- `executionId`
- `transcriptId`
- `executionTimeMs`
- `~/.skillforge/transcript.jsonl`
- `~/.skillforge/execution-log.jsonl`
- `JSON Lines`
- `non-fatal save`
- `Phase 16`
