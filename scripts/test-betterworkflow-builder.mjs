import { buildBetterWorkflow } from "../src/skillforge/betterworkflow-builder.mjs";
import { validateWorkflowOutput } from "../src/skillforge/betterworkflow-contract.mjs";

const sampleInput = {
  goal: {
    summary: "将 betterWorkflow 从设计层推进到实现层，落地最小生成链原型",
    deliverable: "可运行的 betterworkflow builder + 验证脚本",
  },
  context: {
    project: "SkillForge 产品形态完整落地里程碑规划",
    background: "Skill Registry MVP 与 betterPrompt MVP 已完成，betterWorkflow 当前仅完成设计层",
  },
  constraints: {
    timebox: "本轮只做 Task 2 最小原型",
    hardRules: [
      "只做 betterWorkflow builder 最小原型",
      "不接 Run Center UI",
      "不回退到 betterPrompt",
      "先能跑起来，不追求最优拆解",
    ],
  },
  parameters: {
    maxMilestones: 3,
    maxAtomicTasksPerMilestone: 2,
    depth: "mvp",
  },
};

const output = buildBetterWorkflow(sampleInput);
const validation = validateWorkflowOutput(output);

console.log("[betterworkflow-builder test] validation:", validation);
console.log("\nMilestones:");
for (const ms of output.milestones) {
  console.log(`- ${ms.id} | ${ms.title}`);
  console.log(`  objective: ${ms.objective}`);
  console.log(`  atomicTaskIds: ${ms.atomicTaskIds.join(", ")}`);
}

console.log("\nAtomic Tasks:");
for (const task of output.atomicTasks) {
  console.log(`- ${task.id} | milestone=${task.milestoneId} | ${task.title}`);
  console.log(`  action: ${task.action}`);
  console.log(`  output: ${task.output}`);
  console.log(`  deps: ${task.deps.join(", ") || "(none)"}`);
}

if (!validation.valid) {
  process.exitCode = 1;
}
