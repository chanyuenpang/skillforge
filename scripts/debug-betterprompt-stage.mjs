#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { normalizeBetterPromptV1Input, validateBetterPromptV1Input } from '../src/skillforge/betterprompt-v1-contract.mjs';
import { buildCompilationPrompt, normalizeCompiledOutput } from '../src/skillforge/betterprompt-builder.mjs';
import { resolveSkills } from '../src/skillforge/skill-resolver.mjs';
import { callJsonModel } from '../src/skillforge/llm-json.mjs';
import { BETTERPROMPT_COMPILATION_SKILL } from '../src/skillforge/system-skills.mjs';

function parseArgs(argv) {
  const args = {
    prompt: '',
    file: '',
    goalHint: '',
    tools: '',
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
    if (flag === '--prompt') args.prompt = readValue();
    if (flag === '--file') args.file = readValue();
    if (flag === '--goal-hint') args.goalHint = readValue();
    if (flag === '--tools') args.tools = readValue();
  }

  return args;
}

function parseTools(csv = '') {
  return String(csv)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

async function readPrompt(args) {
  if (args.file) return readFile(args.file, 'utf8');
  if (args.prompt) return args.prompt;
  if (process.stdin.isTTY) return '';
  let data = '';
  for await (const chunk of process.stdin) data += chunk;
  return data.trim();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rawPrompt = await readPrompt(args);
  if (!rawPrompt) {
    console.error('Usage: node scripts/debug-betterprompt-stage.mjs --prompt "..."');
    process.exit(1);
  }

  const input = normalizeBetterPromptV1Input({
    rawPrompt,
    ...(args.goalHint ? { goal_hint: args.goalHint } : {}),
  });
  const validated = validateBetterPromptV1Input(input);
  if (!validated.success) {
    console.error(JSON.stringify({ success: false, stage: 'input_validation', issues: validated.error.issues }, null, 2));
    process.exit(2);
  }

  const routingStartedAt = performance.now();
  const routingResult = await resolveSkills({
    context: {
      intent: input.goal_hint || '',
      description: input.rawPrompt,
      text: input.rawPrompt,
      tools: parseTools(args.tools),
      tags: [],
    },
  });
  const routingMs = Math.round(performance.now() - routingStartedAt);

  const payload = {
    success: true,
    routing: {
      selectedIds: (routingResult.selected || []).map((skill) => skill.id),
      rejectedCount: Array.isArray(routingResult.rejected) ? routingResult.rejected.length : 0,
      rationale: routingResult.routingRationale || [],
      metadata: routingResult.metadata || null,
      timings: { routingMs },
    },
  };

  if (!Array.isArray(routingResult.selected) || routingResult.selected.length === 0) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  const compilationPrompt = buildCompilationPrompt(input, routingResult);
  const compilationStartedAt = performance.now();
  const llmResult = await callJsonModel({
    stage: 'betterprompt_compilation',
    systemPrompt: BETTERPROMPT_COMPILATION_SKILL.systemPrompt,
    userPrompt: compilationPrompt,
    maxTokens: 1800,
  });
  const compilationMs = Math.round(performance.now() - compilationStartedAt);
  const compiled = normalizeCompiledOutput(llmResult.data);

  payload.compilation = {
    timings: { compilationMs },
    modelMeta: llmResult.meta,
    executorPromptPreview: (compiled.executorPrompt || '').slice(0, 600),
    promptPreview: compilationPrompt.slice(0, 1200),
  };

  console.log(JSON.stringify(payload, null, 2));
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
