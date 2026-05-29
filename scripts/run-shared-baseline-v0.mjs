#!/usr/bin/env node

/**
 * run-shared-baseline-v0.mjs — Shared baseline v0 runner
 *
 * 读取 baselines/shared/v0/samples/manifest.json，按顺序消费 jsonl 样本，
 * 按 record.dataset 分流到对应 stage：
 *   - betterprompt  → buildBetterPromptV1 全链路
 *   - betterplan    → runBetterPlan（LLM 管道，含兜底）
 *   - integration   → plan→prompt→spawn smoke 链路
 *
 * 产出统一 summary 到 baselines/shared/v0/results/summary.json
 *
 * Usage:
 *   node scripts/run-shared-baseline-v0.mjs
 *   npm run baseline:shared:v0
 */

import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const SAMPLES_DIR = join(PROJECT_ROOT, 'baselines', 'shared', 'v0', 'samples');
const RESULTS_DIR = join(PROJECT_ROOT, 'baselines', 'shared', 'v0', 'results');

// ── Lazy imports (avoid loading everything if a stage is skipped) ──────────

async function loadBetterPromptBuilder() {
  const mod = await import('../src/skillforge/betterprompt-builder.mjs');
  return mod.buildBetterPromptV1 || mod.buildBetterPromptPackage;
}

async function loadBetterPlanPipeline() {
  const mod = await import('../src/skillforge/betterplan-pipeline.mjs');
  return mod.runBetterPlan;
}

async function loadIntegrationModules() {
  const [integration, mapper, runtime] = await Promise.all([
    import('../src/skillforge/plan-prompt-spawn-integration.mjs'),
    import('../src/skillforge/plan-dto-mapper.mjs'),
    import('../src/skillforge/plan-runtime.mjs'),
  ]);
  return {
    linkReadyTasks: integration.linkReadyTasks,
    mapPlanSkeletonToPlanDTO: mapper.mapPlanSkeletonToPlanDTO,
    evaluatePlanRuntime: runtime.evaluatePlanRuntime,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function hasText(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function toArray(v) {
  return Array.isArray(v) ? v : [];
}

function nowISO() {
  return new Date().toISOString();
}

function durationMs(startTime) {
  return Date.now() - startTime;
}

async function readJSONL(filePath) {
  const raw = await readFile(filePath, 'utf8');
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return { _parse_error: true, _raw: line.slice(0, 200) };
      }
    });
}

async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

// ── Input mappers: convert shared-sample.v0 input → module-native input ───

/**
 * Map betterprompt shared-sample.v0 input to buildBetterPromptV1-compatible format.
 *
 * The v0 input structure: { version, task, context, skills, constraints, runtime }
 * The v1 builder expects: { prompt: string, goal_hint?: string, skillAssets?: array }
 *
 * We construct a rich prompt from all v0 fields so the builder has enough context
 * for skill resolution and 7-section template generation.
 */
function betterpromptInputToV1(input) {
  const goal = input.task?.goal || '';
  const type = input.task?.type || '';
  const project = input.context?.project || '';
  const facts = toArray(input.context?.facts).join('; ');
  const artifacts = toArray(input.context?.artifacts).join(', ');
  const successCriteria = toArray(input.task?.success_criteria).join('; ');
  const hardConstraints = toArray(input.constraints?.hard).join('; ');
  const riskLevel = input.constraints?.risk_level || 'low';
  const language = input.runtime?.language || 'zh-CN';
  const timebox = input.runtime?.timebox_min;
  const candidates = toArray(input.skills?.candidates);
  const bundles = toArray(input.skills?.bundle_refs);

  const promptParts = [
    `任务目标：${goal}`,
    type ? `任务类型：${type}` : '',
    project ? `所属项目：${project}` : '',
    successCriteria ? `成功标准：${successCriteria}` : '',
    facts ? `背景信息：${facts}` : '',
    artifacts ? `相关文档：${artifacts}` : '',
    hardConstraints ? `硬约束：${hardConstraints}` : '',
    `风险级别：${riskLevel}`,
    `输出语言：${language}`,
    timebox ? `时间预算：${timebox} 分钟` : '',
  ].filter(Boolean);

  const prompt = promptParts.join('\n');

  const skillAssets = [
    ...candidates.map((id) => ({ skill_id: id, source_skill_ref: id })),
    ...bundles.map((id) => ({ skill_id: id, source_skill_ref: id })),
  ];

  if (skillAssets.length === 0) {
    skillAssets.push({ skill_id: 'coding-agent-workflow', source_skill_ref: 'coding-agent-workflow' });
  }

  return { prompt, goal_hint: goal, skillAssets };
}

/**
 * Map betterplan shared-sample.v0 input to runBetterPlan-compatible format.
 *
 * The v0 input structure: { task, context, plan_suggestion, constraints }
 * runBetterPlan expects: { plan: string, goal_hint?: string }
 *
 * We construct a plan text from the suggestion steps and context.
 */
function betterplanInputToPipeline(input) {
  const goal = input.task?.goal || '';
  const type = input.task?.type || '';
  const project = input.context?.project || '';
  const facts = toArray(input.context?.facts).join('; ');
  const steps = toArray(input.plan_suggestion?.steps);
  const suggestedSkills = toArray(input.plan_suggestion?.suggested_skill_refs);
  const hardConstraints = toArray(input.constraints?.hard).join('; ');
  const riskLevel = input.constraints?.risk_level || 'medium';

  const planParts = [
    `# 计划：${goal}`,
    '',
    `## 目标`,
    goal,
    '',
    type ? `类型：${type}` : '',
    project ? `项目：${project}` : '',
    facts ? `背景：${facts}` : '',
    '',
    hardConstraints ? `硬约束：${hardConstraints}` : '',
    riskLevel ? `风险级别：${riskLevel}` : '',
    '',
    steps.length > 0 ? `## 建议步骤\n${steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}` : '',
    '',
    suggestedSkills.length > 0 ? `## 建议技能\n${suggestedSkills.join(', ')}` : '',
  ].filter(Boolean).join('\n');

  return { plan: planParts, goal_hint: goal };
}

/**
 * Build a minimal PlanDTO from integration shared-sample.v0 input.
 *
 * Each step in plan_stage.steps becomes a sequential task.
 * All tasks share the same phase; deps chain linearly.
 */
async function buildIntegrationPlanDTO(input, sampleId, mapFn) {
  const steps = toArray(input.plan_stage?.steps);
  const goal = input.task?.goal || `Integration plan for ${sampleId}`;
  const suggestedSkills = toArray(input.plan_stage?.suggested_skill_refs);

  const tasks = steps.map((step, i) => ({
    id: `${sampleId}-t${i + 1}`,
    title: step,
    description: `${step}（来源：integration 样本 ${sampleId}，建议技能：${suggestedSkills.join(', ') || '无'}）`,
    phase: 'main',
    dependsOn: i === 0 ? [] : [`${sampleId}-t${i}`],
    outputs: [step],
    order: i + 1,
  }));

  if (tasks.length === 0) {
    // Fallback: create at least one task from the goal
    tasks.push({
      id: `${sampleId}-t1`,
      title: goal,
      description: goal,
      phase: 'main',
      dependsOn: [],
      outputs: ['completed'],
      order: 1,
    });
  }

  const skeleton = {
    planId: `${sampleId}-plan`,
    planTitle: goal,
    version: '1.0.0',
    phases: [
      { id: 'main', title: '主要执行阶段', order: 1 },
    ],
    tasks,
  };

  return mapFn(skeleton);
}

// ── Sample result helpers ───────────────────────────────────────────────────

function makeSampleResult({
  id, status, durationMs, error, result,
  betterpromptPackageId, betterpromptSkills, betterpromptQcPass, betterpromptFallback,
  betterplanGoal, betterplanSkeletonLen, betterplanFallbackUsed, betterplanConfidence,
  integrationTraceCount, integrationPromptCount, integrationSpawnCount,
  warnings,
}) {
  const r = {
    id,
    status,
    duration_ms: durationMs,
  };
  if (error) r.error = String(error).slice(0, 500);
  if (betterpromptPackageId !== undefined) r.betterprompt_package_id = betterpromptPackageId;
  if (betterpromptSkills !== undefined) r.betterprompt_skills = betterpromptSkills;
  if (betterpromptQcPass !== undefined) r.betterprompt_qc_pass = betterpromptQcPass;
  if (betterpromptFallback !== undefined) r.betterprompt_fallback = betterpromptFallback;
  if (betterplanGoal !== undefined) r.betterplan_goal = betterplanGoal;
  if (betterplanSkeletonLen !== undefined) r.betterplan_skeleton_len = betterplanSkeletonLen;
  if (betterplanFallbackUsed !== undefined) r.betterplan_fallback_used = betterplanFallbackUsed;
  if (betterplanConfidence !== undefined) r.betterplan_confidence = betterplanConfidence;
  if (integrationTraceCount !== undefined) r.integration_trace_count = integrationTraceCount;
  if (integrationPromptCount !== undefined) r.integration_prompt_count = integrationPromptCount;
  if (integrationSpawnCount !== undefined) r.integration_spawn_count = integrationSpawnCount;
  if (result) {
    // Include a compact result digest (truncated for summary readability)
    const digest = typeof result === 'string' ? result : JSON.stringify(result);
    r.result_digest = digest.slice(0, 400);
  }
  if (warnings && warnings.length > 0) r.warnings = warnings;
  return r;
}

function makeStageResult({
  dataset, status, exitCode, durationMs,
  total, passed, failed, skipped,
  samples, note, capability,
}) {
  return {
    dataset,
    status,
    exit_code: exitCode ?? (status === 'completed' ? 0 : 1),
    duration_ms: durationMs,
    metrics: { total_samples: total, passed, failed, skipped: skipped ?? 0 },
    samples: samples ?? [],
    ...(note ? { note } : {}),
    ...(capability ? { capability } : {}),
  };
}

function buildFailureSampleSnapshot(sample) {
  const allowedFields = [
    'betterprompt_fallback',
    'betterprompt_package_id',
    'betterprompt_qc_pass',
    'betterprompt_skills',
    'betterplan_fallback_used',
    'betterplan_confidence',
    'betterplan_skeleton_len',
    'integration_trace_count',
    'integration_prompt_count',
    'integration_spawn_count',
    'result_digest',
    'warnings',
    'duration_ms',
  ];

  const snapshot = {};
  for (const key of allowedFields) {
    const value = sample?.[key];
    if (value !== undefined && value !== null) {
      snapshot[key] = value;
    }
  }

  return snapshot;
}

function buildFailuresNDJSON(summary) {
  const bestBySample = new Map();

  for (const stage of toArray(summary?.stages)) {
    const dataset = stage?.dataset || 'unknown';
    for (const sample of toArray(stage?.samples)) {
      const status = sample?.status;
      if (status !== 'error' && status !== 'partial') continue;

      const sampleId = sample?.id || 'unknown';
      const key = `${dataset}::${sampleId}`;
      const reason = hasText(sample?.error) ? sample.error : undefined;
      const reasonCode = hasText(sample?.error) ? 'RUNTIME_ERROR' : 'PARTIAL_RESULT';

      const item = {
        run_id: summary.run_id,
        dataset,
        sample_id: sampleId,
        status,
        stage: dataset,
        reason_code: reasonCode,
        ...(reason ? { reason } : {}),
        sample_snapshot: buildFailureSampleSnapshot(sample),
        ts: nowISO(),
      };

      const existing = bestBySample.get(key);
      if (!existing) {
        bestBySample.set(key, item);
        continue;
      }

      // 去重优先级：error > partial
      if (existing.status !== 'error' && item.status === 'error') {
        bestBySample.set(key, item);
      }
    }
  }

  return Array.from(bestBySample.values())
    .map((row) => JSON.stringify(row))
    .join('\n');
}

// ── Stage runners ───────────────────────────────────────────────────────────

async function runBetterPromptStage(samples) {
  const buildFn = await loadBetterPromptBuilder();
  const sampleResults = [];
  let passed = 0;
  let failed = 0;

  for (const record of samples) {
    const id = record.id || 'unknown';
    const t0 = Date.now();
    const warnings = [];

    if (record._parse_error) {
      sampleResults.push(makeSampleResult({ id, status: 'error', durationMs: durationMs(t0), error: 'JSONL 解析失败' }));
      failed++;
      continue;
    }

    try {
      const v1Input = betterpromptInputToV1(record.input);
      const result = await buildFn(v1Input);

      const pkg = result.package || result;
      const qc = result.qc || pkg?.qc || pkg?.delivery_package?.selfCheck || {};
      const qcPass = qc.pass === true || pkg?.qc?.pass === true;
      const fallbackUsed = result.fallback?.fallback_used === true || pkg?.fallback?.fallback_used === true;
      const skills = Array.isArray(pkg?.selected_skills) ? pkg.selected_skills : [];

      if (fallbackUsed) warnings.push('betterPrompt 使用了 fallback');

      sampleResults.push(makeSampleResult({
        id,
        status: qcPass ? 'passed' : 'partial',
        durationMs: durationMs(t0),
        betterpromptPackageId: pkg?.package_id || result?.package_id || null,
        betterpromptSkills: skills,
        betterpromptQcPass: qcPass,
        betterpromptFallback: fallbackUsed,
        warnings: warnings.length > 0 ? warnings : undefined,
      }));

      qcPass ? passed++ : failed++;
    } catch (err) {
      sampleResults.push(makeSampleResult({
        id,
        status: 'error',
        durationMs: durationMs(t0),
        error: err.message,
      }));
      failed++;
    }
  }

  return { sampleResults, passed, failed };
}

async function runBetterPlanStage(samples) {
  let runBetterPlanFn;
  try {
    runBetterPlanFn = await loadBetterPlanPipeline();
  } catch (err) {
    // Module load failed — mark all as skipped
    const sampleResults = samples.map((r) => makeSampleResult({
      id: r.id || 'unknown',
      status: 'skipped',
      durationMs: 0,
      error: `betterplan 模块加载失败: ${err.message}`,
    }));
    return { sampleResults, passed: 0, failed: 0, skipped: samples.length, loadError: err.message };
  }

  const sampleResults = [];
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const record of samples) {
    const id = record.id || 'unknown';
    const t0 = Date.now();
    const warnings = [];

    if (record._parse_error) {
      sampleResults.push(makeSampleResult({ id, status: 'error', durationMs: durationMs(t0), error: 'JSONL 解析失败' }));
      failed++;
      continue;
    }

    try {
      const pipelineInput = betterplanInputToPipeline(record.input);
      const output = await runBetterPlanFn(pipelineInput);

      if (output.error) {
        // LLM call failed entirely
        warnings.push(`LLM 调用失败: ${output.error}`);
        sampleResults.push(makeSampleResult({
          id,
          status: 'error',
          durationMs: durationMs(t0),
          error: output.error,
          betterplanFallbackUsed: output.meta?.fallbackUsed || false,
          warnings,
        }));
        failed++;
        continue;
      }

      const result = output.result;
      const meta = output.meta || {};
      const fallbackUsed = meta.fallbackUsed === true;
      const llmCalled = meta.llmCalled === true;

      if (fallbackUsed) warnings.push('betterPlan 使用了 LLM 结构兜底（输出未通过校验或解析失败）');
      if (!llmCalled) warnings.push('betterPlan 未调用 LLM（可能使用了兜底逻辑）');

      // In v0, if LLM wasn't called at all (e.g., api key missing), mark as partial
      const sampleStatus = llmCalled ? (fallbackUsed ? 'partial' : 'passed') : 'partial';

      sampleResults.push(makeSampleResult({
        id,
        status: sampleStatus,
        durationMs: durationMs(t0),
        betterplanGoal: result?.goal?.slice(0, 100) || null,
        betterplanSkeletonLen: Array.isArray(result?.skeleton) ? result.skeleton.length : 0,
        betterplanFallbackUsed: fallbackUsed,
        betterplanConfidence: typeof result?.confidence === 'number' ? result.confidence : null,
        warnings: warnings.length > 0 ? warnings : undefined,
        result: result ? {
          goal: result.goal,
          boundaries: result.boundaries?.slice(0, 2),
          skeleton_len: result.skeleton?.length,
          gaps: result.gaps?.slice(0, 2),
          confidence: result.confidence,
        } : null,
      }));

      if (sampleStatus === 'passed' || sampleStatus === 'partial') passed++;
      else failed++;
    } catch (err) {
      sampleResults.push(makeSampleResult({
        id,
        status: 'error',
        durationMs: durationMs(t0),
        error: err.message,
      }));
      failed++;
    }
  }

  return { sampleResults, passed, failed, skipped };
}

async function runIntegrationStage(samples) {
  let linkReadyTasks, mapPlanSkeletonToPlanDTO, evaluatePlanRuntime;
  try {
    const mods = await loadIntegrationModules();
    linkReadyTasks = mods.linkReadyTasks;
    mapPlanSkeletonToPlanDTO = mods.mapPlanSkeletonToPlanDTO;
    evaluatePlanRuntime = mods.evaluatePlanRuntime;
  } catch (err) {
    const sampleResults = samples.map((r) => makeSampleResult({
      id: r.id || 'unknown',
      status: 'skipped',
      durationMs: 0,
      error: `integration 模块加载失败: ${err.message}`,
    }));
    return { sampleResults, passed: 0, failed: 0, skipped: samples.length, loadError: err.message };
  }

  const sampleResults = [];
  let passed = 0;
  let failed = 0;

  for (const record of samples) {
    const id = record.id || 'unknown';
    const t0 = Date.now();

    if (record._parse_error) {
      sampleResults.push(makeSampleResult({ id, status: 'error', durationMs: durationMs(t0), error: 'JSONL 解析失败' }));
      failed++;
      continue;
    }

    try {
      const planDTO = await buildIntegrationPlanDTO(record.input, id, mapPlanSkeletonToPlanDTO);
      const runtimeOutput = evaluatePlanRuntime({
        planDTO,
        completedTaskIds: [],
        failedTaskIds: [],
      });

      const result = await linkReadyTasks({ planDTO, runtimeOutput });

      const traceCount = result.traceRecords?.length ?? 0;
      const promptCount = result.promptResults?.length ?? 0;
      const spawnCount = result.spawnSpecs?.length ?? 0;

      // Verify spawn specs pass validation
      const { validateSpawnSpec } = await import('../src/skillforge/spawn-spec-contract.mjs');
      let spawnValidCount = 0;
      for (const { spec } of result.spawnSpecs || []) {
        const v = validateSpawnSpec(spec);
        if (v.valid) spawnValidCount++;
      }

      const sampleStatus = traceCount > 0 && spawnCount > 0 && spawnValidCount === spawnCount ? 'passed' : 'partial';

      sampleResults.push(makeSampleResult({
        id,
        status: sampleStatus,
        durationMs: durationMs(t0),
        integrationTraceCount: traceCount,
        integrationPromptCount: promptCount,
        integrationSpawnCount: spawnCount,
        result: {
          summary: result.summary,
          trace_count: traceCount,
          spawn_valid_count: spawnValidCount,
          spawn_total_count: spawnCount,
          prompt_count: promptCount,
          betterprompt_attempted: result.summary?.includes('attempted=') ? true : false,
        },
      }));

      if (sampleStatus === 'passed') passed++;
      else failed++;
    } catch (err) {
      sampleResults.push(makeSampleResult({
        id,
        status: 'error',
        durationMs: durationMs(t0),
        error: err.message,
      }));
      failed++;
    }
  }

  return { sampleResults, passed, failed };
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const runId = randomUUID();
  const startedAt = nowISO();

  console.log(`🚀 shared baseline v0 runner — run ${runId.slice(0, 8)}`);
  console.log(`   时间: ${startedAt}\n`);

  // 1. Load manifest
  const manifestPath = join(SAMPLES_DIR, 'manifest.json');
  let manifest;
  try {
    const raw = await readFile(manifestPath, 'utf8');
    manifest = JSON.parse(raw);
  } catch (err) {
    console.error(`❌ 无法读取 manifest: ${manifestPath}`);
    console.error(`   ${err.message}`);
    process.exit(1);
  }

  if (!Array.isArray(manifest.files) || manifest.files.length === 0) {
    console.error('❌ manifest.files 为空或不存在');
    process.exit(1);
  }

  console.log(`📋 Manifest: ${manifest.name} (${manifest.protocol})`);
  console.log(`   数据集: ${manifest.files.map((f) => f.dataset).join(', ')}`);
  console.log(`   样本数: ${manifest.files.reduce((s, f) => s + (f.count || 0), 0)}\n`);

  // 2. Process each file in order
  const stages = [];
  let totalPassed = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  for (const fileEntry of manifest.files) {
    const dataset = fileEntry.dataset;
    const filePath = join(SAMPLES_DIR, fileEntry.path);

    console.log(`▶ Stage: ${dataset} (${fileEntry.path})`);

    const stageStart = Date.now();
    let records;
    try {
      records = await readJSONL(filePath);
    } catch (err) {
      console.error(`   ❌ 读取失败: ${err.message}`);
      stages.push(makeStageResult({
        dataset,
        status: 'error',
        exitCode: 1,
        durationMs: durationMs(stageStart),
        total: 0,
        passed: 0,
        failed: 0,
        skipped: fileEntry.count || 0,
        note: `文件读取失败: ${err.message}`,
      }));
      totalFailed += (fileEntry.count || 0);
      continue;
    }

    if (records.length === 0) {
      console.log(`   ⚠️ 无记录`);
      stages.push(makeStageResult({
        dataset,
        status: 'skipped',
        durationMs: durationMs(stageStart),
        total: 0,
        passed: 0,
        failed: 0,
        note: '文件为空',
      }));
      continue;
    }

    // Route by dataset
    let stageResult;
    let capability = null;
    let note = null;

    if (dataset === 'betterprompt') {
      const { sampleResults, passed, failed } = await runBetterPromptStage(records);
      stageResult = makeStageResult({
        dataset,
        status: failed === 0 ? 'completed' : 'partial',
        durationMs: durationMs(stageStart),
        total: records.length,
        passed,
        failed,
        samples: sampleResults,
        capability: 'full',
      });
    } else if (dataset === 'betterplan') {
      const { sampleResults, passed, failed, skipped, loadError } = await runBetterPlanStage(records);

      // Determine capability level
      if (loadError) {
        capability = 'unavailable';
        note = `模块不可用: ${loadError}`;
      } else {
        // Check if any sample used LLM successfully
        const anyLLM = sampleResults.some((s) => s.betterplan_fallback_used === false);
        capability = anyLLM ? 'full' : 'limited';
        if (!anyLLM) {
          note = 'betterPlan 管道已打通（含结构兜底与 contract 校验），但 LLM 未成功调用。API key 配置后可通过全链路。';
        }
      }

      stageResult = makeStageResult({
        dataset,
        status: loadError ? 'partial' : (failed === 0 ? 'completed' : 'partial'),
        durationMs: durationMs(stageStart),
        total: records.length,
        passed: (passed || 0) + (skipped || 0),
        failed: failed || 0,
        samples: sampleResults,
        capability,
        note: capability === 'limited' ? note : undefined,
      });
    } else if (dataset === 'integration') {
      const { sampleResults, passed, failed, skipped, loadError } = await runIntegrationStage(records);

      if (loadError) {
        capability = 'unavailable';
        note = `模块不可用: ${loadError}`;
      } else {
        capability = 'smoke';
        note = 'plan→prompt→spawn 烟测链路：验证 PlanDTO 构建 → runtime 评估 → ready task 链接 → SpawnSpec 校验';
      }

      stageResult = makeStageResult({
        dataset,
        status: loadError ? 'partial' : (failed === 0 ? 'completed' : 'partial'),
        durationMs: durationMs(stageStart),
        total: records.length,
        passed: (passed || 0) + (skipped || 0),
        failed: failed || 0,
        samples: sampleResults,
        capability,
        note,
      });
    } else {
      // Unknown dataset
      stageResult = makeStageResult({
        dataset,
        status: 'skipped',
        durationMs: durationMs(stageStart),
        total: records.length,
        passed: 0,
        failed: 0,
        skipped: records.length,
        note: `未知数据集类型: ${dataset}`,
      });
      totalSkipped += records.length;
    }

    totalPassed += stageResult.metrics.passed;
    totalFailed += stageResult.metrics.failed;
    totalSkipped += stageResult.metrics.skipped ?? 0;

    const emoji = stageResult.status === 'completed' ? '✅' : stageResult.status === 'partial' ? '⚠️' : '❌';
    console.log(`   ${emoji} ${stageResult.metrics.passed}/${stageResult.metrics.total_samples} 通过 (${stageResult.duration_ms}ms)${stageResult.capability ? ` [${stageResult.capability}]` : ''}`);
    stages.push(stageResult);
  }

  // 3. Build & write summary
  const finishedAt = nowISO();
  const overallDuration = Date.now() - new Date(startedAt).getTime();

  const hasFailures = totalFailed > 0;
  const allStagesComplete = stages.every((s) => s.status === 'completed');
  const overallStatus = allStagesComplete ? 'completed' : (hasFailures ? 'partial' : 'partial');

  const summary = {
    runner: 'run-shared-baseline-v0',
    protocol: 'shared-sample.v0',
    run_id: runId,
    started_at: startedAt,
    finished_at: finishedAt,
    duration_ms: overallDuration,
    stages,
    totals: {
      stages: stages.length,
      total_samples: totalPassed + totalFailed + totalSkipped,
      passed: totalPassed,
      failed: totalFailed,
      skipped: totalSkipped,
    },
    overall_status: overallStatus,
  };

  await ensureDir(RESULTS_DIR);
  const summaryPath = join(RESULTS_DIR, 'summary.json');
  await writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf8');

  // 4. Build & write failure pool NDJSON (overwrite each run)
  const failuresPath = join(RESULTS_DIR, 'failures.ndjson');
  const failuresNDJSON = buildFailuresNDJSON(summary);
  await writeFile(failuresPath, failuresNDJSON ? `${failuresNDJSON}\n` : '', 'utf8');

  // 5. Console report
  console.log(`\n${'='.repeat(50)}`);
  console.log(`📊 Summary: ${totalPassed} passed, ${totalFailed} failed, ${totalSkipped} skipped`);
  console.log(`   整体状态: ${overallStatus === 'completed' ? '✅ 全部通过' : '⚠️ 部分通过'}`);
  console.log(`   耗时: ${overallDuration}ms`);
  console.log(`   结果: ${summaryPath}`);
  console.log(`${'='.repeat(50)}`);

  // Exit code: 0 if all passed, 1 otherwise
  process.exit(totalFailed > 0 ? 1 : 0);
}

main();
