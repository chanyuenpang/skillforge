# ADR: SkillForge 运行中心与知识资产子域以结构化规格划分为长期边界

## Status

accepted

## Context

本次计划已经把运行中心与知识资产两个子域从产品概念推进到可指导研发的结构化规格。若只把这些内容停留在单次计划产物里，后续实现 `PromptDraft`、`StepPlan`、`ExecutionRun`、`Skeleton`、`TemplateSnippet`、`AssetReuseRecord` 时，边界和归属会再次回到口头约定，容易出现运行视角与资产视角互相污染的问题。

计划记录明确了两条子域已经分别落盘，且通过稳定交界面保持互不污染，因此这不只是文档整理，而是一个会约束后续研发的长期架构决定。

## Decision

决定将 SkillForge 的运行中心与知识资产拆成两个长期稳定的子域，并用各自的结构化规格作为实现边界：

1. **运行中心负责运行视角对象**  
   运行中心规格覆盖 `Task`、`PromptDraft`、`StepPlan`、`ExecutionRun`、`Skeleton（运行视角）` 与复用回沉记录，后续运行链路应以这些对象为主组织。

2. **知识资产负责资产视角对象**  
   知识资产规格覆盖 `PromptDraft（资产视角）`、`TemplateSnippet`、`Skeleton（资产视角）`、`AssetReuseRecord`、`AssetBackflowIntake`，后续资产沉淀应以这些对象为主组织。

3. **双归属对象必须显式区分视角**  
   `PromptDraft` 与 `Skeleton` 这类双归属对象必须明确区分“运行视角”和“资产视角”，不能用单一对象语义混用两边职责。

4. **子域交界面只用稳定引用键连接**  
   两个子域之间只通过稳定引用键对接，不引入复杂事件协议，以避免跨域耦合扩散。

5. **共享数据字典应后续补齐**  
   `assetRef`、`version`、`sourceTaskId`、`sourceRunId` 这类跨域引用键需要收敛到共享数据字典中，作为后续统一治理的基础。

## Alternatives Considered

- 把运行中心与知识资产合并成单一子域：拒绝。会混淆运行与沉淀职责，后续扩展更难控制。
- 先做复杂事件协议再定义边界：拒绝。会让跨域耦合提前膨胀，不利于当前阶段收敛。
- 继续只保留概念级划分、不落结构化规格：拒绝。无法为后续研发提供可执行边界。

## Related Code

| Path | Role |
| ---- | ---- |
| `docs/skillforge-run-center-domain-spec-v0.1.md` | 运行中心子域规格。 |
| `docs/skillforge-knowledge-asset-domain-spec-v0.1.md` | 知识资产子域规格。 |
| `docs/skillforge-product-charter-v1.md` | 上层产品总纲。 |
| `docs/skillforge-web-ia-and-module-layering-v1.md` | 网页 IA 与模块分层承接依据。 |
| `docs/skillforge-roadmap-and-doc-governance-v1.md` | 路线与文档治理约束来源。 |

## Consequences

- 正向：运行中心与知识资产的职责边界清晰，后续实现更容易按域推进。
- 正向：`PromptDraft`、`Skeleton` 等双归属对象可以被稳定分流，减少语义漂移。
- 正向：跨域连接只依赖稳定引用键，耦合度可控。
- 取舍：需要后续补一份共享数据字典，统一 `assetRef`、`version`、`sourceTaskId`、`sourceRunId` 等字段。
- 风险：若后续实现再次绕开这两份规格，运行视角与资产视角会重新混杂。
- 验证锚点：后续研发应分别围绕 `Task + PromptDraft + StepPlan` 与 `Skeleton + TemplateSnippet` 的最小可操作路径推进。

## Search Terms

- `PromptDraft`
- `StepPlan`
- `ExecutionRun`
- `Skeleton`
- `TemplateSnippet`
- `AssetReuseRecord`
- `AssetBackflowIntake`
- `assetRef`
- `sourceTaskId`
- `sourceRunId`
