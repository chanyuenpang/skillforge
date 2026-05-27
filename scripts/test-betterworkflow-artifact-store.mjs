import { access, readFile } from "node:fs/promises";
import { runBetterWorkflowPipeline } from "../src/skillforge/betterworkflow-pipeline.mjs";
import { writeBetterWorkflowArtifact } from "../src/skillforge/betterworkflow-artifact-store.mjs";

const sampleInput = {
  goal: {
    summary: "SkillForge 主计划：补最小 artifact 留痕并产出真实样本",
    deliverable: "betterWorkflow pipeline 结构化 artifact fixture",
  },
  context: {
    project: "SkillForge 产品形态完整落地里程碑规划",
    background: "pipeline 已跑通，需要将真实结果沉淀为 artifact 供后续 execution-log / Run Center 复用",
  },
  constraints: {
    timebox: "最小可用",
    hardRules: ["只做 artifact 留痕", "不做 Run Center UI", "保持结构化 JSON"],
  },
  parameters: {
    maxMilestones: 3,
    maxAtomicTasksPerMilestone: 2,
    depth: "mvp",
  },
};

const pipelineResult = runBetterWorkflowPipeline(sampleInput);
const saved = await writeBetterWorkflowArtifact({
  input: sampleInput,
  pipelineResult,
});

await access(saved.artifactPath);
const artifactRaw = await readFile(saved.artifactPath, "utf8");
const artifact = JSON.parse(artifactRaw);

const pass =
  Boolean(saved.artifactId) &&
  Boolean(saved.artifactPath) &&
  artifact?.id === saved.artifactId &&
  artifact?.source === "betterworkflow-pipeline" &&
  artifact?.summary?.milestoneCount > 0 &&
  artifact?.workflowOutput?.milestones?.length > 0;

console.log("[betterworkflow-artifact-store test]");
console.log("artifactId:", saved.artifactId);
console.log("artifactPath:", saved.artifactPath);
console.log("milestones:", artifact?.summary?.milestoneCount ?? 0);
console.log("tasks:", artifact?.summary?.taskCount ?? 0);

if (!pass) {
  console.error("\n[FAIL] betterWorkflow artifact store validation failed");
  process.exitCode = 1;
} else {
  console.log("\n[PASS] betterWorkflow artifact store validation passed");
}
