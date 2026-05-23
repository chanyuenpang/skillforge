# 出站 Webhook 与子代理注册表条目传递链路

## 结论

`agent_end`、`session_end`、`subagent_ended` 这条链路现在已经具备稳定的出站 Webhook 投递能力；它属于“事件结束后异步推送”的通用能力，而不是某个单次任务的临时补丁。子代理结束时的注册表条目还会携带 `frozenResultText`，并通过结束 Hook 上下文继续向外传递，供下游 Webhook 消费。

## 长期行为 / 规则

- 出站 Webhook 通过 `src/plugins/outbound-webhook.ts` 统一投递，不应把投递逻辑散落到各个事件处理器里。
- 支持的事件类型包括 `subagent_ended`、`agent_end`、`session_end`。
- 出站投递是“即发即弃”模型，但带有重试与指数退避，避免一次网络抖动直接丢失通知。
- Webhook payload 支持 `${ENV_VAR}` 模板替换，方便在配置中注入运行时环境变量。
- `result_text` 在对外投递前会截断，避免把过长结果直接塞进回调。
- 可选的 HMAC 密钥头部用于增强 webhook 校验能力。
- 子代理注册表条目在结束阶段会把 `frozenResultText` 继续传递到 Hook 上下文，保证注册表条目里的稳定结果文本不会在链路中丢失。
- `stableRequesterOrigin` 与 `directOrigin` 的回退优先级必须保持一致：当回退发生后，应继续使用会话数据丰富化后的来源信息，而不是退回到更弱的原始值。

## 关联代码

### 主锚点

- `src/plugins/outbound-webhook.ts`：出站 Webhook 投递主实现，包含重试、退避、模板替换与 HMAC 头部逻辑。
- `src/plugins/hooks.ts`：在 `agent_end`、`session_end`、`subagent_ended` 处理流程中触发 `fireOutboundWebhook()`。
- `src/agents/subagent-registry-completion.ts`：把 `frozenResultText` 从注册表条目传入结束 Hook 上下文。
- `src/agents/subagent-announce.ts`：修复 `stableRequesterOrigin` / `directOrigin` 的优先级与会话数据丰富化回退。

### 关联锚点

| 路径 | 作用 |
| ---- | ---- |
| `src/config/types.hooks.ts` | 定义 `OutboundWebhookEntry`、`OutboundWebhookConfig` 与 `HooksConfig.outbound`。 |
| `src/plugins/hook-types.ts` | 为 `PluginHookSubagentContext` 增加 `frozenResultText`。 |
| `src/agents/subagent-announce.test.ts` | 回退源路径的回归测试锚点，覆盖 `loadSessionEntryByKey` 在显式 `null` 条目上的行为。 |

## 真实调用链路

1. `src/agents/subagent-registry-completion.ts`：整理子代理结束时的注册表条目，并把 `frozenResultText` 送入 Hook 上下文。
2. `src/plugins/hooks.ts`：监听 `agent_end`、`session_end`、`subagent_ended`，在结束点触发 `fireOutboundWebhook()`。
3. `src/plugins/outbound-webhook.ts`：根据配置组装请求，处理模板替换、截断、HMAC 头部与重试退避。
4. 下游 HTTP 接收端：收到最终 POST 投递。

## 不要改错的位置

- 不要把 `subagent_ended` 的结果文本处理逻辑只改在测试里；真正的数据通路在 `subagent-registry-completion.ts` 和 `hook-types.ts`。
- 不要把来源优先级修复写成只改表面字段；需要保证回退后仍使用会话丰富化后的 origin。
- 不要把出站 Webhook 当成任务完成摘要的唯一渠道；它是事件级通知通道，和内部状态机不是一回事。

## 验证标准

后续修改这条链路时，至少要确认：

- `agent_end`、`session_end`、`subagent_ended` 都能按配置触发出站推送。
- `result_text` 截断、模板替换、HMAC 头部和重试退避仍然生效。
- `frozenResultText` 在注册表条目到 Hook 上下文的传递没有丢失。
- `stableRequesterOrigin` / `directOrigin` 的回退优先级不再退化。
- `src/agents/subagent-announce.test.ts` 中的回归用例继续覆盖显式 `null` 条目场景。

## 关键检索词

- `fireOutboundWebhook()`
- `outbound webhook`
- `subagent_ended`
- `agent_end`
- `session_end`
- `frozenResultText`
- `stableRequesterOrigin`
- `directOrigin`
- `loadSessionEntryByKey`
- `HMAC`
- `${ENV_VAR}`
- `result_text`
