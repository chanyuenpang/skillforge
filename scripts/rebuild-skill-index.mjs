#!/usr/bin/env node

import path from 'node:path';
import { runRegistryScanPipeline } from '../src/skillforge/registry-scan-pipeline.mjs';
import {
  RELATIONAL_INDEX_PATH,
  RELATIONAL_INDEX_SCHEMA_VERSION,
  RELATIONAL_INDEX_VERSION,
  openRelationalIndexDb,
  ensureRelationalIndexSchema,
  clearRelationalIndex,
  normalizeSkillRecord,
  normalizeTagRecords,
  upsertSkillRecord,
  upsertTagRecord,
  linkSkillTag,
  writeIndexMeta,
  countIndexRows,
} from '../src/skillforge/relational-index.sqlite.mjs';

function parseArgs(argv) {
  const args = {
    sourceDir: path.resolve('skills'),
    sourceId: 'local-skills',
    mode: 'full-rebuild',
    dbPath: RELATIONAL_INDEX_PATH,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const [flag, inlineValue] = token.split('=', 2);
    const takeValue = () => {
      if (inlineValue !== undefined) return inlineValue;
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        i += 1;
        return next;
      }
      return '';
    };

    if (flag === '--source-dir') args.sourceDir = path.resolve(takeValue());
    if (flag === '--source-id') args.sourceId = takeValue() || args.sourceId;
    if (flag === '--db-path') args.dbPath = path.resolve(takeValue());
  }

  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const scan = await runRegistryScanPipeline({
    sourceDir: args.sourceDir,
    sourceId: args.sourceId,
  });

  const { db, path: dbPath } = openRelationalIndexDb(args.dbPath);
  ensureRelationalIndexSchema(db);
  clearRelationalIndex(db);

  for (const record of scan.records) {
    if (record.status !== 'ok' || !record.registryEntry) continue;
    const skillRecord = normalizeSkillRecord(record.registryEntry, {
      scanId: scan.scanId,
      sourceId: scan.sourceId,
    });
    upsertSkillRecord(db, skillRecord);

    const tagRecords = normalizeTagRecords(record.registryEntry);
    for (const tagRecord of tagRecords) {
      upsertTagRecord(db, tagRecord);
      linkSkillTag(db, {
        skillId: skillRecord.id,
        tagId: tagRecord.id,
        matchKind: tagRecord.tag_type,
        source: 'registry-scan',
      });
    }
  }

  const counts = countIndexRows(db);
  writeIndexMeta(db, {
    indexVersion: RELATIONAL_INDEX_VERSION,
    schemaVersion: RELATIONAL_INDEX_SCHEMA_VERSION,
    builtAt: new Date().toISOString(),
    sourceId: scan.sourceId,
    scanId: scan.scanId,
    skillCount: counts.skills,
    tagCount: counts.tags,
    relationCount: counts.skillTags + counts.entityRelations,
    buildMode: args.mode,
  });

  console.log(JSON.stringify({
    ok: true,
    dbPath,
    scanId: scan.scanId,
    sourceId: scan.sourceId,
    summary: scan.summary,
    indexCounts: counts,
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: {
      name: error.name,
      code: error.code || null,
      message: error.message,
      meta: error.meta || null,
    },
  }, null, 2));
  process.exit(2);
});
