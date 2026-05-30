# SkillForge 试运行额度配置

## 配置文件

SkillForge 的试运行开关和额度不在 `openclaw.json`，而在：

```text
~/.openclaw/runtime/skillforge-flags.json
```

## 当前推荐配置

```json
{
  "enabled": true,
  "planRemaining": 20,
  "promptRemaining": 50
}
```

## 字段说明

| 字段 | 含义 | 备注 |
|------|------|------|
| `enabled` | 总开关 | `false` 时完全停用 SkillForge 试运行 |
| `planRemaining` | `betterPlan` 剩余触发次数 | 每次命中 plan review 前置触发点时先减 1，再调用 |
| `promptRemaining` | `betterPrompt` 剩余触发次数 | 每次命中 `sessions_spawn` 前置触发点时先减 1，再调用 |

## 运行语义

当前模式是**先扣额度，再调用**：

1. 命中触发点
2. 先扣减对应计数
3. 再调用 SkillForge CLI
4. 无论成功或失败，都不回滚计数
5. 主流程继续执行（fail-open）

这意味着：

- 计数控制的是**触发次数**，不是成功次数
- 即使调用失败，也会消耗一次额度
- 某项计数减到 `0` 后，对应工具会自动停用

## 如何重置额度

直接覆盖配置文件：

```bash
cat > ~/.openclaw/runtime/skillforge-flags.json << 'EOF'
{
  "enabled": true,
  "planRemaining": 20,
  "promptRemaining": 50
}
EOF
```

## 观察方式

- 看剩余额度：

```bash
cat ~/.openclaw/runtime/skillforge-flags.json
```

- 看运行日志：

```bash
tail ~/.skillforge/execution-log.jsonl
```

当前日志采用最简格式：

```json
{
  "ts": "2026-05-30T06:49:25.000Z",
  "source": "betterPrompt",
  "input": "...",
  "output": "..."
}
```

## 相关日志位置

- 工具自身日志：`~/.skillforge/execution-log.jsonl`
- `betterPlan` 审计日志：`~/.openclaw/runtime/skillforge-betterplan-audit.jsonl`
- `betterPrompt` 审计日志：`~/.openclaw/runtime/skillforge-betterprompt-audit.jsonl`

## 使用建议

- 先用较小额度验证接入链路是否稳定
- 需要重新放量时，只改 `planRemaining` 和 `promptRemaining` 即可
- 修改额度后**不需要重启 gateway**
