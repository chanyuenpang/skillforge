import assert from 'node:assert/strict';
import { buildBetterPromptPackage } from '../src/skillforge/betterprompt-builder.mjs';
import { BETTERPROMPT_RAW_EVIDENCE_SAMPLES } from '../src/skillforge/fixtures/betterprompt-raw-evidence-samples.mjs';

async function runOne(sample) {
  const built = await buildBetterPromptPackage(sample.input);
  const fallbackUsed = built?.fallback?.fallback_used === true;

  assert.equal(
    fallbackUsed,
    sample.expectFallback,
    `[${sample.id}] fallback 期望=${sample.expectFallback} 实际=${fallbackUsed}`,
  );

  if (!sample.expectFallback) {
    assert.equal(
      built?.fallback?.package_minimal_ready,
      true,
      `[${sample.id}] 有 raw 主证据时，package_minimal_ready 必须为 true`,
    );

    const selectedSkills = built?.package?.selected_skills || [];
    assert.ok(
      selectedSkills.length > 0,
      `[${sample.id}] 有 raw 主证据时，selected_skills 不应为空`,
    );
  }

  return {
    id: sample.id,
    expectFallback: sample.expectFallback,
    fallbackUsed,
    packageMinimalReady: built?.fallback?.package_minimal_ready ?? false,
    selectedSkillCount: built?.package?.selected_skills?.length || 0,
  };
}

async function main() {
  const results = [];
  for (const sample of BETTERPROMPT_RAW_EVIDENCE_SAMPLES) {
    results.push(await runOne(sample));
  }

  console.log(JSON.stringify({
    suite: 'betterprompt-raw-evidence-gate-v1',
    passed: true,
    total: results.length,
    results,
  }, null, 2));
}

await main();
