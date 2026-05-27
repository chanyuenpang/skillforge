# ADR-0091: SkillForge 前端 ErrorBoundary 分层错误兜底策略

## Status

accepted

## Context

SkillForge 网页端在早期形态中缺少统一的错误兜底机制。当页面组件渲染过程中抛出异常（如未定义变量、API 返回异常数据、嵌套组件崩溃）时，整个 React 应用会白屏，用户无法恢复，必须手动刷新。

之前各页面依赖"组件自身不出错"的假设，没有 ErrorBoundary 覆盖。一旦某个叶子组件崩溃，错误冒泡到根节点导致整个 SPA 不可用。

本轮前端优化将白屏兜底列为 P0 级问题，需要在最小改动成本下建立分层错误容错体系。

## Decision

采用 **全局 + 局部两层 ErrorBoundary** 作为前端错误兜底策略：

1. **全局 ErrorBoundary（Layout 层）**
   在 `App.jsx` / `main.jsx` 的路由出口处包裹 `<ErrorBoundary>`，捕获所有未被子级 ErrorBoundary 拦截的异常。fallback 页面提供返回首页和重新加载操作。保证任何场景下用户不会看到白屏。

2. **局部 ErrorBoundary（页面级）**
   在 `RunCenterOverview`、`RunCenterList`、`RunCenterDetail` 等每个页面组件的外层包裹 `<ErrorBoundary>`。fallback 提供与页面上下文相关的恢复操作：
   - 详情页异常 → 返回列表 / 重试
   - 列表页异常 → 重试 / 返回总览
   - 总览页异常 → 重试 / 返回首页

3. **具体实现**
   - `ErrorBoundary.jsx` 作为共享组件，接收 `fallback` 渲染函数
   - 开发者可以为每个 ErrorBoundary 传入不同的 fallback UI
   - 全局 fallback 置顶，页面级 fallback 提供上下文相关恢复路径
   - 不侵入现有路由层级，直接在 JSX 树中包裹

这种分层模式确保：
- 叶子组件崩溃不会扩散到同级页面
- 页面自身崩溃时不会影响其他页面
- 根级崩溃时仍有兜底恢复入口
- 不依赖 try-catch 在渲染函数中的侵入式写法

## Alternatives Considered

- 全局单层 ErrorBoundary：拒绝。一个页面崩溃会导致导航到其他页面也被阻塞（由于 ErrorBoundary 在 React 中只能捕获其子树的错误，单层全局边界会掩盖页面间隔离性）。
- 每个组件自行 try-catch：拒绝。侵入式、不可复用、容易遗漏。
- 不处理，依赖页面刷新：拒绝。白屏体验不可接受。

## Related Code

| Path | Role |
| ---- | ---- |
| `web/src/components/ErrorBoundary.jsx` | 共享 ErrorBoundary 组件（新增） |
| `web/src/App.jsx` | 全局 ErrorBoundary 入口 |
| `web/src/main.jsx` | 全局 ErrorBoundary 入口（备用） |
| `web/src/components/RunCenterOverview.jsx` | 页面级 ErrorBoundary |
| `web/src/components/RunCenterList.jsx` | 页面级 ErrorBoundary + 三态升级 |
| `web/src/components/RunCenterDetail.jsx` | 页面级 ErrorBoundary + 异常数据兜底 |

## Consequences

- 正向：全局 + 局部两层覆盖，任意 JSX 子树崩溃都不会导致白屏。
- 正向：页面级 fallback 提供上下文相关恢复路径（返回列表 / 重试 / 回首页），用户体验优于统一"出错了"提示。
- 正向：新增页面时只需在外层包裹 `<ErrorBoundary>` 即可获得兜底能力，成本极低。
- 取舍：ErrorBoundary 只能捕获渲染阶段异常，不能捕获异步错误或事件处理中的异常。异步错误仍需在 API 层或事件处理器中单独处理。
- 取舍：过度包裹 ErrorBoundary 可能掩盖深层的 bug 信号。建议每个 ErrorBoundary 有日志或上报机制（当前实现仅做 UI 降级，尚未接入错误上报）。

## Search Terms

- `ErrorBoundary`
- `ErrorBoundary.jsx`
- `fallback`
- 全局 ErrorBoundary
- 页面级 ErrorBoundary
- 白屏兜底
- `componentDidCatch`
