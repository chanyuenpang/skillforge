#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function runScript(scriptName) {
  const scriptPath = path.join(projectRoot, 'scripts', scriptName);
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: projectRoot,
    encoding: 'utf8',
  });

  return {
    scriptName,
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    error: result.error ? String(result.error.message || result.error) : '',
  };
}

function summarizeBlock(label, block) {
  const lines = [];
  lines.push(`## ${label}`);
  lines.push(`- exit: ${block.status}`);
  if (block.error) lines.push(`- error: ${block.error}`);
  if (block.stdout.trim()) {
    lines.push('- stdout:');
    for (const line of block.stdout.trim().split(/\r?\n/)) lines.push(`  ${line}`);
  }
  if (block.stderr.trim()) {
    lines.push('- stderr:');
    for (const line of block.stderr.trim().split(/\r?\n/)) lines.push(`  ${line}`);
  }
  return lines.join('\n');
}

const smoke = runScript('skillforge-smoke-gate.mjs');
const status = runScript('skillforge-status.mjs');
const operate = runScript('skillforge-operate.mjs');

const overallOk = [smoke, status, operate].every((block) => block.status === 0 && !block.error);

console.log('SkillForge release delivery entry');
console.log(`Project root: ${projectRoot}`);
console.log('Delivery summary:');
console.log(`- smoke gate: ${smoke.status === 0 ? 'ok' : 'failed'}`);
console.log(`- status: ${status.status === 0 ? 'ok' : 'failed'}`);
console.log(`- operate: ${operate.status === 0 ? 'ok' : 'failed'}`);
console.log(`- overall: ${overallOk ? 'ready-for-release' : 'release-blocked'}`);
console.log('');
console.log(summarizeBlock('skillforge-smoke-gate.mjs', smoke));
console.log('');
console.log(summarizeBlock('skillforge-status.mjs', status));
console.log('');
console.log(summarizeBlock('skillforge-operate.mjs', operate));

process.exit(overallOk ? 0 : 1);
