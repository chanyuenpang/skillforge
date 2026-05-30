# 飞书颜色强调使用说明

适用场景：在当前回复 / Feishu markdown 中，用颜色突出重点信息。

## 已验证可用写法
```html
<font color=red>红色测试</font>
```

要点：
- `color=` 后面直接写值，不要加双引号
- 当前通道已验证可用的颜色枚举值包括：`red`、`blue`、`blue-500`、`blue-600`、`wathet-500`

示例：
```html
<font color=blue>普通蓝色强调</font>
<font color=blue-500>蓝色 500 强调</font>
<font color=blue-600>蓝色 600 强调</font>
<font color=wathet-500>浅蓝强调</font>
```

## 使用建议
- 优先用颜色强调关键信息、结论、风险提示
- 不建议为了占位或分段去写空标题，直接对重点句子上色更清楚
- 同一段里不要滥用多种颜色，避免信息噪音

## 不建议作为首选的写法
- `#007ACC` 这类 hex 颜色：当前通道下不稳定 / 未确认
- `rgba(...)`：当前通道下不稳定 / 未确认

结论：优先使用已验证的枚举值，不要优先尝试 hex 或 rgba。
