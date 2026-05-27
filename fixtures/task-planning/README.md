# Task Planning Fixture

fixtureId: task-planning
fixtureVersion: 0.1.0

这是一个最小化的 SkillForge 静态 fixture，用于验证“任务规划”技能的边界、依赖识别与计划输出约束。

## 目标

- 识别复杂任务的边界、共享基础件与阻塞关系
- 输出结构化计划，避免把实现、验证、审查混在一个任务里
- 保持保守调度，不假设外部工具能力，先现场验证再派发

## 文件清单

- `workflow-source.yaml`：工作流源声明
- `skill-spec.yaml`：技能规格说明
- `generation-run.yaml`：静态生成记录
- `skill-manifest.yaml`：技能清单
- `replay-cases.yaml`：静态回放用例
- `validation-result.yaml`：静态验证结果占位
- `skill/SKILL.md`：技能正文与触发说明

## 取舍

本 fixture 只保留最小边界、风险点与计划结构，不实现真实的计划调度引擎或多轮重规划。
