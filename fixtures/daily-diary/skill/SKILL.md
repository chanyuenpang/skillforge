---
name: daily-diary
version: 0.1.0
description: "日常日记技能：当用户说‘记一下’、‘一个想法’、‘帮我记’或‘补充一下’时，帮助把用户直接提供的内容记录到日记 JSON 文件中，并支持补充上一条记录。"
metadata:
  fixtureId: daily-diary
  fixtureVersion: 0.1.0
  language: zh-CN
  permissions:
    network: false
    externalSend: false
    fileWrite: true
    destructiveOperations: false
    privatePathRead: false
---

# 日常日记技能

## 使用场景

当用户说“记一下”“一个想法”“帮我记”或“补充一下”时，记录用户直接提供的内容到日记 JSON 文件；如为“补充一下”，则追加到当天最后一条记录。

## 输入要求

- 用户直接说出的日常想法或补充内容
- 可选提供时间、日期、上下文
- 不要求、不读取、不推断任何私有文件、真实联系人、私有链接或凭证

## 输出格式

请输出结构化 JSON 日记记录，包含：

1. **month**：`YYYY-MM`
2. **entries**：日记条目数组
3. **id**：形如 `DIARY-YYYYMMDD-序号`
4. **datetime**：`YYYY-MM-DD HH:MM`
5. **original_content**：用户原始内容
6. **content**：精炼后的内容
7. **tags**：最多 3 个标签，且来自允许集合
8. **lobster_comment**：小龙虾点评
9. **supplements**：补充内容数组

补充格式：

```json
{
  "datetime": "YYYY-MM-DD HH:MM",
  "content": "补充内容"
}
```

## 允许标签

- #日常
- #创意想法
- #非正经修仙
- #龙虾改造
- #龙虾游戏
- #游戏
- #家人
- #工作

## 权限边界

默认保守：

- 不联网
- 不外发
- 可以写入日记文件
- 不做删除、覆盖、配置修改等破坏性操作
- 不读取私有路径或本地敏感材料
- 不生成或猜测真实联系人、真实链接、密钥、凭证

如果用户请求读取私有材料、外发日记或补全敏感信息，应拒绝该部分请求，并只记录用户直接提供的可公开处理内容。

## 静态检查清单

- structure：技能包含 frontmatter、触发说明、输入输出与边界。
- trigger：中文触发词包括记一下、一个想法、帮我记、补充一下。
- boundary：权限边界保守且明确拒绝副作用。
- dependency：无外部服务、无私有数据源依赖。
- replay：配套 replay-cases.yaml 仅设计用例，不伪造运行结果。
- privacy：仅处理用户直接提供的内容，拒绝敏感信息。
- compatibility：Markdown 正文与 YAML frontmatter 可被静态 MVP 解析。
