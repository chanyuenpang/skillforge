// ── Plan → Prompt → Spawn Integration Adapter ──────────────────────────────
// Phase G first cut: bridges plan-runtime with prompt-assembler and spawn-spec,
// producing a minimal end-to-end "plan -> prompt -> spawn" traceable chain.
//
// Design rules:
//   - Pure adapter layer — does NOT modify core domain (plan-runtime, resolver,
//     assembler, spawn-spec-contract).
//   - No complex scheduling, queues, retries, concurrency, or multi-branch
//     decision trees.
//   - Core layer stays focused on plan/state evaluation; prompt/spawn details
//     live entirely in this adapter.
//   - Only "ready" tasks from the runtime output are linked.
//
// Trace contract:
//   - planTaskId  — which plan task this chain belongs to
//   - traceId     — unique trace identifier
//   - promptRef   — reference to the assembled prompt (kind + generation timestamp)
//   - spawnRef    — reference to the spawn spec (kind + source + version)
//   - version     — integration adapter version
// ────────────────────────────────────────────────────────────────────────────

import { resolveSkills } from './skill-resolver.mjs';
import { assemblePrompt } from './prompt-assembler.mjs';
import { createSpawnSpec, createSpawnTrace } from './spawn-spec-contract.mjs';

// ── Constants ───────────────────────────────────────────────────────────────

const INTEGRATION_VERSION = 'plan-prompt-spawn-integration-draft-1';
const TRACE_SOURCE = 'plan-prompt-spawn-adapter';

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalizeString(value) {
  if (value == null) return '';
  return String(value).trim();
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Generate a short trace-id from planId + taskId for deterministic traceability.
 */
function buildTraceId(planDTO, task) {
  const planId = normalizeString(planDTO?.planId) || 'unknown-plan';
  const taskId = normalizeString(task?.id) || 'unknown-task';
  const ts = Date.now();
  return `trace-${planId}-${taskId}-${ts}`;
}

// ── Context Extraction ──────────────────────────────────────────────────────

/**
 * Extract skill-resolver context from a plan task.
 *
 * Produces a minimal { tags, intent, description } object from the task's
 * title, description, and outputs fields so the resolver can pick suitable
 * skills.
 */
function buildTaskContext(task, _planDTO) {
  const title = normalizeString(task?.title);
  const description = normalizeString(task?.description);
  const outputs = Array.isArray(task?.outputs) ? task.outputs : [];

  // Use title + description as the resolver's intent/description
  // Outputs become capability hints
  const tags = [];
  const capabilities = [];

  for (const o of outputs) {
    const s = normalizeString(o);
    if (s) {
      tags.push(s);
      capabilities.push(s);
    }
  }

  return {
    intent: title || description || 'complete this task',
    description: description || title || '',
    tags: tags.length > 0 ? tags : ['complete'],
    capabilities,
  };
}

// ── Trace Record ─────────────────────────────────────────────────────────────

/**
 * createIntegrationTrace(traceInfo)
 *
 * @param {object} traceInfo
 * @param {string} traceInfo.traceId       — unique trace identifier
 * @param {string} traceInfo.planTaskId    — the plan task id
 * @param {object} traceInfo.promptRef     — { kind, skillIds, generatedAt }
 * @param {object} traceInfo.spawnRef      — { kind, source, version }
 * @returns {object} frozen trace record
 */
function createIntegrationTrace(traceInfo = {}) {
  const traceId = normalizeString(traceInfo.traceId) || 'trace-unknown';
  const planTaskId = normalizeString(traceInfo.planTaskId) || 'task-unknown';

  const promptRef = Object.freeze({
    kind: normalizeString(traceInfo.promptRef?.kind) || 'assembled-prompt',
    skillIds: Array.isArray(traceInfo.promptRef?.skillIds) ? [...traceInfo.promptRef.skillIds] : [],
    generatedAt: normalizeString(traceInfo.promptRef?.generatedAt) || new Date().toISOString(),
  });

  const spawnRef = Object.freeze({
    kind: normalizeString(traceInfo.spawnRef?.kind) || 'spawn-spec',
    source: normalizeString(traceInfo.spawnRef?.source) || 'unknown-source',
    version: normalizeString(traceInfo.spawnRef?.version) || 'unknown',
  });

  return Object.freeze({
    kind: 'plan-prompt-spawn-trace',
    version: INTEGRATION_VERSION,
    traceId,
    planTaskId,
    promptRef,
    spawnRef,
    source: TRACE_SOURCE,
    recordedAt: new Date().toISOString(),
  });
}

// ── Prompt Generation ────────────────────────────────────────────────────────

/**
 * generatePromptForTask(task, planDTO, opts)
 *
 *   1. Extract resolver context from task
 *   2. Resolve skills from context
 *   3. Assemble prompt from resolved skills
 *   4. Return { promptResult, resolvedSkills }
 *
 * @param {object} task      — task object from PlanDTO
 * @param {object} planDTO   — full PlanDTO
 * @param {object} [opts]    — optional options forwarded to prompt assembler
 * @returns {object} { promptResult, resolvedSkills }
 */
function generatePromptForTask(task, planDTO, opts = {}) {
  const context = buildTaskContext(task, planDTO);

  // Resolve skills from the task context
  const resolverOutput = resolveSkills({ context });

  // Assemble the prompt from resolved skills, merging with caller opts
  const assembleOpts = { ...opts };
  const promptResult = assemblePrompt({
    resolvedSkills: resolverOutput.resolvedSkills,
    options: assembleOpts,
  });

  return {
    promptResult,
    resolvedSkills: resolverOutput.resolvedSkills,
    resolverOutput,
  };
}

// ── SpawnSpec Generation ─────────────────────────────────────────────────────

/**
 * generateSpawnSpecForTask(task, promptResult, traceInfo)
 *
 * Builds a minimal SpawnSpec that references the prompt and task.
 * Does NOT contain prompt text itself — references only.
 *
 * @param {object} task          — task object from PlanDTO
 * @param {object} promptResult  — output of assemblePrompt()
 * @param {object} traceInfo     — { traceId, ... }
 * @returns {object} frozen SpawnSpec
 */
function generateSpawnSpecForTask(task, promptResult, traceInfo = {}) {
  const traceId = normalizeString(traceInfo.traceId) || `trace-task-${normalizeString(task?.id)}`;

  const spawnTrace = createSpawnTrace({
    traceId,
    source: TRACE_SOURCE,
    versionTag: INTEGRATION_VERSION,
    origin: `plan-task:${normalizeString(task?.id)}`,
  });

  return createSpawnSpec({
    version: INTEGRATION_VERSION,
    source: {
      kind: 'plan-prompt-spawn-integration',
      name: normalizeString(task?.title) || normalizeString(task?.id) || 'plan-task',
      version: INTEGRATION_VERSION,
    },
    trace: spawnTrace,
    payload: {
      taskIds: [normalizeString(task?.id)],
      notes: normalizeString(promptResult?.promptText)
        ? `prompt generated: ${promptResult.promptText.slice(0, 80)}...`
        : 'no prompt text',
    },
  });
}

// ── Main Integration Entry ──────────────────────────────────────────────────

/**
 * linkReadyTasks(params)
 *
 * Main entry point: takes a PlanDTO + PlanRuntimeOutput, and for each
 * "ready" task:
 *
 *   1. Resolves skills → assembles prompt
 *   2. Generates a minimal SpawnSpec
 *   3. Records a trace record
 *
 * Returns the full chain artifacts — prompts, spawn specs, and traces —
 * for external validation.
 *
 * @param {object} params
 * @param {object} params.planDTO         — validated PlanDTO (from plan-dto-mapper)
 * @param {object} params.runtimeOutput   — output of evaluatePlanRuntime()
 * @param {object} [params.traceInfo]     — optional parent trace info
 * @param {object} [params.promptOpts]    — optional prompt assembler options
 * @returns {object} { version, traceRecords, promptResults, spawnSpecs }
 */
export function linkReadyTasks({
  planDTO = {},
  runtimeOutput = null,
  traceInfo = {},
  promptOpts = {},
} = {}) {
  if (!runtimeOutput || !isPlainObject(runtimeOutput)) {
    return {
      version: INTEGRATION_VERSION,
      traceRecords: [],
      promptResults: [],
      spawnSpecs: [],
      summary: 'no runtime output provided',
    };
  }

  const readyTaskIds = Array.isArray(runtimeOutput?.readyTaskIds)
    ? runtimeOutput.readyTaskIds
    : [];

  if (readyTaskIds.length === 0) {
    return {
      version: INTEGRATION_VERSION,
      traceRecords: [],
      promptResults: [],
      spawnSpecs: [],
      summary: 'no ready tasks to link',
    };
  }

  const taskMap = new Map();
  if (Array.isArray(planDTO?.tasks)) {
    for (const t of planDTO.tasks) {
      taskMap.set(t.id, t);
    }
  }

  const traceRecords = [];
  const promptResults = [];
  const spawnSpecs = [];

  for (const taskId of readyTaskIds) {
    const task = taskMap.get(taskId);
    if (!task) {
      // Task exists in runtime output but not in planDTO — skip
      continue;
    }

    const localTraceId = buildTraceId(planDTO, task);

    // 1. Generate prompt
    const { promptResult, resolvedSkills } = generatePromptForTask(task, planDTO, promptOpts);

    // 2. Generate spawn spec
    const spawnSpec = generateSpawnSpecForTask(task, promptResult, { traceId: localTraceId });

    // 3. Create trace record
    const traceRecord = createIntegrationTrace({
      traceId: localTraceId,
      planTaskId: taskId,
      promptRef: {
        kind: promptResult.kind,
        skillIds: promptResult.referencedSkills?.map((s) => s.skillId) || [],
        generatedAt: promptResult.metadata?.generatedAt || new Date().toISOString(),
      },
      spawnRef: {
        kind: spawnSpec.kind,
        source: spawnSpec.source.name,
        version: spawnSpec.version,
      },
    });

    traceRecords.push(traceRecord);
    promptResults.push({
      taskId,
      prompt: promptResult,
      resolvedSkills,
    });
    spawnSpecs.push({
      taskId,
      spec: spawnSpec,
    });
  }

  return {
    version: INTEGRATION_VERSION,
    traceRecords: Object.freeze(traceRecords),
    promptResults: Object.freeze(promptResults),
    spawnSpecs: Object.freeze(spawnSpecs),
    summary: `linked ${traceRecords.length} ready task(s): plan → prompt → spawn`,
  };
}

// ── Convenience: single-task wrapper ────────────────────────────────────────

/**
 * linkSingleTask(task, planDTO, opts)
 *
 * Convenience wrapper that runs the full plan→prompt→spawn chain for a single
 * task, without requiring a full PlanRuntimeOutput.
 */
export function linkSingleTask(task = {}, planDTO = {}, opts = {}) {
  const fakeRuntimeOutput = {
    readyTaskIds: [task.id],
  };

  return linkReadyTasks({
    planDTO,
    runtimeOutput: fakeRuntimeOutput,
    traceInfo: opts.traceInfo || {},
    promptOpts: opts.promptOpts || {},
  });
}

export default linkReadyTasks;
