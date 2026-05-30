---
name: feishu-file-sender
version: 1.1.0
description: "飞书文件发送 | 正确发送飞书文件消息，避免格式错误和权限问题。触发词：发送文件、飞书文件、文件消息。"
metadata:
  openclaw:
    emoji: "📎"
    priority: high
    type: skill
---

# 飞书文件发送技能

专门用于正确发送飞书文件消息，避免格式错误、权限问题和中文乱码。

## 适用场景

任何需要给用户发送文件的场景（txt、md、pdf、图片、excel等所有格式）

## 前置条件

1. 飞书网关正常运行
2. 文件大小不超过30MB

## 账号选择（重要！必须指定！）

**每次使用 `openclaw message send` 必须带 `--account` 参数**，不指定会回退到 `defaultAccount: "organizer"`，如果该 bot 不在群里会导致 230002 错误。

### 账号与 Agent 映射

| Agent | 绑定账号 | --account 值 |
|-------|---------|-------------|
| feishu | original | `--account original` |
| feishu-organizer | organizer | `--account organizer` |
| feishu-engineer | engineer | `--account engineer` |

### 如何确定使用哪个账号

- 查看你自己是哪个 agent（参见 AGENT.md 中的账号信息）
- 使用对应的 `--account` 值
- 如果遇到 "open_id cross app" 或 "230002 Bot/User can NOT be out of the chat" 错误，可尝试切换其他账号

## 使用步骤

### 步骤1：文件预处理

文件必须放在工作目录根目录：/home/yankeeting/.openclaw/workspace/
如果文件不在此目录，**必须先复制到 workspace 根目录再发送**。

**图片文件特别规则（强制）**：
- 图片（.jpg/.png/.gif/.webp 等）**只能**发送 workspace 根目录下的副本
- 不允许直接发送 workspace 根目录之外的图片路径
- 发送时应使用复制后的 workspace 根目录绝对路径

**重要**：记录文件的原始位置，用于后续判断是否需要清理

### 步骤2：确定发送目标

#### 私聊场景
- 目标是用户 ID（`ou_` 开头），从消息元数据的 `sender_id` 获取

#### 群聊场景
- 目标是群聊 ID（`oc_` 开头），从消息元数据的 `conversation_label` 获取
- 判断方法：消息元数据中 `is_group_chat: true` 表示群聊

### 步骤3：发送文件

#### 方式A：图片文件（.jpg/.png/.gif/.webp等）

**必须先把图片复制到 workspace 根目录**，然后直接在对话中发送该绝对路径，不要加任何其他文字：
```
/home/yankeeting/.openclaw/workspace/xxx.png
```
注意：此方式会通过当前 session 的 reply-dispatcher 发送，在 thread 中时文件会发到 thread 内。

**禁止**直接发送如下路径：
- 项目目录中的原图
- docs/、temp/、downloads/、子目录中的图片
- 任何不在 `/home/yankeeting/.openclaw/workspace/` 根目录下的图片路径

#### 方式B：文档/其他文件（.txt/.md/.pdf/.xlsx/.docx等）

使用命令行发送，**必须指定 `--account`**：

**私聊发送**：
```bash
openclaw message send --channel feishu --target "ou_xxx" --media /home/yankeeting/.openclaw/workspace/xxx.txt --account original
```

**群聊发送**：
```bash
openclaw message send --channel feishu --target "oc_xxx" --media /home/yankeeting/.openclaw/workspace/xxx.txt --account original
```
注意：群聊发送时，`--target` 使用群聊 ID（`oc_` 开头），文件会发到群的主聊天区。

### 步骤4：清理文件（重要！）

**发送完成后**，检查并清理 workspace 中的临时文件：

1. **判断是否需要删除**：如果文件是从其他位置**复制**进来的，需要删除 workspace 中的副本
2. **图片文件强制规则**：
   - 图片发送前复制到 workspace 根目录的副本，**发送成功后必须删除**
   - 原始图片文件如果是为本次发送临时生成/临时搬运的，也应一并清理
3. **保留的文件**：
   - 原本就存在于 workspace 的长期文件（不动）
   - 框架文件（AGENTS.md, SOUL.md, MEMORY.md 等）
   - shared.sqlite
4. **需要删除的文件**：
   - 从 docs/, temp/, 项目目录或其他子目录复制到 workspace 根目录的图片/文件
   - 为本次发送临时生成的图片/文件
   - 发送后确认成功即可删除

**清理命令示例**：
```bash
rm /home/yankeeting/.openclaw/workspace/xxx.png
```

## Thread 中发送文件

在 thread 对话中发送文件时：
- **方式A（图片路径）**：文件会发到 thread 内（通过 reply-dispatcher）
- **方式B（CLI 命令）**：`--target` 使用群聊 ID（`oc_xxx`），文件会发到群的主聊天区（非 thread 内）
- thread session 的群聊 ID 可从消息元数据的 `conversation_label` 字段获取

## 必须遵守的规则

✅ **允许**：
- 文件放在 workspace 根目录下再发送
- 发送时只发路径/命令，无其他文字
- 中文文件名直接用，无需编码
- 发送完成后清理复制或临时生成的图片/文件

❌ **禁止**：
- 使用 `MEDIA:` 前缀
- 使用 `<qqfile>`/`<file>` 标签
- 使用 `file://` 协议头
- 发送非 workspace 根目录下的图片
- 在路径/命令前后加说明文字
- 发送完成后不清理复制或临时生成的图片/文件

## 验证标准

### 发送成功判断

1. **命令返回验证**：执行命令后返回 `✅ Sent via Feishu. Message ID: xxx` 即为发送成功
2. **日志验证**：网关日志中出现 `dispatch complete (queuedFinal=true)` 且无错误记录
3. **错误判断**：如果出现 `sendMediaFeishu failed`、`path-not-allowed`、权限错误等记录，即为发送失败

### 失败处理

如果遇到以下错误：
- "open_id cross app" → 切换其他飞书账号重试
- "230002 Bot/User can NOT be out of the chat" → 当前账号的 bot 不在群里，切换其他账号或确认 bot 已加入群聊
- 发送残留文件堵塞 → 切换账号重试

切换账号后重试，不要一直用同一个账号反复尝试。

### 注意

只能确认我方发送成功，无法100%确认用户侧收到（可能存在网络/飞书延迟）。如果发送失败，agent 应手动重试最多2次（优先切换账号重试），重试失败则告知用户具体错误原因。

## 变更历史

- **v1.0.0** (2026-03-30): 初始版本
- **v1.1.0** (2026-03-30): 添加文件发送后清理规则，删除从其他位置复制的临时文件
