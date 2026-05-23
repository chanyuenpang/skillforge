import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const target = resolve(__dirname, 'skillforge-smoke-gate.mjs');

const result = spawnSync(process.execPath, [target], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
});

const stdout = result.stdout ?? '';
const stderr = result.stderr ?? '';
const exitCode = typeof result.status === 'number' ? result.status : (result.error ? 1 : 0);

const required = [
  'SkillForge Smoke Gate',
  'SMOKE GATE: PASS',
  'checked: 2',
];

const combined = `${stdout}\n${stderr}`;
const passed = exitCode === 0 && required.every((s) => combined.includes(s));

console.log(`exitCode: ${exitCode}`);
console.log('stdout:');
process.stdout.write(stdout);
if (stdout && !stdout.endsWith('\n')) process.stdout.write('\n');
console.log('stderr:');
process.stdout.write(stderr);
if (stderr && !stderr.endsWith('\n')) process.stdout.write('\n');
console.log(passed ? '✅ PASS' : '❌ FAIL');

process.exitCode = passed ? 0 : 1;
