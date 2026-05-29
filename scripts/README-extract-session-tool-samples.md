# extract-session-tool-samples

用于批量提取 OpenClaw sessions 中的 `plan_write` / `sessions_spawn` 工具调用样本。

## 文件

- `scripts/extract-session-tool-samples.mjs`

## 支持参数

- `--sessionKey <key>`（可重复）
- `--sessionKeyFile <file>`
- `--toolName plan_write|sessions_spawn|both`
- `--limit <n>`
- `--from <iso|ms>`
- `--to <iso|ms>`
- `--format json|jsonl`
- `--out <file>`
- `--baseDir <dir>`（可选，默认 `./sessions`）

## 输出字段

每条样本包含：

- `sessionKey`
- `timestamp`
- `toolName`
- `toolCallId`
- `toolArgumentsSnippet`
- `toolResultSnippet`
- `sourceFile`

## 示例

```bash
# 输出到 stdout（json）
node scripts/extract-session-tool-samples.mjs \
  --sessionKey agent:coding-agent:subagent:xxx \
  --toolName both \
  --limit 50

# 从文件读取多个 sessionKey，输出 jsonl 文件
node scripts/extract-session-tool-samples.mjs \
  --sessionKeyFile ./session-keys.txt \
  --toolName sessions_spawn \
  --from 2026-01-01T00:00:00Z \
  --to 2026-12-31T23:59:59Z \
  --format jsonl \
  --out ./tmp/sessions-spawn-samples.jsonl
```

## 说明

- 日志文件定位规则：
  1. `<baseDir>/<sessionKey>.jsonl`
  2. `<baseDir>/<sessionKey>/events.jsonl`
- 解析失败行会自动跳过。
- `toolArgumentsSnippet` / `toolResultSnippet` 会截断到 300 字符，避免单条样本过大。
