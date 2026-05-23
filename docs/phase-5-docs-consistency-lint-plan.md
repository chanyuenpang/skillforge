# Phase 5 Docs Consistency Lint Plan (contract-first)

> 这是一页 **docs/planning guardrail**，不是 runtime/tooling 实现。它只定义后续 Phase 5 文档在命名、路径、元信息与交叉引用上的一致性检查口径；不引入新能力，不声明任何自动化已存在。

## 1. 目标与边界

### 目标
- 让 Phase 5 的 contract / status / planning 文档保持统一、可导航、可检查。
- 降低后续新增 surface 或收口页时的风格漂移、断链与“看起来像完成了”的误读。
- 为后续可能的 lint / review 流程提供明确的文档判定标准。
- 作为 `phase-5-contract-consistency-checklist-v0.md` 的上游 guardrail，二者共同组成 docs-only 一致性巡检入口。
- 为 Task 这个最小冻结入口提供命名、路径、元信息与 cross-reference 的一致性约束。
- 为 `phase-5-subplan-closeout-structure-v2.md` 提供命名、路径、元信息与 cross-reference 的一致性约束入口。

### 边界
- 这是 **docs/planning guardrail**，不是 runtime/tooling 实现。
- 不定义真实 lint 工具、不实现 CI 规则、不改写脚本或 package 配置。
- 不把 planning 态、placeholder 或 contract-only 叙述写成 runtime complete。

## 2. 检查维度

### 2.1 命名
**Must**
- 文件名、标题、章节名与文档定位一致。
- Phase 5 contract 文档应保持统一前缀与可识别后缀，避免同义不同名。
- surface 名称在全文中保持单一写法，不混用缩写/别名。

**Should**
- 标题尽量包含 surface / scope / contract 语义，便于索引页快速判断。
- 相近概念使用固定术语，不在同一页内多套叫法切换。

### 2.2 路径
**Must**
- 文档路径应稳定、可推断、可被相对链接直接引用。
- 索引页、status 页、各 contract 页之间应使用相对路径，避免硬编码外部路径。
- 新增文档必须能从 Phase 5 入口页被找到，不能成为孤页。

**Should**
- 同一类文档尽量放在同一目录层级，减少导航成本。
- 路径结构应反映文档角色：index / status / contract / plan。

### 2.3 元信息
**Must**
- 若文档包含元信息块（frontmatter / header / status 标识），其字段含义必须清楚且一致。
- `frozen / draft / placeholder` 等状态词必须按既定语义使用，不能混写。
- 文档状态不得暗示实现完成，除非文档内容明确声明的是 contract 收口，而不是 runtime 完成。

**Should**
- 记录适用范围、最后收口对象、关联文档，便于审阅时快速定界。
- 若存在 owner / stage / status 之类字段，建议保持跨页同构。

### 2.4 links / cross-reference
**Must**
- 所有关键 surface 入口应能互相找到：index ↔ contract ↔ current-status。
- 链接目标必须指向正确文档，不得用近似路径或过期锚点充数。
- cross-reference 只能做事实导航，不得把规划页当实现页引用。

**Should**
- 每个新页至少提供一个“上游入口”和一个“相关入口”。
- 交叉引用优先指向最权威的 contract / index 页，再指向说明页。

## 3. 规则级别

### Must
以下问题属于必须修正：
- 命名冲突或明显歧义
- 路径不可达、链接断裂、引用错误
- 元信息把 planning / placeholder 写成已完成实现
- 关键 surface 无法从入口页发现

### Should
以下问题建议修正，但可接受有限度例外：
- 命名不够统一但仍可理解
- 目录层级略深但不影响发现性
- 交叉引用不完整但不造成误导
- 元信息字段可用但不完全同构

## 4. 适用范围

本 plan 适用于 Phase 5 已冻结或正在收口的 docs 资产，主要包括：
- contract index
- current-status / closeout 单页
- 各 surface 的 contract 文档
- Task 这类最小冻结入口文档
- 相关 planning / skeleton / guardrail 文档
- 收口子计划结构文档（例如 `phase-5-subplan-closeout-structure-v2.md`）
- 新增 surface 的 state-model / view-model contract 文档（例如 History）

不适用于：
- runtime 实现代码
- UI 实现代码
- persistence / publish 的真实执行逻辑
- 任何脚本、CI、lint 工具本身的实现细节

## 5. 执行方式

### Manual
- 由作者在提交前手工检查命名、路径、元信息与关键链接。
- 适合单页新增或小范围收口。

### Pre-merge
- 在合并前做轻量复核：检查入口可达、关键 cross-reference 是否齐全、状态词是否误用。
- 适合 Phase 5 contract 页持续扩展时的最小门槛。

### Future automation
- 仅作为后续可能方向：将上述规则转成可执行 lint / link check / review checklist。
- 本文不实现、不声明已接入，也不定义具体工具链。

## 6. 抽样自检建议

每次新增或修改 Phase 5 文档后，可做以下抽样检查：
1. 抽 1 个新页，确认标题、文件名、目录角色一致。
2. 抽 1 个入口页，确认能链到新页，且返回路径清晰。
3. 抽 1 个状态词，确认没有把 contract 收口误写成 runtime complete。
4. 抽 2 条 cross-reference，确认目标存在且语义正确。
5. 抽 1 处元信息字段，确认与同类页面写法一致。
6. 抽 1 组 closeout 入口，确认 current-status / index / review gate / subplan / checklist 之间能闭环指向 closeout review 包准备，而不是误指向实现完成。

## 7. 非目标

本 plan 明确不做以下事情：
- 不实现任何 lint 工具或 CI job
- 不修改 `src/`、`scripts/`、`package.json`
- 不定义 runtime / UI / persistence / publish 的行为
- 不扩展新的 product surface
- 不把 Queue / Detail 的 draft 口径误写成 frozen
- 不把 planning 结论伪装成已交付能力
- 不替代后续真正的 contract 冻结文档

## 8. Related

- 上游索引：[`phase-5-contract-index.md`](./phase-5-contract-index.md)
- 当前收口：[`phase-5-closeout-current-status.md`](./phase-5-closeout-current-status.md)
- 相关规划：[`phase-5-product-surface-ui-planning-skeleton-v0.md`](./phase-5-product-surface-ui-planning-skeleton-v0.md)
- contract consistency checklist：[`phase-5-contract-consistency-checklist-v0.md`](./phase-5-contract-consistency-checklist-v0.md)
