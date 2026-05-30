# ERRORS.md - 错误记录

## 记录格式

```markdown
## [ERR-YYYYMMDD-XXX] 错误描述

**Logged**: YYYY-MM-DDTHH:MM:SSZ
**Priority**: high | medium | low
**Status**: pending | resolved | wont_fix
**Area**: selector | network | anti-crawl | structure

### Summary
简要描述什么失败了

### Error
```
实际的错误信息或输出
```

### Context
- 尝试的操作
- 使用的输入或参数
- 相关环境信息

### Suggested Fix
如果可能，如何解决

### Metadata
- Reproducible: yes | no | unknown
- Related Target: 网站名

---
```