# ADR-0102: SkillForge Registry MVP 核心数据契约 v1

## 状态
已冻结（MVP 阶段）

## 背景
SkillForge 产品形态已收敛为：以 Skill Registry 为根资产层，betterWorkflow 负责宏观拆解，betterPrompt 负责微观展开，skill bundle 作为加速 reference 层，Run Center 保留原始 I/O 作为评估体系。Registry MVP 的最小链路为：`source -> scan -> artifact -> refresh -> index -> query`。需要一套最小数据契约支撑这条链。

## 决策
冻结以下四组最小 schema：

### 1. SkillSourceItem（来源层）
```json
{
  "sourceId": "string (必填) — 来源唯一 ID",
  "sourceType": "string (必填) — local_dir | git_repo",
  "location": "string (必填) — 来源路径或 URL",
  "enabled": "boolean (必填) — 是否参与扫描",
  "updatedAt": "string (可选) — 来源配置变更时间"
}
```

### 2. ScanArtifact（扫描产物层）
```json
{
  "artifactId": "string (必填) — 产物 ID",
  "sourceId": "string (必填) — 对应来源",
  "scanAt": "string (必填) — 扫描完成时间",
  "scannerVersion": "string (必填) — 扫描器版本",
  "items": [
    {
      "skillId": "string (必填) — 技能稳定 ID",
      "name": "string (必填) — 技能名",
      "description": "string (可选) — 简介",
      "entryPath": "string (必填) — 技能入口文件路径",
      "hash": "string (必填) — sha256 内容哈希"
    }
  ]
}
```

### 3. SkillIndexRecord（索引层）
```json
{
  "skillId": "string (必填) — 主键",
  "sourceId": "string (必填) — 来源归属",
  "name": "string (必填) — 显示名",
  "description": "string (可选) — 简介",
  "tags": "string[] (可选) — 标签",
  "entryPath": "string (必填) — 文件路径",
  "contentHash": "string (必填) — 内容哈希",
  "indexedAt": "string (必填) — 入索引时间",
  "status": "string (必填) — active | deleted"
}
```

### 4. RefreshDiff（刷新差异层）
```json
{
  "sourceId": "string (必填) — 差异所属来源",
  "fromArtifactId": "string (可选) — 基线产物",
  "toArtifactId": "string (必填) — 当前产物",
  "generatedAt": "string (必填) — 生成时间",
  "added": "string[] (必填) — 新增 skillId 列表",
  "updated": "string[] (必填) — 变化 skillId 列表",
  "removed": "string[] (必填) — 删除 skillId 列表"
}
```

## MVP 保守策略
- sourceType 控制为 1~2 种
- hash 仅用 sha256
- status 仅 active/deleted 两态
- 不做 AST/依赖图等重分析字段
- 不做向量/embedding 索引
- rename 按 remove+add 处理
- 先不加复杂鉴权/多分支配置

## 影响范围
- 子计划 Task 2-6（Source Adapter、Scan、Refresh、Index、Query、E2E）
- 后续 betterWorkflow/betterPrompt 的 skill 材料来源

## 关联
- 主计划：SkillForge 产品形态完整落地里程碑规划
- 子计划：Skill Registry 最小可用链
