#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const fakeHome = mkdtempSync(join(tmpdir(), "workflow-kit-approval-events-"));
process.env.HOME = fakeHome;

const skillforgeDir = join(fakeHome, ".skillforge");
mkdirSync(skillforgeDir, { recursive: true });

function seedRiskEvent(fixtureId, idem) {
  const riskEvent = {
    kind: "risk-event",
    type: "RiskFactObserved",
    eventId: `${fixtureId}:${idem}`,
    idempotencyKey: idem,
    fixtureId,
    riskType: "policy_violation",
    severity: "high",
    summary: "risk observed",
    observedAt: "2026-05-24T05:00:00.000Z",
    evidenceRefs: ["ev:risk"],
    sourceLinks: ["https://example.test/risk"],
    metadata: {},
    recordedAt: "2026-05-24T06:00:00.000Z",
    payload: {},
  };
  appendFileSync(join(skillforgeDir, "risk-store.jsonl"), JSON.stringify(riskEvent) + "\n", "utf8");
}

seedRiskEvent("fixture-approval-A", "idem-risk-A");
seedRiskEvent("fixture-approval-B", "idem-risk-B");
seedRiskEvent("fixture-approval-C", "idem-risk-C");

const { requestReview, approveReview, rejectReview } = await import("../src/skillforge/review-store.mjs");
const {
  requestApproval,
  grantApproval,
  denyApproval,
  getApprovalState,
  loadApprovalEvents,
} = await import("../src/skillforge/approval-store.mjs");

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

console.log("--- Approval granted flow ---");

test("review complete then requestApproval", () => {
  requestReview("fixture-approval-A");
  approveReview("fixture-approval-A");

  const result = requestApproval("fixture-approval-A");
  assert.equal(result.ok, true);
  assert.equal(result.duplicate, false);

  const state = getApprovalState("fixture-approval-A");
  assert.equal(state.status, "pending");
  assert.equal(state.decision, null);
  assert.equal(state.lastEventType, "ApprovalRequested");
  assert.ok(typeof state.reviewEventRef === "string");
});

test("grantApproval transitions to granted", () => {
  const result = grantApproval("fixture-approval-A", { reason: "approved" });
  assert.equal(result.ok, true);
  assert.equal(result.type, "ApprovalGranted");

  const state = getApprovalState("fixture-approval-A");
  assert.equal(state.status, "granted");
  assert.equal(state.decision, "grant");
  assert.equal(state.lastEventType, "ApprovalGranted");
  assert.equal(state.eventCount, 2);
});

console.log("\n--- Approval denied flow ---");

test("review rejected then approval denied", () => {
  requestReview("fixture-approval-B");
  rejectReview("fixture-approval-B");
  requestApproval("fixture-approval-B");

  const result = denyApproval("fixture-approval-B", { reason: "deny" });
  assert.equal(result.ok, true);
  assert.equal(result.type, "ApprovalDenied");

  const state = getApprovalState("fixture-approval-B");
  assert.equal(state.status, "denied");
  assert.equal(state.decision, "deny");
  assert.equal(state.lastEventType, "ApprovalDenied");
  assert.equal(state.eventCount, 2);
});

console.log("\n--- Illegal transitions ---");

test("cannot requestApproval when review not completed", () => {
  requestReview("fixture-approval-C");
  assert.throws(() => requestApproval("fixture-approval-C"), /review .* is not completed/);
});

test("cannot grant after granted", () => {
  assert.throws(() => grantApproval("fixture-approval-A"), /already granted/);
});

test("cannot deny after denied", () => {
  assert.throws(() => denyApproval("fixture-approval-B"), /already denied/);
});

test("cannot grant non-existent approval", () => {
  assert.throws(() => grantApproval("fixture-no-approval"), /no approval exists/);
});

console.log("\n--- Idempotency ---");

test("duplicate requestApproval is idempotent", () => {
  const r1 = requestApproval("fixture-approval-A");
  assert.equal(r1.ok, true);
  assert.equal(r1.duplicate, true);

  const events = loadApprovalEvents("fixture-approval-A");
  assert.equal(events.length, 2);
});

test("append-only event lines kept", () => {
  const raw = readFileSync(join(skillforgeDir, "approval-events.jsonl"), "utf8").trim();
  const lines = raw.split("\n").filter(Boolean);
  assert.equal(lines.length, 4);
});

console.log(`\nResult: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log("❌ FAIL");
  rmSync(fakeHome, { recursive: true, force: true });
  process.exit(1);
}
console.log("✅ PASS");
rmSync(fakeHome, { recursive: true, force: true });
