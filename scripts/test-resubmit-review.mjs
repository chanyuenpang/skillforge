#!/usr/bin/env node
/**
 * test-resubmit-review.mjs — S4 重审闭环测试
 *
 * Coverage:
 *   1. Normal resubmit flow: reject → resubmit → new round → approve
 *   2. Non-rejected state resubmit rejected (approved, ready, idle)
 *   3. Old round vs new round distinguishable
 *   4. Multiple resubmissions: round tracking across rounds
 *   5. Idempotency on resubmit
 *   6. Append-only verification
 *   7. getReviewState returns correct round after resubmit
 */

import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync, appendFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const fakeHome = mkdtempSync(join(tmpdir(), "workflow-kit-s4-resubmit-"));
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
    summary: "risk observed for S4 test",
    observedAt: "2026-05-24T05:00:00.000Z",
    evidenceRefs: ["ev:s4-001"],
    sourceLinks: ["https://s4.example.test/risk"],
    metadata: {},
    recordedAt: "2026-05-24T06:00:00.000Z",
    payload: {},
  };
  appendFileSync(join(skillforgeDir, "risk-store.jsonl"), JSON.stringify(event) + "\n", "utf8");
}

// Seed fixtures
seedRisk("fixture-s4-resubmit-1", "idem-risk-s4-r1");
seedRisk("fixture-s4-resubmit-2", "idem-risk-s4-r2");
seedRisk("fixture-s4-resubmit-3", "idem-risk-s4-r3");
seedRisk("fixture-s4-resubmit-4", "idem-risk-s4-r4");
seedRisk("fixture-s4-multi", "idem-risk-s4-multi");

const {
  requestReview,
  approveReview,
  rejectReview,
  resubmitReview,
  getReviewState,
  loadReviewEvents,
} = await import("../src/skillforge/review-store.mjs");

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
// 1. 驳回 → 重提 → 新轮次成功
// ═══════════════════════════════════════════════════════════════
console.log("── 1. 驳回 → 重提 → 新轮次 ──");

test("request → reject → state is rejected", () => {
  requestReview("fixture-s4-resubmit-1");
  rejectReview("fixture-s4-resubmit-1", { reason: "needs rework" });

  const state = getReviewState("fixture-s4-resubmit-1");
  assert.equal(state.status, "rejected");
  assert.equal(state.round, 1);
  assert.equal(state.eventCount, 2); // Requested + Rejected
});

let resubmitEventId;
test("resubmitReview from rejected → new round 2, status ready", () => {
  const eventsBefore = countEventLines("review-events.jsonl");

  const result = resubmitReview("fixture-s4-resubmit-1", {
    reason: "reworked, ready for re-review",
    idempotencyKey: "resubmit-key-001",
  });
  assert.equal(result.ok, true);
  assert.equal(result.duplicate, false);
  assert.equal(result.round, 2);
  assert.ok(typeof result.eventId === "string");
  resubmitEventId = result.eventId;

  // State after resubmit: ready, round 2
  const state = getReviewState("fixture-s4-resubmit-1");
  assert.equal(state.status, "ready");
  assert.equal(state.round, 2);
  assert.equal(state.lastEventType, "ReviewResubmitted");

  // Append-only: new event appended
  const eventsAfter = countEventLines("review-events.jsonl");
  assert.equal(eventsAfter, eventsBefore + 1);
});

test("after resubmit → can approve new round", () => {
  const result = approveReview("fixture-s4-resubmit-1", {
    reason: "approved on round 2",
  });
  assert.equal(result.ok, true);

  const state = getReviewState("fixture-s4-resubmit-1");
  assert.equal(state.status, "approved");
  assert.equal(state.decision, "approve");
  assert.equal(state.round, 2); // round preserved from resubmit

  // Event sequence: Requested(r1) → Rejected → Resubmitted(r2) → Approved
  const events = loadReviewEvents("fixture-s4-resubmit-1");
  assert.equal(events.length, 4);
  assert.equal(events[0].type, "ReviewRequested");
  assert.equal(events[0].round, 1);
  assert.equal(events[1].type, "ReviewRejected");
  assert.equal(events[2].type, "ReviewResubmitted");
  assert.equal(events[2].round, 2);
  assert.equal(events[2].previousRound, 1);
  assert.equal(events[3].type, "ReviewApproved");
});

test("after resubmit → can reject new round too", () => {
  // Use a separate fixture: fixture-s4-resubmit-2
  requestReview("fixture-s4-resubmit-2");
  rejectReview("fixture-s4-resubmit-2");
  resubmitReview("fixture-s4-resubmit-2");

  // Now reject the new round
  const result = rejectReview("fixture-s4-resubmit-2", {
    reason: "still not good enough",
  });
  assert.equal(result.ok, true);

  const state = getReviewState("fixture-s4-resubmit-2");
  assert.equal(state.status, "rejected");
  assert.equal(state.round, 2);
});

// ═══════════════════════════════════════════════════════════════
// 2. 非驳回态重提被拒绝
// ═══════════════════════════════════════════════════════════════
console.log("\n── 2. 非驳回态重提被拒绝 ──");

test("cannot resubmit from approved state", () => {
  requestReview("fixture-s4-resubmit-3");
  approveReview("fixture-s4-resubmit-3");

  assert.throws(
    () => resubmitReview("fixture-s4-resubmit-3"),
    /only "rejected" allows resubmission/
  );
});

test("cannot resubmit from ready state (no decision yet)", () => {
  requestReview("fixture-s4-resubmit-4");

  assert.throws(
    () => resubmitReview("fixture-s4-resubmit-4"),
    /only "rejected" allows resubmission/
  );
});

test("cannot resubmit for non-existent review", () => {
  assert.throws(
    () => resubmitReview("no-such-fixture-s4"),
    /no review exists/
  );
});

// ═══════════════════════════════════════════════════════════════
// 3. 多轮重审：旧轮次与新轮次可区分
// ═══════════════════════════════════════════════════════════════
console.log("\n── 3. 多轮重审轮次可区分 ──");

test("multiple resubmissions track distinct rounds", () => {
  requestReview("fixture-s4-multi");

  // Round 1: reject
  rejectReview("fixture-s4-multi", { reason: "round 1 rejected" });
  let state = getReviewState("fixture-s4-multi");
  assert.equal(state.round, 1);
  assert.equal(state.status, "rejected");

  // Round 2: resubmit → reject
  const r2 = resubmitReview("fixture-s4-multi", { reason: "retry round 2" });
  assert.equal(r2.round, 2);
  rejectReview("fixture-s4-multi", { reason: "round 2 rejected" });
  state = getReviewState("fixture-s4-multi");
  assert.equal(state.round, 2);
  assert.equal(state.status, "rejected");

  // Round 3: resubmit → approve
  const r3 = resubmitReview("fixture-s4-multi", { reason: "retry round 3" });
  assert.equal(r3.round, 3);
  approveReview("fixture-s4-multi", { reason: "round 3 approved" });
  state = getReviewState("fixture-s4-multi");
  assert.equal(state.round, 3);
  assert.equal(state.status, "approved");

  // Verify event sequence contains all rounds
  const events = loadReviewEvents("fixture-s4-multi");
  const roundEvents = events.filter((e) => typeof e.round === "number");
  assert.equal(roundEvents.length, 3); // Requested(r1) + Resubmitted(r2) + Resubmitted(r3)
  assert.equal(events.length, 6);

  const rounds = roundEvents.map((e) => e.round);
  assert.deepEqual(rounds, [1, 2, 3]);
});

// ═══════════════════════════════════════════════════════════════
// 4. Idempotency on resubmit
// ═══════════════════════════════════════════════════════════════
console.log("\n── 4. Resubmit 幂等 ──");

test("resubmitReview with same idempotencyKey is idempotent", () => {
  const eventsBefore = countEventLines("review-events.jsonl");

  const r = resubmitReview("fixture-s4-resubmit-2", {
    idempotencyKey: "resubmit-key-002",
    reason: "duplicate resubmit",
  });
  // fixture-s4-resubmit-2 is already rejected after round 2, so this should work
  // but wait — fixture-s4-resubmit-2 was rejected at round 2 and NOT resubmitted
  // Let me check: in test "after resubmit → can reject new round too", we did:
  // request → reject → resubmit → reject
  // So state is rejected (round 2). Resubmit should work.
  assert.equal(r.ok, true);
  assert.equal(r.duplicate, false);
  assert.equal(r.round, 3); // round 3

  // Repeat with same key
  const r2 = resubmitReview("fixture-s4-resubmit-2", {
    idempotencyKey: "resubmit-key-002",
  });
  assert.equal(r2.ok, true);
  assert.equal(r2.duplicate, true);
  assert.equal(r2.eventId, r.eventId);
  assert.equal(r2.round, 3);

  // No new events appended
  const eventsAfter = countEventLines("review-events.jsonl");
  assert.equal(eventsAfter, eventsBefore + 1); // only the first call
});

// ═══════════════════════════════════════════════════════════════
// 5. Append-only verification
// ═══════════════════════════════════════════════════════════════
console.log("\n── 5. Append-only 验证 ──");

test("old round events are not overwritten by resubmit", () => {
  const events = loadReviewEvents("fixture-s4-resubmit-1");
  // Must still contain the original round 1 events
  const r1Events = events.filter((e) => e.round === 1 || e.type === "ReviewRejected");
  const hasR1Requested = events.some((e) => e.type === "ReviewRequested" && e.round === 1);
  const hasR1Rejected = events.some((e) => e.type === "ReviewRejected" && events.indexOf(e) > events.findIndex(ev => ev.type === "ReviewRequested"));
  assert.equal(hasR1Requested, true, "original round 1 request event preserved");
  // The Rejected event should still exist (it doesn't carry round but was round 1's terminal)
  const hasRejected = events.some((e) => e.type === "ReviewRejected");
  assert.equal(hasRejected, true, "original rejection event preserved");
});

test("event store contents are valid JSON and append-only", () => {
  const eventPath = join(fakeHome, ".skillforge", "review-events.jsonl");
  const raw = readFileSync(eventPath, "utf8").trim();
  const lines = raw.split("\n").filter(Boolean);

  // All lines must be valid JSON
  for (const line of lines) {
    const parsed = JSON.parse(line);
    assert.equal(parsed.kind, "review-event");
  }

  // Event count sanity: at least our test events exist
  assert.ok(lines.length >= 6, `expect at least 6 events, got ${lines.length}`);
});

// ═══════════════════════════════════════════════════════════════
// 6. getReviewState edge cases after resubmit
// ═══════════════════════════════════════════════════════════════
console.log("\n── 6. getReviewState 边界 ──");

test("getReviewState round is correct after approved resubmitted review", () => {
  const state = getReviewState("fixture-s4-resubmit-1");
  assert.equal(state.round, 2);
  assert.equal(state.status, "approved");
});

test("getReviewState round is correct while resubmitted review is still ready", () => {
  // fixture-s4-resubmit-2 is in rejected state on round 2 (after resubmit → reject)
  // Well, we resubmitted it again in the idempotency test so it's in ready state on round 3
  const state = getReviewState("fixture-s4-resubmit-2");
  assert.equal(state.round, 3);
  assert.equal(state.status, "ready");
});

test("unresubmitted review has round 1", () => {
  // fixture-s4-resubmit-3 was approved without resubmit
  const state = getReviewState("fixture-s4-resubmit-3");
  assert.equal(state.round, 1);
  assert.equal(state.status, "approved");
});

// ═══════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════
console.log(`\n── S4 测试结果 ──`);
console.log(`${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log("❌ S4 FAIL");
  rmSync(fakeHome, { recursive: true, force: true });
  process.exit(1);
}
console.log("✅ S4 PASS");
rmSync(fakeHome, { recursive: true, force: true });
