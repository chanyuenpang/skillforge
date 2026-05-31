import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import {
  openRelationalIndexDb,
  ensureRelationalIndexSchema,
  writeIndexMeta,
  readIndexMeta,
  assertReadableIndex,
  countIndexRows,
  normalizeSkillRecord,
  normalizeTagRecords,
  upsertSkillRecord,
  upsertTagRecord,
  linkSkillTag,
} from '../../src/skillforge/relational-index.sqlite.mjs';
import { createRegistryEntry } from '../../src/skillforge/registry-entry.mjs';

test('relational index bootstrap creates required tables and readable metadata', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'skillforge-index-'));
  const dbPath = path.join(dir, 'index.sqlite');
  const { db } = openRelationalIndexDb(dbPath);
  ensureRelationalIndexSchema(db);
  writeIndexMeta(db, {
    indexVersion: '1',
    schemaVersion: '1',
    builtAt: '2026-05-30T00:00:00.000Z',
    sourceId: 'local-skills',
    scanId: 'scan_test',
    skillCount: 0,
    tagCount: 0,
    relationCount: 0,
    buildMode: 'full-rebuild',
  });

  const meta = readIndexMeta(db);
  assert.equal(meta.indexVersion, '1');
  assert.equal(meta.schemaVersion, '1');
  assert.equal(meta.scanId, 'scan_test');

  const readableMeta = assertReadableIndex(db);
  assert.equal(readableMeta.buildMode, 'full-rebuild');
});

test('relational index remains readable after incremental single-skill writes', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'skillforge-index-'));
  const dbPath = path.join(dir, 'index.sqlite');
  const { db } = openRelationalIndexDb(dbPath);
  ensureRelationalIndexSchema(db);
  writeIndexMeta(db, {
    indexVersion: '1',
    schemaVersion: '1',
    builtAt: '2026-05-30T00:00:00.000Z',
    sourceId: 'local-skills',
    scanId: 'scan_test',
    skillCount: 0,
    tagCount: 0,
    relationCount: 0,
    buildMode: 'rebuilding',
  });

  const entry = createRegistryEntry({
    id: 'local-skills:coding-agent-workflow',
    name: 'coding-agent-workflow',
    kind: 'subagent',
    skillRole: 'primary',
    skillCategory: 'execution',
    description: 'Code execution workflow.',
    sourceRef: { path: 'skills/coding-agent-workflow/SKILL.md' },
    applicableScenes: ['code modification'],
    triggerHints: ['modify code'],
    requiredTools: ['Edit'],
    toolSignals: ['edit'],
    entrypointHints: ['inspect file'],
    toolFamilies: ['editor'],
    reportHints: ['change-summary'],
    stopRuleHints: ['stop-on-blocker'],
    constraintHints: ['minimal-change'],
    workflowSkeletonSummary: 'Read, edit, validate.',
    tags: ['code', 'implementation'],
  }, {
    sourceId: 'local-skills',
    scanId: 'scan_test',
  });

  const skillRecord = normalizeSkillRecord(entry, {
    sourceId: 'local-skills',
    scanId: 'scan_test',
  });
  upsertSkillRecord(db, skillRecord);
  for (const tagRecord of normalizeTagRecords(entry)) {
    upsertTagRecord(db, tagRecord);
    linkSkillTag(db, {
      skillId: skillRecord.id,
      tagId: tagRecord.id,
      matchKind: tagRecord.tag_type,
      source: 'test',
    });
  }

  const counts = countIndexRows(db);
  writeIndexMeta(db, {
    indexVersion: '1',
    schemaVersion: '1',
    builtAt: '2026-05-30T00:00:01.000Z',
    sourceId: 'local-skills',
    scanId: 'scan_test',
    skillCount: counts.skills,
    tagCount: counts.tags,
    relationCount: counts.skillTags + counts.entityRelations,
    buildMode: 'rebuilding',
  });

  const readableMeta = assertReadableIndex(db);
  assert.equal(readableMeta.buildMode, 'rebuilding');
  assert.equal(counts.skills, 1);
  assert.ok(counts.tags > 0);
});
