# SkillForge Roadmap

这份 roadmap 只描述当前重启后的最小主线。

当前唯一优先级：

- `betterPlan`
- `betterPrompt`
- `skill register`
- `log retention and review`

产品定义见 [docs/product-core.md](D:/Users/chany/Documents/SkillForge/docs/product-core.md)。

## Current State

当前仓库已经完成一次收敛式重构。

目标不再是继续扩展旧的 phase、治理、UI、审批或平台叙事，而是围绕 agent 的真实调用链打磨两个关键拦截器：

- `betterPlan`：拦在 `plan_write` 之后，做 plan review
- `betterPrompt`：拦在 `sessionSpawn` 之前，做动态 skill routing 和执行编译

当前要进入的下一阶段是：

- OpenClaw 不再只把 SkillForge 当成“测试调用但不消费结果”的旁路试运行
- SkillForge 的目标输出质量要提升到足以支撑日常真实调用
- 关注点从“有没有触发”切换为“输出是否值得被主流程日常依赖”

## Mainline

```text
User request
  -> leader agent
  -> plan_write
  -> betterPlan review
  -> task execution
  -> sessionSpawn boundary
  -> betterPrompt routing and compilation
  -> generic executor
  -> log retention and review
```

## Near-Term Goals

### 0. Graduate from tryout to production-quality output

目标：

- 把 OpenClaw 当前的非消费式试运行心智切换为质量导向心智
- 不再以“调用成功/失败不阻断主流程”作为主要成功标准
- 改为以 `betterPlan` / `betterPrompt` 的输出是否达到日常真实调用质量为主要成功标准

完成判断：

- `betterPlan` 的 review 对 leader agent 的日常计划质量有稳定帮助
- `betterPrompt` 的 compiled package 对下游执行方有稳定帮助
- 日志足以解释质量问题来自 review、retrieval、compilation 还是 execution
- 团队可以开始讨论“何时消费输出”，而不是继续停留在“是否触发”

### 1. Stabilize `betterPlan`

目标：

- 稳定 `plan_write` 阶段的 review 质量
- 明确 review 输出应该指出哪些结构问题
- 降低 plan 在进入执行前的歧义和缺口

完成判断：

- 同类 plan 能得到更一致的 review 反馈
- 任务粒度、依赖、约束、验收缺口能被稳定指出
- review 结果对 leader agent 真有修正价值

### 2. Stabilize `betterPrompt`

目标：

- 在 `sessionSpawn` 前接管固定 subagent 路由
- 动态匹配 skills
- 输出给通用 executor agent 的可执行 guidance

完成判断：

- 不依赖预定义 subagent 也能稳定产出执行包
- guidance 更少空话、更少步骤混淆
- 对真实 executor 的帮助强于原始 spawn prompt

### 3. Keep `skill register` useful

目标：

- 保持 skill 登记和检索入口可用
- 支撑 betterPrompt 的实时 routing
- 为 skill workflow signal 提供最小来源层

完成判断：

- 能稳定找到相关 skill
- 返回的 skill 信息对 routing 和 execution compilation 有实际帮助
- skill source 能被日志追溯

### 4. Make logs reviewable

目标：

- 留存真实任务调用链
- 能回看 leader agent 输入、plan review、skill 命中、compiled prompt 和执行结果
- 让后续迭代建立在真实样本上

完成判断：

- 至少能回看一次完整真实调用链
- 能定位失败更像是 plan、register 还是 prompt 的问题

## Non-Goals For Now

当前明确不做：

- 恢复旧 phase 体系
- 恢复大而全 Web 平台
- 恢复审批中心 / run center / 复杂治理系统
- 提前宣称自动化长期自优化能力
- 为了“完整”而恢复已收缩掉的历史设计
- 继续把 OpenClaw 只当成“无消费行为的测试调用”终点状态

## Recommended Working Order

1. 先定清 `betterPlan` review contract
2. 再定清 `betterPrompt` routing contract
3. 再根据 contract 调整 `skill register` 的最小 schema
4. 再用日志验证 routing 和 compiled execution 是否真的提升稳定性
