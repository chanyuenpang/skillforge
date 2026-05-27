import { buildBetterWorkflow } from "../src/skillforge/betterworkflow-builder.mjs";
import { mapWorkflowToPlanDTO } from "../src/skillforge/betterworkflow-plan-adapter.mjs";

const sampleInput = {
  goal: {
    summary: "将 betterWorkflow 从设计层推进到实现层，落地最小生成链原型",
    deliverable: "可运行的 betterworkflow builder + plan adapter + 验证脚本",
  },
  context: {
    project: "SkillForge 产品形态完整落地里程碑规划",
    background: "betterWorkflow builder 已可生成 milestones + atomicTasks，现需接入当前 plan/task 结构",
  },
  constraints: {
    timebox: "本轮只做最小 adapter",
    hardRules: [
      "只做 betterWorkflow -> 当前 plan 结构的最小 adapter",
      "不做大重构",
      "不接 Run Center UI",
      "先能跑起来",
    ],
  },
  parameters: {
    maxMilestones: 3,
    maxAtomicTasksPerMilestone: 2,
    depth: "mvp",
  },
};

const workflowOutput = buildBetterWorkflow(sampleInput);
const planDTO = mapWorkflowToPlanDTO(workflowOutput);

console.log("[betterworkflow-plan-adapter test] summary:");
console.log("- milestones:", workflowOutput.milestones.length);
console.log("- atomicTasks:", workflowOutput.atomicTasks.length);
console.log("- phases:", planDTO.phases.length);
console.log("- tasks:", planDTO.tasks.length);
console.log("- dependencies:", planDTO.dependencies.length);

console.log("\nPhases:");
for (const phase of planDTO.phases) {
  console.log(`- ${phase.id} | ${phase.title} | tasks=${phase.taskIds.join(", ") || "(none)"}`);
}

console.log("\nTasks:");
for (const task of planDTO.tasks) {
  console.log(`- ${task.id} | phase=${task.phaseId} | ${task.title}`);
  console.log(`  dependsOn: ${task.dependsOn.join(", ") || "(none)"}`);
  console.log(`  outputs: ${task.outputs.join(", ") || "(none)"}`);
}

const pass =
  planDTO.phases.length >= workflowOutput.milestones.length &&
  planDTO.tasks.length === workflowOutput.atomicTasks.length;

if (!pass) {
  console.error("\n[FAIL] adapter mapping check failed");
  process.exitCode = 1;
} else {
  console.log("\n[PASS] adapter mapping check passed");
}
