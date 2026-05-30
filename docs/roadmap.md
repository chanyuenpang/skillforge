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

目标不再是继续扩展旧的 phase、治理、UI、审批或平台叙事，而是围绕真实任务调用链打磨一个更可执行的 workflow compilation layer。

## Mainline

```text
Real task input
  -> betterPlan
  -> skill register lookup
  -> betterPrompt
  -> execution
  -> log retention and review
```

## Near-Term Goals

### 1. Stabilize `betterPlan`

目标：

- 稳定 milestone / atomic task 拆解质量
- 让输出更适合后续 skill grounding
- 降低同类任务的计划结构漂移

完成判断：

- 同类任务得到更接近的结构
- 原子任务边界更清晰
- 约束和完成标准不会频繁丢失

### 2. Stabilize `betterPrompt`

目标：

- 基于任务和 skill 上下文生成更可执行 guidance
- 降低 subagent 走一步看一步
- 提高步骤和输出格式一致性

完成判断：

- guidance 更少空话
- 结构更稳定
- 对真实任务的帮助强于直接裸 prompt

### 3. Keep `skill register` useful

目标：

- 保持 skill 登记和检索入口可用
- 支撑 betterPrompt 的实时 skill 参考
- 为后续 workflow extraction 留好来源层

完成判断：

- 能稳定找到相关 skill
- 返回的 skill 信息对 prompt grounding 有实际帮助
- skill source 能被日志追溯

### 4. Make logs reviewable

目标：

- 留存真实任务调用链
- 能回看输入、计划、skill 命中、prompt 产物和执行结果
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

## Recommended Working Order

1. 先用真实任务持续打 `betterPlan`
2. 再观察 `betterPrompt` 对执行稳定性的影响
3. 再根据日志调整 `skill register` 的检索质量
4. 最后才决定是否需要补新的 UI 或治理层
