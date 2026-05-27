# ADR: SkillForge 网页产品壳层以总览工作台和统一一级导航为起点

## Status

accepted

## Context

当前网页端已经从“风险审批子域可用”推进到下一阶段：如果继续只围绕单一审批页扩展，产品入口会长期停留在“只有一个核心页面”的状态，无法形成真正的网页产品壳层。

这次计划明确了长期目标：先建立总览工作台、统一一级导航与基础页面框架，让风险审批成为壳层内的核心子域之一，而不是几乎唯一的可见页面。

## Decision

决定将 SkillForge 网页端的壳层建设固定为以下约束：

1. **先建总览工作台，再补深功能页**  
   以总览工作台作为默认入口，先提供欢迎区、待办聚合、风险审批快捷入口和基础状态卡片，再逐步补齐其他深功能。

2. **统一一级导航与顶层路由**  
   在 `Layout.jsx` 与 `App.jsx` 的壳层范围内建立稳定的一级导航骨架，覆盖总览、风险审批、任务与运行、知识与资产、系统与配置等入口。

3. **壳层只负责入口组织，不吞深内容**  
   顶层页面只承担导航、路由与兼容跳转；不把首页做成深功能集合，也不把旧路由兼容逻辑扩散到各个业务组件。

4. **风险审批必须作为壳层内的核心子域保留**  
   `overview -> /risk/queue`、`overview -> /risk/history`、`/risk/queue -> overview`、`/risk/approval/:fixtureId -> overview` 的导航路径要保持可达，并兼容旧链接逐步迁移到 `/risk/*` 直链。

5. **壳层验证以真实导航路径为准**  
   该阶段的回归重点是壳层级导航、首页入口和风险域接入链路，而不是把深功能一次性铺满。

## Alternatives Considered

- 继续只把风险审批页当主入口：拒绝。这样会让产品入口层长期单薄，难以形成真正的壳层。
- 先扩展大量深功能页，再补统一导航：拒绝。会导致入口分散、信息架构后置，壳层成形更慢。
- 把首页直接做成深功能聚合页：拒绝。会混淆壳层职责，让首页承担过多业务内容。

## Related Code

| Path | Role |
| ---- | ---- |
| `web/src/App.jsx` | 顶层路由组织与壳层入口。 |
| `web/src/components/Layout.jsx` | 统一壳层布局与一级导航骨架。 |
| `web-server.mjs` | 最小 web 服务承载层，后续首页与占位入口的数据接线从这里扩展。 |
| `docs/skillforge-web-product-shape-requirements.md` | 当前阶段产品形态、一级信息架构与 P0/P1 边界需求来源。 |
| `tasks/skill-风险审批网页端收尾一致性与运行证据/plan.json` | 上一轮收尾计划的结论与运行证据承接。 |

## Consequences

- 正向：网页端不再只有审批页可见，产品入口层开始成形。
- 正向：总览工作台可以作为未来运行中心、知识与资产、系统与配置等页面的统一入口。
- 正向：风险审批继续保留为壳层内的核心子域，不会被首页吞没。
- 取舍：壳层阶段会先出现大量占位与导航骨架，深功能需要后续持续填充。
- 风险：旧路由兼容逻辑若长期不收敛，会拖慢 `/risk/*` 直链迁移。
- 验证锚点：`overview -> /risk/queue`、`overview -> /risk/history`、`/risk/queue -> overview`、`/risk/approval/:fixtureId -> overview` 的可达性回归。

## Search Terms

- `总览工作台`
- `一级导航`
- `Layout.jsx`
- `App.jsx`
- `/risk/queue`
- `/risk/history`
- `/risk/approval/:fixtureId`
- `overview`
- `risk/approval`
- `risk/history`
- `risk/queue`
