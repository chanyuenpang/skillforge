#!/usr/bin/env node
/**
 * test-skillforge-operate.mjs — Validates the operator CLI chain AND verifies
 * that ALL THREE chain objects (ReviewRecord, PublishPrep, RegistryEntry)
 * are persisted to their respective stores.
 *
 * Steps:
 *   1. Clean all stores to start fresh
 *   2. Run skillforge-operate.mjs as child process; verify stdout + exit code
 *   3. Query all three stores to confirm 'demo-v1' was persisted in each
 *
 * Usage:
 *   node scripts/test-skillforge-operate.mjs
 */

import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, unlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { loadById as loadRegistryById } from '../src/skillforge/registry-store.mjs';
import { loadById as loadReviewById } from '../src/skillforge/review-store.mjs';
import { loadById as loadPrepById } from '../src/skillforge/prep-store.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const scriptPath = resolve(__dirname, 'skillforge-operate.mjs');
const BASE = `${homedir()}/.skillforge`;
const STORE_PATHS = [
  `${BASE}/review-store.jsonl`,
  `${BASE}/prep-store.jsonl`,
  `${BASE}/registry-store.jsonl`,
];

let passed = 0;
let failed = 0;

function check(label, condition) {
  if (condition) { passed++; console.log(`  PASS: ${label}`); }
  else { failed++; console.error(`  FAIL: ${label}`); }
}

// ---- Step 0: Clean all stores before test ----
for (const p of STORE_PATHS) {
  if (existsSync(p)) unlinkSync(p);
}
console.log('Cleaned all stores.\n');

// ---- Step 1: Run the operator CLI ----
let stdout = '';
let stderr = '';
let exitCode = 0;

try {
  stdout = execSync(`node ${JSON.stringify(scriptPath)}`, {
    encoding: 'utf8',
    timeout: 30_000,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
} catch (err) {
  stdout = err.stdout ?? '';
  stderr = err.stderr ?? '';
  exitCode = err.status ?? 1;
}

console.log('--- operator CLI stdout ---');
console.log(stdout);
if (stderr) {
  console.log('--- operator CLI stderr ---');
  console.log(stderr);
}
console.log(`--- exit code: ${exitCode} ---\n`);

check('stdout contains "SkillForge Operator CLI"', stdout.includes('SkillForge Operator CLI'));
check('stdout contains "validation: PASS"', stdout.includes('validation: PASS'));
check('stdout contains "status: OK"', stdout.includes('status: OK'));
check('stdout contains "Persist to ReviewStore"', stdout.includes('Persist to ReviewStore'));
check('stdout contains "Persist to PrepStore"', stdout.includes('Persist to PrepStore'));
check('stdout contains "Persist to RegistryStore"', stdout.includes('Persist to RegistryStore'));
check('stdout contains "review-store: OK"', stdout.includes('review-store: OK'));
check('stdout contains "prep-store: OK"', stdout.includes('prep-store: OK'));
check('stdout contains "registry-store: OK"', stdout.includes('registry-store: OK'));
check('stdout contains "all persisted"', stdout.includes('all persisted'));
check(`exit code is 0 (got ${exitCode})`, exitCode === 0);

// ---- Step 2: Verify all three persistence side-effects ----
const reviewEntry = loadReviewById('demo-v1');
check('review-record persisted via loadReviewById demo-v1', reviewEntry !== null);
if (reviewEntry) {
  check('review-record fixtureId matches', reviewEntry.fixtureId === 'demo-v1');
  check('review-record is valid kind', reviewEntry.kind === 'review-record');
  check('review-record status is approved', reviewEntry.status === 'approved');
}

const prepEntry = loadPrepById('demo-v1');
check('publish-prep persisted via loadPrepById demo-v1', prepEntry !== null);
if (prepEntry) {
  check('publish-prep reviewRecordRef fixtureId matches', prepEntry.reviewRecordRef?.fixtureId === 'demo-v1');
  check('publish-prep is valid kind', prepEntry.kind === 'publish-prep');
  check('publish-prep readiness is ready', prepEntry.readiness?.overall === 'ready');
}

const registryEntry = loadRegistryById('demo-v1');
check('registry-entry persisted via loadRegistryById demo-v1', registryEntry !== null);
if (registryEntry) {
  check('registry-entry fixtureId matches', registryEntry.fixtureId === 'demo-v1');
  check('registry-entry is valid kind', registryEntry.kind === 'registry-entry');
}

// ---- Summary ----
console.log(`\nResult: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log('❌ FAIL');
  process.exit(1);
} else {
  console.log('✅ PASS');
}
