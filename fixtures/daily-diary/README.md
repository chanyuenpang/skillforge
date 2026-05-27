# Daily Diary Fixture

fixtureId: daily-diary
fixtureVersion: 0.1.0

这是一个最小化的 SkillForge 静态 fixture，用于验证“日常日记”技能的基础结构与触发约束。

## 目标

- 记录用户直接提供的日常想法到日记 JSON
- 支持“补充一下”追加到当天最后一条记录
- 保持保守权限边界，不读取私有材料、不外发

## 文件清单

- `workflow-source.yaml`：工作流源声明
- `skill-spec.yaml`：技能规格说明
- `generation-run.yaml`：静态生成记录
- `skill-manifest.yaml`：技能清单
- `replay-cases.yaml`：静态回放用例
- `validation-result.yaml`：静态验证结果占位
- `skill/SKILL.md`：技能正文与触发说明

## 取舍

本 fixture 只做最小必要映射，不实现真实的日记写入流程，也不补充扩展模板或额外派生文件。
