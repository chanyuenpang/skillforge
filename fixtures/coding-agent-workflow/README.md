# Coding Agent Workflow Fixture

fixtureId: coding-agent-workflow
fixtureVersion: 0.1.0

这是一个最小化的 SkillForge 静态 fixture，用于验证“编码代理工作流”技能的边界、实现职责和验证闭环约束。

## 目标

- 负责代码实现、修复、重构与集成
- 保持实现、验证、审查职责分离
- 明确先收集信息、再规划、再实现、再验证的工作流

## 文件清单

- `workflow-source.yaml`：工作流源声明
- `skill-spec.yaml`：技能规格说明
- `generation-run.yaml`：静态生成记录
- `skill-manifest.yaml`：技能清单
- `replay-cases.yaml`：静态回放用例
- `validation-result.yaml`：静态验证结果占位
- `skill/SKILL.md`：技能正文与触发说明

## 取舍

本 fixture 只保留最小实现职责边界，不实现真实编码任务调度或复杂工具链集成。
