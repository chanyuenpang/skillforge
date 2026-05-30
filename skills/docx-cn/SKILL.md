---
name: docx-cn
version: 1.0.0
description: "Word 文档处理 | 创建、读取、编辑 Word 文档。支持 .docx 格式、格式化、表格、图片。触发词：Word、文档、docx。"
metadata:
  openclaw:
    emoji: "📄"
    priority: medium
    type: skill
---

# DOCX 文档处理

## 概述

.docx 文件是一个包含 XML 文件的 ZIP 压缩包。

## 快速参考

| 任务 | 方法 |
|------|------|
| 读取/分析内容 | `pandoc` 或解包查看原始 XML |
| 创建新文档 | 使用 `docx-js` |
| 编辑现有文档 | 解包 → 编辑 XML → 重新打包 |

## 读取内容

```bash
# 提取文本（包含修订跟踪）
pandoc --track-changes=all document.docx -o output.md

# 访问原始 XML
python scripts/office/unpack.py document.docx unpacked/
```

## 创建新文档

使用 JavaScript 生成 .docx 文件。安装：`npm install -g docx`

### 基本设置
```javascript
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
        Header, Footer, AlignmentType, PageOrientation, LevelFormat,
        TableOfContents, HeadingLevel, BorderStyle, WidthType, ShadingType,
        VerticalAlign, PageNumber, PageBreak } = require('docx');

const doc = new Document({ sections: [{ children: [/* 内容 */] }] });
Packer.toBuffer(doc).then(buffer => fs.writeFileSync("doc.docx", buffer));
```

### 验证
创建文件后验证。如果验证失败，解包、修复 XML、重新打包。
```bash
python scripts/office/validate.py doc.docx
```

### 页面尺寸

```javascript
// 关键：docx-js 默认 A4，不是 US Letter
// 始终明确设置页面尺寸以获得一致结果
sections: [{
  properties: {
    page: {
      size: {
        width: 12240,   // 8.5 英寸（DXA 单位）
        height: 15840   // 11 英寸（DXA 单位）
      },
      margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } // 1 英寸边距
    }
  },
  children: [/* 内容 */]
}]
```

**常用页面尺寸（DXA 单位，1440 DXA = 1 英寸）**：

| 纸张 | 宽度 | 高度 | 内容宽度（1 英寸边距） |
|------|------|------|------------------------|
| US Letter | 12,240 | 15,840 | 9,360 |
| A4（默认） | 11,906 | 16,838 | 9,026 |

### 样式（覆盖内置标题）

使用 Arial 作为默认字体。保持标题黑色以提高可读性。

```javascript
const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 24 } } }, // 12pt 默认
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial" },
        paragraph: { spacing: { before: 240, after: 240 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial" },
        paragraph: { spacing: { before: 180, after: 180 }, outlineLevel: 1 } },
    ]
  },
  sections: [{
    children: [
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("标题")] }),
    ]
  }]
});
```

### 列表（绝不使用 unicode 项目符号）

```javascript
// ❌ 错误 - 绝不手动插入项目符号字符
new Paragraph({ children: [new TextRun("• 项目")] })  // 错误

// ✅ 正确 - 使用编号配置
const doc = new Document({
  numbering: {
    config: [
      { reference: "bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbers",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ]
  },
  sections: [{
    children: [
      new Paragraph({ numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("项目符号项目")] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 },
        children: [new TextRun("编号项目")] }),
    ]
  }]
});
```

### 表格

**关键：表格需要双重宽度** - 在表格上设置 `columnWidths` 并在每个单元格上设置 `width`。

```javascript
const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };

new Table({
  width: { size: 9360, type: WidthType.DXA }, // 始终使用 DXA
  columnWidths: [4680, 4680], // 必须等于表格宽度
  rows: [
    new TableRow({
      children: [
        new TableCell({
          borders,
          width: { size: 4680, type: WidthType.DXA }, // 也在每个单元格上设置
          shading: { fill: "D5E8F0", type: ShadingType.CLEAR }, // CLEAR 不是 SOLID
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun("单元格")] })]
        })
      ]
    })
  ]
})
```

### 图片

```javascript
// 关键：type 参数是必需的
new Paragraph({
  children: [new ImageRun({
    type: "png", // 必需：png, jpg, jpeg, gif, bmp, svg
    data: fs.readFileSync("image.png"),
    transformation: { width: 200, height: 150 },
    altText: { title: "标题", description: "描述", name: "名称" } // 三个都必需
  })]
})
```

### 分页符

```javascript
// 关键：PageBreak 必须在 Paragraph 内
new Paragraph({ children: [new PageBreak()] })

// 或使用 pageBreakBefore
new Paragraph({ pageBreakBefore: true, children: [new TextRun("新页面")] })
```

### 页眉/页脚

```javascript
sections: [{
  properties: {
    page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } }
  },
  headers: {
    default: new Header({ children: [new Paragraph({ children: [new TextRun("页眉")] })] })
  },
  footers: {
    default: new Footer({ children: [new Paragraph({
      children: [new TextRun("页 "), new TextRun({ children: [PageNumber.CURRENT] })]
    })] })
  },
  children: [/* 内容 */]
}]
```

## 编辑现有文档

**按顺序执行所有 3 个步骤。**

### Step 1: 解包
```bash
python scripts/office/unpack.py document.docx unpacked/
```

### Step 2: 编辑 XML

编辑 `unpacked/word/` 中的文件。

**关键：对新内容使用智能引号。** 当添加带有撇号或引号的文本时，使用 XML 实体：

| 实体 | 字符 |
|------|------|
| `&#x2018;` | '（左单引号） |
| `&#x2019;` | '（右单引号/撇号） |
| `&#x201C;` | "（左双引号） |
| `&#x201D;` | "（右双引号） |

### Step 3: 打包
```bash
python scripts/office/pack.py unpacked/ output.docx --original document.docx
```

## docx-js 关键规则

- **明确设置页面尺寸** - docx-js 默认 A4；美国文档使用 US Letter (12240 x 15840 DXA)
- **绝不使用 `\n`** - 使用单独的 Paragraph 元素
- **绝不使用 unicode 项目符号** - 使用带编号配置的 `LevelFormat.BULLET`
- **PageBreak 必须在 Paragraph 内** - 独立创建无效 XML
- **ImageRun 需要 `type`** - 始终指定 png/jpg 等
- **始终用 DXA 设置表格 `width`** - 绝不使用 `WidthType.PERCENTAGE`
- **表格需要双重宽度** - `columnWidths` 数组和单元格 `width`，两者必须匹配
- **使用 `ShadingType.CLEAR`** - 绝不对表格着色使用 SOLID
- **TOC 仅需要 HeadingLevel** - 标题段落不使用自定义样式

## 依赖

- **pandoc**: 文本提取
- **docx**: `npm install -g docx`（新文档）
- **LibreOffice**: PDF 转换
- **Poppler**: `pdftoppm` 用于图片

## 相关 Skill

- `summarize` - 内容摘要
- `feishu-doc` - 飞书文档操作
