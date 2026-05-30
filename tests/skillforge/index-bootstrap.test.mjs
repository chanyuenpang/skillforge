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
} from '../../src/skillforge/relational-index.sqlite.mjs';

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
