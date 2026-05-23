import assert from 'node:assert/strict';
import { runGeneratorPipeline } from '../src/skillforge/generator-orchestrator.mjs';

const workflowSource = {
  id: 'wf-minimal-001',
  name: 'Minimal Workflow',
  description: 'A minimal valid workflow source for generator orchestrator verification.',
  steps: [
    {
      id: 'step-1',
      type: 'action',
      name: 'First Step',
    },
  ],
};

try {
  const result = runGeneratorPipeline(workflowSource);

  assert.equal(result?.skillSpec?.kind, 'skill-spec');
  assert.equal(result?.skillManifest?.kind, 'skill-manifest');
  assert.equal(typeof result?.skillMd, 'string');
  assert.ok(result.skillMd.length > 0);
  assert.equal(typeof result?.lineage, 'object');
  assert.ok(Array.isArray(result.lineage.stages));

  console.log('✅ PASS: generator orchestrator pipeline returned valid outputs');
} catch (error) {
  console.error('❌ FAIL: generator orchestrator pipeline verification failed');
  console.error(error?.stack || error);
  process.exitCode = 1;
}
