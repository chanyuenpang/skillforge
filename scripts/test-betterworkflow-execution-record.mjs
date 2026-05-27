/**
 * test-betterworkflow-execution-record.mjs
 *
 * Verifies that buildBetterWorkflowExecutionRecord can take a real
 * pipeline result from runBetterWorkflowPipeline and produce a valid
 * execution-log-compatible record with betterWorkflow trace fields.
 */
import { runBetterWorkflowPipeline } from "../src/skillforge/betterworkflow-pipeline.mjs";
import { buildBetterWorkflowExecutionRecord } from "../src/skillforge/betterworkflow-execution-record.mjs";
import { validateExecutionLogEntry } from "../src/skillforge/execution-log-store.mjs";

// ── sample input (same Shape as test-betterworkflow-pipeline) ──────
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

// ── 1) run pipeline ──────────────────────────────────────────────
const start = Date.now();
const pipelineResult = runBetterWorkflowPipeline(sampleInput);
const durationMs = Date.now() - start;

console.log("=== Pipeline output summary ===");
console.log(JSON.stringify(pipelineResult.summary, null, 2));

// ── 2) build execution record ────────────────────────────────────
const artifactPath = "/tmp/betterworkflow-artifact-dummy.json";
const record = buildBetterWorkflowExecutionRecord(sampleInput, pipelineResult, {
  artifactPath,
  durationMs,
  status: "completed",
});

console.log("\n=== Execution record ===");
console.log(JSON.stringify(record, null, 2));

// ── 3) validate against execution-log-store contract ──────────────
const validation = validateExecutionLogEntry(record);

if (!validation.valid) {
  console.error("\n[FAIL] Record failed execution-log-store validation:");
  console.error(JSON.stringify(validation.errors, null, 2));
  process.exitCode = 1;
} else {
  console.log("\n[PASS] Record passes execution-log-store validation");
}

// ── 4) verify betterWorkflow-specific fields ─────────────────────
const checks = [
  { label: "kind === betterworkflow.execution", pass: record.kind === "betterworkflow.execution" },
  { label: "source === betterworkflow-pipeline", pass: record.source === "betterworkflow-pipeline" },
  { label: "id is non-empty string", pass: typeof record.id === "string" && record.id.length > 0 },
  { label: "createdAt is valid ISO string", pass: !Number.isNaN(Date.parse(record.createdAt)) },
  { label: "inputSummary.goalSummary non-empty", pass: !!record.inputSummary?.goalSummary },
  { label: "inputSummary.project non-empty", pass: !!record.inputSummary?.project },
  { label: "inputSummary.hardRuleCount === 4", pass: record.inputSummary?.hardRuleCount === 4 },
  { label: "workflowRef starts with betterworkflow-", pass: record.workflowRef.startsWith("betterworkflow-") },
  { label: "artifactPath matches", pass: record.artifactPath === artifactPath },
  { label: "milestoneCount === 3", pass: record.milestoneCount === 3 },
  { label: "atomicTaskCount === 6", pass: record.atomicTaskCount === 6 },
  { label: "phaseCount === 3", pass: record.phaseCount === 3 },
  { label: "taskCount === 6", pass: record.taskCount === 6 },
  { label: "dependencyCount === 3", pass: record.dependencyCount === 3 },
  { label: "planRef is null (reserved)", pass: record.planRef === null },
  { label: "status === completed", pass: record.status === "completed" },
  { label: "durationMs is a positive number", pass: typeof record.durationMs === "number" && record.durationMs >= 0 },
];

console.log("\n=== BetterWorkflow-specific field checks ===");
let allPass = true;
for (const check of checks) {
  const icon = check.pass ? "✔" : "✘";
  console.log(`  ${icon} ${check.label}`);
  if (!check.pass) allPass = false;
}

if (!allPass) {
  console.error("\n[FAIL] Some betterWorkflow-specific field checks failed");
  process.exitCode = 1;
} else {
  console.log("\n[PASS] All betterWorkflow-specific field checks passed");
}

// ── 5) summary ───────────────────────────────────────────────────
console.log("\n=== Summary ===");
console.log(`- executionId:              ${record.executionId}`);
console.log(`- kind:                     ${record.kind}`);
console.log(`- source:                   ${record.source}`);
console.log(`- status:                   ${record.status}`);
console.log(`- createdAt:                ${record.createdAt}`);
console.log(`- inputSummary.goalSummary: ${record.inputSummary.goalSummary}`);
console.log(`- workflowRef:              ${record.workflowRef}`);
console.log(`- milestoneCount:           ${record.milestoneCount}`);
console.log(`- atomicTaskCount:          ${record.atomicTaskCount}`);
console.log(`- phaseCount:               ${record.phaseCount}`);
console.log(`- taskCount:                ${record.taskCount}`);
console.log(`- dependencyCount:          ${record.dependencyCount}`);
console.log(`- durationMs:               ${record.durationMs}ms`);
console.log(`- execution-log valid:      ${validation.valid}`);
