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
 * @returns {{ skillSpec, skillManifest, skillMd, planSkeleton, lineage }}
 */
export function runGeneratorPipeline(workflowSource, options = {}) {
  const finalized =
    options && typeof options.finalized === 'object' && options.finalized !== null
      ? options.finalized
      : {};
  const generationContext = {
    generationRunId:
      typeof options.generationRunId === 'string' && options.generationRunId.trim()
        ? options.generationRunId.trim()
        : undefined,
    sourceRefs: Array.isArray(options.sourceRefs) ? options.sourceRefs : [],
    finalized,
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

  const skillSpec = compileWorkflowToSpec(workflowSource, generationContext);
  const skillManifest = compileSpecToManifest(skillSpec, generationContext);
  const skillMd = compileManifestToSkillMd(skillManifest);

  const validation = {
    hasSkillName: Boolean(skillManifest?.skill?.name),
    hasGenerationRunId: Boolean(skillManifest?.generationRunId),
    hasFinalizedId: Boolean(skillManifest?.lineage?.finalizedId),
  };
  const reconcile = {
    valid: validation.hasSkillName,
    traceable:
      validation.hasGenerationRunId ||
      validation.hasFinalizedId ||
      (Array.isArray(skillManifest?.sourceRefs) && skillManifest.sourceRefs.length > 0),
  };

  return {
    skillSpec,
    skillManifest,
    skillMd,
    planSkeleton: skillManifest?.planSkeleton || skillSpec?.planSkeleton,
    validation,
    reconcile,
    generationRun: {
      id: generationContext.generationRunId,
      sourceRefs: generationContext.sourceRefs,
    },
    lineage: {
      ...generationContext.lineage,
      finalizedId: skillManifest?.lineage?.finalizedId,
      finalizedRevision: skillManifest?.lineage?.finalizedRevision,
      finalizedAt: skillManifest?.lineage?.finalizedAt,
      traceable: reconcile.traceable,
    },
  };
}
