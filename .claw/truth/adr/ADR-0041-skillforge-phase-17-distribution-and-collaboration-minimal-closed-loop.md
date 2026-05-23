# ADR: Phase 17 分发与协作先收口最小闭环，再考虑完整平台

## Status

accepted

## Context

Phase 17 的目标不是直接做完整的安装器、权限台或回滚平台，而是先把 SkillForge 从单机单用户能力推进到**最小 registry 分发入口**与**后续团队协作扩展基础**的产品状态。

这次子计划的完成记录给出了清晰边界：第一刀是让 `registry publish/list/detail` 的 HTTP 闭环全绿；随后再补 `install/versions/single-version`，再补 `rollback/recovery`，最后补最小 `reviewer/approver` 协作可见字段。计划结论也明确写出：Phase 17 已达到收口线，可以关闭。

## Decision

决定将 Phase 17 的实现顺序固定为：**先打通 `registry publish/list/detail` 的最小分发闭环，再按需补 `install/version`、`rollback/recovery`，最后把最小 `reviewer/approver` 协作可见字段挂到发布主入口上**。

具体规则如下：

1. **分发入口优先于完整平台**
   - 第一刀只追求 `publish/list/detail` 的真实 HTTP 闭环全绿。
   - 不先扩成安装器、权限治理面板或完整回滚平台。

2. **协作信息挂在发布主链上**
   - 最小协作能力优先通过 `publish` 主入口透出 `reviewer` / `approver` 可见字段。
   - `list` 与 `versions` 必须能稳定读到这些真值。

3. **功能按最小闭环顺序收口**
   - 先分发，再安装版本，再回退恢复，再补协作可见层。
   - 每一刀都必须能被真实 HTTP 验证，而不是只在对象层或字段层“看起来有”。

4. **阶段收口以真实端到端验证为准**
   - `publish/list/detail`、`install/versions/single-version`、`rollback/recovery`、最小协作可见层均成立后，Phase 17 可以关闭。

## Alternatives Considered

- **先做完整安装器**：拒绝。会把第一刀从分发入口拉成更重的产品平台。
- **先做完整权限/审批台**：拒绝。协作信息需要先挂在发布主链上，而不是另起一套治理面。
- **先做完整回滚平台**：拒绝。回退能力应先以最小恢复闭环成立，再考虑更完整的运作平台。
- **继续留在分发链路末端做更多 UI 增强**：拒绝。当前阶段的收口线是闭环成立，不是继续堆界面。

## Related Code

| Path | Role |
| ---- | ---- |
| `scripts/skillforge-web-ui.mjs` | 当前 Web UI server，承载最小分发与协作可见入口。 |
| `src/skillforge/registry-entry.mjs` | `RegistryEntry` 的当前结构与协作字段承载点。 |
| `src/skillforge/registry-store.mjs` | `RegistryEntry` 的 store，支撑 `publish/list/detail` 读写闭环。 |
| `plan/subplan-19-subplan-20-phase-17-distribution-collaboration.json` | 本次 Phase 17 子计划记录，含完成任务与收口结论。 |

## Consequences

- 正向：Phase 17 先形成真实可验证的最小分发闭环，而不是空泛的平台愿景。
- 正向：`reviewer` / `approver` 协作信息被固定为发布链上的可见字段，避免后续实现把协作真值丢到旁路。
- 正向：`rollback/recovery` 作为最小运作闭环的一部分，被放在分发与安装之后，顺序合理。
- 取舍：当前不是完整安装器、完整权限系统或完整回滚平台，只是这些能力的最小入口与可见基础。
- 验证锚点：计划记录明确给出 `POST /api/registry/publish`、`GET /api/registry/versions`、`GET /api/registry/skills/demo-reviewer-4/versions` 的真实 curl 验证通过，并写明 Phase 17 可直接关闭。

## Search Terms

- `registry publish`
- `registry list`
- `registry detail`
- `install`
- `versions`
- `single-version`
- `rollback`
- `recovery`
- `reviewer`
- `approver`
- `scripts/skillforge-web-ui.mjs`
