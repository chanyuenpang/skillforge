#!/usr/bin/env node
import { schemaRegistry } from '../src/skillforge/schema.mjs';
import { createReviewRecord, validateReviewRecord } from '../src/skillforge/review-record.mjs';
import { createPublishPrep, validatePublishPrep } from '../src/skillforge/publish-prep.mjs';
import { createRegistryEntry, validateRegistryEntry } from '../src/skillforge/registry-entry.mjs';
import { buildRuntimeReplayReport, RUNTIME_REPLAY_KIND, RUNTIME_REPLAY_PROTOCOL_VERSION, RUNTIME_REPLAY_REPORT_VERSION } from '../src/skillforge/runtime-replay-reporter.mjs';
import { runGeneratorPipeline } from '../src/skillforge/generator-orchestrator.mjs';
import { list as listRegistryStore } from '../src/skillforge/registry-store.mjs';
import { list as listReviewStore } from '../src/skillforge/review-store.mjs';
import { list as listPrepStore } from '../src/skillforge/prep-store.mjs';
import { list as listTranscriptStore, count as countTranscripts } from '../src/skillforge/transcript-store.mjs';
import { list as listExecutionLog, recent as recentExecutionLog, count as countExecutionLog } from '../src/skillforge/execution-log-store.mjs';
import { listCheckpointProgress } from '../src/skillforge/recovery-checkpoint.mjs';

const PASS = '✅ PASS';
const FAIL = '❌ FAIL';
function pad(s, n) { return String(s).padEnd(n); }

console.log(`\n  SkillForge — Read-only Status Report`);
console.log(`  Generated: ${new Date().toISOString()}\n`);

// 1. 注册态
console.log('═══ 1. 注册态 ═══');
const names = Object.keys(schemaRegistry);
names.forEach(n => console.log(`  ${pad(n, 28)} ${schemaRegistry[n].version}`));
const allRegistered = names.includes('review-record') && names.includes('publish-prep') && names.includes('registry-entry');
console.log(allRegistered ? `  ${PASS}  Core schemas registered.\n` : `  ${FAIL}  Missing core schemas.\n`);

// 2. 校验态
console.log('═══ 2. 校验态 ═══');
let allValid = true;

const rr = createReviewRecord('demo-fixture', { generateRef: 'g1', validateRef: 'v1' }, ['ws.yaml']);
rr.status = 'approved';
rr.decision = 'approve';
rr.updatedAt = new Date().toISOString();
const rrV = validateReviewRecord(rr);
console.log(`  ${pad('review-record', 28)} ${rrV.valid ? PASS : FAIL}  status=${rr.status} decision=${rr.decision}`);
if (!rrV.valid) allValid = false;

const pp = createPublishPrep(rr, { staticValidationPassed: true, preflightPassed: true });
const ppV = validatePublishPrep(pp);
console.log(`  ${pad('publish-prep', 28)} ${ppV.valid ? PASS : FAIL}  readiness=${pp.readiness.overall} handoff=${pp.handoffMeta.status}`);
if (!ppV.valid) allValid = false;

const re = createRegistryEntry(pp, { registryId: 'reg-demo', version: '0.1.0', source: { type: 'skillforge-fixture', location: 'demo' } });
const reV = validateRegistryEntry(re);
console.log(`  ${pad('registry-entry', 28)} ${reV.valid ? PASS : FAIL}  status=${re.registryMeta.status} version=${re.version}`);
if (!reV.valid) allValid = false;

console.log(allValid ? `  ${PASS}  All schemas validated.\n` : `  ${FAIL}  Validation failures.\n`);

// 3. 阶段态
console.log('═══ 3. 阶段态 ═══');
console.log(`  Step 1 — ReviewRecord                  ${rrV.valid ? PASS : FAIL}`);
console.log(`  Step 2 — PublishPrep (→ from review)    ${ppV.valid ? PASS : FAIL}`);
console.log(`  Step 3 — RegistryEntry (→ from prep)    ${reV.valid ? PASS : FAIL}`);
const chainOk = rrV.valid && ppV.valid && reV.valid;
console.log(chainOk ? `  ${PASS}  Three-stage chain constructible end-to-end.\n` : `  ${FAIL}  Chain broken.\n`);

// 4. 门槛态
console.log('═══ 4. 门槛态 ═══');
const g1 = rr.status === 'approved' && rr.decision === 'approve';
const g2 = pp.readiness.overall === 'ready';
const g3 = re.registryMeta.status !== 'published';
console.log(`  ${pad('ReviewRecord approved→publish-prep', 44)} ${g1 ? PASS : FAIL}`);
console.log(`  ${pad('publish-prep readiness ready', 44)} ${g2 ? PASS : FAIL}`);
console.log(`  ${pad('approved ≠ publish complete', 44)} ${g3 ? PASS : FAIL}`);
const gatesOk = g1 && g2 && g3;
console.log(gatesOk ? `  ${PASS}  All gates satisfied.\n` : `  ${FAIL}  Gate failure.\n`);

// Summary
console.log('═══ Summary ═══');
console.log(`  注册态 ${allRegistered ? PASS : FAIL}  校验态 ${allValid ? PASS : FAIL}  阶段态 ${chainOk ? PASS : FAIL}  门槛态 ${gatesOk ? PASS : FAIL}\n`);
console.log(allRegistered && allValid && chainOk && gatesOk
  ? '  ✅ SkillForge system is structurally sound.\n'
  : '  ⚠️  Issues detected.\n');

// 5. Runtime Replay Status
console.log('═══ 5. Runtime Replay Status ═══');
let runtimeOk = true;
let report;
try { report = buildRuntimeReplayReport({}); runtimeOk = true; } catch (e) { runtimeOk = false; }
console.log(`  ${pad('Report constructible (empty args)', 44)} ${report?.kind === RUNTIME_REPLAY_KIND ? PASS : FAIL}`);
console.log(`  ${pad('Protocol version', 44)} ${RUNTIME_REPLAY_PROTOCOL_VERSION}`);
console.log(`  ${pad('Artifact version', 44)} ${RUNTIME_REPLAY_REPORT_VERSION}`);
console.log(`  ${pad('Kind', 44)} ${report?.kind ?? '—'}`);
console.log(`  ${pad('Status taxonomy', 44)} ${Array.isArray(report?.metadata?.statusTaxonomy?.reportStatuses) ? PASS : FAIL}`);
console.log(`  ${pad('Report status output', 44)} ${report?.status === 'draft' ? PASS : FAIL}`);
console.log(`  ${pad('Execution mode', 44)} ${report?.metadata?.note ? 'synthetic (honest, non-real)' : FAIL}`);
console.log(runtimeOk ? `  ${PASS}  Runtime Replay chain structurally observable.\n` : `  ${FAIL}  Runtime Replay unavailable.\n`);

// 6. Generator Status
console.log('═══ 6. Generator Status ═══');
const minimalWorkflowSource = {
  id: 'demo-generator-status',
  name: 'demo-generator-status',
  title: 'Demo Generator Status',
  description: 'Minimal workflow source for generator observability.',
  triggerPhrases: ['demo'],
  boundaries: ['read-only status probe'],
  kind: 'workflow-source',
  version: '0.0.0',
  compatibility: { node: '>=18' },
  privacy: { level: 'internal' }
};
let generatorReport;
let generatorConstructible = false;
try {
  generatorReport = await runGeneratorPipeline(minimalWorkflowSource);
  generatorConstructible = Boolean(generatorReport);
} catch (e) {
  generatorReport = { error: e?.message ?? String(e) };
}
const generatorStatus = generatorReport?.status ?? generatorReport?.result?.status ?? 'unknown';
const generatorOutcome = generatorConstructible ? 'constructible' : 'not constructible';
console.log(`  ${pad('Pipeline constructible', 44)} ${generatorConstructible ? PASS : FAIL}`);
console.log(`  ${pad('Outcome', 44)} ${generatorOutcome}`);
console.log(`  ${pad('Observed status', 44)} ${generatorStatus}`);
console.log(`  ${pad('Error', 44)} ${generatorReport?.error ?? '—'}`);
console.log(generatorConstructible ? `  ${PASS}  Generator status surface is minimally observable.\n` : `  ${FAIL}  Generator status surface unavailable.\n`);

// 7. Review Store Status
console.log('═══ 7. Review Store Status ═══');
let reviewEntries = [];
let reviewAccessible = false;
try {
  reviewEntries = listReviewStore();
  reviewAccessible = true;
} catch (e) {
  reviewEntries = [];
}
console.log(`  ${pad('Store accessible', 44)} ${reviewAccessible ? PASS : FAIL}`);
console.log(`  ${pad('Persisted entries (unique)', 44)} ${reviewEntries.length}`);
if (reviewEntries.length > 0) {
  const recent = reviewEntries.slice(-3).reverse();
  console.log(`  ${pad('Recent entries', 44)}`);
  for (const e of recent) {
    console.log(`    • ${e.fixtureId}  status=${e.status}  decision=${e.decision ?? '—'}`);
  }
}
console.log(reviewAccessible ? `  ${PASS}  Review store is accessible.
` : `  ${FAIL}  Review store unavailable.
`);

// 8. Prep Store Status
console.log('═══ 8. Prep Store Status ═══');
let prepEntries = [];
let prepAccessible = false;
try {
  prepEntries = listPrepStore();
  prepAccessible = true;
} catch (e) {
  prepEntries = [];
}
console.log(`  ${pad('Store accessible', 44)} ${prepAccessible ? PASS : FAIL}`);
console.log(`  ${pad('Persisted entries (unique)', 44)} ${prepEntries.length}`);
if (prepEntries.length > 0) {
  const recent = prepEntries.slice(-3).reverse();
  console.log(`  ${pad('Recent entries', 44)}`);
  for (const e of recent) {
    const fid = e.reviewRecordRef?.fixtureId ?? e.fixtureId ?? '?';
    console.log(`    • ${fid}  readiness=${e.readiness?.overall ?? '?'}`);
  }
}
console.log(prepAccessible ? `  ${PASS}  Prep store is accessible.
` : `  ${FAIL}  Prep store unavailable.
`);

// 9. Registry Store Status
console.log('═══ 9. Registry Store Status ═══');
let storeEntries = [];
let storeAccessible = false;
try {
  storeEntries = listRegistryStore();
  storeAccessible = true;
} catch (e) {
  storeEntries = [];
}
console.log(`  ${pad('Store accessible', 44)} ${storeAccessible ? PASS : FAIL}`);
console.log(`  ${pad('Persisted entries (unique)', 44)} ${storeEntries.length}`);
if (storeEntries.length > 0) {
  const recent = storeEntries.slice(-3).reverse();
  console.log(`  ${pad('Recent entries', 44)}`);
  for (const e of recent) {
    const st = e.registryMeta?.status ?? '?';
    const ver = e.version ?? '?';
    console.log(`    • ${e.fixtureId}  v${ver}  status=${st}`);
  }
}
console.log(storeAccessible ? `  ${PASS}  Registry store is accessible.\n` : `  ${FAIL}  Registry store unavailable.\n`);

// 10. Recovery Checkpoint Status
console.log('═══ 10. Recovery Checkpoint Status ═══');
let checkpoints = [];
let checkpointAccessible = false;
try {
  checkpoints = listCheckpointProgress();
  checkpointAccessible = true;
} catch (e) {
  checkpoints = [];
}
console.log(`  ${pad('Checkpoint surface', 44)} ${checkpointAccessible ? PASS : FAIL}`);
console.log(`  ${pad('Recoverable fixtures', 44)} ${checkpoints.length}`);
if (checkpoints.length > 0) {
  const recent = checkpoints.slice(-3).reverse();
  console.log(`  ${pad('Recent checkpoint', 44)}`);
  for (const cp of recent) {
    console.log(`    • ${cp.fixtureId}  stage=${cp.stage}  resume=${cp.canResume ? 'yes' : 'no'}`);
  }
}
console.log(checkpointAccessible ? `  ${PASS}  Recovery checkpoint is observable.\n` : `  ${FAIL}  Recovery checkpoint unavailable.\n`);

// 11. Transcript Store Status
console.log('═══ 11. Transcript Store Status ═══');
let transcriptEntries = [];
let transcriptAccessible = false;
try {
  transcriptEntries = listTranscriptStore();
  transcriptAccessible = true;
} catch (e) {
  transcriptEntries = [];
}
const transcriptCount = countTranscripts();
console.log(`  ${pad('Store accessible', 44)} ${transcriptAccessible ? PASS : FAIL}`);
console.log(`  ${pad('Total lines stored', 44)} ${transcriptCount}`);
console.log(`  ${pad('Unique case entries', 44)} ${transcriptEntries.length}`);
if (transcriptEntries.length > 0) {
  const recent = transcriptEntries.slice(-3).reverse();
  console.log(`  ${pad('Recent transcripts', 44)}`);
  for (const e of recent) {
    const ts = (e.timestamp ?? '').slice(0, 19).replace('T', ' ');
    console.log(`    • ${e.transcriptId}  ${e.status}  model=${e.model}  ${ts}`);
  }
}
console.log(transcriptAccessible ? `  ${PASS}  Transcript store is accessible.\n` : `  ${FAIL}  Transcript store unavailable.\n`);

// 12. Execution Log Status
console.log('═══ 12. Execution Log Status ═══');
let logEntries = [];
let logAccessible = false;
try {
  logEntries = listExecutionLog();
  logAccessible = true;
} catch (e) {
  logEntries = [];
}
const logCount = countExecutionLog();
console.log(`  ${pad('Store accessible', 44)} ${logAccessible ? PASS : FAIL}`);
console.log(`  ${pad('Total entries', 44)} ${logCount}`);
if (logCount > 0) {
  const recent = recentExecutionLog(5);
  console.log(`  ${pad('Recent entries', 44)}`);
  for (const e of recent) {
    const ts = (e.timestamp ?? '').slice(0, 19).replace('T', ' ');
    console.log(`    • ${e.executionId}  fixture=${e.fixtureId}  ${e.status}  ${ts}  source=${e.source}`);
  }
}
console.log(logAccessible ? `  ${PASS}  Execution log store is accessible.\n` : `  ${FAIL}  Execution log store unavailable.\n`);
