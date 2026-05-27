import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

function toSafeSlug(value, fallback = "workflow") {
  const normalized = String(value ?? "").trim().toLowerCase();
  const slug = normalized
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || fallback;
}

function summarizeInput(input) {
  const hardRules = Array.isArray(input?.constraints?.hardRules) ? input.constraints.hardRules : [];
  return {
    goalSummary: input?.goal?.summary ?? null,
    deliverable: input?.goal?.deliverable ?? null,
    project: input?.context?.project ?? null,
    hardRuleCount: hardRules.length,
    maxMilestones: input?.parameters?.maxMilestones ?? null,
    maxAtomicTasksPerMilestone: input?.parameters?.maxAtomicTasksPerMilestone ?? null,
    depth: input?.parameters?.depth ?? null,
  };
}

function summarizePlanDTO(planDTO) {
  return {
    phaseCount: Array.isArray(planDTO?.phases) ? planDTO.phases.length : 0,
    taskCount: Array.isArray(planDTO?.tasks) ? planDTO.tasks.length : 0,
    dependencyCount: Array.isArray(planDTO?.dependencies) ? planDTO.dependencies.length : 0,
  };
}

export async function writeBetterWorkflowArtifact({
  input,
  pipelineResult,
  artifactDir = path.resolve(process.cwd(), "fixtures/betterworkflow-artifacts"),
} = {}) {
  if (!pipelineResult || typeof pipelineResult !== "object") {
    const error = new Error("pipelineResult is required");
    error.name = "BetterWorkflowArtifactStoreValidationError";
    throw error;
  }

  const { workflowOutput = null, planDTO = null, summary = null } = pipelineResult;
  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  const goalSlug = toSafeSlug(input?.goal?.summary, "betterworkflow");
  const artifactId = `${stamp}-${goalSlug}`;
  const artifactPath = path.join(artifactDir, `${artifactId}.json`);

  const artifact = {
    id: artifactId,
    createdAt: now.toISOString(),
    source: "betterworkflow-pipeline",
    inputSummary: summarizeInput(input),
    workflowOutput,
    planDTOSummary: summarizePlanDTO(planDTO),
    summary,
  };

  await mkdir(artifactDir, { recursive: true });
  await writeFile(artifactPath, JSON.stringify(artifact, null, 2), "utf8");

  return {
    artifactId,
    artifactPath,
  };
}

export default writeBetterWorkflowArtifact;
