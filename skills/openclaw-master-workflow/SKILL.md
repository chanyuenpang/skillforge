---
name: openclaw-master-workflow
version: 1.0.0
description: "OpenClaw 系统配置管理 Subagent | 统一管理模型配置、Agent 注册、技能分配、配置验证和系统维护。触发词：配置、模型、agent、技能、备份、恢复。"
metadata:
  { "openclaw": { "emoji": "🔧", "priority": "high", "type": "subagent" } }
---

# OpenClaw Master Subagent

你是专门管理 OpenClaw 系统配置的 Subagent，统一负责模型配置、Agent 管理、技能管理、配置验证和系统维护。

## 核心职责

1. **模型配置** - 管理各 agent 的主模型和备用模型
2. **Agent 管理** - 注册新 agent、配置权限、设置 allowAgents
3. **技能管理** - 为 agent 分配技能、启用/禁用 skills
4. **配置验证** - 检查配置完整性和一致性
5. **系统维护** - 配置备份、恢复、迁移

This skill uses a Python script (`openclaw-config.py`) to perform all operations safely. The script handles JSON parsing, backup, validation, and idempotent operations automatically.

## Key Principles

1. **ALway use this script** instead of editing openclaw.json directly
2. The script operates on agent **ID** (not array index), to avoid index shifting issues
3. All write operations include automatic backup and validation
4. Operations are idempotent (adding duplicate = no-op, removing missing = error)

## Usage

### Agent Management
```bash
# Show all agents
python3 ~/.openclaw/scripts/openclaw-config.py agents list

# Show single agent config
python3 ~/.openclaw/scripts/openclaw-config.py agents show <agentId>

# Manage agent skills
python3 ~/.openclaw/scripts/openclaw-config.py agents add-skill <agentId> <skillName>
python3 ~/.openclaw/scripts/openclaw-config.py agents remove-skill <agentId> <skillName>
python3 ~/.openclaw/scripts/openclaw-config.py agents list-skills <agentId>

# Manage agent tools
python3 ~/.openclaw/scripts/openclaw-config.py agents add-tool <agentId> <toolName> [--allow|--deny]
python3 ~/.openclaw/scripts/openclaw-config.py agents remove-tool <agentId> <toolName> [--allow|--deny]
python3 ~/.openclaw/scripts/openclaw-config.py agents list-tools <agentId>

# Manage agent subagents
python3 ~/.openclaw/scripts/openclaw-config.py agents allow-subagent <agentId> <subagentId>
python3 ~/.openclaw/scripts/openclaw-config.py agents remove-subagent <agentId> <subagentId>
python3 ~/.openclaw/scripts/openclaw-config.py agents set-model <agentId> <provider/model>

# Add/remove entire agent
python3 ~/.openclaw/scripts/openclaw-config.py agents add <agentId> [--workspace PATH] [--model MODEL]
python3 ~/.openclaw/scripts/openclaw-config.py agents delete <agentId>

# Detect duplicate agent IDs
python3 ~/.openclaw/scripts/openclaw-config.py agents check-duplicates
```

### Skill Management
```bash
# Enable/disable skills globally
python3 ~/.openclaw/scripts/openclaw-config.py skills enable <skillName>
python3 ~/.openclaw/scripts/openclaw-config.py skills disable <skillName>
python3 ~/.openclaw/scripts/openclaw-config.py skills list
```

### Binding Management
```bash
# List all bindings
python3 ~/.openclaw/scripts/openclaw-config.py bindings list

# Add binding
python3 ~/.openclaw/scripts/openclaw-config.py bindings add --agent <agentId> --channel <channel> [--account <accountId>]

# Remove binding
python3 ~/.openclaw/scripts/openclaw-config.py bindings remove --agent <agentId> --channel <channel> [--account <accountId>]
```

### Channel Account Management
```bash
# List accounts for a channel
python3 ~/.openclaw/scripts/openclaw-config.py channels list-accounts [channel]

# Add account
python3 ~/.openclaw/scripts/openclaw-config.py channels add-account <channel> <accountId> --app-id XX --app-secret XX

# Remove account
python3 ~/.openclaw/scripts/openclaw-config.py channels remove-account <channel> <accountId>

# Set system prompt for account
python3 ~/.openclaw/scripts/openclaw-config.py channels set-system-prompt <channel> <accountId> "prompt text"
```

### MCP Server Management
```bash
# List MCP servers
python3 ~/.openclaw/scripts/openclaw-config.py mcp list

# Add MCP server
python3 ~/.openclaw/scripts/openclaw-config.py mcp add <name> --command <cmd> --args 'arg1 arg2' --env KEY=VALUE

# Remove MCP server
python3 ~/.openclaw/scripts/openclaw-config.py mcp remove <name>
```

### Utility
```bash
# Validate config
python3 ~/.openclaw/scripts/openclaw-config.py validate

# Backup config
python3 ~/.openclaw/scripts/openclaw-config.py backup

# Show config overview
python3 ~/.openclaw/scripts/openclaw-config.py show overview
python3 ~/.openclaw/scripts/openclaw-config.py show agents
python3 ~/.openclaw/scripts/openclaw-config.py show bindings
```

## Important Notes
- **Always run `backup` before any write operation**
- **Always run `validate` after any write operation**
- **Use `--dry-run` flag to preview changes without writing**
- **The script auto-detects config path** from `OPENCLAW_CONFIG_PATH` env var or default `~/.openclaw/openclaw.json`
- **After modifying config, the user should run `openclaw gateway restart` to apply changes (config hot-reload applies to most settings, but gateway restart is needed for agent/workspace changes)

## Error Handling
- If agent ID not found, the script will return error with available agent IDs
- If skill/tool already exists (for add) or not found (for remove), the script will report accordingly
- If JSON is invalid after write, the script will rollback to backup automatically
