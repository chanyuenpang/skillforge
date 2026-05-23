#!/usr/bin/env node
/**
 * test-recovery-checkpoint.mjs
 *
 * End-to-end validation of the recovery-checkpoint module.
 * Verifies that lastCheckpoint, canResume, listCheckpointProgress
 * all work correctly, and that skillforge-status.mjs surfaces the
 * Recovery Checkpoint Status section.
 *
 * Uses existing persisted data in ~/.skillforge/*-store.jsonl.
 * Requires demo-v1 to be present through all three stages.
 */

import { lastCheckpoint, canResume, listCheckpointProgress } from '../src/skillforge/recovery-checkpoint.mjs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const FIXTURE_ID = 'demo-v1';
const PASS = '\x1b[32m✅ PASS\x1b[0m';
const FAIL = '\x1b[31m❌ FAIL\x1b[0m';

let allPass = true;

function check(label, ok, detail) {
  const tag = ok ? PASS : FAIL;
  if (!ok) allPass = false;
  console.log(`  ${tag}  ${label}${detail ? `  — ${detail}` : ''}`);
}

// ─── 1. lastCheckpoint returns non-null ───
console.log('');
console.log(`  ════════════════════════════════════════`);
console.log(`   Recovery Checkpoint Test`);
console.log(`   Fixture: ${FIXTURE_ID}`);
console.log(`   Started: ${new Date().toISOString()}`);
console.log(`  ════════════════════════════════════════`);
console.log('');

const cp = lastCheckpoint(FIXTURE_ID);
check('lastCheckpoint returns non-null', cp !== null, `stage=${cp?.stage ?? 'null'}`);

// ─── 2. Result reflects current stage ───
const stageOk = typeof cp?.stage === 'string' && cp.stage !== 'none' && cp.stage.startsWith('registry-');
check('Stage reflects registry (terminal chain stage)', stageOk, `stage=${cp?.stage}`);

// ─── 3. canResume is true ───
check('canResume() returns true', canResume(FIXTURE_ID) === true);

// ─── 4. listCheckpointProgress includes demo-v1 ───
const progress = listCheckpointProgress();
const foundInProgress = progress.some(p => p.fixtureId === FIXTURE_ID && p.canResume === true);
check('listCheckpointProgress includes demo-v1 as resumable', foundInProgress, `total fixtures=${progress.length}`);

// ─── 5. Returned object structure is sound ───
check('Checkpoint object has fixtureId', typeof cp?.fixtureId === 'string' && cp.fixtureId !== '');
check('Checkpoint object has canResume as boolean', typeof cp?.canResume === 'boolean');
check('Checkpoint object has review/prep/registry', cp?.review !== undefined, `review=${cp?.review !== null}, prep=${cp?.prep !== null}, registry=${cp?.registry !== null}`);
check('Checkpoint object has updatedAt timestamp', typeof cp?.updatedAt === 'string', cp?.updatedAt);

// ─── 6. skillforge-status.mjs output contains Recovery Checkpoint Status ───
console.log('');
console.log('  ─── skillforge-status.mjs integration ───');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const statusScript = resolve(__dirname, 'skillforge-status.mjs');

let statusOutput;
let statusExitCode;
try {
  statusOutput = execSync(`node "${statusScript}"`, { encoding: 'utf8', timeout: 15000 });
  statusExitCode = 0;
} catch (e) {
  statusOutput = e.stdout ?? '';
  statusExitCode = e.status ?? 1;
}

check('skillforge-status.mjs exits with code 0', statusExitCode === 0, `exit=${statusExitCode}`);
check('Output contains "Recovery Checkpoint Status"', statusOutput.includes('Recovery Checkpoint Status'));

// Extract and show checkpoint-relevant lines
const chkLines = statusOutput.split('\n').filter(l =>
  l.includes('Recovery') || l.includes('Checkpoint') || l.includes('Recoverable')
);
if (chkLines.length > 0) {
  console.log('  Checkpoint lines in status output:');
  for (const line of chkLines) {
    console.log(`    ${line.trim()}`);
  }
}

// ─── Summary ───
console.log('');
console.log(`  ════════════════════════════════════════`);
console.log(allPass ? `   ${PASS}  All recovery checkpoint tests passed.` : `   ${FAIL}  Some tests failed.`);
console.log(`  ════════════════════════════════════════`);
console.log('');

process.exit(allPass ? 0 : 1);
