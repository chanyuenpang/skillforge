#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runRegistryScanPipeline } from '../src/skillforge/registry-scan-pipeline.mjs';
import { createRegistryEntry } from '../src/skillforge/registry-entry.mjs';
import { save as saveRegistryEntry, hasSourceHash } from '../src/skillforge/registry-store.mjs';
import { generateSkillTags } from '../src/skillforge/skill-tagger.mjs';

function parseArgs(argv) {
  const out = { sourceDir: '.', sourceId: 'local', max: 3, version: '0.1.0' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--source-dir') out.sourceDir = argv[++i] || out.sourceDir;
    else if (arg === '--source-id') out.sourceId = argv[++i] || out.sourceId;
    else if (arg === '--max') out.max = Number(argv[++i] || out.max);
    else if (arg === '--version') out.version = argv[++i] || out.version;
  }
  return out;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tagSchema = JSON.parse(readFileSync(path.resolve(__dirname, '../src/skillforge/tag-schema.json'), 'utf8'));

const input = parseArgs(process.argv.slice(2));
const scan = await runRegistryScanPipeline({ sourceDir: input.sourceDir, sourceId: input.sourceId });

const candidates = scan.records
  .filter((r) => r.status === 'ok' && r.fields?.semantic)
  .slice(0, input.max);

const installed = [];
const skipped = [];

for (const record of candidates) {
  const sourceHash = record.fields.hash;
  if (hasSourceHash(sourceHash)) {
    skipped.push({ skillId: record.skillId, reason: 'source_hash_exists', sourceHash });
    continue;
  }

  const skillContent = readFileSync(record.entryPath, 'utf8');
  const tagIds = await generateSkillTags(skillContent, tagSchema);
  const tags = tagIds.map((id) => ({ id }));

  const publishPrep = {
    kind: 'publish-prep',
    reviewRecordRef: {
      fixtureId: record.skillId,
      reviewDecision: 'approve',
      reviewUpdatedAt: new Date().toISOString()
    },
    provenance: {
      preparedAt: new Date().toISOString(),
      evidenceRefs: [record.skillId],
      sourceLinks: [record.entryPath]
    }
  };

  const entry = createRegistryEntry(publishPrep, {
    registryId: `install-${record.skillId}`,
    version: input.version,
    initialStatus: 'registered',
    source: { type: 'skillforge-install', location: record.entryPath },
    source_hash: sourceHash,
    semanticAsset: record.fields.semantic,
    tags,
    notes: ['installed via semantic chain', `scanId=${scan.scanId}`]
  });

  const persisted = saveRegistryEntry(entry);
  installed.push({
    skillId: record.skillId,
    persisted,
    semantic: record.fields.semantic
  });
}

console.log(JSON.stringify({
  ok: true,
  input,
  scan: {
    scanId: scan.scanId,
    summary: scan.summary,
    artifactPath: scan.artifactPath
  },
  installed,
  skipped
}, null, 2));
