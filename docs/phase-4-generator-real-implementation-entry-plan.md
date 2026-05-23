# Phase 4 Generator Real-Implementation Entry Plan

> 这是一页承接入口复评，不是实现说明。它只回答：Phase 4 在 static-only / planning skeleton 已经具备什么、generator 真实实现还缺什么、现在是否适合进入真实实现承接、以及最小 implementation 切口是什么。
>
> 核心边界：**planning/static-only ≠ generator completed**。这里固化的是承接入口，不是把 Phase 4 写成已完成的生成器。

## 1. 已具备的 planning/static-only 事实

Phase 4 当前已经具备的事实基线如下：

- `docs/phase-4-planning-skeleton-v0.md` 已冻结 Phase 4 的最小输入契约、最小产物契约、依赖映射与 M4.1~M4.3 里程碑。
- `docs/phase-4-workflow-spec-input-contract.md` 已把 workflow/spec 输入侧的规划约束单独钉死。
- M4.1 已有实际落地点：`workflow-source` 最小 schema + 独立 contract tests，当前仍是 `schema-only / static contract freeze`。
- M4.2 已有静态样本：`meeting-summary-assistant` 存在 generated manifest 与 generated `SKILL.md`，并通过独立 contract test `PASS 13/13`，但这仍是 `static-only landing`。
- M4.3 已有独立 packaging contract reconcile：`scripts/test-packaging-contract-reconcile.mjs`，happy path fixture 为 `meeting-summary-assistant`，对账覆盖 `generated/skill-manifest.yaml`、`generated/skill/SKILL.md`、`validation-result.yaml`，结果 `PASS 16/16`。
- `docs/phase-4-closeout.md` 已明确 Phase 4 到达自然收口点：`static-only` / `contract-first` / `planning skeleton + sample landing`。
- `docs/roadmap.md` 已把 Phase 4 叙述收束为 planning skeleton + sample landing，并明确下一步优先切 Phase 5 planning skeleton / 规划拆解，而不是继续扩 static-only。

## 2. 仍未达成的 generator 真实实现目标

以下目标仍未完成，不能被写成 generator 已实现：

- 不能从任意 workflow 自动生成完整 skill 文件树。
- 还没有真实的 generator 实现面去承接 `workflow -> SkillSpec -> SkillManifest -> SKILL.md` 的端到端生产链路。
- 还没有真实的附属资源生成策略执行面，只存在 planning 级别的资源计划边界。
- 还没有生成后自动静态验证的真实执行闭环，只存在静态样本与独立 contract/reconcile 证据。
- 还没有可选 runtime replay 承接面；runtime 依然是后续阶段能力。
- 还没有 `GenerationRun` 的真实持久化/追踪链路。
- 还没有人工确认点的实现，只能在文档中要求外发、写文件、网络、隐私内容不得默认进入公开产物。
- 还没有达到“至少 3 个从不同 workflow 生成的 simple skill 静态通过”和“至少 1 个生成 skill 完成真实模型回放”这类生成器级退出条件。

## 3. 现在是否适合进入 generator 真实实现承接

**判断：适合进入承接，但只能以最小切口进入，不能直接进入全链路实现。**

理由很简单：

- planning skeleton 已经足够稳，输入契约、产物契约、依赖映射、边界和 closeout 口径都已经存在。
- M4.1 / M4.2 / M4.3 已提供静态证据，说明我们不是在空地上开工。
- 但 Phase 4 的文档已经明确到达自然收口点，再继续在 planning/static-only 里加深，只会把文档写成重复说明，而不是进入真实实现。
- 所以现在最合适的是：从文档承接入口切到 generator 真实实现的最小切口，而不是继续扩 Phase 4 的静态说明。

## 4. 推荐的最小 implementation 切口

最小切口建议是：**只做一个 simple skill 的生成链路承接，不做 UI / publish / runtime / registry。**

更具体的最小 executable chain 入口，已单独收束到 `docs/phase-4-generator-minimal-executable-chain-entry.md`：

1. 以现有 `workflow-source -> SkillSpec` 规划契约为入口。
2. 只承接最小生成目标：`SkillManifest + SKILL.md` skeleton。
3. 保持 simple skill 优先，默认不扩 standard / advanced。
4. 生成后只接最小静态验证，不把 runtime 作为默认门禁。
5. 产物只要求能追踪输入、生成版本、输出路径、验证结果。

这个切口的好处是：

- 最小、可控，不会一下子滑进 UI / publish / registry / runtime。
- 正好承接现有 planning skeleton，不会推翻已有文档。
- 能用最小实现验证 Phase 4 的真实价值：从 planning 走向 generator 的第一条可执行路径。

该切口的可执行任务骨架已单独收束到 `docs/phase-4-generator-implementation-task-breakdown.md`。

## 5. 如果暂时不进入真实实现，还需要先补什么

如果要继续保守一点，下一步至少要先补齐这些前置条件：

- 把 simple skill 的最小生成输入和输出边界再收紧一层，避免 generator 过度扩散。
- 固化生成 run 的命名、追踪和验证结果回写格式。
- 明确哪些字段只能保守留白，哪些字段必须生成。
- 继续防止把 static pass 误写成 runtime pass。

但从当前状态看，这些更像是 implementation 承接时的最小约束，不需要再拖一轮 planning 才能开始。

## 6. 非目标

本页明确不做以下事情：

- 不做 UI
- 不做 publish
- 不做 registry
- 不做完整 runtime
- 不做 full skill generation pipeline
- 不把 planning/static-only closeout 误写成 generator 完成
- 不把 sample landing 误写成端到端生产能力

## 7. 结论

Phase 4 现在已经具备足够的 planning/static-only 事实，可以进入 generator 真实实现承接。

但承接方式必须是：**最小 implementation 切口先行**，即只做 simple skill 的 `workflow/spec -> manifest/SKILL.md skeleton -> static validation` 这条线，不扩 UI / publish / registry / runtime。

这就是当前主计划最合适的下一步：先把 generator 从“规划能说清”推进到“最小链路能真正跑起来”。
