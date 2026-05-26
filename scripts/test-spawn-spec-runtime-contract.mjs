import assert from 'node:assert/strict';

import { compileWorkflowToSpec } from '../src/skillforge/generator-workflow-to-spec.mjs';
import { spawnSpecFromStageE } from '../src/skillforge/spawn-spec-contract.mjs';
import { runSpawnSpecRuntime } from '../src/skillforge/spawn-runtime-adapter.mjs';
import { createRuntimeTraceEchoEntry } from '../src/skillforge/runtime-spawn-entry.mjs';

const stageEArtifact = {
  name: 'workflow-kit-stage-e',
  version: '3.2.1',
  spawnSpecVersion: '0.1.0',
  trace: {
    traceId: 'trace-abc-001',
    source: 'stage-e',
    versionTag: 'v3.2.1',
    origin: 'stage-e-output',
  },
  payload: {
    taskIds: ['task-a', 'task-b'],
    notes: 'minimal closure test',
  },
};

const spawnSpec = spawnSpecFromStageE(stageEArtifact);
assert.equal(spawnSpec.kind, 'spawn-spec');
assert.equal(spawnSpec.trace.traceId, 'trace-abc-001');
assert.equal(spawnSpec.trace.source, 'stage-e');
assert.equal(spawnSpec.source.version, '3.2.1');

const runtime = runSpawnSpecRuntime(spawnSpec, createRuntimeTraceEchoEntry());
assert.equal(runtime.ok, true);
assert.equal(runtime.output.received, true);
assert.equal(runtime.output.source, 'stage-e-artifact');
assert.equal(runtime.output.version, '3.2.1');
assert.equal(runtime.output.traceId, 'trace-abc-001');
assert.equal(runtime.output.trace.source, 'stage-e');
assert.equal(runtime.output.trace.versionTag, 'v3.2.1');

const specFromStageE = compileWorkflowToSpec({
  fixtureId: 'fixture-stage-e',
  fixtureVersion: '1.0.0',
  name: 'stage-e-mapper',
  summary: 'stage e to spec',
  source: {
    type: 'manual',
    language: 'zh-CN',
    inputContract: { acceptedInputs: ['changeSummaryMaterial'], rejectedInputs: ['privateRepo'] },
    outputContract: { format: 'markdown', sections: ['Overview'] },
  },
  permissions: { network: false, externalSend: false, fileRead: true, fileWrite: false, destructiveOperations: false, privatePathRead: false },
  dependencies: { noneDeclared: true, items: [] },
  checklist: { structure: 'ok', trigger: 'ok', boundary: 'ok', dependency: 'ok', replay: 'ok', privacy: 'ok', compatibility: 'ok' },
});
assert.equal(specFromStageE.kind, 'skill-spec');

console.log('spawn-spec-runtime-contract: pass');
