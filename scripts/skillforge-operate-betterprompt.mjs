#!/usr/bin/env node

import { buildBetterPromptV1 } from '../src/skillforge/betterprompt-builder.mjs';
import { buildRoutedRunRecord, saveRoutedRun } from '../src/skillforge/routed-run-store.mjs';

function inferFailureStage(error) {
  const stage = error?.meta?.stage || '';
  if (stage === 'skill_ir_extraction' || stage === 'skill_routing') return 'retrieval';
  if (stage === 'betterprompt_compilation') return 'compilation';
  return 'compilation';
}

function buildFailureRetrieval(error, prompt) {
  const routingResult = error?.meta?.routingResult;
  if (!routingResult) return null;

  return {
    queryText: prompt,
    projectToolContext: [],
    runtimeToolContext: [],
    candidates: Array.isArray(routingResult.candidates)
      ? routingResult.candidates.map((candidate) => ({
          id: candidate.id,
          kind: candidate.kind,
          name: candidate.name,
          requiredTools: candidate.requiredTools || [],
        }))
      : [],
    selected: Array.isArray(routingResult.selected)
      ? routingResult.selected.map((candidate) => candidate.id)
      : [],
    rejected: routingResult.rejected || [],
    routingRationale: routingResult.routingRationale || [],
    metadata: routingResult.metadata || null,
    toolGateSummary: routingResult.toolGateSummary || null,
    inputContext: routingResult.inputContext || null,
  };
}

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

    if (token === '--help' || token === '-h') args.help = true;
    if (flag === '--prompt') args.prompt = readValue();
    if (flag === '--goal-hint') args.goal_hint = readValue();
  }

  return args;
}

async function readStdinIfNeeded() {
  if (process.stdin.isTTY) return '';
  let data = '';
  for await (const chunk of process.stdin) data += chunk;
  return data.trim();
}

function printUsage() {
  console.log('Usage:');
  console.log('  node scripts/skillforge-operate-betterprompt.mjs --prompt "..." [--goal-hint "..."]');
  console.log('  echo "..." | node scripts/skillforge-operate-betterprompt.mjs --goal-hint "..."');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    return;
  }

  const stdinPrompt = args.prompt ? '' : await readStdinIfNeeded();
  const prompt = args.prompt || stdinPrompt;
  if (!prompt) {
    printUsage();
    process.exit(1);
  }

  const runId = `bpr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    const result = await buildBetterPromptV1({
      rawPrompt: prompt,
      ...(args.goal_hint ? { goal_hint: args.goal_hint } : {}),
    });

    const routedRun = buildRoutedRunRecord({
      runId,
      status: 'success',
      userRequest: { text: prompt },
      retrieval: {
        queryText: prompt,
        projectToolContext: result.routing.toolGate.projectToolContext,
        runtimeToolContext: result.routing.toolGate.runtimeToolContext,
        candidates: result.routing.selected.map((candidate) => ({ id: candidate.id, kind: candidate.kind })),
        selected: result.routing.selected.map((candidate) => candidate.id),
        rejected: result.routing.rejected,
      },
      compilation: {
        sourcePrompt: prompt,
        selectedSkillRefs: result.trace.skillRefs,
        compiledPackage: {
          objective: result.guidance.objective || '',
          stepOutline: result.guidance.stepOutline || [],
          reportHints: result.guidance.reportHints || [],
          executorPromptPreview: result.executorPrompt.slice(0, 400),
        },
        timings: result.diagnostics?.timings || null,
        model: result.diagnostics?.model || null,
      },
      diagnosis: {
        failureStage: result.qc.pass ? null : 'compilation',
        notes: result.qc.issues,
      },
    });
    saveRoutedRun(routedRun);

    process.stdout.write(`${JSON.stringify({ ...result, runId }, null, 2)}\n`);
  } catch (error) {
    saveRoutedRun(buildRoutedRunRecord({
      runId,
      status: 'failed',
      userRequest: { text: prompt },
      retrieval: buildFailureRetrieval(error, prompt),
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
