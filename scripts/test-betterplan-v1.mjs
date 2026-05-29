#!/usr/bin/env node

/**
 * test-betterplan-v1.mjs — betterPlan v1 验证与调试脚本
 *
 * 用法：
 *   node scripts/test-betterplan-v1.mjs --plan "计划内容..."
 *   node scripts/test-betterplan-v1.mjs --plan-file /path/to/plan.txt
 *   node scripts/test-betterplan-v1.mjs --plan-file /path/to/plan.txt --hint "额外目标提示"
 *   node scripts/test-betterplan-v1.mjs --sample       # 使用内置示例
 *
 * 输出：betterPlan v1 骨架 JSON 到 stdout
 */

import { runBetterPlan } from '../src/skillforge/betterplan-pipeline.mjs';
import { validateBetterPlanOutput } from '../src/skillforge/betterplan-contract.mjs';
import { readFile } from 'node:fs/promises';

// ── Built-in sample plan ─────────────────────────────────────────────────────

const SAMPLE_PLAN = `
# SkillForge betterPlan v1 落地计划

## 目标
在现有 betterWorkflow 基础设施上落地 betterPlan v1，通过收敛式重构产出可用的计划骨架生成器。

## 范围边界
- 只做收敛式重构，不推倒重写
- 输入主体是 plan_write 输入原文
- 不要继续保留重治理流程、过细阶段状态机
- 不要扩展 UI / 审批 / run center

## 输入约定
- 输入形态：{ plan: string, goal_hint?: string }
- plan 字段是 plan_write 的原始文本
- goal_hint 是可选的总体目标提示

## 输出约定
- 目标概述
- 边界约束
- 任务骨架步骤
- 执行顺序理由
- 缺口识别
- 收口条件

## 实现策略
1. 创建 betterplan-contract.mjs 定义输入输出合约
2. 创建 betterplan-pipeline.mjs 实现核心管线
3. 程序负责过滤/裁剪/拼装/校验
4. LLM 负责理解/提炼/生成
5. 创建验证脚本 test-betterplan-v1.mjs

## 完成标准
- 代码已改完
- 存在明确可调用入口
- 能按新 contract 产出 betterPlan v1 骨架
`;

// ── Argument Parsing ─────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;

    const [flag, inlineValue] = token.split('=', 2);
    const takeValue = () => {
      if (inlineValue !== undefined) return inlineValue;
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        i += 1;
        return next;
      }
      return '';
    };

    if (flag === '--plan') args.plan = takeValue();
    else if (flag === '--plan-file') args.planFile = takeValue();
    else if (flag === '--hint') args.goalHint = takeValue();
    else if (flag === '--sample') args.useSample = true;
    else if (flag === '--help') args.showHelp = true;
  }
  return args;
}

// ── Help ─────────────────────────────────────────────────────────────────────

function showHelp() {
  console.log(`
betterPlan v1 — 计划骨架抽取器验证脚本

用法:
  node scripts/test-betterplan-v1.mjs [选项]

选项:
  --plan <text>        直接提供计划文本
  --plan-file <path>   从文件读取计划文本
  --hint <text>        可选的总体目标提示
  --sample             使用内置示例计划文本
  --help               显示此帮助

示例:
  node scripts/test-betterplan-v1.mjs --sample
  node scripts/test-betterplan-v1.mjs --plan "写一个 CLI 工具..."
  node scripts/test-betterplan-v1.mjs --plan-file ./my-plan.md --hint "聚焦 MVP"

输出:
  JSON 格式的 betterPlan v1 结果，包含 result 和 meta 两部分
`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.showHelp) {
    showHelp();
    process.exit(0);
  }

  // Resolve plan text
  let planText;
  if (args.planFile) {
    try {
      planText = await readFile(args.planFile, 'utf-8');
    } catch (err) {
      console.error(`错误: 无法读取文件 ${args.planFile}: ${err.message}`);
      process.exit(1);
    }
  } else if (args.plan) {
    planText = args.plan;
  } else if (args.useSample) {
    planText = SAMPLE_PLAN;
  } else {
    console.error('错误: 请提供 --plan、--plan-file 或 --sample');
    showHelp();
    process.exit(1);
  }

  const input = {
    plan: planText,
    ...(args.goalHint ? { goal_hint: args.goalHint } : {}),
  };

  console.error(`→ 输入: ${planText.length} 字符`);
  if (args.goalHint) console.error(`→ 目标提示: ${args.goalHint}`);

  const t0 = Date.now();
  const output = await runBetterPlan(input);
  const elapsed = Date.now() - t0;

  // Run contract validation on result
  let contractCheck = null;
  if (output.result) {
    contractCheck = validateBetterPlanOutput(output.result);
  }

  // Build summary output
  const summary = {
    success: output.result !== null,
    elapsed_ms: elapsed,
    contract_valid: contractCheck?.valid ?? null,
    contract_errors: contractCheck?.errors ?? [],
    result: output.result,
    meta: output.meta,
    ...(output.error ? { error: output.error } : {}),
  };

  // Print as pretty JSON
  console.log(JSON.stringify(summary, null, 2));

  // Exit code
  if (!output.result) {
    console.error(`\n✗ betterPlan v1 运行失败: ${output.error}`);
    process.exit(1);
  }

  console.error(`\n✓ betterPlan v1 完成 (${elapsed}ms)`);
  if (output.result.skeleton?.length > 0) {
    console.error(`→ 骨架步骤数: ${output.result.skeleton.length}`);
    for (const step of output.result.skeleton) {
      console.error(`  ${step.id}: ${step.title} [order=${step.order}, deps=${step.dependsOn.join(',') || '无'}]`);
    }
  }
  if (output.result.gaps?.length > 0) {
    console.error(`→ 识别缺口: ${output.result.gaps.length} 项`);
  }
  console.error(`→ 信心度: ${output.result.confidence}`);
}

main().catch((err) => {
  console.error(`致命错误: ${err.message}`);
  console.error(err.stack);
  process.exit(2);
});
