#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const target = resolve(here, 'skillforge-release.mjs');

const result = spawnSync(process.execPath, [target], {
  encoding: 'utf8',
  maxBuffer: 10 * 1024 * 1024,
});

const stdout = result.stdout ?? '';
const stderr = result.stderr ?? '';
const output = `${stdout}${stderr}`;
const exitCode = typeof result.status === 'number' ? result.status : 1;

const required = [
  'SkillForge release delivery entry',
  'Delivery summary:',
  'overall: ready-for-release',
  'smoke gate: ok',
];

const missing = required.filter((needle) => !output.includes(needle));
const passed = exitCode === 0 && missing.length === 0;

console.log(`exitCode: ${exitCode}`);
if (stdout) {
  console.log('--- stdout ---');
  process.stdout.write(stdout.endsWith('\n') ? stdout : `${stdout}\n`);
}
if (stderr) {
  console.log('--- stderr ---');
  process.stdout.write(stderr.endsWith('\n') ? stderr : `${stderr}\n`);
}

if (passed) {
  console.log('✅ PASS');
  process.exit(0);
}

console.log('❌ FAIL');
if (missing.length > 0) {
  console.log(`missing: ${missing.join(', ')}`);
}
process.exit(1);
