#!/usr/bin/env node
import assert from 'node:assert/strict';
import { buildBetterWorkflowRunCenterView } from '../src/skillforge/betterworkflow-run-center-view.mjs';
import { buildBetterPromptRunCenterView } from '../src/skillforge/betterprompt-run-center-view.mjs';
import { buildSkillBundleRunCenterView } from '../src/skillforge/skill-bundle-run-center-view.mjs';

function validateObservability(view, name) {
  assert.ok(view && typeof view === 'object', `${name}: view must be object`);
  assert.ok(view.observability && typeof view.observability === 'object', `${name}: observability missing`);
  assert.ok(['ok', 'degraded', 'error'].includes(view.observability.status), `${name}: invalid observability.status`);
  assert.equal(typeof view.observability.duration_ms, 'number', `${name}: duration_ms must be number`);
  assert.ok(Array.isArray(view.observability.trace_refs), `${name}: trace_refs must be array`);
  assert.ok(['info', 'warn', 'error'].includes(view.observability.alert_level), `${name}: invalid alert_level`);
}

const bw = buildBetterWorkflowRunCenterView({
  source: 'betterworkflow-pipeline',
  id: 'bw-1',
  createdAt: new Date().toISOString(),
  status: 'completed',
  durationMs: 123,
  traceRefs: ['task:1', 'plan:2'],
});

const bp = buildBetterPromptRunCenterView({
  source: 'betterprompt-pipeline',
  executionId: 'bp-1',
  timestamp: new Date().toISOString(),
  status: 'running',
  durationMs: 45,
  traceRefs: ['prompt:1'],
});

const sb = buildSkillBundleRunCenterView({
  source: 'skill-bundle-soft-recommendation',
  id: 'sb-1',
  createdAt: new Date().toISOString(),
  status: 'failed',
  durationMs: 77,
  traceRefs: ['bundle:1'],
});

validateObservability(bw, 'betterWorkflow');
validateObservability(bp, 'betterPrompt');
validateObservability(sb, 'skillBundle');

console.log('✅ run-center observability contract check passed (3 views)');
