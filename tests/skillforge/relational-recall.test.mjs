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
      skillRole: 'verification',
      skillCategory: 'review',
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
  assert.equal(snapshot.entries[0].skillRole, 'verification');
  assert.equal(snapshot.entries[0].skillCategory, 'review');
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

test('recallSkillBundle prefers primary execution skills for code modification tasks while keeping complementary skills', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'skillforge-recall-'));
  const dbPath = path.join(dir, 'index.sqlite');
  const { db } = openRelationalIndexDb(dbPath);
  ensureRelationalIndexSchema(db);

  const primaryEntry = makeRegistryEntry({
    registryId: 'local-skills:coding-agent-workflow',
    name: 'coding-agent-workflow',
    skillKind: 'subagent',
    description: 'Core execution workflow for code modifications and implementation tasks.',
    sourceRef: { path: '/skills/coding-agent-workflow/SKILL.md' },
    routingProfile: {
      skillRole: 'primary',
      skillCategory: 'execution',
      applicableScenes: ['code modification', 'implementation'],
      triggerHints: ['modify code', 'implementation task', 'compiler change'],
      requiredTools: ['Edit', 'Read', 'Bash'],
      toolSignals: ['edit', 'code'],
      entrypointHints: ['inspect file', 'edit code'],
      toolFamilies: ['editor'],
      reportHints: ['change-summary'],
      stopRuleHints: ['stop-on-blocker'],
      constraintHints: ['minimal-change'],
      workflowSkeletonSummary: 'Read the target file, make the code change, then validate the result.',
      tags: ['code', 'implementation', 'compiler'],
    },
  });

  const toolingEntry = makeRegistryEntry({
    registryId: 'local-skills:new-asset-creator',
    name: 'new-asset-creator',
    description: 'Asset creation workflow that interacts with compile.py and compile validation.',
    sourceRef: { path: '/skills/new-asset-creator/SKILL.md' },
    routingProfile: {
      skillRole: 'tooling',
      skillCategory: 'project',
      applicableScenes: ['asset compile validation'],
      triggerHints: ['compile.py', 'asset compile'],
      requiredTools: ['python-script'],
      toolSignals: ['compile.py'],
      entrypointHints: ['run compile'],
      toolFamilies: ['compiler'],
      reportHints: ['validation-result'],
      stopRuleHints: ['stop-on-compile-failure'],
      constraintHints: ['do-not-edit-tres'],
      workflowSkeletonSummary: 'Create or adjust asset sources, then run compile validation.',
      tags: ['compiler', 'asset', 'compile'],
    },
  });

  const genericPrimaryEntry = makeRegistryEntry({
    registryId: 'local-skills:feishu-master',
    name: 'feishu-master',
    skillKind: 'subagent',
    description: 'General execution workflow for Feishu documents, drive, and sharing tasks.',
    sourceRef: { path: '/skills/feishu-master/SKILL.md' },
    routingProfile: {
      skillRole: 'primary',
      skillCategory: 'execution',
      applicableScenes: ['feishu docs', 'sharing files'],
      triggerHints: ['feishu', 'document sharing', 'wiki permissions'],
      requiredTools: ['feishu_doc', 'feishu_drive'],
      toolSignals: ['feishu'],
      entrypointHints: ['feishu_doc'],
      toolFamilies: ['feishu'],
      reportHints: ['share-summary'],
      stopRuleHints: ['stop-on-permission-error'],
      constraintHints: ['workspace-cleanup'],
      workflowSkeletonSummary: 'Use Feishu APIs to operate docs and sharing flows.',
      tags: ['feishu', 'docs', 'sharing'],
    },
  });

  for (const entry of [primaryEntry, toolingEntry, genericPrimaryEntry]) {
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
  }

  writeIndexMeta(db, {
    indexVersion: '1',
    schemaVersion: '1',
    builtAt: '2026-05-30T00:00:00.000Z',
    sourceId: 'local-skills',
    scanId: 'scan_test',
    skillCount: 3,
    tagCount: 12,
    relationCount: 9,
    buildMode: 'full-rebuild',
  });

  const snapshot = loadIndexSnapshot({ dbPath });
  const result = recallSkillBundle({
    snapshot,
    taskRecord: {
      summary: 'Modify compiler/compile.py to add duplicate id detection',
      projectScope: null,
      taskTypes: ['code-modification', 'implementation'],
      workflowStages: ['implementation'],
      artifactTargets: ['compiler/compile.py'],
      toolHints: ['Edit'],
      agentArchetypes: ['developer'],
      constraints: ['minimal-change'],
      reportExpectations: ['change-summary'],
      openTags: ['compiler'],
    },
    context: {},
    maxCandidates: 5,
  });

  assert.equal(result.shortlisted.length, 2);
  assert.equal(result.shortlisted[0].id, 'local-skills:coding-agent-workflow');
  assert.equal(result.shortlisted[0].skillRole, 'primary');
  assert.equal(result.shortlisted[1].skillRole, 'tooling');
  assert.ok(!result.shortlisted.some((item) => item.id === 'local-skills:feishu-master'));
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
