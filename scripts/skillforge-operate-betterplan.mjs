#!/usr/bin/env node

/**
 * skillforge-operate-betterplan.mjs — betterPlan v1 CLI entry
 *
 * Usage:
 *   node scripts/skillforge-operate-betterplan.mjs --plan "plan text here" [--goal-hint "hint"]
 *   echo "plan text" | node scripts/skillforge-operate-betterplan.mjs [--goal-hint "hint"]
 *
 * Outputs structured task skeleton as JSON.
 * No execution records, no governance, no run center.
 */
import { runBetterPlan } from '../src/skillforge/betterplan-pipeline.mjs';

function parseArgs(argv) {
  const args = { plan: '', goalHint: '' };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const [flag, inlineValue] = token.split('=', 2);

    const readValue = () => {
      if (inlineValue !== undefined) return inlineValue;
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        i += 1;
        return next;
      }
      return '';
    };

    if (flag === '--plan') args.plan = readValue();
    if (flag === '--goal-hint') args.goalHint = readValue();
  }

  return args;
}

async function readStdinIfNeeded() {
  if (process.stdin.isTTY) return '';
  let data = '';
  for await (const chunk of process.stdin) {
    data += chunk;
  }
  return data.trim();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const stdinPlan = await readStdinIfNeeded();
  const plan = args.plan || stdinPlan;

  if (!plan) {
    console.error('Usage: node scripts/skillforge-operate-betterplan.mjs --plan "..." [--goal-hint "..."]');
    console.error('or: echo "..." | node scripts/skillforge-operate-betterplan.mjs --goal-hint "..."');
    process.exit(1);
  }

  const output = await runBetterPlan({
    plan,
    ...(args.goalHint ? { goal_hint: args.goalHint } : {}),
  });

  if (!output.result) {
    console.error(JSON.stringify({ error: output.error, meta: output.meta }, null, 2));
    process.exit(1);
  }

  const result = {
    version: 'betterplan.v1',
    contract: { input: '{ plan: string, goal_hint?: string }', output: 'task-skeleton' },
    input: { plan: plan.slice(0, 120) + (plan.length > 120 ? '...' : ''), goal_hint: args.goalHint || undefined },
    output: output.result,
    meta: {
      llmCalled: output.meta.llmCalled,
      llmDurationMs: output.meta.llmDurationMs,
      model: output.meta.model,
      validationPassed: output.meta.validationPassed,
      fallbackUsed: output.meta.fallbackUsed,
      warnings: output.meta.warnings,
    },
  };

  console.log(JSON.stringify(result, null, 2));
}

main();
