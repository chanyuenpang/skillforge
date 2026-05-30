# ADR: SkillForge CLI 接入 OpenClaw 的安装、调用文档与 Hook 采样方案

## Status

accepted

## Context

这次接入不是只把 CLI 跑起来，而是要把它变成其他 agent 可复用的标准工具入口，并给 OpenClaw 留下明确的 hook 采样点。计划里已经确认：必须先现场验证安装方式、`--help`、运行方式，再沉淀面向 agent 的调用文档，最后明确 OpenClaw 如何在真实调用链路上采集数据。

长期上，这解决的是“工具能不能被其他 agent 稳定使用”和“OpenClaw 能不能从真实调用中拿到可靠样本”这两个问题。若只记录一次性接入步骤，而不把调用协议和采样位置固定下来，后续会反复出现入口分散、参数口径不一致、采样链路不清晰的问题。

## Decision

决定将 SkillForge CLI 的接入固定为“可复用调用文档 + 明确 Hook 采样点”的长期方案：

1. **CLI 先以现场验证过的方式作为标准入口**
   - 安装方式、版本检查、`--help` 和实际运行方式都以现场验证结果为准。
   - 不用记忆中的假设替代真实调用。
   - 只要 CLI 入口发生变化，就需要重新校验调用文档中对应部分。

2. **调用文档面向其他 agent，必须能直接照抄使用**
   - 文档必须明确安装、环境变量、命令格式、输入输出、典型调用样例、错误处理。
   - 文档目标不是人类阅读笔记，而是让其他 agent 能按文档直接执行。
   - 文档中必须保留可复用的调用锚点，避免只写概念不写命令。

3. **OpenClaw Hook 方案要明确真实采样位置**
   - 方案必须说明 OpenClaw 应该 hook 在调用链路的哪里采集真实数据。
   - 采样重点不是“知道有工具”，而是“能抓到真实调用过程与结果”。
   - Hook 方案要与 CLI 的真实入口绑定，避免脱离实际调用路径。

4. **验证以‘可执行 + 可读 help + 文档存在 + hook 落点明确’为准**
   - CLI 必须可执行。
   - 关键 help 必须可读。
   - 文档文件必须存在且可供其他 agent 使用。
   - Hook 方案必须有明确落点，而不是停留在抽象描述。

## Alternatives Considered

- **只写安装笔记，不写 agent 调用文档**：被拒绝。这样无法形成可复用入口。
- **只记录文档，不明确 hook 采样点**：被拒绝。OpenClaw 无法稳定采集真实调用数据。
- **把接入做成平台级重构**：被拒绝。此次任务的边界是工具接入与文档沉淀，不是重构整个工作流。
- **只凭记忆写文档，不做现场验证**：被拒绝。会让调用命令与实际 CLI 行为脱节。

## Related Code

| Path | Role |
| ---- | ---- |
| `docs/skillforge-cli-openclaw-hook-guide.md` | 面向其他 agent 的 CLI 调用与 Hook 说明文档。 |
| `plans/skillforge-cli-接入-openclaw-安装-调用文档与-hook-采样方案/plan.json` | 本次接入计划源记录。 |
| `docs/` | 工作流文档落点目录。 |
| `skills/` | 后续可复用的 agent 调用与接入说明沉淀目录。 |

## Consequences

- 正向：SkillForge CLI 变成可被其他 agent 直接复用的标准入口，不只是一次性接入。
- 正向：OpenClaw 有了明确的 Hook 采样位置，后续可以继续做真实调用数据采集。
- 正向：文档和实际 CLI 行为保持绑定，减少调用口径漂移。
- 取舍：文档需要随着 CLI 入口变化同步更新，维护成本会上升。
- 风险：如果后续 Hook 只停留在文档层、不落真实链路，采样价值会打折。
- 验证锚点：必须能验证 CLI 可执行、`--help` 可读、文档存在、Hook 落点明确。

## Search Terms

- `SkillForge CLI`
- `OpenClaw`
- `--help`
- `hook`
- `采样`
- `调用文档`
- `环境变量`
- `错误处理`
- `docs/skillforge-cli-openclaw-hook-guide.md`
