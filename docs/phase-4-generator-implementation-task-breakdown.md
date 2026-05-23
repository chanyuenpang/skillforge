# Phase 4 implementation checklist: generator minimal executable chain

> 这是 Phase 4 的**执行清单/任务骨架**，不是 generator 已实现完成说明。
>
> 它只负责把当前主计划中"generator 真实实现承接"的第一刀压成可执行顺序：从已完成的 static-only / planning skeleton / entry 文档，进入 **generator minimal executable chain** 的最小实施入口。
>
> 明确边界：本文**不**宣称 generator 已完成，不把 static-only / planning skeleton 误写成真实生成能力已完成，也不把完整 workflow 支持、UI、publish、registry、runtime 全链路的后续工作混进来。

## 0. 结论先行

当前阶段最合适的推进方式，不是扩 generator 全链路，而是先把 **generator minimal executable chain** 拆成一条严格串行、局部可并行的执行链。

**第一个真正的 implementation subplan 应该是：**

**锁定首个 generator 承接输入**

因为这一步决定后续所有输入边界、映射规则、产物骨架和验证口径；如果输入对象不固定，后面的 SkillSpec → SkillManifest → SKILL.md skeleton → validation 全都会漂。

## 1. 第一批可执行子任务列表（按顺序）

### G1. 锁定首个 generator 承接输入

**目标**
- 选定一个最小、最稳定、可复核的 workflow/spec 输入样本作为 generator 首刀承接对象。
- 把"从什么生成"先钉死。

**边界**
- 只选一个输入样本。
- 不扩展到 multi-workflow、multi-profile、multi-skill 分流。
- 不引入 UI、publish、registry、runtime 依赖。

**依赖**
- 已有的 `docs/phase-4-workflow-spec-input-contract.md`。
- 已有的 `docs/phase-4-planning-skeleton-v0.md`。
- 已有的 `docs/phase-4-generator-minimal-executable-chain-entry.md`。

**可并行项**
- 候选输入样本的筛选可与现有 Phase 4 文档复核并行。
- 但最终定案必须串行落地。

**说明**
- 这是整个 implementation subplan 的起点，也是后续所有任务的前置条件。

---

### G2. 冻结最小输入 → SkillSpec 映射

**目标**
- 明确哪些输入字段进入 `SkillSpec`、以什么顺序映射、哪些字段不进入。
- 把映射规则压到最窄，避免把规划口径扩成通用抽取器。

**边界**
- 只覆盖 G1 选定的单输入样本。
- 只定义最小必需字段与映射规则。
- 不讨论完整元数据推理、模板推理、多输入聚合。

**依赖**
- G1 固定的承接输入对象。
- 现有的 input contract 文档。

**说明**
- 这一步是映射口径固化，不是实现。

---

### G3. 冻结最小 SkillSpec → SkillManifest 映射

**目标**
- 明确 `SkillSpec` 的哪些字段进入 `SkillManifest`、以什么结构产出。
- 只承接最小 manifest 字段集：entry / files / dependencies / permissions / compatibility 的必要骨架。

**边界**
- 只覆盖 single skill 的最小 manifest。
- 只定义最小字段集。
- 不扩展完整 manifest schema、多模板分流、运行时资源推测。

**依赖**
- G2 的输入 → SkillSpec 映射冻结。

**说明**
- 如果这一步的映射不明确，后续 SKILL.md skeleton 会与 manifest 产生歧义。

---

### G4. 冻结最小 SKILL.md skeleton 模板

**目标**
- 明确 `SkillManifest` 的哪些字段进入 `SKILL.md` skeleton、以什么格式输出。
- 只生成最小 frontmatter、description、边界说明、检查清单与流程骨架。
- 不把完整内容生产（详细说明、完整示例、验证脚本）当成第一刀目标。

**边界**
- 只覆盖 single skill 的 SKILL.md skeleton。
- 不扩展完整 SKILL.md 模板体系、多语言输出、附属资源生成。
- 不引入 UI 预览、markdown 渲染引擎。

**依赖**
- G3 的 SkillSpec → SkillManifest 映射冻结。

**可并行项**
- G2（输入→SkillSpec）与 G4（SkillManifest→SKILL.md skeleton）可在 G3 冻结后并行推进细化。
- 但 G2→G3→G4 的主链必须串行。

**说明**
- SKILL.md skeleton 必须是 deliberate omission，字段留白要明确标为 pending / reserved，不能默认填默认值。

---

### G5. 冻结最小验证回写

**目标**
- 让生成结果能回写静态验证结论、版本信息与路径信息。
- 建立最小可跟踪的 generation run record。

**边界**
- 只回写 static pass / pending / fail 的最小状态。
- 不进入 runtime replay、review gate、publish 门禁。
- 不要求完整校验体系。

**依赖**
- G4 的 SKILL.md skeleton 模板。
- 现有的 static validation 入口（validate:fixtures / validate:contracts）。

**说明**
- 这一步保证"生成后有证据"，不是"验证体系完整"。

---

### G6. 做最小边界审计

**目标**
- 检查 G1-G5 的设计/实现入口有没有悄悄滑向 multi-workflow、multi-skill、UI、publish、registry、runtime。
- 一旦发现边界漂移，立刻收回。

**边界**
- 不是扩面任务。
- 只是边界审计。

**依赖**
- G1-G5 的全部成果。

**说明**
- 这是防止计划失焦的最后一道闸。

---

## 2. 串行 / 并行关系

### 必须串行

以下任务必须严格串行：

1. **G1 → G2**
   - 没有固定输入，就无法稳定定义映射规则。

2. **G2 → G3**
   - 输入→SkillSpec 映射不清，SkillManifest 口径无从落地。

3. **G3 → G4**
   - SkillManifest 边界未定，SKILL.md skeleton 无锚点。

4. **G4 → G5**
   - 产物骨架未定，验证回写缺少输出对象。

5. **G5 → G6**
   - 先把全链路定住，才能做边界反查。

### 可以并行

以下任务可以在前置条件满足后并行推进：

- **G2 与 G4 的细化工作**
  - 前提：G3 已冻结核心映射。
  - 原因：一个聚焦输入侧映射细化，一个聚焦输出侧模板细化。

- **G5 的验证回写格式设计** 可与 **G4 的 skeleton 模板细化** 同步
  - 前提：G3 已固定 manifest 结构。
  - 原因：验证回写依赖于产物结构，不依赖具体模板内容。

### 不能并行的点

- 不能在 G1 未完成时同时展开 G3/G4 的具体设计。
- 不能一边做 G5，一边还在改 G2 的映射定义。
- 不能把 G6 当成扩面入口。

## 3. 每个子任务的依赖图（简版）

```text
G1 锁定首个承接输入
  -> G2 冻结输入 → SkillSpec 映射
     -> G3 冻结 SkillSpec → SkillManifest 映射
        -> G4 冻结 SKILL.md skeleton 模板
           -> G5 冻结最小验证回写
              -> G6 边界审计
```

并行分支（在 G3 冻结后）：

```text
G3
 ├─> G4 主链
 ├─> G2 细化
 └─> (G5 格式设计，前提是 G4 产物结构已知)
```

## 4. 第一个真正 implementation subplan

**在 G1-G6 的整体顺序中，G1 是第一个 true implementation subplan。**

原因：

- G1 **不是又一个文档讨论**，而是要求真正选定一个具体的 workflow/spec 输入作为实现起点。
- 后续 G2-G5 全依赖 G1 的固定对象。
- G1 不完成，generator 的最小 executable chain 就没有"从哪开始"的锚点。

## 5. 当前不做什么

本 checklist 明确不做以下内容：

- 全量 workflow 支持
- UI（可视化编排、预览、审核界面）
- publish（发布链路、分发、版本投递）
- registry（注册表写入、团队空间同步）
- runtime 全链路（真实 replay、scoring、sandbox、transcript 体系）
- multi-skill / multi-profile 批处理（批量生成与批量编排）
- 端到端大一统生成器
- 完整 SKILL.md 内容生产

换句话说：这里仍然只是 Phase 4 的 **generator minimal executable chain** 骨架，不是 generator 已实现完成。

## 6. 这份清单和现有 Phase 4 文档的关系

本页继承并收束以下已有结论，但不重复宣称它们是实现完成：

- `docs/phase-4-planning-skeleton-v0.md`
- `docs/phase-4-workflow-spec-input-contract.md`
- `docs/phase-4-closeout.md`
- `docs/phase-4-m42-minimal-synthesis-note.md`
- `docs/phase-4-m43-packaging-contract-reconcile.md`
- `docs/phase-4-generator-real-implementation-entry-plan.md`
- `docs/phase-4-generator-minimal-executable-chain-entry.md`
- `docs/roadmap.md`

其中，`docs/phase-4-generator-minimal-executable-chain-entry.md` 负责说明"为什么要这么切"和"推荐切口是什么"，本页负责说明"先做什么、怎么排、哪里能并行、第一刀是哪一刀"。

## 7. 结论

当前主计划在 Phase 4 上最合适的下一步，不是扩大 generator 面，也不是转去 Phase 5，而是先按上述顺序把 **generator minimal executable chain** 拆成可执行清单。

这一步的价值是：

- 把 static-only / planning skeleton 推进到真正可执行的骨架；
- 把 generator 真实实现的第一刀压到最窄；
- 为后续真正 implementation subplan（G1 开始）提供明确顺序与边界。

如果这一步不先落稳，后面任何 Phase 4 实现都容易变成"看起来在推进，实际还在 static-only / planning 层打转"。
