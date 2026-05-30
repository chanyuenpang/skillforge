# SkillForge 试运行额度配置

## 配置文件

**唯一路径**：`~/.openclaw/runtime/skillforge-flags.json`

## 配置内容

```json
{
  "enabled": true,
  "planRemaining": 20,
  "promptRemaining": 50
}
```

## 字段说明

| 字段 | 含义 | 建议值 |
|------|------|--------|
| `enabled` | 总开关，`false` 则完全停用 | `true` |
| `planRemaining` | betterPlan 剩余触发次数，每次 plan review 前扣 1 | 20 |
| `promptRemaining` | betterPrompt 剩余触发次数，每次 spawn subagent 前扣 1 | 50 |

## 运行机制

1. 命中触发点 → 先扣减计数 → 再调用 SkillForge CLI
2. 调用成功或失败都**不回滚**计数
3. 某项计数减到 `0` 后，对应工具**自动停用**
4. 当前是「只调用不消费」模式，不阻塞主流程

## 如何重置额度

把 `planRemaining` 和 `promptRemaining` 改回目标值即可，**不需要重启 gateway**。

## 日志位置

- 工具自身日志：`~/.skillforge/execution-log.jsonl`（每行 `{ ts, source, input, output }`）
- betterPlan 审计日志：`~/.openclaw/runtime/skillforge-betterplan-audit.jsonl`
- betterPrompt 审计日志：`~/.openclaw/runtime/skillforge-betterprompt-audit.jsonl`
