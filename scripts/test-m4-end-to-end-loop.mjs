#!/usr/bin/env node
/**
 * test-m4-end-to-end-loop.mjs — M4 端到端闭环验证脚本
 *
 * 通过 HTTP API 驱动完整的发起 → 执行 → 记录 → 查询 → 回流流程。
 *
 * 覆盖三类场景：
 *   Scenario A: 成功执行（完整 happy path）
 *   Scenario B: 失败 → 重试 → 成功
 *   Scenario C: 重复触发 / 幂等保护
 *
 * 前置条件：web-server.mjs 已运行在 localhost:4173
 *
 * 用法：
 *   node scripts/test-m4-end-to-end-loop.mjs
 *   node scripts/test-m4-end-to-end-loop.mjs --base-url http://192.168.0.12:4173
 */

const BASE_URL = process.argv.includes('--base-url')
  ? process.argv[process.argv.indexOf('--base-url') + 1]
  : 'http://localhost:4173';

let passed = 0;
let failed = 0;
const failures = [];

// ── helpers ────────────────────────────────────────────────────────────

async function api(method, path, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, opts);
  const data = await res.json();
  return { status: res.status, data };
}

function assert(name, condition, detail = '') {
  if (condition) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    const msg = `  ❌ ${name}${detail ? ` — ${detail}` : ''}`;
    failures.push(msg);
    console.log(msg);
  }
}

function logSection(title) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${'='.repeat(60)}`);
}

// ── Scenario A: 成功执行 ───────────────────────────────────────────────

async function scenarioA_success() {
  logSection('Scenario A: 成功执行（完整 happy path）');

  const idempotencyKey = `m4-test-a-${Date.now()}`;
  const fixtureId = 'm4-e2e-success-demo';
  const params = { action: 'validate', target: 'demo-fixture' };

  // Step A1: Initiate task run
  console.log('\n[A1] 发起任务 (initiate) ...');
  const init = await api('POST', '/api/tasks/runs', {
    fixtureId,
    idempotencyKey,
    parentPlanId: 'plan-m4-test',
    params,
  });
  assert('A1.1: Initiate 返回 ok', init.data?.ok === true, JSON.stringify(init.data));
  assert('A1.2: 状态为 pending', init.data?.data?.currentStatus === 'pending', init.data?.data?.currentStatus);
  assert('A1.3: 获得 taskRunId', typeof init.data?.data?.taskRunId === 'string' && init.data.data.taskRunId.length > 0);
  const taskRunId = init.data?.data?.taskRunId;
  if (!taskRunId) {
    console.log('  ⚠️  无法获取 taskRunId，跳过后续 A 场景步骤');
    return;
  }
  console.log(`      taskRunId = ${taskRunId}`);

  // Step A2: Start execution
  console.log('\n[A2] 启动执行 (start) ...');
  const start = await api('POST', `/api/tasks/runs/${taskRunId}/start`);
  assert('A2.1: Start 返回 ok', start.data?.ok === true);
  assert('A2.2: 状态变为 running', start.data?.data?.currentStatus === 'running', start.data?.data?.currentStatus);

  // Step A3: Record outputs
  console.log('\n[A3] 记录产出 (record output) ...');
  const out1 = await api('POST', `/api/tasks/runs/${taskRunId}/output`, {
    kind: 'intermediate',
    content: 'Step 1 validation passed',
    payload: { step: 1, checks: { schema: true, fixture: true } },
  });
  assert('A3.1: Output 1 写入成功', out1.data?.ok === true);

  const out2 = await api('POST', `/api/tasks/runs/${taskRunId}/output`, {
    kind: 'result',
    content: 'All validations passed. Fixture is deployable.',
    payload: { step: 2, status: 'ok', deployable: true },
  });
  assert('A3.2: Output 2 写入成功', out2.data?.ok === true);

  // Step A4: Complete
  console.log('\n[A4] 完成任务 (complete) ...');
  const complete = await api('POST', `/api/tasks/runs/${taskRunId}/complete`, {
    message: 'M4 e2e success scenario completed',
  });
  assert('A4.1: Complete 返回 ok', complete.data?.ok === true);
  assert('A4.2: 状态变为 completed', complete.data?.data?.currentStatus === 'completed', complete.data?.data?.currentStatus);
  assert('A4.3: 有执行耗时', typeof complete.data?.data?.durationMs === 'number' && complete.data.data.durationMs >= 0);

  // Step A5: Query lineage (回看全过程)
  console.log('\n[A5] 查询全程记录 (query lineage) ...');
  const lineage = await api('GET', `/api/tasks/runs/${taskRunId}`);
  assert('A5.1: Lineage 查询成功', lineage.data?.ok === true);
  assert('A5.2: 状态为 completed', lineage.data?.data?.currentStatus === 'completed');
  assert('A5.3: 有 init 事件', lineage.data?.data?.init !== null);
  assert('A5.4: 有 started 事件', lineage.data?.data?.started !== null);
  assert('A5.5: 有产出记录', Array.isArray(lineage.data?.data?.outputs) && lineage.data.data.outputs.length >= 3,
    `outputs count: ${lineage.data?.data?.outputs?.length}`);
  assert('A5.6: 事件总数 >= 5', lineage.data?.data?.events?.length >= 5,
    `events count: ${lineage.data?.data?.events?.length}`);
  assert('A5.7: init 中的 fixtureId 匹配', lineage.data?.data?.init?.fixtureId === fixtureId);

  // Step A6: List & filter (列表查询)
  console.log('\n[A6] 列表查询 (list runs) ...');
  const list = await api('GET', `/api/tasks/runs?fixtureId=${encodeURIComponent(fixtureId)}`);
  assert('A6.1: 列表查询成功', list.data?.ok === true);
  assert('A6.2: 有结果', list.data?.data?.total >= 1, `total: ${list.data?.data?.total}`);
  assert('A6.3: 列表中包含本 taskRunId',
    list.data?.data?.items?.some((r) => r.taskRunId === taskRunId));

  return taskRunId;
}

// ── Scenario B: 失败 → 重试 → 成功 ─────────────────────────────────────

async function scenarioB_failRetry() {
  logSection('Scenario B: 失败 → 重试 → 成功');

  const idempotencyKey = `m4-test-b-${Date.now()}`;
  const fixtureId = 'm4-e2e-fail-retry-demo';

  // Step B1: Initiate
  console.log('\n[B1] 发起任务 ...');
  const init = await api('POST', '/api/tasks/runs', {
    fixtureId,
    idempotencyKey,
    parentPlanId: 'plan-m4-test',
    params: { action: 'risky-operation' },
  });
  assert('B1.1: Initiate 成功', init.data?.ok === true);
  const taskRunId = init.data?.data?.taskRunId;
  if (!taskRunId) return;

  // Step B2: Start
  console.log('\n[B2] 启动执行 ...');
  await api('POST', `/api/tasks/runs/${taskRunId}/start`);

  // Step B3: Record output and fail
  console.log('\n[B3] 记录中间产出后故意失败 ...');
  await api('POST', `/api/tasks/runs/${taskRunId}/output`, {
    kind: 'intermediate',
    content: 'Pre-check started...',
    payload: { step: 'pre-check', progress: 0.3 },
  });
  const fail = await api('POST', `/api/tasks/runs/${taskRunId}/fail`, {
    code: 'REVIEW_FAILED',
    message: 'Review stage rejected: fixture does not meet quality bar',
    details: { rejectReasons: ['missing acceptance criteria', 'no evidence anchors'] },
  });
  assert('B3.1: Fail 返回 ok', fail.data?.ok === true);
  assert('B3.2: 状态变为 failed', fail.data?.data?.currentStatus === 'failed');
  assert('B3.3: 错误码正确', fail.data?.data?.errorCode === 'REVIEW_FAILED');

  // Step B4: Retry (start again from failed)
  console.log('\n[B4] 重试：从 failed 重新启动 ...');
  const retryStart = await api('POST', `/api/tasks/runs/${taskRunId}/start`);
  assert('B4.1: 从 failed 重试 start 成功', retryStart.data?.ok === true);
  assert('B4.2: 状态回到 running', retryStart.data?.data?.currentStatus === 'running');

  // Step B5: Record retry success output
  console.log('\n[B5] 重试后记录成功产出 ...');
  await api('POST', `/api/tasks/runs/${taskRunId}/output`, {
    kind: 'result',
    content: 'Retry succeeded: all quality checks passed',
    payload: { checks: { acceptanceCriteria: true, evidenceAnchors: true } },
  });

  // Step B6: Complete
  console.log('\n[B6] 完成重试后的任务 ...');
  const complete = await api('POST', `/api/tasks/runs/${taskRunId}/complete`, {
    message: 'Fail → retry → success flow completed',
  });
  assert('B6.1: Complete 成功', complete.data?.ok === true);

  // Step B7: Query lineage and verify full fail+retry+success trail
  console.log('\n[B7] 查询全程记录 ...');
  const lineage = await api('GET', `/api/tasks/runs/${taskRunId}`);
  assert('B7.1: 最终状态为 completed', lineage.data?.data?.currentStatus === 'completed');
  assert('B7.2: 有 failed 事件', lineage.data?.data?.failed !== null);
  assert('B7.3: retryCount >= 1', lineage.data?.data?.retryCount >= 1,
    `retryCount: ${lineage.data?.data?.retryCount}`);

  // Step B8: Verify list API also reports correct status
  console.log('\n[B8] 列表校验 ...');
  const list = await api('GET', `/api/tasks/runs?fixtureId=${encodeURIComponent(fixtureId)}`);
  const run = list.data?.data?.items?.find((r) => r.taskRunId === taskRunId);
  assert('B8.1: 列表中状态为 completed', run?.status === 'completed', run?.status);
  assert('B8.2: 重试计数正确', run?.retryCount >= 1, `retryCount: ${run?.retryCount}`);

  return taskRunId;
}

// ── Scenario C: 重复触发 / 幂等 ────────────────────────────────────────

async function scenarioC_idempotency() {
  logSection('Scenario C: 重复触发 / 幂等保护');

  const idempotencyKey = `m4-test-c-${Date.now()}`;
  const fixtureId = 'm4-e2e-idempotent-demo';

  // Step C1: First initiate — should succeed
  console.log('\n[C1] 首次发起 ...');
  const first = await api('POST', '/api/tasks/runs', {
    fixtureId,
    idempotencyKey,
    parentPlanId: 'plan-m4-test',
  });
  assert('C1.1: 首次 initiate 成功', first.data?.ok === true);
  assert('C1.2: 非重复', first.data?.data?.duplicate === false);
  const taskRunId = first.data?.data?.taskRunId;
  if (!taskRunId) return;

  // Step C2: Second initiate with same idempotencyKey — should return existing
  console.log('\n[C2] 相同 idempotencyKey 再次发起 (幂等) ...');
  const second = await api('POST', '/api/tasks/runs', {
    fixtureId,
    idempotencyKey, // same key!
    parentPlanId: 'plan-m4-test',
  });
  assert('C2.1: 二次 initiate 返回 ok', second.data?.ok === true);
  assert('C2.2: 标记为 duplicate', second.data?.data?.duplicate === true);
  assert('C2.3: 返回相同 taskRunId', second.data?.data?.taskRunId === taskRunId,
    `expected: ${taskRunId}, got: ${second.data?.data?.taskRunId}`);
  assert('C2.4: 状态仍为 pending', second.data?.data?.currentStatus === 'pending');

  // Step C3: Run the task to completion
  console.log('\n[C3] 正常执行该任务到完成 ...');
  await api('POST', `/api/tasks/runs/${taskRunId}/start`);
  await api('POST', `/api/tasks/runs/${taskRunId}/output`, {
    kind: 'result',
    content: 'Idempotent flow completed',
  });
  await api('POST', `/api/tasks/runs/${taskRunId}/complete`);

  // Step C4: Third initiate with same key — should still return same run
  console.log('\n[C4] 任务完成后再次用相同 idempotencyKey 发起 ...');
  const third = await api('POST', '/api/tasks/runs', {
    fixtureId,
    idempotencyKey, // same key
  });
  assert('C4.1: 三次 initiate 返回 ok', third.data?.ok === true);
  assert('C4.2: 仍标记为 duplicate', third.data?.data?.duplicate === true);
  assert('C4.3: 返回相同 taskRunId', third.data?.data?.taskRunId === taskRunId);
  assert('C4.4: 状态反映为 completed', third.data?.data?.currentStatus === 'completed',
    `status: ${third.data?.data?.currentStatus}`);

  return taskRunId;
}

// ── Scenario D: 回流收口验证 ───────────────────────────────────────────

async function scenarioD_backflow() {
  logSection('Scenario D: 回流收口 — 结果回写到存储层');

  const idempotencyKey = `m4-test-d-${Date.now()}`;
  const fixtureId = 'm4-e2e-backflow-demo';

  // Init + start + output with file-based evidence references
  const init = await api('POST', '/api/tasks/runs', {
    fixtureId,
    idempotencyKey,
    parentPlanId: 'plan-skillforge-100',
    params: { milestone: 'M4', objective: '端到端闭环' },
  });
  const taskRunId = init.data?.data?.taskRunId;
  if (!taskRunId) return;

  await api('POST', `/api/tasks/runs/${taskRunId}/start`);

  // Record artifact references that a downstream consumer can use
  await api('POST', `/api/tasks/runs/${taskRunId}/output`, {
    kind: 'artifact',
    content: 'Generated task-run-store.mjs',
    payload: {
      file: 'src/skillforge/task-run-store.mjs',
      path: '/home/yankeeting/.openclaw/projects/workflow-kit/src/skillforge/task-run-store.mjs',
      type: 'source-module',
    },
  });
  await api('POST', `/api/tasks/runs/${taskRunId}/output`, {
    kind: 'artifact',
    content: 'Updated web-server.mjs with task run API endpoints',
    payload: {
      file: 'web-server.mjs',
      path: '/home/yankeeting/.openclaw/projects/workflow-kit/web-server.mjs',
      type: 'source-module',
    },
  });

  const complete = await api('POST', `/api/tasks/runs/${taskRunId}/complete`, {
    message: 'M4 end-to-end loop backflow verification completed',
  });

  // Now verify the backflow: the completed output should be queryable
  const lineage = await api('GET', `/api/tasks/runs/${taskRunId}`);
  assert('D.1: 最终状态为 completed', lineage.data?.data?.currentStatus === 'completed');
  // Check that the artifact outputs are in the events
  const artifactOutputs = lineage.data?.data?.outputs?.filter(
    (o) => o.output?.kind === 'artifact',
  );
  assert('D.2: 有 artifact 产出记录', artifactOutputs?.length >= 2,
    `artifacts: ${artifactOutputs?.length}`);
  assert('D.3: 产出包含 task-run-store.mjs',
    artifactOutputs?.some((o) => o.output?.payload?.file?.includes('task-run-store')));
  assert('D.4: 产出包含 web-server.mjs',
    artifactOutputs?.some((o) => o.output?.payload?.file?.includes('web-server')));
  assert('D.5: 回流成功（completed 事件存在）', complete.data?.ok === true);

  return taskRunId;
}

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔬 M4 端到端闭环验证');
  console.log(`   BASE_URL: ${BASE_URL}`);
  console.log('   场景: A(成功) B(失败重试) C(幂等) D(回流收口)');
  console.log();

  try {
    // Ping the server
    const ping = await api('GET', '/api/run-center/summary');
    if (!ping.data?.ok) {
      console.log(`❌ 无法连接到 web-server: ${BASE_URL}`);
      console.log('   请先启动: node web-server.mjs');
      process.exit(1);
    }
    console.log('✅ web-server 连接正常\n');

    await scenarioA_success();
    await scenarioB_failRetry();
    await scenarioC_idempotency();
    await scenarioD_backflow();

    // ── Summary ──────────────────────────────────────────────────────
    const total = passed + failed;
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  📊 M4 验证结果: ${passed}/${total} 通过`);
    if (failed > 0) {
      console.log(`  ❌ ${failed} 项失败:`);
      failures.forEach((f) => console.log(f));
    }
    console.log(`${'='.repeat(60)}`);

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error(`\n💥 验证脚本异常: ${err.message}`);
    console.error(err.stack);
    process.exit(2);
  }
}

main();
