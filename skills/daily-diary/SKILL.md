---
name: daily-diary
version: 1.0.0
description: "日常日记技能 | 记录日常想法到日记文件夹。触发词：记一下、一个想法、帮我记、补充一下。当用户说这些触发词时，需要认真听并把内容记录到 workspace/diary/YYYY-MM/ 目录的 JSON 文件中，同时添加点评、时间和标签。"
metadata:
  openclaw:
    emoji: "📔"
    priority: high
    type: skill
---

# Daily Diary - 日常日记技能

## 触发词
- 记一下
- 一个想法
- 帮我记
- 补充一下

## 功能说明
当用户使用触发词时，需要：
1. 认真听取用户的原始内容
2. 将内容原文记录到日记 JSON 文件
3. 添加小龙虾的点评
4. 添加时间戳
5. 添加标签（最多3个）

## 可用标签
- #日常
- #创意想法
- #非正经修仙（tiny world 项目）
- #龙虾改造（OpenClaw 本体改进）
- #龙虾游戏（theclawgame 项目）
- #游戏
- #家人
- #工作

## 补充功能（针对"补充一下"触发词）

当用户说"补充一下"时：
1. 读取当天的 JSON 文件
2. 找到最后一条记录（最后一条 entries）
3. 在该记录的 supplements 数组中添加新内容
4. 同时更新 lobster_comment（可以是对补充内容的点评，或者保留原点评）

补充格式：
```json
"supplements": [
  {
    "datetime": "YYYY-MM-DD HH:MM",
    "content": "补充内容"
  }
]
```

## 记录格式
JSON 格式，存储在 `workspace/diary/YYYY-MM/YYYY-MM-DD.json`

```json
{
  "month": "YYYY-MM",
  "entries": [
    {
      "id": "DIARY-YYYYMMDD-序号",
      "datetime": "YYYY-MM-DD HH:MM",
      "original_content": "用户原始内容",
      "content": "精炼后的内容",
      "tags": ["#标签1", "#标签2"],
      "lobster_comment": "小龙虾的点评",
      "supplements": []
    }
  ]
}
```

## 操作流程
1. 用户说触发词时，监听完整内容
2. 解析内容并确定标签（最多3个）
3. 读取当天的 JSON 文件（若不存在则创建）
4. 添加新条目，ID 自增
5. 写入文件

## 文件位置
- 基础路径：`workspace/diary/`
- 每月目录：`workspace/diary/YYYY-MM/`
- 日记文件：`workspace/diary/YYYY-MM/YYYY-MM-DD.json`
