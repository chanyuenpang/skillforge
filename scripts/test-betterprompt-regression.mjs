import { validateBetterPromptInput } from '../src/skillforge/betterprompt-contract.mjs';
import { buildBetterPromptPackage } from '../src/skillforge/betterprompt-builder.mjs';
import { evaluateBetterPromptPackage } from '../src/skillforge/betterprompt-qc.mjs';
import { BETTERPROMPT_SAMPLES } from '../src/skillforge/fixtures/betterprompt-samples.mjs';

function detectFallbackOrUnstable(sample, built, evaluated, buildError) {
  const flags = [];

  if (buildError) {
    flags.push('build-error');
    return flags;
  }

  const selectedCount = built?.package?.selected_skills?.length || 0;
  if (selectedCount === 0) {
    flags.push('fallback:no-selected-skills');
  }

  const checks = Array.isArray(evaluated?.checks) ? evaluated.checks : [];
  const failedChecks = checks.filter((c) => !c.pass);
  if (failedChecks.length > 0) {
    flags.push('unstable:failed-checks');
  }

  if ((evaluated?.score ?? 0) < 80) {
    flags.push('unstable:low-score');
  }

  if (sample.shape === '冲突约束') {
    flags.push('unstable:conflicting-constraints');
  }

  return flags;
}

async function runOne(sample) {
  const validation = validateBetterPromptInput(sample.input);
  const inputValid = validation.success;

  let buildError = null;
  let built = null;
  let evaluated = null;

  if (inputValid) {
    try {
      built = await buildBetterPromptPackage(validation.data);
      evaluated = evaluateBetterPromptPackage(built.package);
    } catch (error) {
      buildError = error;
    }
  }

  const selectionCount = built?.package?.selected_skills?.length || 0;
  const builderQcPass = built?.qc_result?.pass ?? false;
  const evalPass = evaluated?.pass ?? false;
  const evalScore = evaluated?.score ?? 0;

  const flags = detectFallbackOrUnstable(sample, built, evaluated, buildError);

  return {
    sample_id: sample.id,
    shape: sample.shape,
    input_valid: inputValid,
    built: !!built,
    build_error: buildError ? String(buildError.message || buildError) : null,
    selection_count: selectionCount,
    builder_qc_pass: builderQcPass,
    evaluate_pass: evalPass,
    evaluate_score: evalScore,
    tags: evaluated?.tags || [],
    fallback_or_unstable: flags,
  };
}

function summarize(results) {
  const sampleCount = results.length;
  const validCount = results.filter((r) => r.input_valid).length;
  const builtCount = results.filter((r) => r.built).length;
  const builderQcPassCount = results.filter((r) => r.builder_qc_pass).length;
  const evalPassCount = results.filter((r) => r.evaluate_pass).length;
  const fallbackOrUnstableCount = results.filter((r) => (r.fallback_or_unstable || []).length > 0).length;

  const totalSelections = results.reduce((sum, r) => sum + (r.selection_count || 0), 0);
  const avgSelectionCount = sampleCount > 0 ? Number((totalSelections / sampleCount).toFixed(2)) : 0;

  return {
    sample_count: sampleCount,
    input_valid_count: validCount,
    built_count: builtCount,
    selection_qc: {
      avg_selection_count: avgSelectionCount,
      builder_qc_pass_count: builderQcPassCount,
      evaluate_pass_count: evalPassCount,
    },
    fallback_or_unstable_count: fallbackOrUnstableCount,
  };
}

async function main() {
  const results = await Promise.all(BETTERPROMPT_SAMPLES.map(runOne));
  const summary = summarize(results);

  const output = {
    suite: 'betterprompt-min-regression-v1',
    generated_at: new Date().toISOString(),
    summary,
    results,
  };

  console.log(JSON.stringify(output, null, 2));
}

await main();
