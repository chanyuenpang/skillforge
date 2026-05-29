#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { extractSkillSemantic } from '../src/skillforge/llm-semantic-extractor.mjs';
import { createRegistryEntry } from '../src/skillforge/registry-entry.mjs';
import { save as saveRegistryEntry, hasSourceHash } from '../src/skillforge/registry-store.mjs';

const skillName = process.argv[2];
if (!skillName) {
  console.log(JSON.stringify({ ok: false, error: 'usage: node install-one-skill.mjs <skill-name>' }));
  process.exit(1);
}

const skillDir = path.join(process.env.HOME, '.openclaw/skills', skillName);
const skillMdPath = path.join(skillDir, 'SKILL.md');

let content;
try {
  content = await fs.readFile(skillMdPath, 'utf8');
} catch {
  console.log(JSON.stringify({ ok: false, error: `SKILL.md not found at ${skillMdPath}` }));
  process.exit(1);
}

const sourceHash = createHash('sha256').update(content).digest('hex');

if (hasSourceHash(sourceHash)) {
  console.log(JSON.stringify({ ok: true, skillId: skillName, status: 'skipped', reason: 'source_hash_exists', sourceHash }));
  process.exit(0);
}

const semantic = await extractSkillSemantic({
  content,
  skillName,
  sourcePath: skillMdPath
});

const publishPrep = {
  kind: 'publish-prep',
  reviewRecordRef: {
    fixtureId: skillName,
    reviewDecision: 'approve',
    reviewUpdatedAt: new Date().toISOString()
  },
  provenance: {
    preparedAt: new Date().toISOString(),
    evidenceRefs: [skillName],
    sourceLinks: [skillMdPath]
  }
};

const entry = createRegistryEntry(publishPrep, {
  registryId: `install-${skillName}`,
  version: '0.1.0',
  initialStatus: 'registered',
  source: { type: 'skillforge-install', location: skillMdPath },
  source_hash: sourceHash,
  semanticAsset: semantic,
  notes: ['installed via single-skill installer']
});

const persisted = saveRegistryEntry(entry);

console.log(JSON.stringify({
  ok: true,
  skillId: skillName,
  persisted,
  semantic: semantic.summary,
  capabilities: semantic.capabilities,
  constraints: semantic.constraints,
  intent: semantic.intent,
  confidence: semantic.confidence,
  extractor: semantic.extractor,
  usedFallback: semantic.usedFallback
}, null, 2));
