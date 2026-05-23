# Phase 5 History state-model contract v0

> 这是 History surface 的 **state-model v0**，采用 contract-first 方式冻结最小真相层。这里只定义状态对象、状态转移与不变量；**不含 UI / runtime / persistence / publish 实现**，也**不展开 derived view-model**。

## 1. 目标与边界

### 目标
- 冻结 History surface 的最小 state-model contract。
- 为后续 view-model、UI、runtime、persistence 提供稳定的文档级真相层基线。
- 统一 History 相关状态语义，避免后续把规划态写成实现态。

### 边界
- 这是 **History 的 state-model v0**，不是实现说明。
- 不描述 UI 结构、不描述 runtime 调度、不描述 persistence schema、不描述 publish 流程。
- 不把 derived views 展开成可执行 view-model 设计；这里只保留 stub。
- 不声明 history / audit / replay 已完成联动或可运行。

## 2. 最小状态对象

History v0 只保留以下最小状态对象：

### 2.1 timeline
- History 的时间线容器，用于承载按顺序增长的历史事件集合。
- 语义上只关心顺序与归档边界，不额外承诺展示结构。

### 2.2 entries
- timeline 中的历史条目集合。
- 条目以 append-only 语义进入系统，保留已有条目的稳定性。

### 2.3 cursor
- 当前读取或回放位置的逻辑指针。
- 用于表达 History 在 timeline 中的当前定位，不承诺具体渲染方式。

### 2.4 filters
- 用于限定 History 视图范围的筛选条件集合。
- 只定义存在性与作用边界，不展开具体筛选算法。

### 2.5 replayAnchor
- 回放锚点，用于标记 replay 的参考边界或起点。
- 只定义锚点语义，不声明真实 replay 已实现。

## 3. 状态转移与不变量

### 3.1 append-only 语义
- entries 以 append-only 方式增长。
- 已存在的历史条目不应被随意覆盖、重排或隐式删除。
- 如未来需要修订，只能通过显式的 contract 扩展另行定义，不能默认篡改 v0 语义。

### 3.2 cursor 单调性
- cursor 只能在明确的状态转移中变化。
- cursor 的变化必须可解释、可追踪，不能无理由跳变。
- 任何向前/向后移动都必须保持与 timeline / replay 边界的一致性。

### 3.3 replay 边界
- replayAnchor 作为 replay 的边界基准，必须与 timeline / entries 的存在关系一致。
- replay 不得越过已声明边界去“补写”不存在的历史语义。
- 若 cursor 与 replayAnchor 存在关系约束，应以不破坏 append-only 语义为前提。

## 4. 误宣称红线

以下表述都不能从本 contract 直接推导出来：
- History UI 已完成
- History runtime 已实现
- History persistence 已实现
- History publish 已实现
- replay 已真实可执行
- view-model 已冻结或可直接落地
- entries 可以任意改写、回滚或重排

## 5. derived views stub

> 这里只保留 stub，不展开 view-model。

- derived views: stub only
- view-model contract: deferred
- projection rules: TBD by later contract
- presentation mapping: not defined here

## 6. 手工 checklist

新增或修改 History 相关文档时，手工检查以下项：

1. 标题是否明确标注 History state-model v0。
2. 是否只描述 contract，不混入 UI / runtime / persistence / publish 实现。
3. 是否包含 timeline / entries / cursor / filters / replayAnchor 五个最小状态对象。
4. 是否明确 append-only 语义。
5. 是否明确 cursor 单调性。
6. 是否明确 replay 边界。
7. 是否没有把 derived views 展开成 view-model 设计。
8. 是否没有误写成 runtime complete 或已可执行。

## 7. Related

- 上游索引：[`phase-5-contract-index.md`](./phase-5-contract-index.md)
- 当前收口：[`phase-5-closeout-current-status.md`](./phase-5-closeout-current-status.md)
- docs 一致性巡检：[`phase-5-docs-consistency-lint-plan.md`](./phase-5-docs-consistency-lint-plan.md)

## 8. 说明

如果后续需要扩展 History 的 view-model / UI / runtime / persistence / publish，请另起独立文档继续收口，不要在本页补写实现态。