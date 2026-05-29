#!/usr/bin/env node
/**
 * skillforge-operate.mjs — Minimal operator CLI for skillforge workflows
 *
 * Usage:
 *   node scripts/skillforge-operate.mjs betterplan --plan=... [--goal-hint=...]
 *   node scripts/skillforge-operate.mjs betterprompt --prompt=... [--goal-hint=...]
 */

function parseArgs(argv) {
  const args = {
    command: '',
    plan: '',
    prompt: '',
    goalHint: '',
    help: false,
  };

  const positionals = [];

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--help' || token === '-h') {
      args.help = true;
      continue;
    }
    if (!token.startsWith('--')) {
      positionals.push(token);
      continue;
    }

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
    if (flag === '--prompt') args.prompt = takeValue();
    if (flag === '--goal-hint') args.goalHint = takeValue();
  }

  args.command = positionals[0] ?? '';
  return args;
}

function printUsage() {
  console.log('Usage:');
  console.log('  node scripts/skillforge-operate.mjs betterplan --plan=... [--goal-hint=...]');
  console.log('  node scripts/skillforge-operate.mjs betterprompt --prompt=... [--goal-hint=...]');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printUsage();
    return;
  }

  if (args.command === 'betterplan') {
    const { runBetterWorkflowPipeline } = await import('../src/skillforge/betterworkflow-pipeline.mjs');
    const input = {
      goal: { summary: args.plan || '未命名计划', deliverable: 'betterPlan v1 骨架' },
      context: {
        project: 'SkillForge betterPlan v1',
        background: args.goalHint ? `goal hint: ${args.goalHint}` : '(no hint)',
      },
      constraints: {
        timebox: '先产出可执行 plan 骨架',
        hardRules: ['只生成 betterPlan v1 骨架', '包含目标、边界、步骤骨架、收口条件'],
      },
      parameters: { maxMilestones: 3, maxAtomicTasksPerMilestone: 2, depth: 'mvp' },
    };
    const result = runBetterWorkflowPipeline(input);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (args.command === 'betterprompt') {
    const { buildBetterPromptV1 } = await import('../src/skillforge/betterprompt-builder.mjs');
    const result = await buildBetterPromptV1({
      prompt: args.prompt,
      ...(args.goalHint ? { goal_hint: args.goalHint } : {}),
    });
    const output = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
    process.stdout.write(`${output}\n`);
    return;
  }

  printUsage();
  process.exitCode = 1;
}

main().catch((err) => {
  console.error(err?.stack ?? err?.message ?? String(err));
  process.exitCode = 1;
});
