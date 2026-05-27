/**
 * test-betterworkflow-run-center-view.mjs
 *
 * Verifies that buildBetterWorkflowRunCenterView can take a real
 * betterWorkflow execution record (built from pipeline output) and
 * produce a valid Run Center view summary.
 *
 * Does NOT touch any UI — pure data-transformation assertion.
 */
import { runBetterWorkflowPipeline } from "../src/skillforge/betterworkflow-pipeline.mjs";
import { buildBetterWorkflowExecutionRecord } from "../src/skillforge/betterworkflow-execution-record.mjs";
import { buildBetterWorkflowRunCenterView } from "../src/skillforge/betterworkflow-run-center-view.mjs";

// ── sample input (same as test-betterworkflow-execution-record) ───
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

// ── 1) build execution record (the real shape) ────────────────────
const start = Date.now();
const pipelineResult = runBetterWorkflowPipeline(sampleInput);
const durationMs = Date.now() - start;

const record = buildBetterWorkflowExecutionRecord(sampleInput, pipelineResult, {
  artifactPath: "/tmp/betterworkflow-artifact-dummy.json",
  durationMs,
  status: "completed",
  planRef: "skillforge/milestone-b/betterworkflow/trace-link",
  taskRef: "task-33",
  traceRefs: {
    session: "agent:coding-agent:subagent:39ccabf3-bbda-4aa2-bc78-d703d4376c9f",
    run: "milestone-b-step-33",
  },
});

// ── 2) convert to Run Center view ────────────────────────────────
const view = buildBetterWorkflowRunCenterView(record);

console.log("=== Run Center View ===");
console.log(JSON.stringify(view, null, 2));

// ── 3) assert mandatory fields ───────────────────────────────────
let exitCode = 0;

function check(label, pass) {
  const icon = pass ? "✔" : "✘";
  console.log(`  ${icon} ${label}`);
  if (!pass) exitCode = 1;
}

// ── Identity fields
console.log("\n=== Identity fields ===");
check("kind === 'betterworkflow.run'", view.kind === "betterworkflow.run");
check("source === 'betterworkflow-pipeline'", view.source === "betterworkflow-pipeline");
check("id is non-empty string", typeof view.id === "string" && view.id.length > 0);
check("createdAt is valid ISO string", !Number.isNaN(Date.parse(view.createdAt)));
check("status === 'completed'", view.status === "completed");

// ── Title & summary
console.log("\n=== Title / summary ===");
check("title starts with 'betterWorkflow ·'", typeof view.title === "string" && view.title.startsWith("betterWorkflow ·"));
check("title contains goal summary", view.title.includes("dogfooding"));
check("summary is non-empty string", typeof view.summary === "string" && view.summary.length > 0);
check("summary contains project name", view.summary.includes("SkillForge"));
check("summary contains milestone count", view.summary.includes("milestone"));
check("summary contains duration", view.summary.includes("Duration:"));

// ── inputSummary
console.log("\n=== inputSummary ===");
const is = view.inputSummary;
check("inputSummary exists", is !== null && typeof is === "object");
check("inputSummary.goalSummary non-empty", typeof is.goalSummary === "string" && is.goalSummary.length > 0);
check("inputSummary.project non-empty", typeof is.project === "string" && is.project.length > 0);
check("inputSummary.hardRuleCount === 4", is.hardRuleCount === 4);
check("inputSummary.hardRules is array of length 4", Array.isArray(is.hardRules) && is.hardRules.length === 4);
check("inputSummary.maxMilestones === 3", is.maxMilestones === 3);
check("inputSummary.maxAtomicTasksPerMilestone === 2", is.maxAtomicTasksPerMilestone === 2);
check("inputSummary.depth === 'mvp'", is.depth === "mvp");

// ── Counts
console.log("\n=== Counts ===");
const c = view.counts;
check("counts exists", c !== null && typeof c === "object");
check("counts.milestones === 3", c.milestones === 3);
check("counts.tasks === 6", c.tasks === 6);
check("counts.phases === 3", c.phases === 3);
check("counts.dependencies === 3", c.dependencies === 3);
check("counts.atomicTasks === 6", c.atomicTasks === 6);

// ── Refs
console.log("\n=== Refs ===");
check("planRef matches", view.planRef === "skillforge/milestone-b/betterworkflow/trace-link");
check("taskRef matches", view.taskRef === "task-33");
check("traceRefs exists", view.traceRefs !== null && typeof view.traceRefs === "object");
check("traceRefs.run === 'milestone-b-step-33'", view.traceRefs.run === "milestone-b-step-33");
check("traceRefs.session starts with 'agent:coding-agent'", view.traceRefs.session?.startsWith("agent:coding-agent"));

// ── Artifact / workflow refs
console.log("\n=== Artifact / workflow refs ===");
check("workflowRef starts with 'betterworkflow-'", typeof view.workflowRef === "string" && view.workflowRef.startsWith("betterworkflow-"));
check("artifactRef matches", view.artifactRef === "/tmp/betterworkflow-artifact-dummy.json");
check("durationMs is a positive number", typeof view.durationMs === "number" && view.durationMs >= 0);

// ── 4) summary ───────────────────────────────────────────────────
console.log("\n=== Summary ===");
console.log(`- kind:          ${view.kind}`);
console.log(`- id:            ${view.id}`);
console.log(`- status:        ${view.status}`);
console.log(`- title:         ${view.title}`);
console.log(`- counts:        M=${c.milestones} T=${c.tasks} P=${c.phases} D=${c.dependencies} A=${c.atomicTasks}`);
console.log(`- durationMs:    ${view.durationMs}ms`);

if (exitCode === 0) {
  console.log("\n[PASS] All Run Center view assertions passed");
} else {
  console.error("\n[FAIL] Some Run Center view assertions failed");
}

process.exitCode = exitCode;
