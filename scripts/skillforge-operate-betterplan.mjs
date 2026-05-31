#!/usr/bin/env node

import { runBetterPlan } from '../src/skillforge/betterplan-pipeline.mjs';
import { buildRoutedRunRecord, saveRoutedRun } from '../src/skillforge/routed-run-store.mjs';

function inferFailureStage(error) {
  const stage = error?.meta?.stage || '';
  if (stage === 'skill_ir_extraction' || stage === 'skill_routing') return 'retrieval';
  if (stage === 'betterplan_review') return 'plan';
  return 'plan';
}

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
  for await (const chunk of process.stdin) data += chunk;
  return data.trim();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const stdinPlan = args.plan ? '' : await readStdinIfNeeded();
  const plan = args.plan || stdinPlan;

  if (!plan) {
    console.error('Usage: node scripts/skillforge-operate-betterplan.mjs --plan "..." [--goal-hint "..."]');
    process.exit(1);
  }

  const runId = `bp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    const output = await runBetterPlan({
      plan,
      ...(args.goalHint ? { goal_hint: args.goalHint } : {}),
    });

    const routedRun = buildRoutedRunRecord({
      runId,
      status: 'success',
      userRequest: { text: plan },
      plan: {
        rawPlanRef: null,
        betterPlanReview: output.result,
      },
      retrieval: output.routing ? {
        candidates: output.routing.candidates?.map((candidate) => ({ id: candidate.id, kind: candidate.kind })) || [],
        selected: output.routing.selected?.map((candidate) => candidate.id) || [],
        rejected: output.routing.rejected || [],
      } : null,
      diagnosis: {
        failureStage: output.result ? null : 'plan',
        notes: output.meta?.warnings || [],
      },
    });
    saveRoutedRun(routedRun);

    if (!output.result) {
      console.error(JSON.stringify({ error: output.error, meta: output.meta }, null, 2));
      process.exit(1);
    }

    console.log(JSON.stringify({
      version: 'betterplan.v2',
      input: {
        goal_hint: args.goalHint || undefined,
        plan_preview: `${plan.slice(0, 120)}${plan.length > 120 ? '...' : ''}`,
      },
      output: output.result,
      routing: output.routing ? {
        selected: output.routing.selected?.map((item) => item.id) || [],
        rationale: output.routing.routingRationale || [],
      } : null,
      meta: output.meta,
      runId,
    }, null, 2));
  } catch (error) {
    saveRoutedRun(buildRoutedRunRecord({
      runId,
      status: 'failed',
      userRequest: { text: plan },
      diagnosis: {
        failureStage: inferFailureStage(error),
        notes: [error.message],
        error: {
          name: error.name,
          code: error.code || null,
          meta: error.meta || null,
        },
      },
    }));
    throw error;
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    success: false,
    error: {
      name: error.name,
      code: error.code || null,
      message: error.message,
      meta: error.meta || null,
    },
  }, null, 2));
  process.exit(2);
});
