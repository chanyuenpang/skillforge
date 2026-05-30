---
name: workspace-organizer
version: 1.0.0
description: "工作空间整理 | 整理 workspace 根目录下的零碎文件，将技术文档放入 docs 文件夹，其余临时文件移动到 temp 文件夹。触发词：整理、workspace、整理文件。"
metadata:
  openclaw:
    emoji: "📦"
    priority: normal
    type: skill
---

# 工作空间整理

整理 OpenClaw workspace 根目录下的零碎文件，保持工作空间整洁。

## 需要保护的文件和目录

**框架文件（绝对不能动）**：

| 类型 | 文件/目录 | 说明 |
|------|-----------|------|
| 配置文件 | `AGENTS.md`, `SOUL.md`, `IDENTITY.md`, `USER.md`, `MEMORY.md`, `HEARTBEAT.md`, `TOOLS.md`, `BOOTSTRAP.md` | 核心配置文件 |
| 数据文件 | `shared.sqlite` | 主数据库文件，禁止移动 |
| 系统目录 | `.clawhub/`, `.git/`, `.knowledge/`, `.learnings/`, `.openclaw/` | 系统级目录 |
| 功能目录 | `config/`, `docs/`, `memory/`, `plans/`, `projects/`, `rules/`, `sessions/`, `skills/`, `specs/`, `status/` | 功能目录 |
| 代码目录 | `node_modules/`, `output/`, `venv/` | 代码依赖和输出 |
| 包管理文件 | `package.json`, `package-lock.json`, `.gitignore` | 项目配置文件 |

## 分类规则

### 技术文档 → docs/

以下文件类型移动到 `docs/` 目录：

| 类型 | 示例 | 说明 |
|------|------|------|
| Markdown 文档 | `*.md` | 技术文档、笔记、分析报告 |
| Office 文档 | `*.pptx`, `*.docx`, `*.xlsx` | 培训材料、报告 |
| PDF 文档 | `*.pdf` | 电子书、手册 |

### 临时文件 → temp/{data}/

以下文件类型移动到 `temp/{data}/` 目录：

| 类型 | 示例 | 说明 |
|------|------|------|
| 图片文件 | `*.png`, `*.jpg`, `*.jpeg`, `*.gif` | 测试图片、生成图片 |
| 脚本文件 | `*.py`, `*.sh`, `*.js` | 临时脚本 |
| 数据库临时文件 | `shared.sqlite.tmp-*` | 临时数据库 |
| 其他临时文件 | 其他不在上述分类的文件 | - |

## 工作流程

### 第一步：扫描文件

列出 workspace 根目录下的所有文件（不含目录）。

### 第二步：识别保护文件

识别并排除以下文件：
- 框架配置文件（见上方列表）
- 主数据库文件（shared.sqlite）

### 第三步：分类文件

对剩余文件进行分类：
- 技术文档 → docs/
- 临时文件 → temp/{data}/

### 第四步：生成整理计划

生成整理计划，列出：
1. **技术文档 → docs/**：列出将移动到 docs 的文件
2. **临时文件 → temp/{data}/**：列出将移动到 temp/{data}/ 的文件
3. **统计**：文件数量和总大小
4. **目标位置**：docs/ 和 temp/{data}/

### 第五步：用户审核

**必须**先将整理计划发给用户审核，确认后再执行。

### 第六步：执行整理

1. 确保 `docs/` 和 `temp/{data}/` 目录存在（{data} 为当前日期，如 2026-04-06）
2. 移动技术文档到 `docs/`
3. 移动临时文件到 `temp/{data}/`
4. 报告整理结果

## 整理计划模板

```markdown
## 整理计划

### 已保护的文件（不动）
- AGENTS.md, SOUL.md, IDENTITY.md, USER.md, MEMORY.md, HEARTBEAT.md, TOOLS.md, BOOTSTRAP.md
- shared.sqlite
- 目录：config/, docs/, memory/, plans/, projects/, rules/, sessions/, skills/, specs/, status/, node_modules/, output/, venv/, temp/

### 技术文档 → docs/
| 文件名 | 大小 |
|--------|------|
| xxx.md | 10KB |
| xxx.pptx | 100KB |

### 临时文件 → temp/{data}/
| 文件名 | 大小 |
|--------|------|
| xxx.png | 1MB |
| xxx.py | 5KB |

### 统计
- 技术文档：X 个，X MB
- 临时文件：X 个，X MB

### 确认
请确认以上计划，确认后我将执行整理。

### 目标目录结构
```
workspace/
├── docs/           # 技术文档
└── temp/
    └── {data}/     # 临时文件（按日期/批次组织）
```
```

## 注意事项

1. **先计划后执行** - 必须先发计划给用户审核
2. **保护框架文件** - 任何框架文件都不能动
3. **保护主数据库** - shared.sqlite 禁止移动，tmp 文件可以移动
4. **临时文件子目录** - 临时文件按日期放入 temp/{data}/ 子目录，避免覆盖
5. **报告结果** - 整理完成后报告移动了多少文件、释放了多少空间

## 最佳实践

1. 定期整理（建议每周一次）
2. 整理后检查 docs/ 和 temp/{data}/ 目录，适时清理

## 相关技能

- `executor` - 文件移动执行

## 变更历史

- **v1.0.0** (2026-03-30): 初始版本
- **v1.0.1** (2026-03-30): 添加 shared.sqlite 到保护列表
- **v1.0.2** (2026-03-30): 修正分类规则，技术文档 → docs/，临时文件 → temp/
- **v1.0.3** (2026-04-06): 临时文件移动到 temp/{data}/ 子目录，按日期组织
