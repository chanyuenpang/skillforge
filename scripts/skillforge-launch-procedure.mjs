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

function stepResult(name, block) {
  return `${name}: ${block.status === 0 && !block.error ? 'PASS' : 'FAIL'}`;
}

const release = runScript('skillforge-release.mjs');
const operate = runScript('skillforge-operate.mjs');

const overallOk = [release, operate].every((block) => block.status === 0 && !block.error);
const procedureState = overallOk ? 'READY' : 'FAIL';

console.log('SkillForge Launch Procedure');
console.log(`Project root: ${projectRoot}`);
console.log('Procedure summary:');
console.log(`- release: ${release.status === 0 ? 'ok' : 'failed'}`);
console.log(`- operate: ${operate.status === 0 ? 'ok' : 'failed'}`);
console.log(`- final: ${procedureState}`);
console.log('');
console.log('Procedure steps:');
console.log(`1. ${stepResult('skillforge-release.mjs', release)}`);
console.log(`2. ${stepResult('skillforge-operate.mjs', operate)}`);
console.log(`3. final: ${procedureState}`);
console.log('');
console.log(summarizeBlock('skillforge-release.mjs', release));
console.log('');
console.log(summarizeBlock('skillforge-operate.mjs', operate));

process.exit(overallOk ? 0 : 1);
