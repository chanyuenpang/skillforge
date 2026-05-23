#!/usr/bin/env node
/**
 * test-skillforge-transcript-store.mjs
 *
 * Verifies the transcript-store.mjs module:
 *   1. buildTranscriptRecord produces a valid record
 *   2. validateTranscriptRecord catches invalid records
 *   3. save persists a record to ~/.skillforge/transcript-store.jsonl
 *   4. loadById retrieves the latest record by caseId
 *   5. list returns unique entries
 *   6. count returns total lines
 */

import {
  buildTranscriptRecord,
  validateTranscriptRecord,
  save,
  loadById,
  list,
  count,
  TRANSCRIPT_STORE_VERSION,
} from '../src/skillforge/transcript-store.mjs';

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

// ── 1. buildTranscriptRecord ───────────────────────────────────────────
section('1. buildTranscriptRecord');

const record = buildTranscriptRecord({
  caseId: 'test-case-1',
  fixtureId: 'test-fixture-1',
  provider: 'openai',
  model: 'gpt-4o-mini',
  input: 'Hello, how are you?',
  outputContent: 'I am fine, thank you!',
  outputRole: 'assistant',
  finishReason: 'stop',
  usage: { promptTokens: 15, completionTokens: 8, totalTokens: 23 },
  executionTimeMs: 1250,
  providerRunId: 'chatcmpl-ABC123',
  status: 'completed',
});

check('transcriptId is set', () => record.transcriptId === 'openai:chatcmpl-ABC123');
check('caseId matches', () => record.caseId === 'test-case-1');
check('fixtureId matches', () => record.fixtureId === 'test-fixture-1');
check('provider is openai', () => record.provider === 'openai');
check('model is gpt-4o-mini', () => record.model === 'gpt-4o-mini');
check('status is completed', () => record.status === 'completed');
check('timestamp is ISO string', () => {
  const ts = Date.parse(record.timestamp);
  return !Number.isNaN(ts) && typeof record.timestamp === 'string';
});
check('output.content is set', () => record.output.content === 'I am fine, thank you!');
check('finishReason is stop', () => record.output.finishReason === 'stop');
check('usage.totalTokens is 23', () => record.usage.totalTokens === 23);
check('providerRunId is chatcmpl-ABC123', () => record.providerRunId === 'chatcmpl-ABC123');
check('executionTimeMs is 1250', () => record.executionTimeMs === 1250);
check('storeVersion is set', () => record.storeVersion === TRANSCRIPT_STORE_VERSION);
console.log(`  record.transcriptId: ${record.transcriptId}`);
console.log(`  record.timestamp: ${record.timestamp}`);

// ── 2. validateTranscriptRecord ────────────────────────────────────────
section('2. validateTranscriptRecord');

const validCheck = validateTranscriptRecord(record);
check('valid record passes', () => validCheck.valid === true && validCheck.errors.length === 0);

const emptyCheck = validateTranscriptRecord({});
check('empty object fails', () => emptyCheck.valid === false && emptyCheck.errors.length > 0);

const nullCheck = validateTranscriptRecord(null);
check('null fails', () => nullCheck.valid === false);

const noId = buildTranscriptRecord({ caseId: 'x', provider: 'openai', model: 'gpt-4' });
noId.transcriptId = '';
const noIdCheck = validateTranscriptRecord(noId);
check('empty transcriptId fails', () => noIdCheck.valid === false);

// ── 3. save + loadById + list + count ──────────────────────────────────
section('3. Persistence (save / loadById / list / count)');

const recordB = buildTranscriptRecord({
  caseId: 'test-case-2',
  fixtureId: 'test-fixture-2',
  provider: 'openai',
  model: 'gpt-4',
  input: 'What is 2+2?',
  outputContent: '4',
  status: 'completed',
  usage: { totalTokens: 10 },
});

let saveResult;
try {
  saveResult = save(record);
  console.log(`  save(record-A): ok=${saveResult.ok} transcriptId=${saveResult.transcriptId}`);
} catch (e) {
  console.log(`  save(record-A): FAIL — ${e.message}`);
  exitCode = 1;
}

let saveResultB;
try {
  saveResultB = save(recordB);
  console.log(`  save(record-B): ok=${saveResultB.ok} transcriptId=${saveResultB.transcriptId}`);
} catch (e) {
  console.log(`  save(record-B): FAIL — ${e.message}`);
  exitCode = 1;
}

check('save result A ok', () => saveResult?.ok === true, record.transcriptId);
check('save result B ok', () => saveResultB?.ok === true, recordB.transcriptId);

const loaded = loadById('test-case-1');
check('loadById(test-case-1) finds record', () => loaded != null, `found ${loaded?.transcriptId}`);
check('loaded caseId matches', () => loaded?.caseId === 'test-case-1');
check('loaded fixtureId matches', () => loaded?.fixtureId === 'test-fixture-1');

const loadedB = loadById('test-case-2');
check('loadById(test-case-2) finds record', () => loadedB != null, `found ${loadedB?.transcriptId}`);
check('loaded-B caseId matches', () => loadedB?.caseId === 'test-case-2');

const allEntries = list();
check('list returns at least 2 unique entries', () => allEntries.length >= 2);

const totalLines = count();
check('count >= 2', () => totalLines >= 2, `count=${totalLines}`);

// ── Summary ────────────────────────────────────────────────────────────
section('Summary');
const passed = errors.length === 0;
console.log(`  ${passed ? 'All checks PASSED' : `${errors.length} check(s) FAILED`}`);
console.log(`  Store path: ~/.skillforge/transcript-store.jsonl`);
if (!passed) {
  console.log(`  Failures: ${errors.join(', ')}`);
}

process.exit(exitCode);
