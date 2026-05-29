import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildBetterPromptPackage } from '../src/skillforge/betterprompt-builder.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureDir = resolve(__dirname, '../fixtures/betterworkflow-artifacts');

const artifactFiles = [
  '2026-05-27T16-07-33-308Z-skillforge-主计划-补最小-artifact-留痕并产出真实样本.json',
  '2026-05-27T16-07-52-206Z-skillforge-主计划-补最小-artifact-留痕并产出真实样本.json',
];

function makeSemanticAssetFromInputSummary(inputSummary) {
  return {
    summary: inputSummary.goalSummary || inputSummary.deliverable || '',
    capabilities: inputSummary.depth ? [inputSummary.depth, 'workflow'] : ['workflow', 'implementation'],
    constraints: inputSummary.hardRuleCount ? [`硬规则数: ${inputSummary.hardRuleCount}`] : [],
    intent: [inputSummary.deliverable || '最小可运行 artifact'],
    quality: { passed: true },
    extractor: 'llm-openai-gpt5',
  };
}

function makeWorkflowSuggestionFromWorkflowOutput(wo) {
  return {
    summary: wo.milestones?.[0]?.objective || '',
    milestones: (wo.milestones || []).map((m) => ({
      name: m.title || m.id,
      objective: m.objective || '',
      doneCriteria: m.doneCriteria || [],
    })),
    atomicTasks: (wo.atomicTasks || []).map((t) => ({
      title: t.title || t.id,
      action: t.action || '',
      deps: t.deps || [],
    })),
  };
}

function makeBetterPromptInput(artifact) {
  const semanticAsset = makeSemanticAssetFromInputSummary(artifact.inputSummary);
  const workflowSuggestion = makeWorkflowSuggestionFromWorkflowOutput(artifact.workflowOutput);
  const planSuggestion = {
    milestones: (artifact.workflowOutput?.milestones || []).map((m) => ({
      title: m.title || m.id,
      tasks: (m.atomicTaskIds || []).map((id) => {
        const at = (artifact.workflowOutput?.atomicTasks || []).find((t) => t.id === id);
        return { title: at?.title || id };
      }),
    })),
    steps: (artifact.workflowOutput?.milestones || []).map((m) => m.objective || m.title || ''),
    suggested_skill_refs: ['coding-agent-workflow', 'task-planning'],
  };

  return {
    version: '0.1.0',
    task: {
      id: artifact.id,
      goal: artifact.inputSummary.goalSummary || '生成可执行 prompt guidance',
      type: artifact.inputSummary.depth || 'prompt-guidance',
      success_criteria: [
        'prompt guidance 可直接用于 subagent',
        '覆盖 inputSummary 声明的深度',
      ],
    },
    context: {
      project: 'workflow-kit-task6-regression',
      facts: [
        `来源: ${artifact.source || 'betterworkflow-artifact'}`,
        `artifacts: ${artifact.id}`,
      ],
      semantic_asset: semanticAsset,
      plan_suggestion: planSuggestion,
      workflow_suggestion: workflowSuggestion,
    },
    skills: {
      candidates: ['coding-agent-workflow', 'task-planning', 'prompt-design'],
      bundle_refs: ['team-ops-bundle'],
    },
    constraints: {
      hard: ['只做第一轮最小可运行打样', '不接 execution-log / run center'],
      soft: ['从上游 suggestion 压缩 guidance，不拼接原文', '保留 QC'],
      risk_level: 'medium',
    },
    runtime: { language: 'zh-CN' },
  };
}

// ── Run ────────────────────────────────────────────────────────────────────

const results = [];

for (const fileName of artifactFiles) {
  const raw = JSON.parse(readFileSync(resolve(fixtureDir, fileName), 'utf8'));
  const input = makeBetterPromptInput(raw);
  const built = await buildBetterPromptPackage(input);
  const pkg = built.package;

  results.push({
    artifact: fileName.slice(0, 50),
    selected_skills: pkg.selected_skills,
    suggested_skill_refs: pkg.suggested_skill_refs,
    recommendation_bundle_refs: pkg.recommended_bundle_refs,
    non_catalog_selected: pkg.metadata?.non_catalog_selected,
    guidance_count: pkg.metadata?.suggestion_guidance_count,
    qc_pass: built.qc_result?.pass,
    qc_issues: built.qc_result?.issues,
    system_length: pkg.prompt.system.length,
    has_upstream_section: pkg.prompt.system.includes('上游建议'),
    fallback_used: pkg.metadata?.fallback_used,
  });
}

console.table(results.map((r, i) => ({ '#': i + 1, ...r, artifact: r.artifact })));

// ── Assert ─────────────────────────────────────────────────────────────────

const errors = [];

for (const r of results) {
  if (!r.qc_pass) errors.push(`${r.artifact}: QC failed - ${r.qc_issues?.join(';')}`);
  if (!r.has_upstream_section) errors.push(`${r.artifact}: missing upstream guidance section in system prompt`);
  if (r.fallback_used) errors.push(`${r.artifact}: fallback triggered unexpectedly`);
  if (!r.selected_skills || r.selected_skills.length < 1) errors.push(`${r.artifact}: no selected skills`);
  // Non-catalog refs in metadata.trace is expected; they must NOT appear in selected_skills
  const nonCatInSelected = (r.non_catalog_selected || []).filter(id => (r.selected_skills || []).includes(id));
  if (nonCatInSelected.length > 0) {
    errors.push(`${r.artifact}: non-catalog refs leaked into selected_skills: ${nonCatInSelected}`);
  }
}

// Print one full system prompt for the first artifact
const firstPkg = (await buildBetterPromptPackage(
  makeBetterPromptInput(JSON.parse(readFileSync(resolve(fixtureDir, artifactFiles[0]), 'utf8')))
)).package;
console.log('\n--- Full system prompt (artifact 1) ---');
console.log(firstPkg.prompt.system);

if (errors.length > 0) {
  console.error('\n❌ REGRESSION FAILED:');
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(`\n✅ Task6 regression passed: ${results.length} real artifacts, all QC pass, all with upstream guidance`);
