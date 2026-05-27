import { runBetterWorkflowPipeline } from "../src/skillforge/betterworkflow-pipeline.mjs";

const sampleInput = {
  goal: {
    summary: "把 builder + adapter 串成最小 dogfooding 闭环并验证可跑通",
    deliverable: "可运行 betterWorkflow pipeline + 端到端验证脚本",
  },
  context: {
    project: "SkillForge 产品形态完整落地里程碑规划",
    background: "已有 input -> workflowOutput 与 workflowOutput -> planDTO 两段能力，需打通为单链路",
  },
  constraints: {
    timebox: "先打通最小闭环",
    hardRules: [
      "只做 betterWorkflow 最小 dogfooding",
      "不做 UI/Run Center 接入",
      "不回退到 betterPrompt",
      "优先简单可运行",
    ],
  },
  parameters: {
    maxMilestones: 3,
    maxAtomicTasksPerMilestone: 2,
    depth: "mvp",
  },
};

const result = runBetterWorkflowPipeline(sampleInput);
const { workflowOutput, planDTO, summary } = result;

console.log("[betterworkflow-pipeline test] summary:");
console.log("- milestones:", summary.milestoneCount);
console.log("- atomicTasks:", summary.atomicTaskCount);
console.log("- phases:", summary.phaseCount);
console.log("- tasks:", summary.taskCount);
console.log("- dependencies:", summary.dependencyCount);

console.log("\nMilestones:");
for (const ms of workflowOutput.milestones) {
  console.log(`- ${ms.id} | ${ms.title} | tasks=${ms.atomicTaskIds.join(", ") || "(none)"}`);
}

console.log("\nTasks:");
for (const task of planDTO.tasks) {
  console.log(`- ${task.id} | phase=${task.phaseId} | ${task.title}`);
}

const pass =
  summary.milestoneCount > 0 &&
  summary.atomicTaskCount > 0 &&
  summary.taskCount === summary.atomicTaskCount &&
  summary.phaseCount >= summary.milestoneCount;

if (!pass) {
  console.error("\n[FAIL] betterWorkflow pipeline end-to-end check failed");
  process.exitCode = 1;
} else {
  console.log("\n[PASS] betterWorkflow pipeline end-to-end check passed");
}
