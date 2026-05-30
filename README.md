# SkillForge

SkillForge 当前是一个面向 agent execution 的最小 workflow compilation layer。

它现在只聚焦四个核心能力：

- `betterPlan`
- `betterPrompt`
- `skill register`
- `log retention and review`

项目已经从早期大而全叙事中收缩出来，当前不再把旧 phase、旧 UI、旧治理系统当作主线。

## Product Core

当前主链路：

```text
Real task input
  -> betterPlan
  -> skill register lookup
  -> betterPrompt
  -> execution
  -> log retention and review
```

目标分解链：

```text
Product Goal
  -> Milestone
  -> Atomic Task
  -> Skill-backed Execution Steps
```

更完整的产品定义见 [docs/product-core.md](D:/Users/chany/Documents/SkillForge/docs/product-core.md)。

## What This Repo Keeps

当前仓库主要保留：

1. `betterPlan` 的实现与验证入口
2. `betterPrompt` 的实现与验证入口
3. `skill register` 的代码入口
4. `log` 相关存储能力
5. 真实 task / skill 样本与最小验证资产

## Quick Start

### Prerequisites

- Node.js available in the shell
- pnpm available in the shell

### Install

```bash
pnpm install
```

## Main Commands

### Run `betterPlan`

```bash
pnpm betterplan -- --plan "在 godot 项目里执行一次 ingame test，并产出结构化报告"
```

或：

```bash
echo "计划内容" | pnpm betterplan
```

当前入口：

- [scripts/skillforge-operate-betterplan.mjs](D:/Users/chany/Documents/SkillForge/scripts/skillforge-operate-betterplan.mjs)
- [src/skillforge/betterplan-pipeline.mjs](D:/Users/chany/Documents/SkillForge/src/skillforge/betterplan-pipeline.mjs)

### Run `betterPrompt`

```bash
pnpm betterprompt -- --prompt "请根据当前任务生成可执行的子代理 guidance"
```

或：

```bash
echo "prompt 原文" | pnpm betterprompt
```

当前入口：

- [scripts/skillforge-operate-betterprompt.mjs](D:/Users/chany/Documents/SkillForge/scripts/skillforge-operate-betterprompt.mjs)
- [src/skillforge/betterprompt-builder.mjs](D:/Users/chany/Documents/SkillForge/src/skillforge/betterprompt-builder.mjs)

### Verification

```bash
pnpm test:betterplan
pnpm test:betterprompt
```

### OpenClaw Runtime Quota

如果你要通过 OpenClaw 的真实调用链路触发 `betterPlan` / `betterPrompt`，请先看额度配置文档：

- [docs/skillforge-runtime-quota-config.md](D:/Users/chany/Documents/SkillForge/docs/skillforge-runtime-quota-config.md)

### Provider Config

如果你要让这条主链路真正跑起来，还要配置 LLM provider。当前系统已经是 strict LM mode，没有 provider credentials 会直接失败。

- [docs/skillforge-provider-config.md](D:/Users/chany/Documents/SkillForge/docs/skillforge-provider-config.md)

仓库里还带了一个可直接拉下来的默认 provider 配置：
- [.skillforge/openclaw.json](D:/Users/chany/Documents/SkillForge/.skillforge/openclaw.json)

## Core Modules

### `betterPlan`

负责把真实任务整理成更稳定的 milestone / atomic task 结构。

主要文件：

- [src/skillforge/betterplan-pipeline.mjs](D:/Users/chany/Documents/SkillForge/src/skillforge/betterplan-pipeline.mjs)
- [src/skillforge/betterplan-contract.mjs](D:/Users/chany/Documents/SkillForge/src/skillforge/betterplan-contract.mjs)

### `betterPrompt`

负责把任务上下文和 skill 上下文编译成更可执行的 guidance。

主要文件：

- [src/skillforge/betterprompt-builder.mjs](D:/Users/chany/Documents/SkillForge/src/skillforge/betterprompt-builder.mjs)
- [src/skillforge/betterprompt-v1-contract.mjs](D:/Users/chany/Documents/SkillForge/src/skillforge/betterprompt-v1-contract.mjs)
- [src/skillforge/prompt-assembler.mjs](D:/Users/chany/Documents/SkillForge/src/skillforge/prompt-assembler.mjs)
- [src/skillforge/skill-resolver.mjs](D:/Users/chany/Documents/SkillForge/src/skillforge/skill-resolver.mjs)

### `skill register`

负责 skill 登记、扫描、解析和引用入口。

主要文件：

- [src/skillforge/registry-entry.mjs](D:/Users/chany/Documents/SkillForge/src/skillforge/registry-entry.mjs)
- [src/skillforge/registry-scan-pipeline.mjs](D:/Users/chany/Documents/SkillForge/src/skillforge/registry-scan-pipeline.mjs)
- [src/skillforge/registry-store.mjs](D:/Users/chany/Documents/SkillForge/src/skillforge/registry-store.mjs)

### `log retention and review`

负责保留真实调用过程中的 transcript 和 artifacts，供未来回看和迭代。

主要文件：

- [src/skillforge/transcript-store.mjs](D:/Users/chany/Documents/SkillForge/src/skillforge/transcript-store.mjs)
- [src/skillforge/raw-artifact-store.mjs](D:/Users/chany/Documents/SkillForge/src/skillforge/raw-artifact-store.mjs)

## Notes

- 当前仓库已经主动清理过时 phase 文档、旧 UI 和失效脚本。
- 如果后续继续重启或重构，请优先以 `docs/product-core.md` 和本 README 为准。
