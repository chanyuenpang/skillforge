# Phase 4 Generator Minimal Executable Chain Entry

> 这是 Phase 4 的**最小可执行链路入口**,不是 generator 已实现完成的声明。
>
> 这页只负责把"generator 真实实现"的第一刀压到最窄:先定义最小 executable chain 的推荐切口、首批子任务顺序、必须固定的输入输出对象,以及明确排除项。它只承接 docs/planning,不进入代码。

## 1. 这一刀要解决什么

Phase 4 现在最需要的,不是把生成器一下子做满,而是先把**最小真实实现链路**钉死:

```text
workflow/spec input
  -> SkillSpec
  -> SkillManifest
  -> SKILL.md skeleton
  -> minimal static validation
  -> generation run record
```

这个链路的目标是让 generator 从"规划里能说"变成"最小路径上能跑",但仍然只是最小实现入口,不代表 full pipeline 已完成。

## 2. 推荐切口:minimal executable chain

推荐切口是:**simple skill 的单条生成链路**。

优先级按这个顺序收:

1. **固定单一输入源**
   只选一个最小 workflow/spec 输入样本作为 generator 首刀承接对象,避免一开始就进入多输入、多 profile、多模板分流。

2. **固定单一产物骨架**
   第一刀只要求产出 `SkillSpec`、`SkillManifest`、`SKILL.md` skeleton,不扩附属资源生成、不扩 UI 产物。

3. **固定单一校验落点**
   生成后只接最小静态验证与结果回写,不把 runtime replay、review gate、publish 门禁塞进来。

4. **固定单一追踪链路**
   产物只需要能追踪输入、生成版本、输出路径、验证结果,先把最小可审计链路做实。

## 3. 第一批最小子任务骨架(按顺序)

建议按下面顺序推进:

1. **锁定首个 generator 承接输入**
   选定一个最小、稳定、可复核的 workflow/spec 输入样本,作为 Phase 4 第一刀的起点。

2. **冻结最小输入 -> SkillSpec 映射**
   明确哪些输入字段进入 `SkillSpec`,哪些字段不进入,避免把规划口径扩成通用抽取器。

3. **冻结最小 SkillSpec -> SkillManifest 映射**
   只承接最小 manifest 字段集,先把 entry / files / dependencies / permissions / compatibility 的必要骨架定住。

4. **冻结最小 SKILL.md skeleton**
   先生成最小 frontmatter、description、边界、检查清单与流程骨架,不把完整内容生产当成第一刀目标。

5. **冻结最小验证回写**
   让生成结果能回写静态验证结论、版本信息与路径信息,但不进入 runtime 或 review 流程。

6. **做最小边界审计**
   反查有没有悄悄滑进 multi-workflow、multi-skill、UI、publish、registry、runtime。

## 4. 第一刀必须固定的输入 / 输出对象

### 必须固定的输入对象

第一刀至少要固定这些输入对象的边界:

- `workflow` / `workflow-source`:generator 的原始输入来源
- `SkillSpec`:承接目标、触发、输入输出、约束、成功标准的规格层
- `generation context`:生成时所需的最小上下文,但不扩成任意外部依赖注入
- `profile / mode`:只允许最小的 simple 生成模式,不把 standard / advanced 一次性拉满

### 必须固定的输出对象

第一刀至少要固定这些输出对象的边界:

- `SkillManifest`
- `SKILL.md` skeleton
- `generation run record`
- `static validation result`

### 第一刀必须明确的保守字段

以下内容必须在最小链路里明确哪些是固定、哪些是留白、哪些是 pending:

- 输入里的隐私与权限边界:不能默认放宽
- 输出里的附属资源:第一刀可以不生成,但必须明确为 deliberate omission,而不是遗忘
- 验证结果:必须能标记 static pass / pending / fail 的最小状态
- 运行记录:必须能追踪输入、模板/版本、产物路径、验证结果

## 5. 明确排除的方向

这一刀明确排除:

- **全量 workflow 支持**:不做任意 workflow 的完整通用生成器
- **UI**:不做可视化编排、预览、审核界面
- **publish**:不做发布链路、不做分发、不做版本投递
- **registry**:不做注册表写入、不做团队空间同步
- **runtime 全链路**:不把真实 replay、scoring、sandbox、transcript 体系塞进第一刀
- **multi-skill / multi-profile 批处理**:不做批量生成与批量编排
- **端到端大一统**:不把 Phase 4 一口气写成生成器 + 验证器 + runtime + publish 的总工程

## 6. 为什么要先压成 docs-level 入口

因为 Phase 4 当前最危险的,不是"没有方向",而是"方向太大,容易一口气扩成全链路"。

先把入口压成 docs-level 最小链路,有三个好处:

1. **把范围锁死**:先固定 simple 生成链路,避免实现时范围漂移。
2. **把子任务排好序**:后续推进可以一刀一刀切,不会乱成一锅。
3. **把误宣称挡住**:避免把 sample landing、planning skeleton 或 static-only 误写成 generator completed。

## 7. 结论

Phase 4 的当前最合适下一步，是先把 generator 的**最小可执行链路入口**立起来。

这不等于 generator 已实现，也不等于 full pipeline 已完成；它只是把"第一刀从哪里切、先切什么、绝对不切什么"写清楚，方便后续真正进入最小实现。

## 8. 执行清单

本入口对应的可执行任务骨架已单独收束到 `docs/phase-4-generator-implementation-task-breakdown.md`，包含：

- G1-G6 按顺序排列的可执行子任务
- 每个子任务的目标、边界、依赖
- 串行/并行关系
- 第一个真正 implementation subplan（G1）
- 当前明确不做的排除项
