#!/usr/bin/env node
/**
 * test-skillforge-execution-log-store.mjs
 *
 * Verifies the execution-log-store.mjs module:
 *   1. buildExecutionLogEntry produces a valid entry
 *   2. validateExecutionLogEntry catches invalid entries
 *   3. save persists an entry to ~/.skillforge/execution-log.jsonl
 *   4. loadById retrieves entries by fixtureId
 *   5. list returns all entries (ordered by insertion)
 *   6. recent returns most recent N entries
 *   7. count returns total lines
 */

import {
  buildExecutionLogEntry,
  validateExecutionLogEntry,
  save,
  loadById,
  list,
  recent,
  count,
  EXECUTION_LOG_VERSION,
} from '../src/skillforge/execution-log-store.mjs';

const PASS = '✅ PASS';
const FAIL = '❌ FAIL';

let exitCode = 0;
const errors = [];

function section(title) {
  console.log(`\n═══ ${title} ═══`);
}

function check(label, predicate, detail = '') {
  const ok = predicate();
  console.log(`  ${ok ? PASS : FAIL}  ${label}${detail ? `  ${detail}` : ''}`);
  if (!ok) {
    exitCode = 1;
    errors.push(label);
  }
}

// ── 1. buildExecutionLogEntry ──────────────────────────────────────────
section('1. buildExecutionLogEntry');

const entry = buildExecutionLogEntry({
  fixtureId: 'demo-fixture-v1',
  status: 'completed',
  source: 'skillforge-operate',
  steps: { review: true, prep: true, registry: true },
  durationMs: 342,
});

check('executionId is set', () => typeof entry.executionId === 'string' && entry.executionId.length > 0);
check('fixtureId matches', () => entry.fixtureId === 'demo-fixture-v1');
check('status is completed', () => entry.status === 'completed');
check('source is skillforge-operate', () => entry.source === 'skillforge-operate');
check('steps.review is true', () => entry.steps.review === true);
check('steps.prep is true', () => entry.steps.prep === true);
check('steps.registry is true', () => entry.steps.registry === true);
check('durationMs is 342', () => entry.durationMs === 342);
check('errorMessage is null for completed', () => entry.errorMessage === null);
check('timestamp is ISO string', () => {
  const ts = Date.parse(entry.timestamp);
  return !Number.isNaN(ts) && typeof entry.timestamp === 'string';
});
check('logVersion is set', () => entry.logVersion === EXECUTION_LOG_VERSION);
console.log(`  entry.executionId: ${entry.executionId}`);
console.log(`  entry.timestamp: ${entry.timestamp}`);

// Failed entry
const failedEntry = buildExecutionLogEntry({
  fixtureId: 'broken-fixture-v1',
  status: 'failed',
  source: 'skillforge-operate',
  errorMessage: 'RegistryEntry validation failed: fixtureId is required',
  steps: { review: true, prep: false, registry: false },
});
check('failed entry status is failed', () => failedEntry.status === 'failed');
check('failed entry errorMessage is set', () =>
  failedEntry.errorMessage.includes('RegistryEntry validation failed'),
);
check('failed entry steps.prep is false', () => failedEntry.steps.prep === false);

// Minimal entry
const minimalEntry = buildExecutionLogEntry({ fixtureId: 'minimal-test' });
check('minimal entry has fixtureId', () => minimalEntry.fixtureId === 'minimal-test');
check('minimal entry defaults to completed', () => minimalEntry.status === 'completed');
check('minimal entry defaults to skillforge-operate', () => minimalEntry.source === 'skillforge-operate');
check('minimal entry steps is null', () => minimalEntry.steps === null);
check('minimal entry durationMs is null', () => minimalEntry.durationMs === null);

// ── 2. validateExecutionLogEntry ───────────────────────────────────────
section('2. validateExecutionLogEntry');

const validCheck = validateExecutionLogEntry(entry);
check('valid entry passes', () => validCheck.valid === true && validCheck.errors.length === 0);

const emptyCheck = validateExecutionLogEntry({});
check('empty object fails', () => emptyCheck.valid === false && emptyCheck.errors.length > 0);

const nullCheck = validateExecutionLogEntry(null);
check('null fails', () => nullCheck.valid === false);

const badStatus = { ...entry, status: 'unknown' };
const badStatusCheck = validateExecutionLogEntry(badStatus);
check('unknown status fails', () => badStatusCheck.valid === false);

const noSource = { ...entry, source: '' };
const noSourceCheck = validateExecutionLogEntry(noSource);
check('empty source fails', () => noSourceCheck.valid === false);

// ── 3. Persistence ─────────────────────────────────────────────────────
section('3. Persistence (save / loadById / list / count)');

let saveResult;
try {
  saveResult = save(entry);
  console.log(`  save(entry-A): ok=${saveResult.ok} id=${saveResult.executionId}`);
} catch (e) {
  console.log(`  save(entry-A): FAIL — ${e.message}`);
  exitCode = 1;
}

let saveResultB;
try {
  saveResultB = save(failedEntry);
  console.log(`  save(entry-B-failed): ok=${saveResultB.ok} id=${saveResultB.executionId}`);
} catch (e) {
  console.log(`  save(entry-B): FAIL — ${e.message}`);
  exitCode = 1;
}

let saveResultC;
try {
  saveResultC = save(minimalEntry);
  console.log(`  save(entry-C-minimal): ok=${saveResultC.ok} id=${saveResultC.executionId}`);
} catch (e) {
  console.log(`  save(entry-C): FAIL — ${e.message}`);
  exitCode = 1;
}

check('save result A ok', () => saveResult?.ok === true, saveResult.executionId);
check('save result B ok', () => saveResultB?.ok === true, saveResultB.executionId);
check('save result C ok', () => saveResultC?.ok === true, saveResultC.executionId);

// loadById — returns all entries for a fixtureId (ordered)
const loaded = loadById('demo-fixture-v1');
check('loadById contains entry-A', () => loaded.some((e) => e.executionId === saveResult.executionId));

const loadedB = loadById('broken-fixture-v1');
check('loadById contains entry-B', () => loadedB.some((e) => e.executionId === saveResultB.executionId));

const loadedC = loadById('minimal-test');
check('loadById contains entry-C', () => loadedC.some((e) => e.executionId === saveResultC.executionId));

// list — returns all entries (ordered by insertion)
const allEntries = list();
check('list returns at least 3 entries', () => allEntries.length >= 3);

// recent — returns most recent N in reverse order
const recentEntries = recent(2);
check('recent(2) returns 2 entries', () => recentEntries.length === 2);
// The last saved entry (minimalTest) should be first
check('recent(2)[0] is most recent (entry-C)', () =>
  recentEntries[0].fixtureId === 'minimal-test',
);

const totalLines = count();
check('count >= 3', () => totalLines >= 3, `count=${totalLines}`);

// ── Summary ────────────────────────────────────────────────────────────
section('Summary');
const passed = errors.length === 0;
console.log(`  ${passed ? 'All checks PASSED' : `${errors.length} check(s) FAILED`}`);
console.log(`  Store path: ~/.skillforge/execution-log.jsonl`);
if (!passed) {
  console.log(`  Failures: ${errors.join(', ')}`);
}

process.exit(exitCode);
