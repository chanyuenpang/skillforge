# Browser Agent Workflow Fixture

fixtureId: browser-agent-workflow
fixtureVersion: 0.1.0

这是一个最小化的 SkillForge 静态 fixture，用于验证“浏览器代理工作流”技能的边界、脚本优先和真实浏览器验证约束。

## 目标

- 验证 Web 应用端到端流程与 UI 交互
- 强调脚本/DOM 探测优先，snapshot 仅兜底
- 明确 BrowserOS MCP 隔离边界与失败两次即停止重试规则

## 文件清单

- `workflow-source.yaml`：工作流源声明
- `skill-spec.yaml`：技能规格说明
- `generation-run.yaml`：静态生成记录
- `skill-manifest.yaml`：技能清单
- `replay-cases.yaml`：静态回放用例
- `validation-result.yaml`：静态验证结果占位
- `skill/SKILL.md`：技能正文与触发说明

## 取舍

本 fixture 只保留最小验证约束，不实现真实浏览器自动化编排或截图产物管理。
