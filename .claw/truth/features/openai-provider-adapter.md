# OpenAI provider adapter：首个真实 provider-backed 接入点

## 结论

`openai` 已经从“普通 builtin key”升级为明确的 provider-backed 入口：它既要出现在 CLI / selection / observed mapper 里，也要在缺少 `OPENAI_API_KEY` 时诚实失败，不能再被当成纯 skeleton 模式。

## 长期行为 / 规则

- `openai` 是 `builtin=true` 且 `providerBacked=true` 的 selection 预设，未来排查时要先看 provider-backed 语义，不要只看它是否 builtin。
- `scripts/run-runtime-draft.mjs` 已支持 `--mode openai`，其 help 文本和 unsupported mode 报错都必须明确列出 `openai`，避免误把它当成保留模式。
- `runtime-observed-mapper` 已把 `openai` 纳入 `SUPPORTED_PROVIDER_SELECTION_KEYS`，说明 observed 层已经开始接受这个 provider-backed key。
- `buildRuntimeProviderAdapterResult()` 需要把 `selection` 默认回填为 `input.provider.selection`，这样 provider-backed 结果才能稳定携带同一条 execution identity / selection 语义链。
- 缺少 `OPENAI_API_KEY` 时，`--mode openai` 的真实验证应诚实返回 `PROVIDER_MISSING_API_KEY`，并保留 `providerKey: openai`、`executionId: stub:*` 这类可区分标记。
- `openai` 的错误码和验证脚本仍然要稳定围绕请求构造、响应适配、错误映射与无 key 失败来校验，避免把一次性验证误写成“已完全产品化”。

## 关联代码

### 主锚点

- `src/skillforge/runtime-provider-openai-adapter.mjs`：OpenAI 适配器核心实现，负责配置加载、API key 解析、请求构造、响应适配、错误映射。
- `src/skillforge/runtime-runner.mjs`：`openai` 模式的同步/异步分流入口，`runRuntimeCaseSkeletonRealExecution()` 是真实调用的唯一合法入口。
- `src/skillforge/runtime-provider-adapter-contract.mjs`：`buildRuntimeProviderAdapterResult()` 的 selection 默认回填点，负责把 `openai` 的 selection 语义稳定传到结果层。
- `src/skillforge/runtime-observed-mapper.mjs`：`SUPPORTED_PROVIDER_SELECTION_KEYS` 里接纳 `openai`，并在 observed / providerExecution / transcript 链路里继续做 same-source 校验。

### 关联锚点

| 路径 | 作用 |
| ---- | ---- |
| `src/skillforge/runtime-provider-adapter-contract.mjs` | `openai` preset 注册与 provider selection 约束。 |
| `scripts/run-runtime-draft.mjs` | CLI `--mode openai` 分发到 async real execution。 |
| `scripts/verify-provider-adapter.mjs` | 适配器契约、请求/响应、错误码、无 key 失败的主验证脚本。 |
| `scripts/test-runtime-contracts.mjs` | 回归测试快照，锁定 `openai` 预设与 runner contract 语义。 |
| `src/skillforge/transcript-store.mjs` | Transcript capture 的持久化 store，成功路径自动写入。 |

## 真实调用链路

1. `scripts/run-runtime-draft.mjs` 解析 `--mode openai`，并单独走 openai 分支。
2. 读取 fixture，完成 static validation 与 preflight。
3. 调用 `runRuntimeCaseSkeletonRealExecution()`。
4. `buildRuntimeProviderAdapterContext().buildResult()` 先把 `selection` 回填到 adapter result，确保 `openai` 的结果不丢 selection 来源。
5. `runtime-runner.mjs` 构造 runner / provider contract，转交 `invokeOpenaiAdapter()`。
6. `runtime-provider-openai-adapter.mjs` 负责真正的 OpenAI-compatible HTTP 调用，或在缺 key 时返回诚实错误。
7. 结果再被 `mapProviderResultToObservedRuntime()`、report builder 归档为 runtime report。

## 不要改错的位置

- `runRuntimeCaseSkeleton()` 不是真实 provider 执行入口；它只应该维持同步骨架语义。
- `scripts/run-runtime-draft.mjs` 的 dry-run / null-runner 语义不能因为 `openai` 接入而改成默认真实执行。
- `runtime-provider-adapter-contract.mjs` 的 selection 规则不能把 `openai` 降级成普通 skeleton key，否则后续同源传播会被污染。

## 已知陷阱

- `openai` 同时是 builtin key 和 provider-backed key，未来排查时要先看 `providerBacked=true`，不要只盯 `implemented=true`。
- 没有 `OPENAI_API_KEY` 时，正确结果是 error，不是 fallback 成功。
- 真实 HTTP 调用不能塞进同步 runner，否则会把 CLI / contract test 的行为搅乱。
- transcript capture 已接入 `runtime-provider-openai-adapter.mjs` 的成功路径（`transcriptStore.save()`），但真实 capture 需要 `OPENAI_API_KEY` 实际可用；缺 key 时不触发 capture。不要因为 store 存在就假定已有 transcript 数据。`executionTimeMs` 当前预留为 `null`。
- scoring、sandbox 仍是后续能力，不能因为 provider 真的可调用就默认升级。

## 验证标准

- `buildRuntimeProviderSelection({ mode: 'openai' })` 必须返回 `providerBacked=true`、`builtin=true`、`implemented=true`，且 selection 结果能被 adapter / observed / report 逐层透传。
- `scripts/run-runtime-draft.mjs --mode openai` 必须在 help、unsupported mode 和 runtime report 三处都能识别 `openai`。
- `scripts/verify-provider-adapter.mjs` 应持续通过关键检查，尤其是无 key 场景和错误码映射。
- `runRuntimeCaseSkeleton({ mode: 'openai' })` 在同步入口下必须诚实失败或 blocked，不能偷偷发起真实 HTTP。
- `runRuntimeCaseSkeletonRealExecution({ mode: 'openai' })` 才能走真实 provider 调用。

## 关键检索词

- `openai`
- `runRuntimeCaseSkeletonRealExecution`
- `invokeOpenaiAdapter`
- `PROVIDER_MISSING_API_KEY`
- `PROVIDER_SYNC_ENTRY_ONLY`
- `OPENAI_API_KEY`
- `runtime-provider-openai-adapter.mjs`
- `scripts/verify-provider-adapter.mjs`
- `--mode openai`
