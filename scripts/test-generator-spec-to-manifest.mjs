import { compileSpecToManifest } from '../src/skillforge/generator-spec-to-manifest.mjs';

function fail(message, details) {
  console.error('❌ FAIL:', message);
  if (details !== undefined) {
    console.error(details);
  }
  process.exitCode = 1;
}

function pass(message) {
  console.log('✅ PASS:', message);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function main() {
  const skillSpec = {
    skill: {
      name: 'spec-to-manifest-test',
      title: 'Spec to Manifest Test',
      description: 'Minimal spec for verifying compileSpecToManifest.',
      triggerPhrases: ['test spec to manifest'],
    },
    inputs: {
      required: ['skillSpec'],
      optional: [],
    },
    outputs: {
      primary: 'skill-manifest',
      format: 'json',
      requiredSections: ['kind', 'skill', 'outputs', 'permissions'],
    },
    permissions: {
      network: false,
      externalSend: false,
      fileRead: false,
      fileWrite: false,
      destructiveOperations: false,
      privatePathRead: false,
    },
  };

  let manifest;
  try {
    manifest = compileSpecToManifest(skillSpec);
  } catch (error) {
    fail('compileSpecToManifest threw an error', error);
    return;
  }

  const problems = [];
  if (manifest?.kind !== 'skill-manifest') problems.push(`Expected kind === 'skill-manifest', got ${manifest?.kind}`);
  if (!isNonEmptyString(manifest?.skill?.name)) problems.push('Expected a valid non-empty manifest.skill.name');
  if (!isNonEmptyString(manifest?.outputs?.format)) problems.push('Expected a valid non-empty manifest.outputs.format');
  if (!manifest?.permissions || typeof manifest.permissions !== 'object' || Array.isArray(manifest.permissions)) {
    problems.push('Expected manifest.permissions to be an object');
  }

  if (problems.length > 0) {
    fail('manifest contract check failed', problems.join('\n'));
    return;
  }

  pass('compileSpecToManifest returned a valid minimal SkillManifest skeleton');
  console.log(JSON.stringify(manifest, null, 2));
}

main();
