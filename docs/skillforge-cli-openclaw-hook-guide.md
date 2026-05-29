# SkillForge CLI 接入 OpenClaw 指南（安装、调用与 Hook 采样）

## 背景与定位

SkillForge 在本仓库中是 **repo-local Node 脚本入口**，**不是独立 npm 全局包**。  
也就是说，调用方式应基于仓库工作目录执行 `node scripts/*.mjs`，而不是 `npm i -g` 后直接敲全局命令。

- 推荐工作目录（repo root）：`/home/yankeeting/.openclaw/projects/workflow-kit`
- 调用原则：在仓库根目录执行脚本，保持相对路径与配置解析一致

---

## 安装与运行前提

### 1) 进入仓库目录

```bash
cd /home/yankeeting/.openclaw/projects/workflow-kit
```

### 2) 安装依赖

```bash
pnpm install
```

说明：当前环境已确认 `pnpm install` 可用。

### 3) 用 help 验证入口可用

```bash
node scripts/skillforge-operate.mjs --help
node scripts/skillforge-status.mjs --help
node scripts/run-runtime-draft.mjs --help
```

---

## CLI 入口总览

| 入口脚本 | 定位 | 读写属性 |
|---|---|---|
| `scripts/skillforge-operate.mjs` | 主操作入口，执行业务操作（含 `betterplan` / `betterprompt`） | 可能产生写入/变更 |
| `scripts/skillforge-status.mjs` | 状态查询入口 | 只读 |
| `scripts/run-runtime-draft.mjs` | runtime draft 执行入口（openai mode 依赖 API Key） | 视具体模式而定 |

> 面向 OpenClaw 的集成建议：优先将 `skillforge-operate.mjs` 视为“主调用面”。

---

## `skillforge-operate.mjs`：betterprompt 调用

### 作用
执行 `betterprompt` 相关能力（提示词优化/生成流程入口）。

### 调用方式

```bash
cd /home/yankeeting/.openclaw/projects/workflow-kit
node scripts/skillforge-operate.mjs betterprompt [options]
```

### 输入/输出形态（通用约定）

- 输入：子命令 + 参数（CLI flags / 位置参数）
- 输出：
  - 成功：stdout 输出结果信息（文本或结构化片段）
  - 失败：stderr 输出错误原因，并返回非 0 退出码

### 失败判断

- 退出码 `!= 0`
- stderr 出现 error/异常栈/参数错误提示
- stdout 缺少预期关键结果

---

## `skillforge-operate.mjs`：betterplan 调用

### 作用
执行 `betterplan` 相关能力（计划生成/改写流程入口）。

### 调用方式

```bash
cd /home/yankeeting/.openclaw/projects/workflow-kit
node scripts/skillforge-operate.mjs betterplan [options]
```

### 输入/输出形态（通用约定）

- 输入：子命令 + 参数
- 输出：
  - 成功：stdout 输出计划结果或过程信息
  - 失败：stderr 输出错误信息，退出码非 0

### 失败判断

- 退出码 `!= 0`
- 参数缺失/格式错误提示
- 运行时异常（如配置缺失、上游依赖失败）

---

## `skillforge-status.mjs`：status 调用（只读）

### 作用
用于状态检查与只读查询，不应触发业务写入。

### 调用方式

```bash
cd /home/yankeeting/.openclaw/projects/workflow-kit
node scripts/skillforge-status.mjs [options]
```

### 输入/输出形态

- 输入：状态查询参数
- 输出：
  - 成功：stdout 返回当前状态信息
  - 失败：stderr 返回错误，退出码非 0

### 典型用途

- 执行前健康检查
- 执行后状态确认
- 自动化链路中的只读探测

---

## `run-runtime-draft.mjs`：runtime draft 调用

### 作用
执行 runtime draft 相关流程。

### 关键前提

在 **openai mode** 下依赖环境变量：

- `OPENAI_API_KEY`

### 调用方式

```bash
cd /home/yankeeting/.openclaw/projects/workflow-kit
node scripts/run-runtime-draft.mjs [options]
```

### 输入/输出形态

- 输入：mode/参数配置
- 输出：
  - 成功：stdout 输出执行结果
  - 失败：stderr 输出失败原因，退出码非 0

### 失败判断（重点）

- 若 openai mode 且未设置 `OPENAI_API_KEY`，通常会直接失败
- 退出码 `!= 0`
- stderr 出现认证/配置缺失/请求失败信息

---

## OpenClaw Hook 接入建议（首版）

### 首版最稳采样点（推荐）

在 OpenClaw 调用 `exec` 执行以下命令时进行采样：

- `node scripts/skillforge-operate*.mjs ...`
- `node scripts/run-runtime-draft.mjs ...`

其中：
- `skillforge-operate.mjs` 覆盖 `betterplan` / `betterprompt` 主流程
- `run-runtime-draft.mjs` 覆盖 runtime draft 流程

> `skillforge-status.mjs` 可按需采样（通常用于观测与排查，不是主业务写路径）。

### 建议采样字段

最小可用字段集：

- `command`：完整命令（含脚本名）
- `args`：参数数组/参数字符串
- `cwd`：执行工作目录
- `start_time`：开始时间
- `end_time`：结束时间
- `exit_code`：进程退出码
- `stdout_summary`：stdout 摘要（截断/摘要化）
- `stderr_summary`：stderr 摘要（截断/摘要化）

### 更细粒度采样（可选增强）

若后续需要更细粒度数据：

1. 在 OpenClaw wrapper 层增加结构化事件日志；或
2. 在统一脚本层增加结构化日志输出（JSON lines 等）。

### 首版策略（重要）

- **先从调用层采样**（OpenClaw `exec` 层）
- **不要先改底层业务协议**
- 先拿到稳定、低侵入的执行观测，再决定是否下钻

---

## 典型调用样例

> 以下示例强调“repo-local + 固定 cwd”。具体参数请以 `--help` 实际输出为准。

```bash
# 1) 查看主操作入口帮助
cd /home/yankeeting/.openclaw/projects/workflow-kit
node scripts/skillforge-operate.mjs --help

# 2) 调用 betterprompt
cd /home/yankeeting/.openclaw/projects/workflow-kit
node scripts/skillforge-operate.mjs betterprompt [options]

# 3) 调用 betterplan
cd /home/yankeeting/.openclaw/projects/workflow-kit
node scripts/skillforge-operate.mjs betterplan [options]

# 4) 查询状态（只读）
cd /home/yankeeting/.openclaw/projects/workflow-kit
node scripts/skillforge-status.mjs [options]

# 5) 运行 runtime draft（openai mode 需要 OPENAI_API_KEY）
cd /home/yankeeting/.openclaw/projects/workflow-kit
OPENAI_API_KEY=*** node scripts/run-runtime-draft.mjs [options]
```

---

## 常见错误与排查

### 1) 当成全局命令执行，报 command not found

**原因**：这是 repo-local 脚本，不是全局 npm 包。  
**修复**：切到仓库目录后用 `node scripts/...mjs` 调用。

### 2) 在错误目录执行导致找不到文件或配置

**原因**：cwd 不在 repo root。  
**修复**：固定到 `/home/yankeeting/.openclaw/projects/workflow-kit` 再执行。

### 3) 参数不对/子命令拼错

**现象**：help 被打印、参数错误、退出码非 0。  
**修复**：先执行对应 `--help`，再按帮助修正参数。

### 4) runtime draft 在 openai mode 下失败

**原因**：未设置或错误设置 `OPENAI_API_KEY`。  
**修复**：注入有效 `OPENAI_API_KEY` 后重试。

### 5) 任务失败但输出不清晰

**排查建议**：
- 检查 exit code
- 保存并查看 stderr 全量
- 在 OpenClaw hook 中记录 stdout/stderr 摘要与命令参数

---

## 给接入 Agent 的落地建议（简版）

1. 固定 `cwd=/home/yankeeting/.openclaw/projects/workflow-kit`。
2. 一律使用 `node scripts/*.mjs` 方式调用（repo-local）。
3. 业务主链路优先接 `skillforge-operate.mjs`（`betterprompt` / `betterplan`）。
4. runtime 相关接 `run-runtime-draft.mjs`，并在 openai mode 注入 `OPENAI_API_KEY`。
5. 首版观测在 OpenClaw `exec` 层采样，不改业务协议。