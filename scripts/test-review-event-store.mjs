#!/usr/bin/env node
/**
 * test-review-event-store.mjs — Validates review event state machine (Slice B).
 *
 * Coverage:
 *   1. Normal review approval flow (request → approve)
 *   2. Review rejection flow (request → reject)
 *   3. Illegal state transitions rejected
 *      a. Cannot request review for non-existent risk fact
 *      b. Cannot approve non-existent review
 *      c. Cannot reject non-existent review
 *      d. Cannot re-approve already approved
 *      e. Cannot re-reject already rejected
 *      f. Cannot approve already rejected
 *      g. Cannot reject already approved
 *      h. Cannot approve/reject if not in 'ready' state
 *   4. Idempotency: duplicate request returns same result
 *   5. getReviewState returns correct computed state
 *   6. loadReviewEvents returns all events for a fixture
 */

import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync, appendFileSync, mkdirSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join } from "node:path";

const fakeHome = mkdtempSync(join(tmpdir(), "workflow-kit-review-events-"));
process.env.HOME = fakeHome;

// Seed a risk fact so reviews have something to reference
const skillforgeDir = join(fakeHome, ".skillforge");
mkdirSync(skillforgeDir, { recursive: true });
const riskEvent = {
  kind: "risk-event",
  type: "RiskFactObserved",
  eventId: "fixture-risk-A:idem-risk-001",
  idempotencyKey: "idem-risk-001",
  fixtureId: "fixture-risk-A",
  riskType: "policy_violation",
  severity: "high",
  summary: "contains disallowed operation",
  observedAt: "2026-05-24T05:00:00.000Z",
  evidenceRefs: ["ev:001"],
  sourceLinks: ["https://example.test/evidence/1"],
  metadata: { actor: "validator" },
  recordedAt: "2026-05-24T06:00:00.000Z",
  payload: {},
};
appendFileSync(join(skillforgeDir, "risk-store.jsonl"), JSON.stringify(riskEvent) + "\n", "utf8");

// Also seed a second fixture for multi-fixture testing
const riskEvent2 = {
  ...riskEvent,
  eventId: "fixture-risk-B:idem-risk-002",
  idempotencyKey: "idem-risk-002",
  fixtureId: "fixture-risk-B",
};
appendFileSync(join(skillforgeDir, "risk-store.jsonl"), JSON.stringify(riskEvent2) + "\n", "utf8");

const {
  requestReview,
  approveReview,
  rejectReview,
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

// ─── 1. Normal review approval flow ───
console.log("--- Normal approval flow ---");

let approveEventId;
test("requestReview creates a review event", () => {
  const result = requestReview("fixture-risk-A", {
    metadata: { requester: "test-script" },
  });
  assert.equal(result.ok, true);
  assert.equal(result.duplicate, false);
  assert.ok(typeof result.eventId === "string");

  const state = getReviewState("fixture-risk-A");
  assert.equal(state.status, "ready");
  assert.equal(state.decision, null);
  assert.equal(state.lastEventType, "ReviewRequested");
  assert.equal(state.eventCount, 1);
});

test("approveReview transitions to approved", () => {
  const result = approveReview("fixture-risk-A", {
    reason: "All checks passed",
    evidenceRefs: ["ev:approve-001"],
  });
  assert.equal(result.ok, true);
  assert.equal(result.type, "ReviewApproved");
  approveEventId = result.eventId;

  const state = getReviewState("fixture-risk-A");
  assert.equal(state.status, "approved");
  assert.equal(state.decision, "approve");
  assert.equal(state.lastEventType, "ReviewApproved");
  assert.equal(state.eventCount, 2);
});

test("loadReviewEvents returns all events", () => {
  const events = loadReviewEvents("fixture-risk-A");
  assert.equal(events.length, 2);
  assert.equal(events[0].type, "ReviewRequested");
  assert.equal(events[1].type, "ReviewApproved");
});

// ─── 2. Review rejection flow ───
console.log("\n--- Rejection flow ---");

test("requestReview for fixture B", () => {
  const result = requestReview("fixture-risk-B");
  assert.equal(result.ok, true);
  assert.equal(result.duplicate, false);

  const state = getReviewState("fixture-risk-B");
  assert.equal(state.status, "ready");
});

test("rejectReview transitions to rejected", () => {
  const result = rejectReview("fixture-risk-B", {
    reason: "Policy violation unresolved",
  });
  assert.equal(result.ok, true);
  assert.equal(result.type, "ReviewRejected");

  const state = getReviewState("fixture-risk-B");
  assert.equal(state.status, "rejected");
  assert.equal(state.decision, "reject");
  assert.equal(state.lastEventType, "ReviewRejected");
  assert.equal(state.eventCount, 2);
});

// ─── 3. Illegal state transitions ───
console.log("\n--- Illegal state transitions ---");

test("cannot request review for non-existent risk fact", () => {
  assert.throws(
    () => requestReview("non-existent-fixture"),
    /no RiskFactObserved event found/
  );
});

test("cannot approve non-existent review", () => {
  assert.throws(
    () => approveReview("non-existent-fixture"),
    /no review exists/
  );
});

test("cannot reject non-existent review", () => {
  assert.throws(
    () => rejectReview("non-existent-fixture"),
    /no review exists/
  );
});

test("cannot re-approve already approved review", () => {
  assert.throws(
    () => approveReview("fixture-risk-A"),
    /already approved/
  );
});

test("cannot re-reject already rejected review", () => {
  assert.throws(
    () => rejectReview("fixture-risk-B"),
    /already rejected/
  );
});

test("cannot approve already rejected review", () => {
  assert.throws(
    () => approveReview("fixture-risk-B"),
    /already rejected/
  );
});

test("cannot reject already approved review", () => {
  assert.throws(
    () => rejectReview("fixture-risk-A"),
    /already approved/
  );
});

// ─── 4. Idempotency ───
console.log("\n--- Idempotency ---");

test("duplicate requestReview is idempotent (same fixtureId)", () => {
  const result = requestReview("fixture-risk-A");
  assert.equal(result.ok, true);
  assert.equal(result.duplicate, true);

  // Should not create a new event
  const events = loadReviewEvents("fixture-risk-A");
  assert.equal(events.length, 2);
});

test("duplicate requestReview is idempotent (same idempotencyKey)", () => {
  const result = requestReview("fixture-risk-B", {
    idempotencyKey: "review-req:fixture-risk-B",
  });
  assert.equal(result.ok, true);
  assert.equal(result.duplicate, true);
});

test("requestReview with custom idempotencyKey works and is replay-safe", () => {
  // First call with explicit key
  const r1 = requestReview("fixture-risk-B", {
    idempotencyKey: "my-custom-review-key",
  });
  // It's a duplicate because fixture-risk-B already has a review
  assert.equal(r1.ok, true);
  assert.equal(r1.duplicate, true);
});

// ─── 5. getReviewState edge cases ───
console.log("\n--- getReviewState edge cases ---");

test("getReviewState returns null for fixture with no review", () => {
  const state = getReviewState("no-such-fixture");
  assert.equal(state, null);
});

test("loadReviewEvents returns empty array for fixture with no review", () => {
  const events = loadReviewEvents("no-such-fixture");
  assert.ok(Array.isArray(events));
  assert.equal(events.length, 0);
});

// ─── 6. Append-only verification ───
console.log("\n--- Append-only verification ---");

test("event store is append-only (new events don't overwrite old)", () => {
  const eventPath = join(fakeHome, ".skillforge", "review-events.jsonl");
  const raw = readFileSync(eventPath, "utf8").trim();
  const lines = raw.split("\n").filter(Boolean);

  // Should have: A(req) + A(approve) + B(req) + B(reject) = 4 events
  assert.equal(
    lines.length,
    4,
    `expected 4 event lines, got ${lines.length}`
  );

  // Parse and verify kinds
  const parsed = lines.map((l) => JSON.parse(l));
  const types = parsed.map((e) => e.type);
  assert.deepEqual(types, [
    "ReviewRequested",
    "ReviewApproved",
    "ReviewRequested",
    "ReviewRejected",
  ]);
});

// ─── Summary ───
console.log(`\nResult: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log("❌ FAIL");
  rmSync(fakeHome, { recursive: true, force: true });
  process.exit(1);
} else {
  console.log("✅ PASS");
  rmSync(fakeHome, { recursive: true, force: true });
}
