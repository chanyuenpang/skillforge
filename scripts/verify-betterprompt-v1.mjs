#!/usr/bin/env node

/**
 * betterPrompt v1 verification script.
 *
 * Usage:
 *   node scripts/verify-betterprompt-v1.mjs                # default sample
 *   node scripts/verify-betterprompt-v1.mjs --prompt "..."  # custom prompt
 *   node scripts/verify-betterprompt-v1.mjs --file path/to/prompt.md
 */

import { buildBetterPromptV1 } from '../src/skillforge/betterprompt-builder.mjs';
import { readFile } from 'node:fs/promises';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
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
    if (flag === '--prompt') args.prompt = takeValue();
    if (flag === '--goal-hint') args.goalHint = takeValue();
    if (flag === '--file') args.file = takeValue();
    if (flag === '--json') args.json = true;
  }
  return args;
}

const SAMPLE_PROMPT = `# 子任务：实现 betterPrompt v1

source_skill_ref: prompt-design
normalized_tag: prompt-engineering, validation, template

## 任务目标
将给定的 subagent prompt 原文化为七区块规范化模板。

## 约束
必须保留 source_skill_ref 和 normalized_tag
禁止扩展 UI 或审批流程
仅做过滤、裁剪、拼装和校验

## 验收标准
输出符合七区块模板
source_skill_ref + normalized_tag 完整
QC score >= 70`;

async function main() {
  const args = parseArgs(process.argv.slice(2));

  let prompt = args.prompt;
  let goalHint = args.goalHint;

  if (args.file) {
    prompt = await readFile(args.file, 'utf8');
    console.error(`[info] 从文件读取 prompt: ${args.file} (${prompt.length} chars)`);
  }

  if (!prompt) {
    console.error('[info] 使用内置 sample prompt');
    prompt = SAMPLE_PROMPT;
  }

  const input = { prompt };
  if (goalHint) input.goal_hint = goalHint;

  console.error('[info] 开始构建 betterPrompt v1 ...');

  try {
    const result = await buildBetterPromptV1(input);

    if (args.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log('='.repeat(60));
      console.log('betterPrompt v1 — 七区块规范化模板');
      console.log('='.repeat(60));
      console.log();
      console.log(result.output.template);
      console.log();
      console.log('='.repeat(60));
      console.log('QC 结果');
      console.log('='.repeat(60));
      console.log(`  pass: ${result.qc.pass}`);
      console.log(`  score: ${result.qc.score}`);
      console.log(`  tags: ${result.qc.tags.join(', ')}`);
      console.log('='.repeat(60));
      console.log('拆解映射');
      console.log('='.repeat(60));
      for (const d of result.output.decomposition) {
        console.log(`  source_skill_ref=${d.source_skill_ref} | normalized_tag=${d.normalized_tag}`);
      }
      console.log();
      console.log(`traces: resolved_skills=[${result.traces.resolved_skill_ids.join(', ')}]`);
      console.log(`traces: semantic_summary=${result.traces.semantic_summary.slice(0, 100)}`);
    }

    if (result.qc.pass) {
      console.error('[OK] build + QC 通过');
      process.exit(0);
    } else {
      console.error(`[WARN] QC 未通过 (score=${result.qc.score})，但输出已生成`);
      process.exit(result.qc.score >= 70 ? 0 : 1);
    }
  } catch (err) {
    console.error(`[FAIL] ${err.message}`);
    process.exit(2);
  }
}

main();
