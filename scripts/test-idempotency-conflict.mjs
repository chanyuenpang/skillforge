#!/usr/bin/env node
/**
 * test-idempotency-conflict.mjs — S2 幂等与并发冲突测试
 *
 * Coverage:
 *   1. 幂等命中：review approve/reject 重复提交返回 duplicate（不重复落主事件）
 *   2. 幂等命中：approval grant/deny 重复提交返回 duplicate
 *   3. 冲突命中：version/state-snapshot 不一致返回 VERSION_CONFLICT（状态不被覆盖）
 *   4. manual/API 双通道对同类问题返回一致语义
 *   5. append-only：幂等/冲突场景不追加新事件行
 */

import assert from "node:assert/strict";
import { mkdtempSync, rmSync, appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const fakeHome = mkdtempSync(join(tmpdir(), "workflow-kit-s2-idempotency-conflict-"));
process.env.HOME = fakeHome;

const skillforgeDir = join(fakeHome, ".skillforge");
mkdirSync(skillforgeDir, { recursive: true });

function seedRisk(fixtureId, idemKey) {
  const event = {
    kind: "risk-event",
    type: "RiskFactObserved",
    eventId: `${fixtureId}:${idemKey}`,
    idempotencyKey: idemKey,
    fixtureId,
    riskType: "policy_violation",
    severity: "high",
    summary: "risk observed for S2 test",
    observedAt: "2026-05-24T05:00:00.000Z",
    evidenceRefs: ["ev:s2-001"],
    sourceLinks: ["https://s2.example.test/risk"],
    metadata: {},
    recordedAt: "2026-05-24T06:00:00.000Z",
    payload: {},
  };
  appendFileSync(join(skillforgeDir, "risk-store.jsonl"), JSON.stringify(event) + "\n", "utf8");
}

seedRisk("fixture-s2-review-1", "idem-risk-s2-r1");
seedRisk("fixture-s2-review-2", "idem-risk-s2-r2");
seedRisk("fixture-s2-review-3", "idem-risk-s2-r3");
seedRisk("fixture-s2-approval-1", "idem-risk-s2-a1");
seedRisk("fixture-s2-approval-2", "idem-risk-s2-a2");

const { requestReview, approveReview, rejectReview, getReviewState, loadReviewEvents } =
  await import("../src/skillforge/review-store.mjs");
const { requestApproval, grantApproval, denyApproval, getApprovalState, loadApprovalEvents } =
  await import("../src/skillforge/approval-store.mjs");

let passed = 0;
let failed = 0;

function test(label, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  PASS: ${label}`);
  } catch (err) {
    failed += 1;
    console.error(`  FAIL: ${label}`);
    console.error(`        ${err.message}`);
  }
}

function countEventLines(path) {
  try {
    const raw = readFileSync(join(skillforgeDir, path), "utf8").trim();
    if (!raw) return 0;
    return raw.split("\n").filter(Boolean).length;
  } catch {
    return 0;
  }
}

// ═══════════════════════════════════════════════════════════════
// 1. 幂等命中：review approve 重复提交
// ═══════════════════════════════════════════════════════════════
console.log("── 1. Review approve 幂等 ──");

let firstApproveEventId;
let reviewEventsBefore;

test("approveReview 首次成功（带 idempotencyKey）", () => {
  requestReview("fixture-s2-review-1");
  reviewEventsBefore = countEventLines("review-events.jsonl");

  const r = approveReview("fixture-s2-review-1", {
    idempotencyKey: "my-approve-key-001",
    reason: "approved for S2 test",
  });
  assert.equal(r.ok, true);
  assert.equal(r.duplicate, false);
  assert.ok(typeof r.eventId === "string");
  firstApproveEventId = r.eventId;

  const state = getReviewState("fixture-s2-review-1");
  assert.equal(state.status, "approved");
  assert.equal(state.decision, "approve");
});

test("approveReview 重复提交返回 duplicate（不追加新事件）", () => {
  const r = approveReview("fixture-s2-review-1", {
    idempotencyKey: "my-approve-key-001",
    reason: "retry same approve",
  });
  assert.equal(r.ok, true);
  assert.equal(r.duplicate, true);
  assert.equal(r.eventId, firstApproveEventId);

  // 事件行数未增长
  const after = countEventLines("review-events.jsonl");
  assert.equal(after, reviewEventsBefore + 1); // +1 = 只有首次的 Approve 事件
});

test("approveReview 不带 idempotencyKey 重复调用仍抛错（向后兼容）", () => {
  assert.throws(
    () => approveReview("fixture-s2-review-1"),
    /already approved/
  );
});

// ═══════════════════════════════════════════════════════════════
// 2. 幂等命中：review reject 重复提交
// ═══════════════════════════════════════════════════════════════
console.log("\n── 2. Review reject 幂等 ──");

let firstRejectEventId;
let rejectEventsBefore;

test("rejectReview 首次成功（带 idempotencyKey）", () => {
  requestReview("fixture-s2-review-2");
  rejectEventsBefore = countEventLines("review-events.jsonl");

  const r = rejectReview("fixture-s2-review-2", {
    idempotencyKey: "my-reject-key-001",
    reason: "rejected for S2 test",
  });
  assert.equal(r.ok, true);
  assert.equal(r.duplicate, false);
  firstRejectEventId = r.eventId;

  const state = getReviewState("fixture-s2-review-2");
  assert.equal(state.status, "rejected");
});

test("rejectReview 重复提交返回 duplicate", () => {
  const r = rejectReview("fixture-s2-review-2", {
    idempotencyKey: "my-reject-key-001",
  });
  assert.equal(r.ok, true);
  assert.equal(r.duplicate, true);
  assert.equal(r.eventId, firstRejectEventId);

  const after = countEventLines("review-events.jsonl");
  // rejectEventsBefore was taken before the first reject; first reject added 1 event
  assert.equal(after, rejectEventsBefore + 1);
});

// ═══════════════════════════════════════════════════════════════
// 3. 幂等命中：approval grant 重复提交
// ═══════════════════════════════════════════════════════════════
console.log("\n── 3. Approval grant 幂等 ──");

let firstGrantEventId;
let approvalEventsBefore;

test("grantApproval 首次成功（带 idempotencyKey）", () => {
  requestReview("fixture-s2-approval-1");
  approveReview("fixture-s2-approval-1");
  requestApproval("fixture-s2-approval-1");
  approvalEventsBefore = countEventLines("approval-events.jsonl");

  const r = grantApproval("fixture-s2-approval-1", {
    idempotencyKey: "my-grant-key-001",
    reason: "granted for S2 test",
  });
  assert.equal(r.ok, true);
  assert.equal(r.duplicate, false);
  firstGrantEventId = r.eventId;

  const state = getApprovalState("fixture-s2-approval-1");
  assert.equal(state.status, "granted");
  assert.equal(state.decision, "grant");
});

test("grantApproval 重复提交返回 duplicate", () => {
  const r = grantApproval("fixture-s2-approval-1", {
    idempotencyKey: "my-grant-key-001",
  });
  assert.equal(r.ok, true);
  assert.equal(r.duplicate, true);
  assert.equal(r.eventId, firstGrantEventId);

  const after = countEventLines("approval-events.jsonl");
  // approvalEventsBefore was taken before the first grant; first grant added 1 event
  assert.equal(after, approvalEventsBefore + 1);
});

// ═══════════════════════════════════════════════════════════════
// 4. 幂等命中：approval deny 重复提交
// ═══════════════════════════════════════════════════════════════
console.log("\n── 4. Approval deny 幂等 ──");

test("denyApproval 首次成功 → 重复提交返回 duplicate", () => {
  requestReview("fixture-s2-approval-2");
  rejectReview("fixture-s2-approval-2");
  requestApproval("fixture-s2-approval-2");
  const before = countEventLines("approval-events.jsonl");

  const r1 = denyApproval("fixture-s2-approval-2", {
    idempotencyKey: "my-deny-key-001",
    reason: "denied",
  });
  assert.equal(r1.ok, true);
  assert.equal(r1.duplicate, false);

  const r2 = denyApproval("fixture-s2-approval-2", {
    idempotencyKey: "my-deny-key-001",
  });
  assert.equal(r2.ok, true);
  assert.equal(r2.duplicate, true);
  assert.equal(r2.eventId, r1.eventId);

  const after = countEventLines("approval-events.jsonl");
  // before was taken before the first deny; first deny added 1 event
  assert.equal(after, before + 1);
});

// ═══════════════════════════════════════════════════════════════
// 5. 版本冲突：expectedLastEventId 不匹配 → VERSION_CONFLICT
// ═══════════════════════════════════════════════════════════════
console.log("\n── 5. Review 版本冲突 ──");

let reviewConflictBefore;

test("approveReview 版本冲突：expectedLastEventId 不匹配 → 返回 VERSION_CONFLICT", () => {
  requestReview("fixture-s2-review-3");
  const state = getReviewState("fixture-s2-review-3");
  assert.equal(state.status, "ready");
  const realLastEventId = state.lastEventId;

  reviewConflictBefore = countEventLines("review-events.jsonl");

  // 用错误的 expectedLastEventId 尝试 approve
  const r = approveReview("fixture-s2-review-3", {
    expectedLastEventId: "wrong-event-id-12345",
    idempotencyKey: "approve-with-conflict",
    reason: "should fail with conflict",
  });

  assert.equal(r.ok, false);
  assert.equal(r.code, "VERSION_CONFLICT");
  assert.equal(r.expectedLastEventId, "wrong-event-id-12345");
  assert.equal(r.currentLastEventId, realLastEventId);

  // 状态未被覆盖：仍为 ready
  const stateAfter = getReviewState("fixture-s2-review-3");
  assert.equal(stateAfter.status, "ready");
  assert.equal(stateAfter.decision, null);
  assert.equal(stateAfter.lastEventId, realLastEventId);

  // 未追加事件
  const eventCount = countEventLines("review-events.jsonl");
  assert.equal(eventCount, reviewConflictBefore);
});

test("approveReview 版本冲突：review 不存在时返回 VERSION_CONFLICT", () => {
  const r = approveReview("no-review-fixture", {
    expectedLastEventId: "some-event",
    idempotencyKey: "approve-no-review",
  });
  assert.equal(r.ok, false);
  assert.equal(r.code, "VERSION_CONFLICT");
  assert.equal(r.currentLastEventId, null);
});

test("approveReview 版本匹配时正常执行（expectedLastEventId 正确）", () => {
  const state = getReviewState("fixture-s2-review-3");
  const r = approveReview("fixture-s2-review-3", {
    expectedLastEventId: state.lastEventId,
    idempotencyKey: "approve-after-version-check",
    reason: "version matched",
  });
  assert.equal(r.ok, true);
  assert.equal(r.duplicate, false);

  const stateAfter = getReviewState("fixture-s2-review-3");
  assert.equal(stateAfter.status, "approved");
});

// ═══════════════════════════════════════════════════════════════
// 6. 版本冲突：approval expectedLastEventId
// ═══════════════════════════════════════════════════════════════
console.log("\n── 6. Approval 版本冲突 ──");

// Use an existing fixture that has a review but no approval yet
seedRisk("fixture-s2-approval-conflict", "idem-risk-s2-ac");
// We need to set up review → approval request
requestReview("fixture-s2-approval-conflict");
approveReview("fixture-s2-approval-conflict");
requestApproval("fixture-s2-approval-conflict");

test("grantApproval 版本冲突 → VERSION_CONFLICT，状态不被覆盖", () => {
  const state = getApprovalState("fixture-s2-approval-conflict");
  assert.equal(state.status, "pending");

  const before = countEventLines("approval-events.jsonl");

  const r = grantApproval("fixture-s2-approval-conflict", {
    expectedLastEventId: "wrong-approval-event-id",
    idempotencyKey: "grant-version-conflict",
  });

  assert.equal(r.ok, false);
  assert.equal(r.code, "VERSION_CONFLICT");

  // 状态未被覆盖
  const stateAfter = getApprovalState("fixture-s2-approval-conflict");
  assert.equal(stateAfter.status, "pending");
  assert.equal(stateAfter.lastEventId, state.lastEventId);

  // 未追加事件
  assert.equal(countEventLines("approval-events.jsonl"), before);
});

test("grantApproval 版本匹配后正常执行", () => {
  const state = getApprovalState("fixture-s2-approval-conflict");
  const r = grantApproval("fixture-s2-approval-conflict", {
    expectedLastEventId: state.lastEventId,
    idempotencyKey: "grant-after-version-ok",
  });
  assert.equal(r.ok, true);
  assert.equal(r.duplicate, false);

  const stateAfter = getApprovalState("fixture-s2-approval-conflict");
  assert.equal(stateAfter.status, "granted");
});

// ═══════════════════════════════════════════════════════════════
// 7. dual-channel: 幂等冲突在 manual/API 返回一致语义
// ═══════════════════════════════════════════════════════════════
console.log("\n── 7. Dual-channel 一致性（幂等冲突） ──");

// Use a fixture that already has a complete approval → gating decision path
seedRisk("fixture-s2-dual", "idem-risk-s2-dual");
const { issueGateDecisionFromManualEntry, issueGateDecisionFromApiEntry } =
  await import("../src/skillforge/gating-entry.mjs");

test("同一 fixture 经 manual/API 入口返回一致 gating decision", () => {
  const manual = issueGateDecisionFromManualEntry({ fixtureId: "fixture-s2-dual" });
  const api = issueGateDecisionFromApiEntry({ fixtureId: "fixture-s2-dual" });

  // 核心语义一致
  assert.equal(manual.ok, api.ok);
  assert.equal(manual.accepted, api.accepted);
  assert.equal(manual.decision, api.decision);
  assert.equal(manual.reason, api.reason);
  // channel 字段不同是预期行为
  assert.equal(manual.channel, "manual");
  assert.equal(api.channel, "api");
});

test("dual-channel 非法输入返回一致拒绝语义", () => {
  const manual = issueGateDecisionFromManualEntry({ fixtureId: "" });
  const api = issueGateDecisionFromApiEntry({ fixtureId: "" });

  assert.equal(manual.ok, false);
  assert.equal(api.ok, false);
  assert.equal(manual.code, "INVALID_INPUT");
  assert.equal(api.code, "INVALID_INPUT");
  assert.equal(manual.message, api.message);
});

test("dual-channel 合法 fixture 幂等重放返回一致 duplicate", () => {
  // 两次调用应返回相同结果（gating fingerprint 去重）
  const m1 = issueGateDecisionFromManualEntry({ fixtureId: "fixture-s2-dual" });
  const m2 = issueGateDecisionFromManualEntry({ fixtureId: "fixture-s2-dual" });

  assert.equal(m1.ok, true);
  assert.equal(m2.ok, true);
  assert.equal(m1.duplicate, true);
  assert.equal(m2.duplicate, true);
  assert.equal(m1.decision, m2.decision);
  assert.equal(m1.eventId, m2.eventId);
});

// ═══════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════
console.log(`\n── S2 测试结果 ──`);
console.log(`${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log("❌ S2 FAIL");
  rmSync(fakeHome, { recursive: true, force: true });
  process.exit(1);
}
console.log("✅ S2 PASS");
rmSync(fakeHome, { recursive: true, force: true });
