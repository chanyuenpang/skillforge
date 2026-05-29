#!/usr/bin/env node

import { buildBetterPromptV1 } from '../src/skillforge/betterprompt-builder.mjs';

function parseArgs(argv) {
  const args = {
    prompt: '',
    goal_hint: '',
    help: false,
  };

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

    if (token === '--help' || token === '-h') {
      args.help = true;
      continue;
    }
    if (flag === '--prompt') args.prompt = readValue();
    if (flag === '--goal-hint') args.goal_hint = readValue();
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

function printUsage() {
  console.log('Usage:');
  console.log('  node scripts/skillforge-operate-betterprompt.mjs --prompt "..." [--goal-hint "..."]');
  console.log('  echo "..." | node scripts/skillforge-operate-betterprompt.mjs --goal-hint "..."');
}

export async function operateBetterPrompt({ prompt = '', goalHint = '' } = {}) {
  const result = await buildBetterPromptV1({
    prompt,
    ...(goalHint ? { goal_hint: goalHint } : {}),
  });
  const output = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
  process.stdout.write(`${output}\n`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printUsage();
    return;
  }

  const stdinPrompt = await readStdinIfNeeded();
  const prompt = args.prompt || stdinPrompt;

  if (!prompt) {
    printUsage();
    process.exit(1);
  }

  await operateBetterPrompt({
    prompt,
    goalHint: args.goal_hint,
  });
}

main();
