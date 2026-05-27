/**
 * test-plan-prompt-spawn-integration.mjs
 *
 * Phase G verification script: proves the minimal plan → prompt → spawn chain.
 *
 * What it proves:
 *   1. plan runtime 推进 — evaluatePlanRuntime produces ready tasks
 *   2. prompt 产物生成 — skill resolver + assembler work from task context
 *   3. SpawnSpec 输出 — valid spawn spec is generated per ready task
 *   4. trace 记录存在 — trace record has planTaskId, traceId, promptRef, spawnRef
 *
 * Does NOT depend on real external providers — pure function chain only.
 */

import { mapPlanSkeletonToPlanDTO } from '../src/skillforge/plan-dto-mapper.mjs';
import { evaluatePlanRuntime } from '../src/skillforge/plan-runtime.mjs';
import { linkReadyTasks, linkSingleTask } from '../src/skillforge/plan-prompt-spawn-integration.mjs';
import { validateSpawnSpec } from '../src/skillforge/spawn-spec-contract.mjs';

// ── Test helpers ────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, label) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    failures.push(label);
    console.error(`  ❌ ${label}`);
  }
}

function header(msg) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  ${msg}`);
  console.log(`${'─'.repeat(60)}`);
}

function summary() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  结果: ✅ ${passed} 通过  ❌ ${failed} 失败  (共 ${passed + failed})`);
  if (failures.length > 0) {
    console.log(`  失败项:`);
    for (const f of failures) console.log(`    ❌ ${f}`);
  }
  console.log(`${'='.repeat(60)}`);
  if (failed > 0) process.exit(1);
}

// ── Fixture: build a simple PlanDTO ─────────────────────────────────────────

function buildTestPlanDTO() {
  const skeleton = {
    planId: 'phase-g-integration-test',
    planTitle: 'Phase G Integration Test Plan',
    version: '1.0.0',
    phases: [
      { id: 'setup', title: 'Setup', order: 1 },
      { id: 'core', title: 'Core Work', order: 2 },
      { id: 'cleanup', title: 'Cleanup', order: 3 },
    ],
    tasks: [
      {
        id: 'task-1',
        title: 'Initialize coding environment',
        description: 'Set up the dev environment and install dependencies',
        phase: 'setup',
        dependsOn: [],
        outputs: ['environment-ready'],
        order: 1,
      },
      {
        id: 'task-2',
        title: 'Implement core logic',
        description: 'Write the main business logic with unit tests',
        phase: 'core',
        dependsOn: ['task-1'],
        outputs: ['core-implemented', 'tests-passing'],
        order: 2,
      },
      {
        id: 'task-3',
        title: 'Code review and bug fixing',
        description: 'Review the implementation, trace any errors found',
        phase: 'core',
        dependsOn: ['task-2'],
        outputs: ['reviewed', 'bugs-fixed'],
        order: 3,
      },
      {
        id: 'task-4',
        title: 'Generate documentation',
        description: 'Summarize what was built and produce docs',
        phase: 'cleanup',
        dependsOn: ['task-3'],
        outputs: ['docs-generated'],
        order: 4,
      },
    ],
  };

  return mapPlanSkeletonToPlanDTO(skeleton);
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite
// ─────────────────────────────────────────────────────────────────────────────

header('Phase G: plan → prompt → spawn 集成验证');

// ════════════════════════════════════════════════════════════════════════════
// Section 1: 验证 plan runtime 推进 —— ready task 产出
// ════════════════════════════════════════════════════════════════════════════

header('1. plan runtime 推进 → ready tasks');

{
  const planDTO = buildTestPlanDTO();

  // 1a. No completed tasks → task-1 should be ready (no deps), rest blocked
  const rt0 = evaluatePlanRuntime({
    planDTO,
    completedTaskIds: [],
    failedTaskIds: [],
  });

  assert(rt0.readyTaskIds.length > 0, '初始评估: 有 ready task(s)');
  assert(rt0.readyTaskIds.includes('task-1'), '初始评估: task-1 是 ready 状态');

  // 1b. Complete task-1 → task-2 should become ready
  const rt1 = evaluatePlanRuntime({
    planDTO,
    completedTaskIds: ['task-1'],
  });

  assert(rt1.readyTaskIds.includes('task-2'), 'task-1 完成后: task-2 ready');
  assert(rt1.readyTaskIds.length === 1, 'task-1 完成后: 只有一个 ready task');

  // 1c. Complete task-1, task-2 → task-3 should become ready
  const rt2 = evaluatePlanRuntime({
    planDTO,
    completedTaskIds: ['task-1', 'task-2'],
  });

  assert(rt2.readyTaskIds.includes('task-3'), 'task-1,2 完成后: task-3 ready');

  // 1d. All tasks done → empty ready list
  const rtAll = evaluatePlanRuntime({
    planDTO,
    completedTaskIds: ['task-1', 'task-2', 'task-3', 'task-4'],
  });

  assert(rtAll.readyTaskIds.length === 0, '全部完成后: ready tasks 为空');
  assert(rtAll.doneTaskIds.length === 4, '全部完成后: 4 个 done');
}

// ════════════════════════════════════════════════════════════════════════════
// Section 2: 验证 prompt 产物生成 —— skill resolver + assembler
// ════════════════════════════════════════════════════════════════════════════

header('2. prompt 产物生成');

{
  const planDTO = buildTestPlanDTO();
  const rt = evaluatePlanRuntime({
    planDTO,
    completedTaskIds: ['task-1', 'task-2'],
  });

  // task-3 should be ready (title: "Code review and bug fixing")
  const result = linkReadyTasks({ planDTO, runtimeOutput: rt });

  assert(result.traceRecords.length === 1, 'prompt 生成: 有 1 条 trace');
  assert(result.promptResults.length === 1, 'prompt 生成: 有 1 个 prompt result');
  assert(result.spawnSpecs.length === 1, 'prompt 生成: 有 1 个 spawn spec');

  const pr = result.promptResults[0];
  assert(pr.taskId === 'task-3', 'prompt 生成: taskId 是 task-3');

  // The prompt text should be non-empty (assembled from resolved skills)
  const promptText = pr.prompt.promptText;
  assert(typeof promptText === 'string' && promptText.length > 0,
    `prompt 生成: promptText 非空 (${promptText.length} chars)`);

  // Should have referenced skills
  const skillCount = pr.resolvedSkills.length;
  assert(skillCount > 0,
    `prompt 生成: 有 ${skillCount} 个 resolved skill(s)`);

  // The prompt should match the kind contract
  assert(pr.prompt.kind === 'assembled-prompt',
    `prompt 生成: kind '${pr.prompt.kind}' 匹配 contract`);
}

// ════════════════════════════════════════════════════════════════════════════
// Section 3: 验证 SpawnSpec 输出
// ════════════════════════════════════════════════════════════════════════════

header('3. SpawnSpec 输出');

{
  const planDTO = buildTestPlanDTO();
  const rt = evaluatePlanRuntime({
    planDTO,
    completedTaskIds: ['task-1', 'task-2'],
  });

  const result = linkReadyTasks({ planDTO, runtimeOutput: rt });
  const { spec } = result.spawnSpecs[0];

  // Validate against the spawn-spec contract
  const validation = validateSpawnSpec(spec);
  assert(validation.valid, `SpawnSpec 验证通过: ${JSON.stringify(validation)}`);

  assert(spec.kind === 'spawn-spec',
    `SpawnSpec kind: '${spec.kind}'`);

  assert(spec.source.kind === 'plan-prompt-spawn-integration',
    `SpawnSpec source: '${spec.source.kind}'`);

  assert(spec.source.name.length > 0,
    `SpawnSpec source name: '${spec.source.name}'`);

  assert(spec.payload.taskIds.includes('task-3'),
    `SpawnSpec payload: 包含 'task-3'`);

  // Trace inside spawn spec
  assert(typeof spec.trace.traceId === 'string' && spec.trace.traceId.length > 0,
    `SpawnSpec trace.traceId: '${spec.trace.traceId}'`);
  assert(spec.trace.source === 'plan-prompt-spawn-adapter',
    `SpawnSpec trace.source: '${spec.trace.source}'`);
}

// ════════════════════════════════════════════════════════════════════════════
// Section 4: 验证 trace 记录完整性
// ════════════════════════════════════════════════════════════════════════════

header('4. trace 记录');

{
  const planDTO = buildTestPlanDTO();
  const rt = evaluatePlanRuntime({
    planDTO,
    completedTaskIds: ['task-1', 'task-2'],
  });

  const result = linkReadyTasks({ planDTO, runtimeOutput: rt });
  const trace = result.traceRecords[0];

  // Required fields
  assert(trace.kind === 'plan-prompt-spawn-trace',
    `trace kind: '${trace.kind}'`);

  assert(typeof trace.traceId === 'string' && trace.traceId.length > 0,
    `trace traceId: '${trace.traceId}'`);

  assert(trace.planTaskId === 'task-3',
    `trace planTaskId: '${trace.planTaskId}'`);

  // promptRef
  assert(typeof trace.promptRef === 'object' && trace.promptRef !== null,
    'trace.promptRef: 存在');
  assert(trace.promptRef.kind === 'assembled-prompt',
    `trace.promptRef.kind: '${trace.promptRef.kind}'`);
  assert(Array.isArray(trace.promptRef.skillIds),
    `trace.promptRef.skillIds: 数组, 长度 ${trace.promptRef.skillIds.length}`);
  assert(trace.promptRef.skillIds.length > 0,
    `trace.promptRef.skillIds: 非空`);
  assert(typeof trace.promptRef.generatedAt === 'string',
    `trace.promptRef.generatedAt: 存在`);

  // spawnRef
  assert(typeof trace.spawnRef === 'object' && trace.spawnRef !== null,
    'trace.spawnRef: 存在');
  assert(trace.spawnRef.kind === 'spawn-spec',
    `trace.spawnRef.kind: '${trace.spawnRef.kind}'`);
  assert(typeof trace.spawnRef.source === 'string' && trace.spawnRef.source.length > 0,
    `trace.spawnRef.source: '${trace.spawnRef.source}'`);
  assert(typeof trace.spawnRef.version === 'string',
    `trace.spawnRef.version: '${trace.spawnRef.version}'`);

  // version and source
  assert(trace.version.startsWith('plan-prompt-spawn-integration'),
    `trace version: '${trace.version}'`);
  assert(trace.source === 'plan-prompt-spawn-adapter',
    `trace source: '${trace.source}'`);
  assert(typeof trace.recordedAt === 'string',
    `trace recordedAt: 存在`);

  console.log(`\n  📋 Trace sample:`);
  console.log(`     traceId:      ${trace.traceId}`);
  console.log(`     planTaskId:   ${trace.planTaskId}`);
  console.log(`     promptRef:    kind=${trace.promptRef.kind} skills=${trace.promptRef.skillIds.join(',')}`);
  console.log(`     spawnRef:     kind=${trace.spawnRef.kind} source=${trace.spawnRef.source}`);
}

// ════════════════════════════════════════════════════════════════════════════
// Section 5: 验证多 ready task 场景
// ════════════════════════════════════════════════════════════════════════════

header('5. 多 ready task 场景');

{
  const planDTO = buildTestPlanDTO();

  // All tasks have no deps except task-1
  const skeleton2 = {
    planId: 'multi-ready-test',
    tasks: [
      { id: 'a1', title: 'Coding task A', phase: 's1', dependsOn: [], outputs: ['code'] },
      { id: 'a2', title: 'Debugging task B', phase: 's1', dependsOn: [], outputs: ['fix'] },
      { id: 'a3', title: 'Review task C', phase: 's1', dependsOn: [], outputs: ['review'] },
    ],
    phases: [{ id: 's1', title: 'Stage 1', order: 1 }],
  };
  const dto2 = mapPlanSkeletonToPlanDTO(skeleton2);

  const rt = evaluatePlanRuntime({ planDTO: dto2, completedTaskIds: [], failedTaskIds: [] });

  assert(rt.readyTaskIds.length === 3,
    `多任务无依赖: 3 个 ready (实际 ${rt.readyTaskIds.length})`);

  const result = linkReadyTasks({ planDTO: dto2, runtimeOutput: rt });

  assert(result.traceRecords.length === 3,
    `多任务集成: 3 条 trace (实际 ${result.traceRecords.length})`);
  assert(result.promptResults.length === 3,
    `多任务集成: 3 个 prompt (实际 ${result.promptResults.length})`);
  assert(result.spawnSpecs.length === 3,
    `多任务集成: 3 个 spawn spec (实际 ${result.spawnSpecs.length})`);

  // Each spawn spec should pass validation
  for (const { spec } of result.spawnSpecs) {
    const v = validateSpawnSpec(spec);
    assert(v.valid, `SpawnSpec ${spec.source.name}: 验证通过`);
  }

  // Each prompt should have non-empty text
  for (const pr of result.promptResults) {
    assert(pr.prompt.promptText.length > 0,
      `prompt ${pr.taskId}: 非空 (${pr.prompt.promptText.length} chars)`);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Section 6: 验证 linkSingleTask 快捷接口
// ════════════════════════════════════════════════════════════════════════════

header('6. linkSingleTask 快捷接口');

{
  const planDTO = buildTestPlanDTO();
  const task1 = planDTO.tasks.find((t) => t.id === 'task-1');

  const result = linkSingleTask(task1, planDTO);

  assert(result.traceRecords.length === 1, 'linkSingleTask: 1 条 trace');
  assert(result.promptResults.length === 1, 'linkSingleTask: 1 个 prompt');
  assert(result.spawnSpecs.length === 1, 'linkSingleTask: 1 个 spawn spec');

  const trace = result.traceRecords[0];
  assert(trace.planTaskId === 'task-1', 'linkSingleTask: planTaskId = task-1');
  assert(trace.promptRef.skillIds.length > 0, 'linkSingleTask: 有 resolved skills');
}

// ════════════════════════════════════════════════════════════════════════════
// Section 7: 边界情况
// ════════════════════════════════════════════════════════════════════════════

header('7. betterPrompt dogfooding');

{
  const planDTO = buildTestPlanDTO();
  const rt = evaluatePlanRuntime({
    planDTO,
    completedTaskIds: ['task-1', 'task-2'],
  });

  const result = linkReadyTasks({ planDTO, runtimeOutput: rt });
  const pr = result.promptResults[0];

  assert(Boolean(pr.betterPrompt), 'betterPrompt: 结果对象存在');
  const hasPkgId = typeof pr.betterPrompt.package_id === 'string' && pr.betterPrompt.package_id.length > 0;
  const hasFallback = pr.betterPrompt.fallback_used === true;
  assert(hasPkgId || hasFallback,
    `betterPrompt: pkg_id 或有 fallback 理由 (pkg=${pr.betterPrompt.package_id}, fallback=${pr.betterPrompt.fallback_used})`);
  assert(Array.isArray(pr.betterPrompt.selected_skills),
    `betterPrompt: selected_skills 为数组 (len=${pr.betterPrompt.selected_skills.length})`);
  assert(typeof pr.betterPrompt.qc_result?.pass === 'boolean',
    `betterPrompt: qc_result.pass 为布尔值 (${pr.betterPrompt.qc_result?.pass})`);
  assert(typeof pr.betterPrompt.fallback_used === 'boolean',
    `betterPrompt: fallback_used 为布尔值 (${pr.betterPrompt.fallback_used})`);

  assert(result.summary.includes('betterPrompt attempted='),
    `summary 包含 attempted 信息: ${result.summary}`);
  assert(result.summary.includes('accepted='),
    `summary 包含 accepted 信息: ${result.summary}`);

  const hasAcceptedOrFallback = pr.betterPrompt.qc_result.pass === true || pr.betterPrompt.fallback_used === true;
  assert(hasAcceptedOrFallback, 'betterPrompt: 覆盖 accepted/fallback 至少一种路径');
}

// ════════════════════════════════════════════════════════════════════════════
// Section 8: 边界情况
// ════════════════════════════════════════════════════════════════════════════

header('8. 边界情况');

{
  const planDTO = buildTestPlanDTO();

  // 7a. Empty runtime output
  const r1 = linkReadyTasks({ planDTO, runtimeOutput: null });
  assert(r1.traceRecords.length === 0, 'null runtimeOutput: traceRecords 为空');
  assert(r1.summary === 'no runtime output provided', 'null runtimeOutput: 正确 summary');

  // 7b. Zero ready tasks
  const rtAll = evaluatePlanRuntime({
    planDTO,
    completedTaskIds: ['task-1', 'task-2', 'task-3', 'task-4'],
  });
  const r2 = linkReadyTasks({ planDTO, runtimeOutput: rtAll });
  assert(r2.traceRecords.length === 0, '零 ready task: traceRecords 为空');
  assert(r2.summary === 'no ready tasks to link', '零 ready task: 正确 summary');

  // 7c. No planDTO but runtime has ready tasks
  const rt1 = evaluatePlanRuntime({
    planDTO,
    completedTaskIds: [],
  });
  const r3 = linkReadyTasks({ planDTO: null, runtimeOutput: rt1 });
  assert(r3.traceRecords.length === 0, '无 planDTO: 找不到 task 不链接 (安全跳过)');
}

// ─────────────────────────────────────────────────────────────────────────────
// 完成
// ─────────────────────────────────────────────────────────────────────────────

summary();
