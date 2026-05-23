#!/usr/bin/env node
import { createRegistryEntry } from '../src/skillforge/registry-entry.mjs';
import { save as saveRegistryEntry, loadById as loadRegistryEntryById } from '../src/skillforge/registry-store.mjs';

function parseArgs(argv) {
  const out = { fixtureId: 'demo-v1', version: '0.1.0' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--fixture-id' || arg === '--fixtureId') out.fixtureId = argv[++i] || out.fixtureId;
    else if (arg === '--version') out.version = argv[++i] || out.version;
  }
  return out;
}

const input = parseArgs(process.argv.slice(2));
const publishPrep = {
  kind: 'publish-prep',
  reviewRecordRef: {
    fixtureId: input.fixtureId,
    reviewDecision: 'approve',
    reviewUpdatedAt: new Date().toISOString(),
  },
  provenance: {
    preparedAt: new Date().toISOString(),
    evidenceRefs: [input.fixtureId],
    sourceLinks: [],
  },
};

const entry = createRegistryEntry(publishPrep, {
  registryId: `install-${input.fixtureId}`,
  version: input.version,
  initialStatus: 'registered',
  source: { type: 'skillforge-install', location: 'local' },
  notes: [`installed via install-skill.mjs`, `version=${input.version}`],
});
const persisted = saveRegistryEntry(entry);
const installed = loadRegistryEntryById(input.fixtureId);

console.log(JSON.stringify({ ok: true, input, entry, persisted, installed }, null, 2));
