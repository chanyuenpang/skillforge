/**
 * test-plan-runtime.mjs — Comprehensive test for plan-runtime engine
 *
 * Covers: dependency satisfaction, blocking, cross-phase, missing deps,
 *         circular deps, self-deps, failed predecessors, empty plan,
 *         in_progress, input immutability.
 */

import { mapPlanSkeletonToPlanDTO } from '../src/skillforge/plan-dto-mapper.mjs';
import {
  evaluatePlanRuntime,
  advancePlanRuntime,
} from '../src/skillforge/plan-runtime.mjs';

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, label) {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(label);
    console.error(`  ❌ FAIL: ${label}`);
  }
}

function header(msg) {
  console.log(`\n📋 ${msg}`);
}

function summary() {
  console.log(`\n${'='.repeat(50)}`);
  if (failures.length > 0) {
    console.log(`  Failures (${failures.length}):`);
    for (const f of failures) console.log(`    ❌ ${f}`);
  }
  console.log(`  ✅ ${passed} passed  ❌ ${failed} failed  (${passed + failed} total)`);
  console.log(`${'='.repeat(50)}`);
  if (failed > 0) process.exit(1);
}

// ── Build PlanDTO Helpers ──────────────────────────────────────────────────

function buildDTO(tasks, planId = 'test-plan') {
  // Build phases from unique phaseIds in tasks
  const phaseSet = new Set(tasks.map((t) => t.phase || 'default'));
  const phases = [...phaseSet].map((id, i) => ({
    id,
    title: `Phase ${id}`,
    order: i + 1,
    description: '',
    taskIds: tasks.filter((t) => (t.phase || 'default') === id).map((t) => t.id),
  }));

  return {
    planId,
    planTitle: 'Test Plan',
    version: '1.0.0',
    source: 'test',
    phases,
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title || `Task ${t.id}`,
      description: '',
      phaseId: t.phase || 'default',
      dependsOn: t.dependsOn || [],
      outputs: [],
      owner: null,
      status: 'pending',
      order: t.order || 1,
    })),
    dependencies: tasks.flatMap((t) =>
      (t.dependsOn || []).map((depId) => ({ taskId: t.id, dependsOn: depId }))
    ),
    metadata: {},
  };
}

// ════════════════════════════════════════════════════════════════════════════
// Test 1: Basic dependency satisfaction
// ════════════════════════════════════════════════════════════════════════════
header('Test 1: Basic dependency satisfaction');

{
  const planDTO = buildDTO([
    { id: 't1', dependsOn: [] },
    { id: 't2', dependsOn: ['t1'] },
    { id: 't3', dependsOn: ['t2'] },
  ]);

  // Nothing done — t1 ready, t2/t3 blocked
  const result1 = evaluatePlanRuntime({ planDTO, completedTaskIds: [] });

  assert(result1.taskStates.length === 3, '1.1: 3 task states');
  assert(result1.taskStates[0].status === 'ready', '1.2: t1 is ready (no deps)');
  assert(result1.taskStates[0].taskId === 't1', '1.3: t1 state matches');
  assert(result1.taskStates[1].status === 'blocked', '1.4: t2 is blocked (t1 not done)');
  assert(result1.taskStates[2].status === 'blocked', '1.5: t3 is blocked (t2 not done)');
  assert(result1.readyTaskIds.includes('t1'), '1.6: readyTaskIds contains t1');
  assert(!result1.readyTaskIds.includes('t2'), '1.7: readyTaskIds does NOT contain t2');
  assert(result1.blockedTaskIds.includes('t2'), '1.8: blockedTaskIds contains t2');
  assert(result1.blockedTaskIds.includes('t3'), '1.9: blockedTaskIds contains t3');

  // t1 done — t2 ready, t3 blocked
  const result2 = evaluatePlanRuntime({ planDTO, completedTaskIds: ['t1'] });
  assert(result2.taskStates[0].status === 'done', '1.10: t1 is done');
  assert(result2.taskStates[1].status === 'ready', '1.11: t2 is ready (t1 done)');
  assert(result2.taskStates[2].status === 'blocked', '1.12: t3 still blocked (t2 not done)');
  assert(result2.readyTaskIds.includes('t2'), '1.13: readyTaskIds contains t2');
  assert(!result2.readyTaskIds.includes('t3'), '1.14: readyTaskIds does NOT contain t3');

  // t1+t2 done — t3 ready
  const result3 = evaluatePlanRuntime({ planDTO, completedTaskIds: ['t1', 't2'] });
  assert(result3.taskStates[0].status === 'done', '1.15: t1 done');
  assert(result3.taskStates[1].status === 'done', '1.16: t2 done');
  assert(result3.taskStates[2].status === 'ready', '1.17: t3 ready (all deps done)');
  assert(result3.readyTaskIds.includes('t3'), '1.18: readyTaskIds contains t3');
  assert(result3.doneTaskIds.length === 2, '1.19: 2 done tasks');
  assert(result3.failedTaskIds.length === 0, '1.20: 0 failed tasks');

  // All done
  const result4 = evaluatePlanRuntime({ planDTO, completedTaskIds: ['t1', 't2', 't3'] });
  assert(result4.taskStates.every((t) => t.status === 'done'), '1.21: all done');
}

// ════════════════════════════════════════════════════════════════════════════
// Test 2: Dependency blocking — unsatisfied deps
// ════════════════════════════════════════════════════════════════════════════
header('Test 2: Unsatisfied deps block correctly');

{
  const planDTO = buildDTO([
    { id: 'a', dependsOn: [] },
    { id: 'b', dependsOn: ['a'] },
  ]);

  // a not done → b blocked
  const result = evaluatePlanRuntime({ planDTO, completedTaskIds: [] });
  assert(result.taskStates[0].status === 'ready', '2.1: a ready');
  assert(result.taskStates[1].status === 'blocked', '2.2: b blocked');
  assert(result.taskStates[1].blockingBy.length === 1, '2.3: b blocked by 1 task');
  assert(result.taskStates[1].blockingBy[0] === 'a', '2.4: b blocked by a');
  assert(
    result.taskStates[1].blockReasons.includes('predecessor_not_done'),
    '2.5: block reason is predecessor_not_done'
  );
  assert(
    result.taskStates[1].recommendation.includes('Waiting for'),
    '2.6: recommendation mentions waiting'
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Test 3: Cross-phase dependencies
// ════════════════════════════════════════════════════════════════════════════
header('Test 3: Cross-phase dependency handling');

{
  const planDTO = buildDTO([
    { id: 'a1', phase: 'phase-A', dependsOn: ['b1'] },
    { id: 'b1', phase: 'phase-B', dependsOn: [] },
    { id: 'b2', phase: 'phase-B', dependsOn: ['a1'] },
  ]);

  // b1 done → a1 ready, a1 done → b2 ready
  const result = evaluatePlanRuntime({ planDTO, completedTaskIds: ['b1'] });
  assert(result.taskStates[0].taskId === 'a1', '3.1: a1 state exists');
  assert(result.taskStates[0].status === 'ready', '3.2: a1 ready (b1 done, cross-phase)');
  assert(result.taskStates[1].status === 'done', '3.3: b1 done');
  assert(result.taskStates[2].status === 'blocked', '3.4: b2 blocked (a1 not done)');

  // a1+b1 done → b2 ready
  const result2 = evaluatePlanRuntime({ planDTO, completedTaskIds: ['a1', 'b1'] });
  assert(result2.taskStates[2].status === 'ready', '3.5: b2 ready (a1 done, cross-phase)');
}

// ════════════════════════════════════════════════════════════════════════════
// Test 4: Missing dependency — task ID not in plan
// ════════════════════════════════════════════════════════════════════════════
header('Test 4: Missing dependency handling');

{
  const planDTO = buildDTO([
    { id: 't1', dependsOn: [] },
    { id: 't2', dependsOn: ['ghost-task'] },
    { id: 't3', dependsOn: ['t1'] },
  ]);

  const result = evaluatePlanRuntime({ planDTO, completedTaskIds: ['t1'] });
  assert(result.taskStates[0].status === 'done', '4.1: t1 done');
  assert(result.taskStates[1].status === 'blocked', '4.2: t2 blocked (missing dep)');
  assert(result.taskStates[1].blockingBy.includes('ghost-task'), '4.3: t2 blocked by ghost-task');
  assert(
    result.taskStates[1].blockReasons.includes('missing_dependency'),
    '4.4: block reason = missing_dependency'
  );
  assert(
    result.taskStates[1].recommendation.includes('Missing'),
    '4.5: recommendation mentions missing'
  );
  assert(result.taskStates[2].status === 'ready', '4.6: t3 ready (t1 done)');
}

// ════════════════════════════════════════════════════════════════════════════
// Test 5: Circular dependency detection
// ════════════════════════════════════════════════════════════════════════════
header('Test 5: Circular dependency detection');

{
  const planDTO = buildDTO([
    { id: 't1', dependsOn: ['t2'] },
    { id: 't2', dependsOn: ['t3'] },
    { id: 't3', dependsOn: ['t1'] },
  ]);

  const result = evaluatePlanRuntime({ planDTO, completedTaskIds: [] });
  assert(result.taskStates.length === 3, '5.1: 3 task states');
  assert(
    result.taskStates.every((t) => t.status === 'blocked'),
    '5.2: all tasks in cycle are blocked'
  );
  assert(
    result.taskStates.every((t) => t.blockReasons.includes('circular_dependency')),
    '5.3: all tasks have circular_dependency reason'
  );
  assert(result.readyTaskIds.length === 0, '5.4: no tasks are ready');
  assert(result.blockedTaskIds.length === 3, '5.5: all 3 tasks are blocked');
  assert(result.metadata.hasCycles === true, '5.6: metadata hasCycles = true');
  assert(result.metadata.cycleMembers.length >= 3, '5.7: cycleMembers lists 3+ members');

  // Cycle tasks not in ready even with some completions
  const result2 = evaluatePlanRuntime({ planDTO, completedTaskIds: ['t1'] });
  assert(result2.taskStates[0].status === 'done', '5.8: t1 done (explicit markup wins)');
  // t2 and t3 still in cycle with each other
  assert(result2.taskStates[1].status === 'blocked', '5.9: t2 blocked (cycle with t3)');
}

// ════════════════════════════════════════════════════════════════════════════
// Test 6: Self-dependency handling
// ════════════════════════════════════════════════════════════════════════════
header('Test 6: Self-dependency');

{
  const planDTO = buildDTO([
    { id: 't1', dependsOn: ['t1'] },
    { id: 't2', dependsOn: ['t1'] },
  ]);

  const result = evaluatePlanRuntime({ planDTO, completedTaskIds: [] });
  assert(result.taskStates[0].status === 'blocked', '6.1: t1 blocked (self-dep)');
  assert(
    result.taskStates[0].blockReasons.includes('self_dependency'),
    '6.2: self_dependency reason'
  );
  assert(
    result.taskStates[0].recommendation.includes('remove self-referencing'),
    '6.3: recommendation to remove self-dep'
  );
  assert(result.taskStates[1].status === 'blocked', '6.4: t2 blocked (t1 not done)');
}

// ════════════════════════════════════════════════════════════════════════════
// Test 7: Failed predecessor handling
// ════════════════════════════════════════════════════════════════════════════
header('Test 7: Failed predecessor');

{
  const planDTO = buildDTO([
    { id: 't1', dependsOn: [] },
    { id: 't2', dependsOn: ['t1'] },
    { id: 't3', dependsOn: ['t2'] },
  ]);

  const result = evaluatePlanRuntime({ planDTO, failedTaskIds: ['t1'] });
  assert(result.taskStates[0].status === 'failed', '7.1: t1 failed');
  assert(result.taskStates[1].status === 'blocked', '7.2: t2 blocked (predecessor failed)');
  assert(
    result.taskStates[1].blockReasons.includes('predecessor_failed'),
    '7.3: predecessor_failed reason'
  );
  assert(
    result.taskStates[1].recommendation.includes('resolve failures'),
    '7.4: recommendation to resolve failures'
  );
  assert(result.taskStates[2].status === 'blocked', '7.5: t3 blocked transitively');

  // completing the failed task doesn't help — must not be in failedTaskIds
  const result2 = evaluatePlanRuntime({
    planDTO,
    completedTaskIds: ['t1'],
    failedTaskIds: [],
  });
  assert(result2.taskStates[0].status === 'done', '7.6: t1 done when not in failed set');
  assert(result2.taskStates[1].status === 'ready', '7.7: t2 ready (t1 done)');
}

// ════════════════════════════════════════════════════════════════════════════
// Test 8: Empty plan
// ════════════════════════════════════════════════════════════════════════════
header('Test 8: Empty plan');

{
  const planDTO = buildDTO([]);
  const result = evaluatePlanRuntime({ planDTO, completedTaskIds: [] });
  assert(result.taskStates.length === 0, '8.1: no task states');
  assert(result.readyTaskIds.length === 0, '8.2: no ready tasks');
  assert(result.blockedTaskIds.length === 0, '8.3: no blocked tasks');
  assert(result.doneTaskIds.length === 0, '8.4: no done tasks');
  assert(typeof result.summary === 'string', '8.5: summary is a string');
  assert(result.metadata.taskCount === 0, '8.6: metadata taskCount = 0');
}

// ════════════════════════════════════════════════════════════════════════════
// Test 9: Active/in_progress marking
// ════════════════════════════════════════════════════════════════════════════
header('Test 9: In-progress task marking');

{
  const planDTO = buildDTO([
    { id: 't1', dependsOn: [] },
    { id: 't2', dependsOn: ['t1'] },
  ]);

  const result = evaluatePlanRuntime({
    planDTO,
    completedTaskIds: ['t1'],
    activeTaskId: 't2',
  });
  assert(result.taskStates[0].status === 'done', '9.1: t1 done');
  assert(result.taskStates[1].status === 'in_progress', '9.2: t2 is in_progress');
  assert(result.readyTaskIds.includes('t2') === false, '9.3: t2 NOT in ready when in_progress');
}

// ════════════════════════════════════════════════════════════════════════════
// Test 10: Input immutability / referential transparency
// ════════════════════════════════════════════════════════════════════════════
header('Test 10: Input immutability');

{
  const planDTO = buildDTO([
    { id: 'a', dependsOn: [] },
    { id: 'b', dependsOn: ['a'] },
    { id: 'c', dependsOn: ['b'] },
  ]);
  const completed = ['a'];
  const input = { planDTO, completedTaskIds: completed };
  const snapshot = JSON.stringify(input);

  const r1 = evaluatePlanRuntime(input);
  const r2 = evaluatePlanRuntime(input);

  // Input not mutated
  assert(JSON.stringify(input) === snapshot, '10.1: input not mutated');

  // Same input → same output
  assert(JSON.stringify(r1) === JSON.stringify(r2), '10.2: same input → same output');

  // Output is frozen (immutable)
  assert(Object.isFrozen(r1), '10.3: output is frozen');
  assert(Object.isFrozen(r1.taskStates), '10.4: taskStates array is frozen');
  assert(Object.isFrozen(r1.taskStates[0]), '10.5: each task state is frozen');
  assert(Object.isFrozen(r1.readyTaskIds), '10.6: readyTaskIds array is frozen');
  assert(Object.isFrozen(r1.blockedTaskIds), '10.7: blockedTaskIds array is frozen');
  assert(Object.isFrozen(r1.doneTaskIds), '10.8: doneTaskIds array is frozen');
  assert(Object.isFrozen(r1.metadata), '10.9: metadata is frozen');

  // Individual task states are frozen
  const blockedState = r1.taskStates.find((t) => t.status === 'blocked');
  assert(blockedState !== undefined, '10.10: blocked state exists');
  assert(Object.isFrozen(blockedState), '10.11: blocked state object is frozen');
  assert(Object.isFrozen(blockedState.blockingBy), '10.12: blockingBy array is frozen');
  assert(Object.isFrozen(blockedState.blockReasons), '10.13: blockReasons array is frozen');
}

// ════════════════════════════════════════════════════════════════════════════
// Test 11: Convenience wrapper — advancePlanRuntime
// ════════════════════════════════════════════════════════════════════════════
header('Test 11: advancePlanRuntime convenience wrapper');

{
  const planDTO = buildDTO([
    { id: 'x', dependsOn: [] },
    { id: 'y', dependsOn: ['x'] },
  ]);

  const result = advancePlanRuntime(planDTO, ['x']);
  assert(result.taskStates[0].status === 'done', '11.1: x done');
  assert(result.taskStates[1].status === 'ready', '11.2: y ready');
  assert(result.readyTaskIds.includes('y'), '11.3: y in readyTaskIds');

  // With failed tasks
  const result2 = advancePlanRuntime(planDTO, [], ['x']);
  assert(result2.taskStates[0].status === 'failed', '11.4: x failed');
  assert(result2.taskStates[1].status === 'blocked', '11.5: y blocked');

  // With active task
  const result3 = advancePlanRuntime(planDTO, ['x'], [], 'y');
  assert(result3.taskStates[1].status === 'in_progress', '11.6: y in_progress');
}

// ════════════════════════════════════════════════════════════════════════════
// Test 12: Integration with plan-dto-mapper — real PlanDTO flow
// ════════════════════════════════════════════════════════════════════════════
header('Test 12: Integration with plan-dto-mapper (real PlanDTO)');

{
  const skeleton = {
    planId: 'integration-test',
    planTitle: 'Integration Test',
    version: '1.0.0',
    source: 'test',
    phases: [
      { id: 'phase-a', title: 'Phase A', phaseOrder: 1 },
      { id: 'phase-b', title: 'Phase B', phaseOrder: 2 },
    ],
    tasks: [
      { id: 'a1', title: 'Task A1', phase: 'phase-a', dependsOn: [], order: 1 },
      { id: 'a2', title: 'Task A2', phase: 'phase-a', dependsOn: ['a1'], order: 2 },
      {
        id: 'b1',
        title: 'Task B1',
        phase: 'phase-b',
        dependsOn: ['a2'],
        order: 1,
      },
      {
        id: 'b2',
        title: 'Task B2',
        phase: 'phase-b',
        dependsOn: ['a1', 'b1'],
        order: 2,
      },
    ],
  };

  const planDTO = mapPlanSkeletonToPlanDTO(skeleton);

  // Nothing done — only a1 ready
  const res1 = evaluatePlanRuntime({ planDTO, completedTaskIds: [] });
  assert(res1.readyTaskIds.length === 1, '12.1: 1 ready (a1)');
  assert(res1.readyTaskIds[0] === 'a1', '12.2: a1 is ready');
  assert(res1.blockedTaskIds.length === 3, '12.3: 3 blocked');
  assert(res1.summary.includes('1 ready'), '12.4: summary mentions 1 ready');

  // a1 done → a2 ready
  const res2 = evaluatePlanRuntime({ planDTO, completedTaskIds: ['a1'] });
  assert(res2.readyTaskIds.includes('a2'), '12.5: a2 ready after a1');
  assert(res2.blockedTaskIds.includes('a2') === false, '12.6: a2 not blocked');

  // a1+a2 done → b1 ready, b2 has a1 done but b1 not done → blocked
  const res3 = evaluatePlanRuntime({ planDTO, completedTaskIds: ['a1', 'a2'] });
  assert(res3.readyTaskIds.includes('b1'), '12.7: b1 ready (a2 done)');
  assert(res3.blockedTaskIds.includes('b2'), '12.8: b2 blocked (b1 not done)');

  // all done
  const res4 = evaluatePlanRuntime({
    planDTO,
    completedTaskIds: ['a1', 'a2', 'b1', 'b2'],
  });
  assert(res4.doneTaskIds.length === 4, '12.9: all 4 done');
  assert(res4.readyTaskIds.length === 0, '12.10: no ready tasks');
}

// ════════════════════════════════════════════════════════════════════════════
// Test 13: Summary output stability
// ════════════════════════════════════════════════════════════════════════════
header('Test 13: Summary stability');

{
  const planDTO = buildDTO([
    { id: 'a', dependsOn: [] },
    { id: 'b', dependsOn: ['a'] },
  ]);

  const result = evaluatePlanRuntime({ planDTO, completedTaskIds: ['a'] });
  assert(typeof result.summary === 'string', '13.1: summary is a string');
  assert(result.summary.length > 0, '13.2: summary not empty');
  // Should mention ready, done, etc.
  assert(
    result.summary.includes('1 ready') ||
      result.summary.includes('0 ready') ||
      result.summary.includes('done'),
    '13.3: summary contains meaningful state'
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Test 14: No tasks with no deps are all ready
// ════════════════════════════════════════════════════════════════════════════
header('Test 14: All tasks with no deps are ready');

{
  const planDTO = buildDTO([
    { id: 'x', dependsOn: [] },
    { id: 'y', dependsOn: [] },
    { id: 'z', dependsOn: [] },
  ]);

  const result = evaluatePlanRuntime({ planDTO, completedTaskIds: [] });
  assert(result.readyTaskIds.length === 3, '14.1: all 3 tasks ready');
  assert(result.blockedTaskIds.length === 0, '14.2: 0 blocked');
  assert(result.taskStates.every((t) => t.status === 'ready'), '14.3: all status = ready');
}

// ════════════════════════════════════════════════════════════════════════════
summary();
