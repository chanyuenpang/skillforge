#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { runBetterPlan } from '../src/skillforge/betterplan-pipeline.mjs';
import { validateBetterPlanOutput } from '../src/skillforge/betterplan-contract.mjs';

const SAMPLE_PLAN = `
# Browser flow validation task

- Use browser tooling to validate the main page flow
- Verify prerequisites before running the actual page steps
- Capture evidence and produce a concise report
- Keep the task within the current browser workflow
`;

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const [flag, inlineValue] = token.split('=', 2);
    const takeValue = () => {
      if (inlineValue !== undefined) return inlineValue;
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        i += 1;
        return next;
      }
      return '';
    };
    if (flag === '--plan') args.plan = takeValue();
    if (flag === '--plan-file') args.planFile = takeValue();
    if (flag === '--hint') args.goalHint = takeValue();
    if (flag === '--sample') args.useSample = true;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let planText = '';

  if (args.planFile) planText = await readFile(args.planFile, 'utf8');
  else if (args.plan) planText = args.plan;
  else planText = SAMPLE_PLAN;

  const result = await runBetterPlan({
    plan: planText,
    ...(args.goalHint ? { goal_hint: args.goalHint } : {}),
  });

  const contract = result.result ? validateBetterPlanOutput(result.result) : { valid: false, errors: [] };
  const summary = {
    success: Boolean(result.result),
    contract_valid: contract.valid,
    contract_errors: contract.errors,
    output: result.result,
    meta: result.meta,
    routing: result.routing ? {
      selected: result.routing.selected?.map((item) => item.id) || [],
      rationale: result.routing.routingRationale || [],
    } : null,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (!result.result || !contract.valid) process.exit(1);
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
