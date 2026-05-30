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
  upsertSkillRecord,
} from '../../src/skillforge/relational-index.sqlite.mjs';
import { resolveSkills } from '../../src/skillforge/skill-resolver.mjs';

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

test('resolveSkills returns structured empty result without calling LM when no candidates survive', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'skillforge-resolver-'));
  const dbPath = path.join(dir, 'index.sqlite');
  const { db } = openRelationalIndexDb(dbPath);
  ensureRelationalIndexSchema(db);

  const record = normalizeSkillRecord(makeRegistryEntry(), { scanId: 'scan_test', sourceId: 'local-skills' });
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

  const result = await resolveSkills({
    context: {
      intent: 'review a page',
      tools: ['browseros-cli'],
      taskRecord: {
        summary: 'Review a page',
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
    },
    explicitSkills: ['local-skills:non-existent-skill'],
    dbPath,
  });

  assert.equal(result.selected.length, 0);
  assert.equal(result.candidates.length, 0);
  assert.equal(result.metadata.taskExtraction.meta.llmCalled, false);
  assert.equal(result.metadata.llmCalled, false);
  assert.equal(result.metadata.scanId, 'scan_test');
  assert.equal(result.scanId, 'scan_test');
  assert.equal(result.metadata.indexVersion, '1');
  assert.match(result.routingRationale[0], /no candidate survived hard filtering/i);
});
