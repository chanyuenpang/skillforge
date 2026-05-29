# SkillForge CLI 给 OpenClaw Agent 的调用文档

这份文档不是面向最终用户的，而是给 **其他 agent / OpenClaw hook 集成层** 看的。

目标只有三个：

1. 说明 **当前仓库里的 CLI 到底是什么**
2. 说明 **agent 应该怎么调用它**
3. 说明 **OpenClaw 应该 hook 在哪里，才能采集真实调用数据**

---

## 1. 结论先说清楚

当前仓库里的 "SkillForge CLI" **不是一个独立发布的 npm 全局包**，而是仓库内的一组 **Node 脚本入口**。

也就是说，当前正确使用方式不是：

```bash
npm install -g xxx
xxx --help
```

而是：

```bash
node scripts/xxx.mjs ...
```

或者通过 `package.json` 里的 script：

```bash
pnpm <script-name>
```

### 已现场确认的核心入口

- `node scripts/skillforge-operate.mjs --help`
- `node scripts/skillforge-operate-betterplan.mjs --help`
- `node scripts/skillforge-operate-betterprompt.mjs --help`
- `node scripts/skillforge-status.mjs --help`
- `pnpm validate:runtime:draft --help`

### 仓库事实

- `package.json` 中 **没有 `bin` 字段**
- 当前项目名是：`workflow-kit`
- CLI 的真实能力主要落在：
  - `scripts/skillforge-operate.mjs`
  - `scripts/skillforge-operate-betterplan.mjs`
  - `scripts/skillforge-operate-betterprompt.mjs`
  - `scripts/skillforge-status.mjs`
  - `scripts/run-runtime-draft.mjs`

所以，后续在 OpenClaw 里说“调用 SkillForge CLI”，默认就应该理解为：

> **在仓库工作目录里执行这些 `node scripts/*.mjs` 命令。**

---

## 2. 安装方式

严格说，当前并没有“安装独立 CLI 包”这一步。

真正需要的是：

### 2.1 依赖安装

在仓库根目录执行：

```bash
pnpm install
```

工作目录：

```bash
/home/yankeeting/.openclaw/projects/workflow-kit
```

### 2.2 运行前提

- Node.js 可用
- `pnpm` 可用
- 仓库依赖已安装完成

### 2.3 可能涉及的环境变量

#### `OPENAI_API_KEY`

`run-runtime-draft` 在 `openai` mode 下依赖这个变量。

示例：

```bash
OPENAI_API_KEY=... pnpm validate:runtime:draft fixtures/meeting-summary-assistant
```

### 2.4 不需要做的事

- 不需要 `npm install -g`
- 不需要自己造软链接成系统命令
- 不需要把它误判成发布到 npm registry 的正式 CLI 包

---

## 3. CLI 入口总览

| 能力 | 入口 | 用途 |
| --- | --- | --- |
| 总入口 | `node scripts/skillforge-operate.mjs` | 统一转发 `betterplan / betterprompt` |
| betterPlan | `node scripts/skillforge-operate-betterplan.mjs` | 把计划文本转成结构化 task skeleton |
| betterPrompt | `node scripts/skillforge-operate-betterprompt.mjs` | 把原始 prompt 转成 betterPrompt v1 输出 |
| 状态查看 | `node scripts/skillforge-status.mjs` | 输出当前 SkillForge 状态报告 |
| runtime draft 验证 | `pnpm validate:runtime:draft <fixture>` | 跑 runtime draft 验证链路 |

---

## 4. 推荐调用方式

对于 agent 来说，**优先用专用入口，不要总是绕总入口**。

也就是说：

- 调 `betterplan` → 优先 `skillforge-operate-betterplan.mjs`
- 调 `betterprompt` → 优先 `skillforge-operate-betterprompt.mjs`
- 查状态 → `skillforge-status.mjs`
- 跑 runtime 验证 → `validate:runtime:draft`

这样有两个好处：

1. 参数更稳定
2. hook 采样时更容易按命令分类统计

---

## 5. 具体调用文档

### 5.1 `skillforge-operate.mjs`

统一入口，支持两个子命令：

- `betterplan`
- `betterprompt`

#### help

```bash
node scripts/skillforge-operate.mjs --help
```

#### betterplan 示例

```bash
node scripts/skillforge-operate.mjs betterplan \
  --plan "把 shared baseline v0 接入 nightly，并补最小验证" \
  --goal-hint "先给出最小可执行骨架"
```

#### betterprompt 示例

```bash
node scripts/skillforge-operate.mjs betterprompt \
  --prompt "帮我把这个任务描述改写成可执行 prompt" \
  --goal-hint "强调边界和验收"
```

#### 输出

- `betterplan`：输出 JSON
- `betterprompt`：输出 betterprompt 结果（字符串或 JSON）

#### 适合场景

- 你想统一从一个命令入口转发
- 你在做快速人工调试

#### 不足

- 对 hook 采样来说分类粒度不如专用入口清晰

---

### 5.2 `skillforge-operate-betterplan.mjs`

这是 **betterPlan 的专用 CLI**。

#### help

```bash
node scripts/skillforge-operate-betterplan.mjs --help
```

#### 命令格式

```bash
node scripts/skillforge-operate-betterplan.mjs --plan "..." [--goal-hint "..."]
```

或者：

```bash
echo "计划文本" | node scripts/skillforge-operate-betterplan.mjs --goal-hint "..."
```

#### 输入契约

```json
{
  "plan": "string",
  "goal_hint": "string?"
}
```

#### 输出特征

返回 JSON，典型结构包含：

- `version`
- `contract`
- `input`
- `output`
- `meta`

其中 `meta` 常见字段包括：

- `llmCalled`
- `llmDurationMs`
- `model`
- `validationPassed`
- `fallbackUsed`
- `warnings`

#### 推荐 agent 调用方式

```bash
node scripts/skillforge-operate-betterplan.mjs \
  --plan "把 OpenClaw 中的真实调用样本沉淀为结构化基线" \
  --goal-hint "输出 task skeleton，不要扩写产品方案"
```

#### 适合 hook 采样的原因

- 输入是单一 `plan`
- 输出是结构化 skeleton
- 非常适合记录：
  - 原始 plan 文本
  - 生成结果
  - llm metadata
  - fallback 情况

---

### 5.3 `skillforge-operate-betterprompt.mjs`

这是 **betterPrompt 的专用 CLI**。

#### help

```bash
node scripts/skillforge-operate-betterprompt.mjs --help
```

#### 命令格式

```bash
node scripts/skillforge-operate-betterprompt.mjs --prompt "..." [--goal-hint "..."]
```

#### 输入契约

```json
{
  "prompt": "string",
  "goal_hint": "string?"
}
```

#### 输出特征

返回 `betterprompt.v1` 结果，常见结构包括：

- `version`
- `contract`
- `input`
- `output.sections`
- `meta`

#### 实际最小示例

```bash
node scripts/skillforge-operate-betterprompt.mjs \
  --prompt "translate hello to chinese"
```

#### 适合 agent 的用法

当 agent 需要把一段原始任务描述改写成更稳定、更可执行的 prompt 时，直接调用这个入口。

---

### 5.4 `skillforge-status.mjs`

这是只读状态工具。

#### help / 运行

```bash
node scripts/skillforge-status.mjs --help
```

如果当前版本没有专门 help 分支，直接执行即可输出状态报告：

```bash
node scripts/skillforge-status.mjs
```

#### 用途

- 查看 SkillForge 当前状态
- 作为 CI 或运行中心的只读状态输入
- 用于确认链路是否构造完整

#### 特点

- 不修改数据
- 输出偏“状态汇总”而不是“生成执行结果”

---

### 5.5 `validate:runtime:draft`

这是 runtime draft 验证入口。

#### 命令格式

```bash
pnpm validate:runtime:draft <fixture-path>
```

#### 示例

```bash
pnpm validate:runtime:draft fixtures/meeting-summary-assistant
```

#### 环境变量

在 `openai` mode 下需要：

```bash
OPENAI_API_KEY=...
```

#### 适合场景

- 验证 runtime draft 链路
- 采集更真实的运行时样本
- 对接 OpenClaw hook 时记录 fixture → runtime 结果

---

## 6. 给 Agent 的调用建议

### 6.1 默认规则

1. **优先用专用入口**，不要默认走总入口
2. 命令必须在仓库根目录执行
3. 优先保留原始输入文本，便于 hook 采样
4. 输出尽量按 stdout 原样保存，不要先丢字段再回传

### 6.2 推荐工作目录

```bash
/home/yankeeting/.openclaw/projects/workflow-kit
```

### 6.3 推荐命令模板

#### betterplan

```bash
node scripts/skillforge-operate-betterplan.mjs --plan "$INPUT" --goal-hint "$GOAL_HINT"
```

#### betterprompt

```bash
node scripts/skillforge-operate-betterprompt.mjs --prompt "$INPUT" --goal-hint "$GOAL_HINT"
```

#### status

```bash
node scripts/skillforge-status.mjs
```

#### runtime draft

```bash
OPENAI_API_KEY="$OPENAI_API_KEY" pnpm validate:runtime:draft "$FIXTURE"
```

---

## 7. OpenClaw 应该怎么 Hook

你的目标不是“能调用一次”，而是：

> **在 OpenClaw 里稳定采集大量真实调用数据。**

所以 hook 设计要优先考虑 **可观测性**，而不是花哨。

### 7.1 最小 hook 原则

对每一次 CLI 调用，至少采这几类数据：

1. **命令身份**
   - 命令名（betterplan / betterprompt / status / runtime-draft）
   - 工作目录
   - 调用时间

2. **输入**
   - 原始参数
   - 原始 stdin（如果有）
   - 关键环境变量是否存在（只记 presence，不直接泄漏密钥值）

3. **输出**
   - stdout
   - stderr
   - exit code

4. **执行元数据**
   - duration_ms
   - 是否调用 LLM
   - model / fallback / warnings（如果输出里有）

### 7.2 最适合的 hook 层级

如果你是直接在 OpenClaw 里接工具，**优先 hook 在 exec/tool 调用边界**，而不是去改 SkillForge 脚本内部。

原因：

- 不污染 SkillForge 本身逻辑
- 可以统一采样多个 CLI
- 后续更容易扩展到别的工具

### 7.3 建议的采样对象模型

建议把每次调用记录成一条统一样本：

```json
{
  "tool": "skillforge-cli",
  "subcommand": "betterplan",
  "cwd": "/home/yankeeting/.openclaw/projects/workflow-kit",
  "argv": ["node", "scripts/skillforge-operate-betterplan.mjs", "--plan", "..."],
  "stdin": null,
  "env_presence": {
    "OPENAI_API_KEY": false
  },
  "started_at": "2026-05-29T23:00:00.000Z",
  "duration_ms": 1234,
  "exit_code": 0,
  "stdout": "{...}",
  "stderr": "",
  "parsed": {
    "version": "betterplan.v1",
    "llmCalled": true,
    "model": "...",
    "fallbackUsed": false,
    "validationPassed": true
  }
}
```

### 7.4 推荐 hook 点

#### 方案 A：OpenClaw 工具层采样（推荐）

在 OpenClaw 对外暴露这个工具时，把真正执行命令的那一层包一下：

- 入参先记录
- 执行 CLI
- 收 stdout/stderr/exit code
- 尝试解析 JSON 输出
- 落一份调用样本

优点：

- 最稳
- 不侵入 SkillForge CLI 实现
- 对多个子命令统一

#### 方案 B：在脚本里手动埋点（不推荐作为首版）

直接改 `scripts/*.mjs`，在每个命令里手写采样逻辑。

问题：

- 很快会污染 CLI
- 后续命令一多，埋点会散
- 不利于统一治理

### 7.5 采样优先级建议

首批最值得采的命令：

1. `skillforge-operate-betterprompt.mjs`
2. `skillforge-operate-betterplan.mjs`
3. `validate:runtime:draft`
4. `skillforge-status.mjs`

原因：

- betterprompt / betterplan = 最核心的生成能力
- runtime draft = 最接近真实运行时样本
- status = 只读状态样本，适合作为对照组

---

## 8. 其他 Agent 的最小使用建议

如果你只是另一个 agent，想最小成本用起来：

### betterprompt

```bash
node scripts/skillforge-operate-betterprompt.mjs --prompt "你的原始任务描述"
```

### betterplan

```bash
node scripts/skillforge-operate-betterplan.mjs --plan "你的计划描述"
```

### 看状态

```bash
node scripts/skillforge-status.mjs
```

### 跑 runtime draft

```bash
pnpm validate:runtime:draft fixtures/meeting-summary-assistant
```

---

## 9. 首版接入时明确不要做什么

1. 不要把它包装成一个假的全局 npm CLI
2. 不要先去改 SkillForge 底层脚本做重埋点
3. 不要一上来做复杂 dashboard
4. 不要为了 hook 采样改动输出契约
5. 不要先做“最终完美形态”的多工具编排平台

首版最重要的是：

> **先把调用打通，先把真实样本采起来。**

---

## 10. 推荐给 OpenClaw 的接入落地顺序

### 第一步
先把这些命令作为工具能力稳定暴露：

- betterprompt
- betterplan
- status
- runtime draft

### 第二步
在 OpenClaw 工具执行边界统一采样：

- argv
- stdout/stderr
- exit code
- duration
- 关键字段解析

### 第三步
把采样结果沉淀成可回放样本：

- 成功样本
- 失败样本
- fallback 样本
- runtime 样本

### 第四步
后面再考虑：

- 风险审批
- 质量评分
- 自动回放
- 运行中心看板

---

## 11. 一句话版本

当前 **SkillForge CLI** 的真实形态是：

> **仓库内 Node 脚本 CLI，而不是独立 npm 包。**

对 agent 来说，正确做法是：

> **在 `workflow-kit` 根目录直接执行 `node scripts/*.mjs` / `pnpm <script>`。**

对 OpenClaw 来说，正确 hook 点是：

> **工具执行边界，而不是 SkillForge 脚本内部。**
