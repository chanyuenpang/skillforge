import { validateWorkflowInput } from "./betterworkflow-contract.mjs";
import { buildBetterWorkflow } from "./betterworkflow-builder.mjs";
import { mapWorkflowToPlanDTO } from "./betterworkflow-plan-adapter.mjs";

function summarizePipeline(workflowOutput, planDTO) {
  const milestones = Array.isArray(workflowOutput?.milestones) ? workflowOutput.milestones : [];
  const atomicTasks = Array.isArray(workflowOutput?.atomicTasks) ? workflowOutput.atomicTasks : [];
  const phases = Array.isArray(planDTO?.phases) ? planDTO.phases : [];
  const tasks = Array.isArray(planDTO?.tasks) ? planDTO.tasks : [];
  const dependencies = Array.isArray(planDTO?.dependencies) ? planDTO.dependencies : [];

  return {
    milestoneCount: milestones.length,
    atomicTaskCount: atomicTasks.length,
    phaseCount: phases.length,
    taskCount: tasks.length,
    dependencyCount: dependencies.length,
  };
}

export function runBetterWorkflowPipeline(input) {
  const inputValidation = validateWorkflowInput(input);
  if (!inputValidation.valid) {
    const error = new Error("Invalid betterWorkflow pipeline input");
    error.name = "BetterWorkflowPipelineInputValidationError";
    error.details = inputValidation.errors;
    throw error;
  }

  const workflowOutput = buildBetterWorkflow(input);
  const planDTO = mapWorkflowToPlanDTO(workflowOutput);
  const summary = summarizePipeline(workflowOutput, planDTO);

  return {
    workflowOutput,
    planDTO,
    summary,
  };
}

export default runBetterWorkflowPipeline;
