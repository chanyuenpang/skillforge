#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const scriptPath = path.join(projectRoot, 'scripts', 'skillforge-launch-procedure.mjs');

const result = spawnSync(process.execPath, [scriptPath], {
  cwd: projectRoot,
  encoding: 'utf8',
});

const stdout = result.stdout || '';
const stderr = result.stderr || '';
const exitCode = result.status;

const checks = [
  { label: 'SkillForge Launch Procedure', found: stdout.includes('SkillForge Launch Procedure') },
  { label: 'Procedure summary:', found: stdout.includes('Procedure summary:') },
  { label: 'release: ok', found: stdout.includes('release: ok') },
  { label: 'operate: ok', found: stdout.includes('operate: ok') },
  { label: 'final: READY', found: stdout.includes('final: READY') },
];

console.log('=== test-skillforge-launch-procedure.mjs ===');
console.log('');
console.log(`[spawn] node scripts/skillforge-launch-procedure.mjs`);
console.log(`exit code: ${exitCode}`);
console.log(`stderr: ${stderr || '(empty)'}`);
console.log('');
console.log('--- stdout ---');
console.log(stdout.trim());
console.log('--- end stdout ---');
console.log('');

let allPass = true;
for (const chk of checks) {
  const icon = chk.found ? '✅' : '❌';
  if (!chk.found) allPass = false;
  console.log(`${icon} contains "${chk.label}"`);
}

console.log('');
console.log(allPass ? '✅ PASS' : '❌ FAIL');

process.exit(allPass ? 0 : 1);
