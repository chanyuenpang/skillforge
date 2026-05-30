#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { buildBetterPromptV1 } from '../src/skillforge/betterprompt-builder.mjs';

const SAMPLE_PROMPT = `
Validate the browser page flow, check prerequisites first, and return a concise evidence-oriented report.
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
    if (flag === '--prompt') args.prompt = takeValue();
    if (flag === '--goal-hint') args.goalHint = takeValue();
    if (flag === '--file') args.file = takeValue();
    if (flag === '--json') args.json = true;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let prompt = args.prompt || SAMPLE_PROMPT;
  if (args.file) prompt = await readFile(args.file, 'utf8');

  const result = await buildBetterPromptV1({
    rawPrompt: prompt,
    ...(args.goalHint ? { goal_hint: args.goalHint } : {}),
  });

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('='.repeat(60));
    console.log('betterPrompt v2');
    console.log('='.repeat(60));
    console.log(`objective: ${result.execution.objective}`);
    console.log('selected skills:', result.routing.selected.map((item) => item.id).join(', '));
    console.log('steps:');
    for (const step of result.execution.steps) {
      console.log(`- ${step.id}: ${step.title}`);
    }
    console.log('report sections:', result.report.requiredSections.join(', '));
    console.log(`qc: pass=${result.qc.pass} score=${result.qc.score}`);
  }

  process.exit(result.qc.pass ? 0 : 1);
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
