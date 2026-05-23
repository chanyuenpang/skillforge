import { compileWorkflowToSpec } from './generator-workflow-to-spec.mjs';
import { compileSpecToManifest } from './generator-spec-to-manifest.mjs';
import { compileManifestToSkillMd } from './generator-manifest-to-skill-md.mjs';

/**
 * runGeneratorPipeline(workflowSource)
 *
 * Minimal end-to-end generator orchestrator.
 * Chains: workflowSource → SkillSpec → SkillManifest → SKILL.md skeleton.
 *
 * @param {object} workflowSource - Raw workflow source descriptor.
 * @returns {{ skillSpec, skillManifest, skillMd, lineage }}
 */
export function runGeneratorPipeline(workflowSource) {
  const skillSpec = compileWorkflowToSpec(workflowSource);
  const skillManifest = compileSpecToManifest(skillSpec);
  const skillMd = compileManifestToSkillMd(skillManifest);

  return {
    skillSpec,
    skillManifest,
    skillMd,
    lineage: {
      pipeline: 'generator-v1',
      stages: [
        'compileWorkflowToSpec',
        'compileSpecToManifest',
        'compileManifestToSkillMd',
      ],
      sourceKind:
        typeof workflowSource === 'object' && workflowSource !== null
          ? workflowSource.kind || 'unknown'
          : 'unknown',
    },
  };
}
