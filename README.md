# SkillForge

SkillForge 已经从早期静态 MVP，推进到一个**最小但真实可用的产品原型**。

它现在不只是“校验 fixture 的静态工具”，而是已经具备：

- 持久化状态层
- 真实 provider replay 入口
- 最小 Web UI 产品面
- registry 分发 / install / rollback / 最小协作可见

![Status: Product Prototype](https://img.shields.io/badge/status-Product%20Prototype-blue)
![Surface: Web UI + CLI](https://img.shields.io/badge/surface-Web%20UI%20%2B%20CLI-brightgreen)
![Distribution: minimal closed loop](https://img.shields.io/badge/distribution-minimal%20closed%20loop-success)

## What SkillForge is now

SkillForge 的当前定位是：

> **把可复用 workflow experience 变成可验证、可回放、可分发、可恢复的 AI skill 产品原型。**

当前仓库已经具备一条真实但克制的产品链：

1. **生成 / 校验底座**：保留原有 fixture、contracts、static validation 能力
2. **状态持久化**：registry / review / prep / transcript / execution log / recovery checkpoint
3. **运行与 replay**：支持最小真实 provider replay 入口
4. **产品面**：Web UI 可触发、可浏览、可看历史
5. **分发能力**：publish / list / detail / install / versions / rollback
6. **最小协作证据**：publish 可写 reviewer / approver，list / versions 可读真值

## Current product status

按当前 roadmap 的四个后半程能力域，当前状态是：

- ✅ **Phase 14 — Persistent State Layer**
- ✅ **Phase 15 — Real Provider Replay**
- ✅ **Phase 16 — Web UI Surface**
- ✅ **Phase 17 — Distribution & Collaboration**

这意味着当前仓库已经达到：

> **最小但真实可用的产品完整落地**

不是“大而全平台”，但已经不是只会输出静态 JSON 的 demo。

---

## Quick start

### Prerequisites

- Node.js available in the shell
- pnpm available in the shell
- Run commands from the repository root

```bash
cd /home/yankeeting/.openclaw/projects/workflow-kit
pnpm install
```

---

## Start the Web UI

启动最小产品面：

```bash
node scripts/skillforge-web-ui.mjs
```

正常会看到：

```text
SkillForge Web UI listening on http://127.0.0.1:4173
```

然后打开：

```text
http://127.0.0.1:4173
```

### Web UI currently provides

- `/`：首页，最小操作入口（replay / operate）
- `/history`：execution log 历史列表
- `/transcripts`：transcript 历史列表
- `/registry`：registry / versions / reviewer / approver 的可见入口
- `/api/status`：状态快照

---

## Core usage flows

### 1) Trigger replay

可通过首页入口触发，也可直接用脚本：

```bash
node scripts/run-runtime-draft.mjs fixtures/release-notes-assistant --mode dry-run
```

如果要走最小真实 provider 路径：

```bash
export OPENAI_API_KEY=your_key
node scripts/run-runtime-draft.mjs fixtures/release-notes-assistant --mode openai
```

说明：

- 有 `OPENAI_API_KEY` → 走真实 provider 请求
- 没有 `OPENAI_API_KEY` → 诚实失败，不伪装成功

---

### 2) Trigger operator flow

```bash
node scripts/skillforge-operate.mjs
```

这条链会写 execution log，并能被 Web UI / status 面观察到。

---

### 3) Check status

```bash
node scripts/skillforge-status.mjs
```

它会输出当前产品状态，包括：

- Registry Store
- Review / Prep
- Recovery Checkpoint
- Transcript Store
- Execution Log

也可以直接请求：

```bash
curl http://127.0.0.1:4173/api/status
```

---

### 4) Publish a registry entry

```bash
curl -X POST http://127.0.0.1:4173/api/registry/publish \
  -H 'content-type: application/json' \
  -d '{
    "fixtureId":"demo-v1",
    "version":"0.1.0",
    "reviewStatus":"approved",
    "reviewDecision":"approve",
    "reviewUpdatedAt":"2026-05-24T00:00:00.000Z",
    "reviewer":"alice",
    "approver":"bob",
    "evidenceRefs":["demo-e1"],
    "sourceLinks":["https://example.invalid/demo"]
  }'
```

这会把一条最小 registry-entry 写入持久化 store，并带上最小协作元数据。

---

### 5) Browse registry and versions

#### Global versions list

```bash
curl http://127.0.0.1:4173/api/registry/versions
```

#### Versions for one fixture

```bash
curl http://127.0.0.1:4173/api/registry/skills/demo-v1/versions
```

#### Single version detail

```bash
curl http://127.0.0.1:4173/api/registry/skills/demo-v1/versions/0.1.0
```

当前最小协作证据层已接上：

- publish 可写 `reviewer` / `approver`
- list / versions 可读 reviewer / approver 真值

---

### 6) Install a skill

```bash
curl -X POST http://127.0.0.1:4173/api/install \
  -H 'content-type: application/json' \
  -d '{
    "fixtureId":"demo-v1",
    "version":"0.1.0"
  }'
```

也可直接走最小安装脚本：

```bash
node scripts/install-skill.mjs demo-v1 0.1.0
```

---

### 7) Roll back / recover

```bash
curl -X POST http://127.0.0.1:4173/api/registry/skills/rollback \
  -H 'content-type: application/json' \
  -d '{
    "fixtureId":"demo-v1"
  }'
```

然后再看版本：

```bash
curl http://127.0.0.1:4173/api/registry/skills/demo-v1/versions
```

当前回退后可观察到的典型字段包括：

- `restoredFromVersion`
- `restoredAt`
- `recoveryMeta`

这意味着当前产品已经不是“只能发布”，而是具备最小恢复闭环。

---

## Persistence locations

当前最重要的持久化数据会落在用户目录下的 `.skillforge/`：

- `~/.skillforge/registry-store.jsonl`
- `~/.skillforge/transcript-store.jsonl`
- `~/.skillforge/execution-log.jsonl`

此外还有 review / prep / recovery 相关状态文件，由对应模块维护。

---

## Validation and testing

虽然产品已经不再局限于静态 MVP，但原有静态校验与 contract 校验仍保留，适合作为回归基线。

### Static fixture validation

```bash
pnpm --silent validate
```

### Multi-fixture validation

```bash
pnpm --silent validate:fixtures
```

### Aggregate validation gate

```bash
pnpm --silent validate:all
```

### Runtime/provider contract checks

```bash
node scripts/test-runtime-contracts.mjs
node scripts/verify-provider-adapter.mjs
```

### Store / operator / web surface checks

```bash
node scripts/test-registry-store.mjs
node scripts/test-review-and-prep-store.mjs
node scripts/test-recovery-checkpoint.mjs
node scripts/test-skillforge-operate.mjs
node scripts/test-skillforge-transcript-store.mjs
node scripts/test-skillforge-execution-log-store.mjs
```

---

## Repository layout

```text
workflow-kit/
├── README.md
├── package.json
├── fixtures/
├── docs/
├── scripts/
│   ├── run-runtime-draft.mjs
│   ├── install-skill.mjs
│   ├── skillforge-operate.mjs
│   ├── skillforge-status.mjs
│   ├── skillforge-release.mjs
│   ├── skillforge-smoke-gate.mjs
│   ├── skillforge-web-ui.mjs
│   └── test-*.mjs
└── src/
    └── skillforge/
        ├── registry-entry.mjs
        ├── registry-store.mjs
        ├── review-store.mjs
        ├── prep-store.mjs
        ├── transcript-store.mjs
        ├── execution-log-store.mjs
        ├── recovery-checkpoint.mjs
        ├── runtime-provider-openai-adapter.mjs
        ├── runtime-runner*.mjs
        └── generator-*.mjs
```

---

## What this product now proves

当前仓库已经能真实证明这些事：

- SkillForge 不只是静态 fixture validator
- SkillForge 已具备最小持久化状态层
- SkillForge 已具备最小真实 provider replay 入口
- SkillForge 已具备最小 Web UI 产品面
- SkillForge 已具备最小 distribution & collaboration 闭环

换句话说：

> **它已经是一个最小但真实可用的产品原型。**

---

## Boundaries / non-goals

当前版本仍然**刻意克制**，还不是一个“大而全平台”：

- 不是完整审批工作台
- 不是完整权限系统
- 不是复杂 semver / 版本治理平台
- 不是大规模多租户分发平台
- 不是全自动外部发布 SaaS

当前完成的是：

> **最小真实产品闭环**，而不是最终形态的全功能平台。

---

## Suggested first-time workflow

如果你第一次使用当前产品，建议按这个顺序：

1. 启动 Web UI
2. 打开 `/` 首页
3. 先用 dry-run 触发 replay
4. 看 `/history` 和 `/transcripts`
5. 调 `publish` API 生成 registry entry
6. 看 `/api/registry/versions`
7. 调 `install` API
8. 再调 `rollback` API 验证恢复

这条线能最快把当前产品的最小闭环全部走一遍。

---

## Related docs

- `docs/roadmap.md`
- `docs/acceptance-result.md`
- `docs/runtime-replay-protocol-lightweight-design.md`
- `.claw/truth/SUMMARY.md`
- `.claw/truth/adr/ADR-0041-skillforge-phase-17-distribution-and-collaboration-minimal-closed-loop.md`

---

## Development notes

开发与扩展时请继续遵守这些原则：

- 先让真实最小链路成立，再扩功能
- 所有新能力都尽量走可验证、可观察路径
- 不把“字段壳”当成功能完成
- 不把“数据层可写”误当成“产品链路可用”
- 必须优先用真实 curl / 脚本 / 页面行为做端到端验真

SkillForge 现在最重要的资产，不是功能数量，
而是：

> **每一条对外声称的能力，都已经有最小真实证据。**
