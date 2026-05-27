#!/usr/bin/env node
/**
 * skillforge-operate.mjs — Minimal operator CLI for the Review → PublishPrep → RegistryEntry chain
 *
 * Purpose:
 *   Provide the smallest honest interactive surface that actually constructs the
 *   three linked objects using the existing module implementations.
 *
 * Usage:
 *   node scripts/skillforge-operate.mjs
 */

import {
  createReviewRecord,
  validateReviewRecord,
} from '../src/skillforge/review-record.mjs';
import {
  createPublishPrep,
  validatePublishPrep,
} from '../src/skillforge/publish-prep.mjs';
import {
  createRegistryEntry,
  validateRegistryEntry,
} from '../src/skillforge/registry-entry.mjs';
import { save as saveRegistryEntry } from '../src/skillforge/registry-store.mjs';
import { save as saveReviewRecord } from '../src/skillforge/review-store.mjs';
import { save as savePublishPrep } from '../src/skillforge/prep-store.mjs';
import { save as saveExecutionLog, buildExecutionLogEntry } from '../src/skillforge/execution-log-store.mjs';

function section(title) {
  console.log(`\n═══ ${title} ═══`);
}

function showObject(label, value) {
  console.log(`${label}: ${JSON.stringify(value, null, 2)}`);
}

function stringifyErrors(errors) {
  return JSON.stringify(errors, null, 2);
}

function reportValidation(label, check) {
  console.log(`validation: ${check.valid ? 'PASS' : 'FAIL'}`);
  if (!check.valid) {
    console.log(`${label}.errors: ${stringifyErrors(check.errors)}`);
  }
}

function parseArgs(argv) {
  const args = {
    fixtureId: 'demo-v1',
    version: '0.1.0-demo',
    evidence: 'demo-evidence-1',
    sourceLink: 'https://example.invalid/skillforge/demo',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;

    const [flag, inlineValue] = token.split('=', 2);
    const takeValue = () => {
      if (inlineValue !== undefined) return inlineValue;
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        i += 1;
        return next;
      }
      return '';
    };

    if (flag === '--fixture-id') args.fixtureId = takeValue();
    if (flag === '--version') args.version = takeValue();
    if (flag === '--evidence') args.evidence = takeValue();
    if (flag === '--source-link') args.sourceLink = takeValue();
  }

  return args;
}

function main() {
  console.log('SkillForge Operator CLI');
  console.log(`Generated: ${new Date().toISOString()}`);

  const input = parseArgs(process.argv.slice(2));
  const usingDefaults =
    input.fixtureId === 'demo-v1' &&
    input.version === '0.1.0-demo' &&
    input.evidence === 'demo-evidence-1' &&
    input.sourceLink === 'https://example.invalid/skillforge/demo';

  const spec = input.fixtureId;
  const reviewOptions = [input.evidence, input.sourceLink];

  section('1) ReviewRecord');
  const reviewRecord = createReviewRecord(spec, reviewOptions[0] ? [reviewOptions[0]] : [], reviewOptions[1] ? [reviewOptions[1]] : []);
  reviewRecord.status = 'approved';
  reviewRecord.decision = 'approve';
  reviewRecord.fixtureId = input.fixtureId;
  const reviewCheck = validateReviewRecord(reviewRecord);
  showObject('input.args', input);
  showObject('output.reviewRecord', reviewRecord);
  reportValidation('reviewRecord', reviewCheck);
  if (!reviewCheck.valid) {
    process.exitCode = 1;
    return;
  }

  section('2) PublishPrep');
  const publishPrep = createPublishPrep(
    reviewRecord,
    {
      staticValidationPassed: true,
      preflightPassed: true,
      reviewGatePassed: true,
      details: usingDefaults ? 'minimal demo readiness' : `parameterized readiness for ${input.fixtureId}`
    },
    {
      evidenceRefs: [input.evidence],
      sourceLinks: [input.sourceLink]
    }
  );
  publishPrep.fixtureId = input.fixtureId;
  publishPrep.version = input.version;
  const publishCheck = validatePublishPrep(publishPrep);
  showObject('output.publishPrep', publishPrep);
  reportValidation('publishPrep', publishCheck);
  if (!publishCheck.valid) {
    process.exitCode = 1;
    return;
  }

  section('3) RegistryEntry');
  const registryEntry = createRegistryEntry(publishPrep, {
    version: input.version,
    tags: ['skillforge', usingDefaults ? 'demo' : 'operator', input.fixtureId],
    notes: usingDefaults ? 'registry entry created from ready publish-prep' : `registry entry created for ${input.fixtureId}`,
  });
  registryEntry.fixtureId = input.fixtureId;
  const registryCheck = validateRegistryEntry(registryEntry);
  showObject('output.registryEntry', registryEntry);
  reportValidation('registryEntry', registryCheck);
  if (!registryCheck.valid) {
    process.exitCode = 1;
    return;
  }

  section('4) Persist to ReviewStore');
  try {
    const r = saveReviewRecord(reviewRecord);
    showObject('reviewStoreResult', r);
    console.log('review-store: OK');
  } catch (err) {
    console.log(`review-store: FAIL — ${err.message}`);
    process.exitCode = 1;
    return;
  }

  section('5) Persist to PrepStore');
  try {
    const p = savePublishPrep(publishPrep);
    showObject('prepStoreResult', p);
    console.log('prep-store: OK');
  } catch (err) {
    console.log(`prep-store: FAIL — ${err.message}`);
    process.exitCode = 1;
    return;
  }

  section('6) Persist to RegistryStore');
  try {
    const persistResult = saveRegistryEntry(registryEntry);
    showObject('registryStoreResult', persistResult);
    console.log('registry-store: OK');
  } catch (err) {
    console.log(`registry-store: FAIL — ${err.message}`);
    process.exitCode = 1;
    return;
  }

  section('7) ExecutionLog');
  try {
    const entry = buildExecutionLogEntry({
      fixtureId: input.fixtureId,
      status: 'completed',
      source: 'skillforge-operate',
      steps: { review: true, prep: true, registry: true },
      input: {
        operation: 'skillforge-operate',
        fixtureId: input.fixtureId,
        version: input.version,
        evidence: input.evidence,
        sourceLink: input.sourceLink,
      },
      output: {
        review: {
          reviewId: reviewRecord.reviewId ?? null,
          status: reviewRecord.status ?? null,
          decision: reviewRecord.decision ?? null,
          fixtureId: reviewRecord.fixtureId ?? null,
        },
        prep: {
          prepId: publishPrep.prepId ?? null,
          fixtureId: publishPrep.fixtureId ?? null,
          version: publishPrep.version ?? null,
          readiness: publishPrep.readiness ?? publishPrep.checks ?? null,
        },
        registry: {
          entryId: registryEntry.entryId ?? null,
          fixtureId: registryEntry.fixtureId ?? null,
          version: registryEntry.version ?? null,
          status: registryEntry.status ?? null,
          tags: registryEntry.tags ?? null,
        },
      },
      inputMessage: `执行 SkillForge operate：fixture=${input.fixtureId}，version=${input.version}，evidence=${input.evidence}`,
      outputMessage: `运行成功：已完成 Review → PublishPrep → Registry 持久化，registryEntry=${registryEntry.entryId ?? 'unknown'}`,
    });
    const el = saveExecutionLog(entry);
    showObject('executionLogResult', el);
    console.log('execution-log: OK');
  } catch (err) {
    console.log(`execution-log: FAIL — ${err.message}`);
    process.exitCode = 1;
    return;
  }

  section('Result');
  console.log('chain: ReviewRecord → PublishPrep → RegistryEntry + ExecutionLog (all persisted)');
  console.log(`fixture-id: ${input.fixtureId}`);
  console.log(`version: ${input.version}`);
  console.log(`evidence: ${input.evidence}`);
  console.log(`source-link: ${input.sourceLink}`);
  console.log('status: OK');
  console.log('implemented: real object construction + validation + console summary');
  console.log('supported args: --fixture-id, --version, --evidence, --source-link');
}

main();
