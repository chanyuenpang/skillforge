---
name: memory-processor-workflow
version: 0.1.0
description: "当用户要求处理单一来源 MEMORY.md 并执行记忆下沉到 knowledge（含去重、回写、Top30 收敛）时使用此技能。"
metadata:
  fixtureId: memory-processor-workflow
  fixtureVersion: 0.1.0
  language: zh-CN
  permissions:
    network: false
    externalSend: false
    fileRead: true
    fileWrite: false
    destructiveOperations: false
    privatePathRead: false
---

# memory-processor-workflow

## 使用场景

当系统需要处理单一来源的 `MEMORY.md` 时，逐条处理其中的 MEMORY 表格条目，将记忆下沉到知识库，并按 Top30 规则收敛回写。

## 输入要求

- 必须提供 `source`
- 必须提供当前来源的 `MEMORY.md` 路径或内容
- 只处理当前来源，不扫描其他来源
- 只处理 MEMORY 表格条目

## 输出格式

请输出结构化处理结果，包含：

1. **source**：来源标识
2. **success**：是否成功
3. **processed_count**：处理的记忆条目数
4. **created**：新建的 knowledge 文件或条目
5. **merged**：合并的已有 knowledge 与 count 变化
6. **failure_reason**：失败原因（成功时可为空）

## 允许操作

- 读取当前来源的 `MEMORY.md`
- 逐条识别 MEMORY 表格中的每一条记忆
- 判断每条记忆的 scope
- 按 scope 写入对应 knowledge 存储位置
- 对当前条目做语义去重匹配与更新
- 对重复条目执行 count 累加、更新时间更新、必要时跨月移动
- 在处理完成后移除 `count=1` 的已下沉条目，并按 Top30 规则收敛 MEMORY

## 权限边界

默认保守：

- 不联网
- 不外发
- 可以读取当前来源 MEMORY.md
- 可以写入 knowledge 与回写 MEMORY.md 的最小变更
- 不做删除、覆盖、配置修改等破坏性操作
- 不扫描其他来源 MEMORY
- 不做整份摘要替代逐条处理
- 不推断、拼接或扩展到来源之外的记忆

## 最小处理规则

- 只处理单一来源
- 只读取 MEMORY 表格，不读其他私有材料
- 逐条处理，禁止合并成主题摘要后再写入
- count=1 必须全量下沉到 knowledge
- MEMORY 只保留 Top30 高频条目
- 保留项 count 必须 >= 2
- 去重优先合并，不新增同语义碎片
- 项目级记忆写入对应项目 `.knowledge/`，全局记忆写入 workspace `.knowledge/`

## 静态检查清单

- structure：包含 frontmatter、输入、输出与边界说明。
- trigger：支持 memory processor / MEMORY.md / 记忆下沉 / knowledge / Top30 语义。
- boundary：明确单一来源、逐条处理、禁止摘要替代、禁止跨来源扫描。
- dependency：无外部服务依赖。
- privacy：仅允许处理当前来源 MEMORY.md，不扩展到其他私有材料。
- compatibility：适配静态 fixture 验证，内容最小且可解析。
- replay：提供 replay-cases.yaml 作为静态回放用例。
