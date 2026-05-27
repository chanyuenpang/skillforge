# ADR-0099: SkillForge Web UI 第二轮精修：浏览器截图级验收与 PASS 门禁

## Status

accepted

## Context

在 Web UI 第二轮精修的范围内，`ApprovalDetail`、`RunCenterList`、`KnowledgeAssetsPage` 已经进入最终体验收口阶段。前序 ADR-0096/0098 已把页面从工程面板风格推进到产品化方向，但是否真正达到可交付标准，不能只看代码或静态改动，必须回到浏览器里做可见、可读、无报错的最终验收。

本次计划记录给出的完成结果已经明确：`ApprovalDetail` 首屏摘要区合规，`RunCenterList` 搜索命中人类可读标题，`KnowledgeAssetsPage` 正常展示无弱标题样本，三页零 `console` 错误，整体 verdict 为 `PASS`。这说明本轮收口的关键不是再加功能，而是把浏览器级验收定义成长期门禁。

## Decision

将本轮 Web UI 第二轮精修的收口规则固定为：

1. **必须以浏览器级验收作为最终门禁**
   - `ApprovalDetail`、`RunCenterList`、`KnowledgeAssetsPage` 的完成标准，不是代码编译通过，而是浏览器中可见、可读、可交互，且没有 `console` 错误。
   - 验收要覆盖首屏内容、搜索命中效果、无弱标题兜底展示这三类体验锚点。

2. **验收允许直接信任已完成任务的事实**
   - 计划中 `done` 的任务可直接视为已完成事实，不再要求重新回读源码或重复证明。
   - 结论层采用 `PASS` / `FAIL` 门禁表达，避免把临时检查结果混进长期事实。

3. **浏览器验收结果作为后续回归基线**
   - 三页零 `console` 错误和人类可读展示效果，作为后续 Web UI 回归时的稳定基线。
   - 未来若这些页面再次改动，必须以同类浏览器验收标准复核，不再退回工程面板式判断。

## Alternatives Considered

- **只记录功能改动，不记录验收门禁**：拒绝。没有浏览器级门禁，体验收口容易回退成“看起来改了”。
- **把验收结果写成临时检查笔记**：拒绝。这里已经是完成态计划，适合沉淀为长期回归基线。
- **再扩大到更多页面一起验收**：拒绝。本轮计划只覆盖 `ApprovalDetail`、`RunCenterList`、`KnowledgeAssetsPage`，不外扩。

## Related Code

| Path | Role |
| ---- | ---- |
| `web/src/components/ApprovalDetail.jsx` | 首屏合规与人类可读展示的验收锚点 |
| `web/src/components/RunCenterList.jsx` | 搜索命中人类可读标题的验收锚点 |
| `web/src/components/KnowledgeAssetsPage.jsx` | 无弱标题样本展示的验收锚点 |

## Consequences

- 正向：三页的完成标准从“实现了”提升为“浏览器里真的通过了”。
- 正向：`PASS` / `FAIL` 门禁可以直接服务后续回归与复核。
- 正向：`console` 零错误成为可重复检查的稳定质量指标。
- 取舍：后续任何相关改动都必须保留浏览器验收成本，不能只靠静态审查。
- 取舍：计划事实依赖已完成任务与复盘结论，要求后续记录保持清晰，不再混入未完成事项。
- 验证锚点：本轮已完成验收结论为 `PASS`，后续同类页面改动应复用此门禁标准。

## Search Terms

- `ApprovalDetail`
- `RunCenterList`
- `KnowledgeAssetsPage`
- `console`
- `PASS`
- `浏览器截图`
- `首屏摘要`
- `弱标题`
- `人类可读标题`
