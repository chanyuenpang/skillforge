# SkillForge Milestone F 发布说明草案（最小版）

## 当前已完成范围

- A-E MVP 已完成
- Run Center observability 已完成并具备关键字段输出
- C/D fallback hardening 已完成
- Milestone F 第一条真实业务流灰度闸门已转绿（commit: `fe33bae`）
- Milestone F 第二条真实业务流（bundle 命中优先）灰度验收脚本已补齐并实跑通过

## 两条灰度业务流

1. **真实业务流 #01（已绿）**
   - 脚本：`scripts/skillforge-milestone-f-gray-acceptance.mjs`
   - 验收重点：betterPrompt package + QC、bundle 命中或 fallback 信号、run-center observability 完整

2. **真实业务流 #02（新增，bundle 真命中）**
   - 脚本：`scripts/skillforge-milestone-f-gray-acceptance-flow-02.mjs`
   - 业务场景：`team incident response runbook` / `release checklist`
   - 验收重点：
     - 输入 task goal
     - betterPrompt package 通过 QC
     - bundle recommendation **必须真命中**（不接受 fallback 代替）
     - run-center observability 关键字段完整
   - 实跑结果：`pass=true`，命中 `recommended_bundle_refs: ["team-ops"]`

## 上线闸门（最小）

- 两条灰度脚本都必须 `pass=true`
- betterPrompt QC 必须持续 `pass=true`
- 第二条业务流必须保持 bundle recommendation 真命中（`bundle_fallback_used=false`）
- run-center observability 必须包含：
  - `status`
  - `duration_ms`
  - `trace_refs`
  - `alert_level`

## 发布前最小复核入口（建议）

- 灰度脚本：
  - `node scripts/skillforge-milestone-f-gray-acceptance.mjs`
  - `node scripts/skillforge-milestone-f-gray-acceptance-flow-02.mjs`
- 第二条业务流关键判定字段（需同时满足）：
  - `pass=true`
  - `betterprompt_qc_pass=true`
  - `bundle_recommendation_hit=true`
  - `recommended_bundle_refs=["team-ops"]`（当前样例实跑值）
  - `bundle_fallback_used=false`
- 基线提交（当前草案对应）：`fe33bae`

## 相关引用（最小）

- 发布说明草案：`docs/skillforge-milestone-f-release-note-draft.md`
- 灰度流 #01：`scripts/skillforge-milestone-f-gray-acceptance.mjs`
- 灰度流 #02：`scripts/skillforge-milestone-f-gray-acceptance-flow-02.mjs`

## 已知限制

- 当前灰度验收仍以脚本化契约检查为主，尚未扩展到大规模线上真实流量回放
- bundle 命中结果受当前 skill bundle 语料与 matcher 策略影响，后续需持续补充 bundle 语义覆盖
- 本轮仅做 Milestone F 主链路推进，不包含 UI 扩展与架构级改造
