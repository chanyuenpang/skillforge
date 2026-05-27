import { mapPlanSkeletonToPlanDTO } from '../src/skillforge/plan-dto-mapper.mjs';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${label}`);
  }
}

function header(msg) {
  console.log(`\n📋 ${msg}`);
}

function summary() {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`  ✅ ${passed} passed  ❌ ${failed} failed  (${passed + failed} total)`);
  console.log(`${'='.repeat(50)}`);
}

// ──────────────────────────────────────────
// Test 1: Normal skeleton — 完整的正常输入
// ──────────────────────────────────────────
header('Test 1: Normal skeleton (完整输入)');
const normalSkeleton = {
  planId: '  plan-001  ',
  planTitle: '  三项产品主线落地计划  ',
  version: '1.2.0',
  source: 'manual',
  phases: [
    { id: 'phase-1', title: '  需求分析  ', phaseOrder: 1, description: '  第一阶段  ' },
    { id: 'phase-2', title: '开发', phaseOrder: 2, description: '第二阶段' }
  ],
  tasks: [
    {
      id: 'task-1',
      title: '  需求调研  ',
      description: '  调研用户需求  ',
      phase: 'phase-1',
      dependsOn: [],
      outputs: ['需求文档'],
      owner: 'yop',
      status: 'done',
      order: 1
    },
    {
      id: 'task-2',
      title: ' 原型设计 ',
      description: '  设计原型  ',
      phase: 'phase-1',
      dependsOn: ['task-1'],
      outputs: ['原型图'],
      owner: null,
      status: '',
      order: 2
    },
    {
      id: 'task-3',
      title: '  编码实现  ',
      phase: 'phase-2',
      dependsOn: ['task-2'],
      outputs: ['代码'],
      order: 3
    }
  ]
};

const normalResult = mapPlanSkeletonToPlanDTO(normalSkeleton);

assert(normalResult.planId === 'plan-001', 'planId trim works');
assert(normalResult.planTitle === '三项产品主线落地计划', 'planTitle trim works');
assert(normalResult.version === '1.2.0', 'version preserved');
assert(normalResult.source === 'manual', 'source preserved');
assert(normalResult.phases.length === 2, '2 phases');
assert(normalResult.phases[0].id === 'phase-1', 'phase-0 id');
assert(normalResult.phases[0].title === '需求分析', 'phase-0 title trim');
assert(normalResult.phases[0].order === 1, 'phase-0 order from phaseOrder');
assert(normalResult.phases[0].taskIds.length === 2, 'phase-0 has 2 taskIds');
assert(normalResult.phases[0].taskIds.includes('task-1'), 'phase-0 contains task-1');
assert(normalResult.phases[0].taskIds.includes('task-2'), 'phase-0 contains task-2');
assert(normalResult.phases[1].taskIds.includes('task-3'), 'phase-1 contains task-3');
assert(normalResult.tasks.length === 3, '3 tasks');
assert(normalResult.tasks[0].status === 'done', 'task-0 status preserved');
assert(normalResult.tasks[1].status === 'pending', 'empty status → pending');
assert(normalResult.tasks[1].owner === null, 'null owner stays null');
assert(normalResult.tasks[2].owner === null, 'missing owner defaults to null');
assert(normalResult.tasks[2].description === '', 'missing description defaults to ""');
assert(normalResult.tasks[2].outputs.length === 1, 'task-3 outputs preserved');
assert(normalResult.tasks[2].outputs.includes('代码'), 'task-3 output is 代码');
assert(normalResult.dependencies.length === 2, '2 dependency edges');
assert(normalResult.dependencies.some(d => d.taskId === 'task-2' && d.dependsOn === 'task-1'), 'task-2 depends on task-1');
assert(normalResult.dependencies.some(d => d.taskId === 'task-3' && d.dependsOn === 'task-2'), 'task-3 depends on task-2');
assert(normalResult.tasks[0].rawRef === normalSkeleton.tasks[0], 'rawRef is original task object (by reference)');

// ──────────────────────────────────────────
// Test 2: Skeleton with missing phase — task指向不存在的phase
// ──────────────────────────────────────────
header('Test 2: Missing phase — task指向不存在的phase');
const missingPhaseSkeleton = {
  planId: 'plan-orphan',
  planTitle: '孤儿任务测试',
  phases: [
    { id: 'phase-a', title: 'Phase A', phaseOrder: 1 }
  ],
  tasks: [
    { id: 't1', title: 'Task 1', phase: 'phase-a' },
    { id: 't2', title: 'Task 2', phase: 'phase-b' }, // 不存在
    { id: 't3', title: 'Task 3' } // 缺 phase
  ]
};

const orphanResult = mapPlanSkeletonToPlanDTO(missingPhaseSkeleton);

assert(orphanResult.tasks.length === 3, 'orphan: 3 tasks');
assert(orphanResult.tasks[0].phaseId === 'phase-a', 'orphan: t1 in phase-a');
assert(orphanResult.tasks[1].phaseId === 'unassigned', 'orphan: t2 → unassigned');
assert(orphanResult.tasks[2].phaseId === 'unassigned', 'orphan: t3 → unassigned (missing phase)');

assert(orphanResult.phases.length === 2, 'orphan: 2 phases (original + unassigned)');
assert(orphanResult.phases[1].id === 'unassigned', 'orphan: unassigned phase created');
assert(orphanResult.phases[1].taskIds.length === 2, 'orphan: unassigned has 2 tasks');
assert(orphanResult.phases[1].taskIds.includes('t2'), 'orphan: unassigned contains t2');
assert(orphanResult.phases[1].taskIds.includes('t3'), 'orphan: unassigned contains t3');

assert(orphanResult.metadata.orphanTaskWarnings.length === 2, 'orphan: 2 warnings');
assert(
  orphanResult.metadata.orphanTaskWarnings.some(w => w.taskId === 't2' && w.reason === 'unknown phase: phase-b'),
  'orphan: t2 warning reason correct'
);
assert(
  orphanResult.metadata.orphanTaskWarnings.some(w => w.taskId === 't3' && w.reason === 'missing phase'),
  'orphan: t3 warning reason correct'
);

// ──────────────────────────────────────────
// Test 3: Skeleton with missing fields — 字段大量缺失
// ──────────────────────────────────────────
header('Test 3: Missing fields — 字段大量缺失/异常');
const sparseSkeleton = {
  // 无 planId
  // 无 planTitle
  phases: [
    { id: 'p1' }, // 只有id，缺 title/phaseOrder/description
    {} // 连id都没有
  ],
  tasks: [
    {
      id: 't1',
      title: 'Task 1',
      phase: 'p1',
      dependsOn: [null, '   ', { taskId: 't0' }, 't0.5'],
      outputs: ['  ', null, 'doc']
    },
    {
      // 全空 task — 所有字段都缺
    }
  ]
};

const sparseResult = mapPlanSkeletonToPlanDTO(sparseSkeleton);

assert(sparseResult.planId === null, 'sparse: missing planId → null');
assert(sparseResult.version === '1.0.0', 'sparse: missing version → 1.0.0');
assert(sparseResult.source === 'planSkeleton', 'sparse: missing source → planSkeleton');
assert(sparseResult.phases.length === 3, 'sparse: 3 phases (2 original + 1 unassigned)');
assert(sparseResult.phases[0].id === 'p1', 'sparse: phase-0 id p1');
assert(sparseResult.phases[0].title === '', 'sparse: phase-0 title empty');
assert(sparseResult.phases[0].order === 1, 'sparse: phase-0 order default 1');
assert(sparseResult.phases[0].description === '', 'sparse: phase-0 desc empty');
assert(sparseResult.phases[1].id === 'phase-2', 'sparse: phase-1 auto-id phase-2');

assert(sparseResult.tasks.length === 2, 'sparse: 2 tasks');
assert(sparseResult.tasks[0].dependsOn.length === 2, 'sparse: t1 has 2 valid deps (null+blank filtered)');
assert(sparseResult.tasks[0].dependsOn.includes('t0'), 'sparse: t1 depends on t0');
assert(sparseResult.tasks[0].dependsOn.includes('t0.5'), 'sparse: t1 depends on t0.5');
assert(sparseResult.tasks[0].outputs.length === 1, 'sparse: t1 has 1 output (blank/null filtered)');
assert(sparseResult.tasks[0].outputs.includes('doc'), 'sparse: t1 output is doc');
assert(sparseResult.tasks[0].owner === null, 'sparse: t1 owner null (missing)');
assert(sparseResult.tasks[0].status === 'pending', 'sparse: t1 status pending (missing)');
assert(sparseResult.tasks[0].order === 1, 'sparse: t1 order default 1');
assert(sparseResult.tasks[0].rawRef === sparseSkeleton.tasks[0], 'sparse: t1 rawRef preserved');

assert(sparseResult.tasks[1].id === 'task-2', 'sparse: task-1 auto-id task-2');
assert(sparseResult.tasks[1].title === '', 'sparse: task-1 title empty');
assert(sparseResult.tasks[1].phaseId === 'unassigned', 'sparse: task-1 → unassigned');
assert(sparseResult.tasks[1].status === 'pending', 'sparse: task-1 status pending');

// unassigned phase should exist because task-1 is orphan
assert(sparseResult.phases.some(p => p.id === 'unassigned'), 'sparse: unassigned phase exists');
assert(sparseResult.metadata.orphanTaskWarnings.length === 1, 'sparse: 1 orphan warning');

// ──────────────────────────────────────────
// Test 4: Edge cases — 空输入、边界值
// ──────────────────────────────────────────
header('Test 4: Edge cases — 空输入/边界值');
const emptyResult = mapPlanSkeletonToPlanDTO(null);
assert(emptyResult.phases.length === 0, 'edge: null input → empty phases');
assert(emptyResult.tasks.length === 0, 'edge: null input → empty tasks');
assert(emptyResult.dependencies.length === 0, 'edge: null input → empty deps');
assert(emptyResult.metadata.orphanTaskWarnings === undefined, 'edge: null input → no orphan warnings');

const emptyObjResult = mapPlanSkeletonToPlanDTO({});
assert(emptyObjResult.phases.length === 0, 'edge: {} input → empty phases');

// ──────────────────────────────────────────
// Test 5: dependsOn 跨 phase + 异构格式
// ──────────────────────────────────────────
header('Test 5: Cross-phase dependencies + heterogeneous dependsOn');
const crossPhaseSkeleton = {
  planId: 'cross-test',
  phases: [
    { id: 'A', title: 'Phase A' },
    { id: 'B', title: 'Phase B' }
  ],
  tasks: [
    { id: 'a1', phase: 'A', dependsOn: ['b1'] }, // 跨 phase 依赖
    { id: 'b1', phase: 'B', dependsOn: [] },
    { id: 'b2', phase: 'B', dependsOn: [{ taskId: 'a1' }, { id: 'b1' }, 999, true] }
  ]
};

const crossResult = mapPlanSkeletonToPlanDTO(crossPhaseSkeleton);

assert(crossResult.tasks.length === 3, 'cross: 3 tasks');
assert(crossResult.dependencies.length === 4, 'cross: 4 dep edges (a1→b1 + b2→a1 + b2→b1 + b2→999)');
assert(
  crossResult.dependencies.some(d => d.taskId === 'a1' && d.dependsOn === 'b1'),
  'cross: a1 cross-phase depends on b1'
);
assert(
  crossResult.dependencies.some(d => d.taskId === 'b2' && d.dependsOn === 'a1'),
  'cross: b2 dep a1 from { taskId }'
);
assert(
  crossResult.dependencies.some(d => d.taskId === 'b2' && d.dependsOn === 'b1'),
  'cross: b2 dep b1 from { id }'
);

// confirm non-string items (999, true) are filtered out
const b2Deps = crossResult.tasks.find(t => t.id === 'b2').dependsOn;
assert(b2Deps.length === 3, 'cross: b2 has 3 deps (a1,b1,stringified-999; true filtered)');
assert(b2Deps.includes('999'), 'cross: b2 dep 999 preserved as string');

// ──────────────────────────────────────────
// Test 6: Pure function — referential transparency
// ──────────────────────────────────────────
header('Test 6: Pure function');
const input = {
  planId: 'pure-test',
  phases: [{ id: 'p1' }],
  tasks: [{ id: 't1', phase: 'p1' }]
};
const frozen = JSON.stringify(input);
const result1 = mapPlanSkeletonToPlanDTO(input);
const result2 = mapPlanSkeletonToPlanDTO(input);
assert(JSON.stringify(input) === frozen, 'pure: input not mutated');
assert(JSON.stringify(result1) === JSON.stringify(result2), 'pure: same input → same output');

// ──────────────────────────────────────────
summary();

process.exit(failed > 0 ? 1 : 0);
