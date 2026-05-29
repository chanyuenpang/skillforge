#!/usr/bin/env node

import { runBetterWorkflowPipeline } from '../src/skillforge/betterworkflow-pipeline.mjs';

function parseArgs(argv) {
  const args = { plan: '', goal_hint: '', help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--help' || token === '-h') {
      args.help = true;
      continue;
    }
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
    if (flag === '--goal-hint') args.goal_hint = takeValue();
  }
  return args;
}

function printUsage() {
  console.log('Usage:');
  console.log('  node scripts/skillforge-operate-betterworkflow.mjs --plan=... [--goal-hint=...]');
}

function buildInput(plan, goalHint) {
  return {
    goal: {
      summary: plan,
      deliverable: 'betterPlan v1 骨架',
    },
    context: {
      project: 'SkillForge betterPlan v1 入口',
      background: goalHint ? `goal hint: ${goalHint}` : 'goal hint: (empty)',
    },
    constraints: {
      timebox: '先产出可执行 plan 骨架',
      hardRules: [
        '只生成 betterPlan v1 骨架',
        '包含目标、边界、步骤骨架、收口条件',
        '不引入旧入口语义',
        '优先简单可运行',
      ],
    },
    parameters: {
      maxMilestones: 3,
      maxAtomicTasksPerMilestone: 2,
      depth: 'mvp',
    },
  };
}

export function operateBetterWorkflow({ plan = '', goalHint = '' } = {}) {
  const input = buildInput(plan, goalHint);
  const result = runBetterWorkflowPipeline(input);

  const betterPlan = {
    plan,
    goal_hint: goalHint || undefined,
    skeleton: {
      objective: result.workflowOutput?.milestones?.[0]?.objective || '',
      boundaries: result.workflowOutput?.milestones?.[0]?.doneCriteria || [],
      steps: result.workflowOutput?.atomicTasks || [],
      closure: result.planDTO || {},
    },
    summary: result.summary,
  };

  console.log(JSON.stringify(betterPlan, null, 2));
}

function main() {
  const { plan, goal_hint, help } = parseArgs(process.argv.slice(2));
  if (help) {
    printUsage();
    return;
  }
  operateBetterWorkflow({ plan, goalHint: goal_hint });
}

main();
