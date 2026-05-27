# M6 托管收尾与文档→可执行规范

> 状态：已落地的收尾规范页。本文只收 M1~M5 的遗留、对齐、规范、检查清单、测试资产与回顾收口，不扩新功能，不改业务闭环。
>
> 核心边界：**文档必须回写真实运行状态**；**规范必须可执行**；**收尾不等于扩面**。

## 1. 遗留项清单

以下条目基于当前仓库中 M1~M5 的真实文档、脚本与目录状态整理。结论分三类：`closed`（已清理/已收口）、`documented`（保留但已明确边界）、`pending`（仍需后续跟踪，不纳入 M6 新开发）。

| 编号 | 遗留项 | 结论 | 处理方式 | 证据/备注 |
|---|---|---|---|---|
| L1 | 单 fixture 静态 MVP 仅 `meeting-summary-assistant` | closed | 已补充 `study-card-assistant`、`release-notes-assistant` 与 `validate:fixtures` 多正例入口 | `docs/static-mvp-validation-report.md`、`docs/roadmap.md` |
| L2 | 反例矩阵入口分散 | closed | 统一为 `validate:fixture:matrix`，并由 `validate:all` 编排 | `scripts/validate-fixture-matrix.mjs`、`scripts/validate-all.mjs` |
| L3 | 静态 validator 与 contract tests 容易被误读为 runtime pass | documented | 在 `docs/validator-contract.md`、`docs/static-mvp-validation-report.md`、`docs/roadmap.md` 明确静态/运行时边界 | `static pass ≠ runtime pass` |
| L4 | 样本库统计口径不一致（标题与编号） | pending | 保留为文档修正项，不影响主链路；后续在样本库文档中统一来源口径 | `docs/sample-skill-library.md` |
| L5 | Phase 3 provider-backed reserved seam 仍为 reserved-only | documented | 明确 rawResponse / transcript / persistence / sandbox / scoring 仍为保留槽位，不得误写为已完成 | `docs/validator-contract.md`、`docs/phase-3-provider-backed-slot-contract-checklist.md` |
| L6 | 运行时 replay 仍未实现 | pending | 保持 `PENDING`，仅承接 Phase 6 入口文档，不做产品扩面 | `docs/roadmap.md`、`docs/phase-6-runtime-replay-real-implementation-entry-hub.md` |
| L7 | 跨平台/跨模型兼容仍未完成 | pending | 明确列入后续维护节奏，不在 M6 中伪装为已验收 | `docs/roadmap.md`、`docs/acceptance-result.md` |
| L8 | 目录/命名兼容（`SkillForge` vs `workflow-kit`）需持续维持 | documented | 保留展示名/路径双口径，避免改名破坏当前脚本与文档 | `docs/data-structure.md`、`docs/roadmap.md` |

### 1.1 清理结论

- **已清理**：静态正例入口从单 fixture 扩展到多 fixture；反例矩阵统一入口；本地总入口和 contract tests 已收口。
- **已归档**：provider-backed reserved seam 的保留语义、静态/运行时边界、展示名/路径兼容口径。
- **待跟踪**：样本库统计口径、runtime replay、跨平台/跨模型兼容。

## 2. 配置/注释修正

以下为当前可核对的一致性修正清单；对已知低风险遗留只做说明性修正，不扩大功能面。

| 项目 | 修正前 | 修正后 | 结论 |
|---|---|---|---|
| `StartLimitIntervalSec` systemd 语义 | 文档可能把该项写成“任意位置都能生效” | 仅在 `[Unit]` / systemd 规定语义内解释，强调位置与版本兼容性 | documented |
| `pnpm validate` | 容易被理解成“全量校验” | 继续明确它只是 baseline alias：`validate:fixture fixtures/meeting-summary-assistant --format json` | closed |
| `validate:all` | 容易被理解成“全部产品链路” | 明确它是 `validate:fixtures` + `validate:fixture:matrix` 的本地总入口，不等于 runtime pass | closed |
| `validate:runtime:draft` | 容易被误读为真实 replay | 明确仅为 draft orchestration，产物仍是 `runtime-replay-report` 草案 | documented |
| provider-backed reserved seam/slot 字段 | 容易与真实执行混淆 | 明确 `rawResponse`、`transcriptAvailability`、`providerMetadata.transcriptPersistence`、`transcriptRef.*` 均为 reserved-only | closed |

### 2.1 核对范围

- systemd：`StartLimitIntervalSec`、服务托管语义、启动/重启策略。
- 路径：`workflow-kit` 工作目录、相对路径优先、展示名 `SkillForge`。
- 启动参数：`validate`、`validate:all`、`validate:fixtures`、`validate:runtime:draft`。
- 环境变量：当前仓库未引入新的强依赖环境变量；如未来引入，必须在 `docs/` 与脚本注释同时回写。
- 默认值：`validate` 默认 baseline、`validate:runtime:draft` 默认 `dry-run`、case 选择默认第一 case。

### 2.2 修正前后对照

- `validate:all`：从“全量门禁”改写为“静态本地总入口”。
- `validate:runtime:draft`：从“runtime pass”改写为“草案级 runtime artifact 生成”。
- provider-backed reserved seam：从“可用能力”改写为“保留槽位，不开放执行”。

## 3. 规范文档

### 3.1 运行手册

新增/收口后，当前新成员独立完成一次完整运行的最小步骤如下：

1. `cd /home/yankeeting/.openclaw/projects/workflow-kit`
2. `pnpm install`
3. `pnpm --silent validate`
4. `pnpm --silent validate:fixtures`
5. `pnpm --silent validate:fixture:matrix`
6. `pnpm --silent validate:all`
7. `pnpm --silent validate:contracts`
8. 需要 runtime 草案时：`pnpm --silent validate:runtime:draft fixtures/meeting-summary-assistant --format json`

#### 运行判断

- `validate` 成功：baseline fixture JSON 正常输出。
- `validate:fixtures` 成功：三正例 fixture 全部通过。
- `validate:fixture:matrix` 成功：6/6 case 通过。
- `validate:all` 成功：静态多正例 + 矩阵均通过。
- `validate:contracts` 成功：关键 stdout / JSON contract 无漂移。
- `validate:runtime:draft` 成功：草案链路可走通，但**不**表示 runtime passed。

### 3.2 故障处理

| 故障现象 | 先看什么 | 怎么判定 | 处理动作 |
|---|---|---|---|
| `validate` 失败 | `docs/static-mvp-validation-report.md`、fixture 目录、`skill/SKILL.md` | 基础字段或边界规则缺失 | 先修 fixture，再跑 baseline |
| `validate:fixtures` 失败 | 三个正例 fixture 的差异 | 某个正例退化或新增不一致 | 回到对应 fixture 修正 |
| `validate:fixture:matrix` 失败 | 失败 case 对应的规则 ID | 反例未命中或 JSON contract 漂移 | 修复规则或断言 |
| `validate:all` 失败 | 先看 `validate:fixtures` 再看矩阵 | 静态总入口任一阶段失败 | 按子命令逐个排查 |
| `validate:contracts` 失败 | stdout markers / JSON schema | contract 文本或字段漂移 | 同步文档与脚本断言 |
| `validate:runtime:draft` 失败 | fixture、preflight、case 选择 | orchestration 或草案报告异常 | 先查 preflight，再查 single-case 选择 |

### 3.3 变更约定

- 先改文档，再改脚本注释，再改实现；回写必须同步。
- 任何影响 `validate` / `validate:all` / `validate:contracts` 的变更，必须补最小验证说明。
- 任何增加 provider/backed 字段、systemd 语义或目录约定的变更，必须在 `docs/roadmap.md` 与相应 contract 文档同步说明。
- 不允许把 `static pass` 写成 `runtime pass`。
- 不允许把保留槽位写成真实能力。

### 3.4 目录约定

- `docs/`：只放规范、收口、验收、计划、证据，不放实现逻辑。
- `scripts/`：只放可执行入口与测试/验证脚本。
- `src/skillforge/`：放真实模块实现，脚本只做薄入口。
- `fixtures/`：放静态验证样本，所有正例/反例都应可复现。
- `docs/optimization/`：放优化回顾与最终分析，不放执行代码。

## 4. 检查清单

### 4.1 发布前 checklist

1. `pnpm install` 成功。
2. `pnpm --silent validate` 成功。
3. `pnpm --silent validate:fixtures` 成功。
4. `pnpm --silent validate:fixture:matrix` 成功。
5. `pnpm --silent validate:all` 成功。
6. `pnpm --silent validate:contracts` 成功。
7. `docs/static-mvp-validation-report.md` 已刷新。
8. `docs/acceptance-result.md` 与当前状态一致。

### 4.2 变更后 checklist

1. 文档是否回写真实状态。
2. 受影响脚本的命令/退出码是否一致。
3. `validate:all` 是否仍能走完。
4. `validate:contracts` 是否仍通过。
5. 是否引入了未说明的新环境变量/目录依赖。
6. 是否新增了会被误读为 runtime pass 的措辞。

### 4.3 故障恢复 checklist

1. 先定位是 fixture、脚本、contract 还是文档漂移。
2. 先跑最小 baseline，再跑 multi-fixture，再跑 matrix。
3. 如果是 runtime 草案问题，先查 preflight 再查 single-case selection。
4. 如果是 provider/backed 误读，回看 reserved-only 边界。
5. 修复后重新刷新 `docs/static-mvp-validation-report.md` 与相关收口文档。

## 5. 测试产物沉淀

### 5.1 可复用测试/验收资产

- `docs/static-mvp-validation-report.md`：静态正例与反例证据总表。
- `docs/acceptance-result.md`：设计验收与风险收口记录。
- `scripts/validate-fixture-matrix.mjs`：正例 + 5 类反例的可复用矩阵。
- `scripts/test-validator-contracts.mjs`：关键 JSON / stdout contract 断言。
- `scripts/test-preflight-contracts.mjs`：preflight contract 断言。
- `scripts/test-runtime-contracts.mjs`：runtime replay skeleton contract 断言。
- `scripts/run-runtime-draft.mjs`：runtime 草案执行入口。

### 5.2 M2/M3/M4 真实验证资产

- M2：`validate:fixtures` 多正例入口、三 fixture 通过。
- M3：`validate:contracts` 与 `validate:all` 的本地组合门禁。
- M4：`validate:runtime:draft` 草案入口与 provider-backed reserved seam contract。

### 5.3 常见失败案例样本

- 缺 `description` / 触发信息的 fixture。
- secret/token/private path 泄漏样本。
- 伪 replay（`passed=true` 但缺 observed）样本。
- 缺 `compatibility` checklist 的样本。
- runtime 草案 preflight 未通过样本。

## 6. 回顾收口

### 6.1 边界

- 本页只收尾，不扩产品边界。
- 不新增 UI、不新增业务闭环、不新增发布体系。
- provider-backed / transcript / sandbox / scoring 仍是保留槽位，不在 M6 中升格为已完成。

### 6.2 责任归属

- 文档维护：主计划 / owner 负责回写。
- 静态验证：脚本与 contract tests 负责守门。
- runtime 草案：只由 `validate:runtime:draft` 入口承接。
- 后续 provider / replay：进入后续 Phase 6/7 的独立实施入口，不从 M6 直接扩面。

### 6.3 维护节奏

- 每次文档或脚本变更后：先跑 `validate:fixtures`、`validate:all`、`validate:contracts`。
- 每次静态证据更新后：刷新 `docs/static-mvp-validation-report.md`。
- 每次涉及 runtime 草案后：同步检查 `docs/validator-contract.md` 与 `docs/roadmap.md`。
- 每周至少回看一次 `docs/acceptance-result.md` 与 `docs/roadmap.md`，确认风险仍在正确状态。

### 6.4 判定通过

判定 M6 收口通过的标准只有四条：

1. 谁看什么：新成员看运行手册、故障处理、检查清单、测试资产目录。
2. 何时看：发布前、变更后、故障恢复时。
3. 如何判定：按 checklist 和命令 exit code 判断，不按主观感觉。
4. 是否回到主计划：若出现 runtime/provider 边界变化，必须回写 `docs/roadmap.md`，并在相应 Phase 6/7 文档中重新收口。

### 6.5 验真记录

- **验真时间**：2026-05-26 22:01 CST（当前执行时刻）
- **主要依据的验证来源**：最近一轮 `validate`、`validate:fixtures`、`validate:fixture:matrix`、`validate:all`、`validate:contracts`，以及 M2/M3/M4 真实 smoke test 产物与对应文档回写结果
- **说明**：本段基于当前工作区与最近一轮验证结果回写；如后续脚本、fixture 或样本库发生变化，需重新重验后再更新本页结论。

## 7. 本次 M6 收口产物

- `docs/phase-6-closeout-and-maintenance.md`

## 8. 后续建议

- 将 `docs/sample-skill-library.md` 的统计口径修正纳入下一次文档维护。
- 若后续 runtime replay 进入实施态，新增独立 Phase 6/7 文档，不在本页增补实现细节。
- 若 systemd / 路径 / CLI 行为发生变化，必须同步回写本页与 `docs/roadmap.md`。
