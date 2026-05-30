import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import {
  openRelationalIndexDb,
  ensureRelationalIndexSchema,
  writeIndexMeta,
  normalizeSkillRecord,
  normalizeTagRecords,
  upsertSkillRecord,
  upsertTagRecord,
  linkSkillTag,
} from '../../src/skillforge/relational-index.sqlite.mjs';
import { loadIndexSnapshot, recallSkillBundle } from '../../src/skillforge/relational-recall.mjs';

function makeRegistryEntry(overrides = {}) {
  return {
    registryId: 'local-skills:browser-review',
    name: 'browser-review',
    skillKind: 'skill',
    description: 'Review browser flows and report findings.',
    sourceRef: { path: '/skills/browser-review/SKILL.md' },
    routingProfile: {
      applicableScenes: ['browser review'],
      triggerHints: ['review browser', 'inspect ui'],
      requiredTools: ['browseros-cli'],
      toolSignals: ['browser'],
      entrypointHints: ['Open the target page first'],
      toolFamilies: ['browser'],
      reportHints: ['summary-report'],
      stopRuleHints: ['stop-on-missing-tool'],
      constraintHints: ['needs-evidence'],
      workflowSkeletonSummary: 'Open page, inspect flow, produce report.',
      tags: ['review', 'browser'],
    },
    registryMeta: { scanId: 'scan_test' },
    ...overrides,
  };
}

test('loadIndexSnapshot returns normalized skill entries from sqlite', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'skillforge-recall-'));
  const dbPath = path.join(dir, 'index.sqlite');
  const { db } = openRelationalIndexDb(dbPath);
  ensureRelationalIndexSchema(db);

  const entry = makeRegistryEntry();
  const record = normalizeSkillRecord(entry, { scanId: 'scan_test', sourceId: 'local-skills' });
  upsertSkillRecord(db, record);
  writeIndexMeta(db, {
    indexVersion: '1',
    schemaVersion: '1',
    builtAt: '2026-05-30T00:00:00.000Z',
    sourceId: 'local-skills',
    scanId: 'scan_test',
    skillCount: 1,
    tagCount: 0,
    relationCount: 0,
    buildMode: 'full-rebuild',
  });

  const snapshot = loadIndexSnapshot({ dbPath });
  assert.equal(snapshot.meta.scanId, 'scan_test');
  assert.equal(snapshot.entries.length, 1);
  assert.equal(snapshot.entries[0].id, 'local-skills:browser-review');
  assert.deepEqual(snapshot.entries[0].requiredTools, ['browseros-cli']);
  assert.deepEqual(snapshot.entries[0].tags, ['review', 'browser']);
});

test('recallSkillBundle boosts skills through tag and tool matches', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'skillforge-recall-'));
  const dbPath = path.join(dir, 'index.sqlite');
  const { db } = openRelationalIndexDb(dbPath);
  ensureRelationalIndexSchema(db);

  const entry = makeRegistryEntry();
  const record = normalizeSkillRecord(entry, { scanId: 'scan_test', sourceId: 'local-skills' });
  upsertSkillRecord(db, record);

  for (const tagRecord of normalizeTagRecords(entry)) {
    upsertTagRecord(db, tagRecord);
    linkSkillTag(db, {
      skillId: record.id,
      tagId: tagRecord.id,
      matchKind: 'direct',
      weight: 1,
      source: 'test',
    });
  }

  writeIndexMeta(db, {
    indexVersion: '1',
    schemaVersion: '1',
    builtAt: '2026-05-30T00:00:00.000Z',
    sourceId: 'local-skills',
    scanId: 'scan_test',
    skillCount: 1,
    tagCount: 4,
    relationCount: 3,
    buildMode: 'full-rebuild',
  });

  const snapshot = loadIndexSnapshot({ dbPath });
  const result = recallSkillBundle({
    snapshot,
    taskRecord: {
      summary: 'Review browser flow',
      projectScope: null,
      taskTypes: ['review'],
      workflowStages: ['validation'],
      artifactTargets: ['ui'],
      toolHints: ['browseros-cli'],
      agentArchetypes: ['review'],
      constraints: [],
      reportExpectations: ['summary-report'],
      openTags: ['browser'],
    },
    context: {},
    maxCandidates: 5,
  });

  assert.equal(result.shortlisted.length, 1);
  assert.equal(result.shortlisted[0].id, 'local-skills:browser-review');
  assert.ok(result.shortlisted[0].recallExplain.finalScore > 0);
  assert.ok(result.shortlisted[0].recallExplain.matchedTags.length > 0);
});

test('recallSkillBundle can recover browser skills from natural-language summary without explicit tools', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'skillforge-recall-'));
  const dbPath = path.join(dir, 'index.sqlite');
  const { db } = openRelationalIndexDb(dbPath);
  ensureRelationalIndexSchema(db);

  const entry = makeRegistryEntry({
    description: 'Validate browser page flows and return evidence-oriented review notes.',
    routingProfile: {
      applicableScenes: ['browser page validation'],
      triggerHints: ['validate browser page flow', 'check prerequisites first'],
      requiredTools: ['browseros-cli'],
      toolSignals: ['browser'],
      entrypointHints: ['Open the target page first'],
      toolFamilies: ['browser'],
      reportHints: ['evidence-report'],
      stopRuleHints: ['stop-on-missing-tool'],
      constraintHints: ['needs-evidence'],
      workflowSkeletonSummary: 'Check prerequisites, validate the browser flow, and return evidence.',
      tags: ['review', 'browser', 'validation'],
    },
  });

  const record = normalizeSkillRecord(entry, { scanId: 'scan_test', sourceId: 'local-skills' });
  upsertSkillRecord(db, record);

  for (const tagRecord of normalizeTagRecords(entry)) {
    upsertTagRecord(db, tagRecord);
    linkSkillTag(db, {
      skillId: record.id,
      tagId: tagRecord.id,
      matchKind: 'direct',
      weight: 1,
      source: 'test',
    });
  }

  writeIndexMeta(db, {
    indexVersion: '1',
    schemaVersion: '1',
    builtAt: '2026-05-30T00:00:00.000Z',
    sourceId: 'local-skills',
    scanId: 'scan_test',
    skillCount: 1,
    tagCount: 6,
    relationCount: 3,
    buildMode: 'full-rebuild',
  });

  const snapshot = loadIndexSnapshot({ dbPath });
  const result = recallSkillBundle({
    snapshot,
    taskRecord: {
      summary: 'Validate browser page flow with prerequisites check and evidence report',
      projectScope: null,
      taskTypes: ['validation', 'testing'],
      workflowStages: ['prerequisites check', 'validation', 'reporting'],
      artifactTargets: ['browser page flow'],
      toolHints: [],
      agentArchetypes: [],
      constraints: [],
      reportExpectations: ['evidence report'],
      openTags: [],
    },
    context: {},
    maxCandidates: 5,
  });

  assert.equal(result.shortlisted.length, 1);
  assert.equal(result.shortlisted[0].id, 'local-skills:browser-review');
  assert.ok(
    result.shortlisted[0].recallExplain.matchedFields.some((item) => item.field === 'description' || item.field === 'triggerHints'),
  );
  assert.ok(result.shortlisted[0].recallExplain.finalScore > 0);
});
