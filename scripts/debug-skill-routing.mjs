#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { debugResolveSkills } from '../src/skillforge/skill-resolver.mjs';

const SAMPLE_PROMPT = `
Validate the browser page flow, check prerequisites first, and return a concise evidence-oriented report.
`;

function parseArgs(argv) {
  const args = {
    prompt: '',
    goalHint: '',
    file: '',
    tools: '',
    json: false,
  };

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
    if (flag === '--tools') args.tools = takeValue();
    if (flag === '--json') args.json = true;
  }

  return args;
}

function parseTools(csv = '') {
  return String(csv)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let prompt = args.prompt || SAMPLE_PROMPT;
  if (args.file) prompt = await readFile(args.file, 'utf8');

  const debug = await debugResolveSkills({
    context: {
      intent: args.goalHint || '',
      description: prompt,
      text: prompt,
      tools: parseTools(args.tools),
      tags: [],
    },
  });

  if (args.json) {
    console.log(JSON.stringify(debug, null, 2));
    return;
  }

  console.log('='.repeat(60));
  console.log('skill routing debug');
  console.log('='.repeat(60));
  console.log(`indexed skills: ${debug.totalIndexedSkills}`);
  console.log(`shortlisted: ${debug.shortlisted.length}`);
  console.log(`rejected: ${debug.rejected.length}`);
  console.log(`index version: ${debug.indexVersion || '-'}`);
  console.log(`scan id: ${debug.scanId || '-'}`);
  console.log(`db path: ${debug.dbPath || '-'}`);
  console.log('task extraction:', JSON.stringify(debug.taskExtraction?.record || {}, null, 2));
  console.log('recall anchors:', (debug.recallAnchors || []).join(', '));
  console.log('context signals:', debug.contextSignals.signals.join(', '));
  if ((debug.lexicalBaseline || []).length > 0) {
    console.log('lexical baseline candidates:');
    for (const candidate of debug.lexicalBaseline) {
      console.log(`- ${candidate.id} score=${candidate.heuristicScore}`);
    }
  }
  console.log('shortlisted candidates:');
  for (const candidate of debug.shortlisted) {
    const explain = candidate.recallExplain || {};
    const matchedTags = (explain.matchedTags || []).map((item) => item.name).join('|') || '-';
    const matchedFields = (explain.matchedFields || []).map((item) => `${item.field}:${(item.values || []).join('|')}`).join(';') || '-';
    console.log(`- ${candidate.id} score=${candidate.heuristicScore} tags=${matchedTags} fields=${matchedFields} tools=${candidate.requiredTools.join('|') || '-'}`);
  }
  console.log('routing prompt preview:');
  console.log(debug.routingPrompt);
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
