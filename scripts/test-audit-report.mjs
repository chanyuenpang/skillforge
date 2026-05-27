#!/usr/bin/env node
/**
 * test-audit-report.mjs — Slice E: audit/report projection tests
 *
 * Coverage:
 *   1. Pass flow: risk → review approved → approval granted → gating allow → report/timeline readable
 *   2. Reject flow: risk → review rejected → approval denied → gating block → report/timeline readable
 *   3. Timeline chronological ordering
 *   4. Cross-stage references present in timeline
 *   5. Report summary fields match actual state
 *   6. Report integrity validation
 *   7. No regression on A/B/C/D stores (append-only, no writes from report)
 */

import assert from "node:assert/strict";
import { mkdtempSync, rmSync, appendFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const fakeHome = mkdtempSync(join(tmpdir(), "workflow-kit-audit-report-"));
process.env.HOME = fakeHome;

const skillforgeDir = join(fakeHome, ".skillforge");
mkdirSync(skillforgeDir, { recursive: true });

// ── Seed helpers ───────────────────────────────────────────────────────────

function seedRisk(fixtureId, idemKey) {
  const riskEvent = {
    kind: "risk-event",
    type: "RiskFactObserved",
    eventId: `${fixtureId}:${idemKey}`,
    idempotencyKey: idemKey,
    fixtureId,
    riskType: "policy_violation",
    severity: "high",
    summary: `risk fact for ${fixtureId}`,
    observedAt: "2026-05-24T00:00:00.000Z",
    evidenceRefs: ["ev:risk-1"],
    sourceLinks: ["https://example.test/risk/1"],
    metadata: { source: "test-audit" },
    recordedAt: "2026-05-24T01:00:00.000Z",
    payload: {},
  };
  appendFileSync(
    join(skillforgeDir, "risk-store.jsonl"),
    JSON.stringify(riskEvent) + "\n",
    "utf8"
  );
}

function seedReviewEvent(fixtureId, type, overrides = {}) {
  const event = {
    kind: "review-event",
    type,
    fixtureId,
    eventId: `${fixtureId}:review-${type}-${Date.now() + Math.random()}`,
    recordedAt: overrides.recordedAt ?? new Date().toISOString(),
    status: overrides.status,
    decision: overrides.decision,
    metadata: overrides.metadata ?? {},
  };
  if (overrides.eventId) event.eventId = overrides.eventId;
  appendFileSync(
    join(skillforgeDir, "review-events.jsonl"),
    JSON.stringify(event) + "\n",
    "utf8"
  );
  return event.eventId;
}

function seedApprovalEvent(fixtureId, type, overrides = {}) {
  const event = {
    kind: "approval-event",
    type,
    fixtureId,
    eventId: `${fixtureId}:approval-${type}-${Date.now() + Math.random()}`,
    recordedAt: overrides.recordedAt ?? new Date().toISOString(),
    status: overrides.status,
    decision: overrides.decision,
    reviewEventRef: overrides.reviewEventRef,
    metadata: overrides.metadata ?? {},
  };
  if (overrides.eventId) event.eventId = overrides.eventId;
  appendFileSync(
    join(skillforgeDir, "approval-events.jsonl"),
    JSON.stringify(event) + "\n",
    "utf8"
  );
  return event.eventId;
}

function seedGatingEvent(fixtureId, overrides = {}) {
  const event = {
    kind: "gating-event",
    type: "GateDecisionIssued",
    fixtureId,
    eventId: `${fixtureId}:gate-${Date.now() + Math.random()}`,
    recordedAt: overrides.recordedAt ?? new Date().toISOString(),
    decision: overrides.decision ?? "allow",
    reason: overrides.reason ?? "test reason",
    decidedAt: overrides.recordedAt ?? new Date().toISOString(),
  };
  appendFileSync(
    join(skillforgeDir, "gating-events.jsonl"),
    JSON.stringify(event) + "\n",
    "utf8"
  );
  return event.eventId;
}

// ── Build test fixture data ────────────────────────────────────────────────

// Flow 1: PASS (approve → grant → allow)
seedRisk("fixture-pass", "risk-pass");
const passReviewApprovedEventId = seedReviewEvent("fixture-pass", "ReviewRequested", {
  status: "ready",
  recordedAt: "2026-05-24T02:00:00.000Z",
});
seedReviewEvent("fixture-pass", "ReviewApproved", {
  status: "approved",
  decision: "approve",
  recordedAt: "2026-05-24T03:00:00.000Z",
});
seedApprovalEvent("fixture-pass", "ApprovalRequested", {
  status: "pending",
  reviewEventRef: passReviewApprovedEventId,
  recordedAt: "2026-05-24T04:00:00.000Z",
});
seedApprovalEvent("fixture-pass", "ApprovalGranted", {
  status: "granted",
  decision: "grant",
  reviewEventRef: passReviewApprovedEventId,
  recordedAt: "2026-05-24T05:00:00.000Z",
});
seedGatingEvent("fixture-pass", {
  decision: "allow",
  reason: "approval-granted",
  recordedAt: "2026-05-24T06:00:00.000Z",
});

// Flow 2: REJECT (reject → deny → block)
seedRisk("fixture-reject", "risk-reject");
const rejectReviewEventId = seedReviewEvent("fixture-reject", "ReviewRequested", {
  status: "ready",
  recordedAt: "2026-05-24T02:00:00.000Z",
});
seedReviewEvent("fixture-reject", "ReviewRejected", {
  status: "rejected",
  decision: "reject",
  recordedAt: "2026-05-24T03:00:00.000Z",
});
seedApprovalEvent("fixture-reject", "ApprovalRequested", {
  status: "pending",
  reviewEventRef: rejectReviewEventId,
  recordedAt: "2026-05-24T04:00:00.000Z",
});
seedApprovalEvent("fixture-reject", "ApprovalDenied", {
  status: "denied",
  decision: "deny",
  reviewEventRef: rejectReviewEventId,
  recordedAt: "2026-05-24T05:00:00.000Z",
});
seedGatingEvent("fixture-reject", {
  decision: "block",
  reason: "approval-denied",
  recordedAt: "2026-05-24T06:00:00.000Z",
});

// ── Import module under test ───────────────────────────────────────────────

const {
  generateReport,
  getAuditTimeline,
  validateReportIntegrity,
} = await import("../src/skillforge/audit-report.mjs");

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

// ── 1. Pass flow: risk → review approved → approval granted → gating allow ─
console.log("--- Pass flow (approve → grant → allow) ---");

test("generateReport returns correct fixtureId", () => {
  const report = generateReport("fixture-pass");
  assert.equal(report.fixtureId, "fixture-pass");
  assert.ok(typeof report.generatedAt === "string");
});

test("riskFact summary is present", () => {
  const report = generateReport("fixture-pass");
  assert.ok(report.riskFact !== null);
  assert.equal(report.riskFact.riskType, "policy_violation");
  assert.equal(report.riskFact.severity, "high");
  assert.equal(report.riskFact.eventCount, 1);
});

test("review shows approved", () => {
  const report = generateReport("fixture-pass");
  assert.ok(report.review !== null);
  assert.equal(report.review.status, "approved");
  assert.equal(report.review.decision, "approve");
  assert.equal(report.review.lastEventType, "ReviewApproved");
  assert.equal(report.review.eventCount, 2);
});

test("approval shows granted", () => {
  const report = generateReport("fixture-pass");
  assert.ok(report.approval !== null);
  assert.equal(report.approval.status, "granted");
  assert.equal(report.approval.decision, "grant");
  assert.equal(report.approval.lastEventType, "ApprovalGranted");
  assert.equal(report.approval.eventCount, 2);
});

test("gating shows allow", () => {
  const report = generateReport("fixture-pass");
  assert.ok(report.gating !== null);
  assert.equal(report.gating.decision, "allow");
  assert.equal(report.gating.reason, "approval-granted");
  assert.equal(report.gating.eventCount, 1);
});

test("timeline has all stages in order", () => {
  const report = generateReport("fixture-pass");
  assert.equal(report.timeline.length, 6);

  const stages = report.timeline.map((e) => e.stage);
  assert.deepEqual(stages, ["risk", "review", "review", "approval", "approval", "gating"]);

  const types = report.timeline.map((e) => e.eventType);
  assert.deepEqual(types, [
    "RiskFactObserved",
    "ReviewRequested",
    "ReviewApproved",
    "ApprovalRequested",
    "ApprovalGranted",
    "GateDecisionIssued",
  ]);
});

test("timeline is chronologically sorted", () => {
  const report = generateReport("fixture-pass");
  let lastTime = null;
  for (const entry of report.timeline) {
    if (lastTime) {
      assert.ok(
        new Date(entry.recordedAt) >= new Date(lastTime),
        `expected ${entry.recordedAt} >= ${lastTime}`
      );
    }
    lastTime = entry.recordedAt;
  }
});

test("pass timeline detail has key fields", () => {
  const report = generateReport("fixture-pass");

  const riskEntry = report.timeline[0];
  assert.equal(riskEntry.stage, "risk");
  assert.equal(riskEntry.detail.riskType, "policy_violation");
  assert.equal(riskEntry.detail.severity, "high");

  const reviewApprovedEntry = report.timeline[2];
  assert.equal(reviewApprovedEntry.detail.decision, "approve");

  const approvalGrantedEntry = report.timeline[4];
  assert.equal(approvalGrantedEntry.detail.decision, "grant");

  const gatingEntry = report.timeline[5];
  assert.equal(gatingEntry.detail.decision, "allow");
});

// ── 2. Reject flow: risk → review rejected → approval denied → gating block ─
console.log("\n--- Reject flow (reject → deny → block) ---");

test("review shows rejected", () => {
  const report = generateReport("fixture-reject");
  assert.ok(report.review !== null);
  assert.equal(report.review.status, "rejected");
  assert.equal(report.review.decision, "reject");
  assert.equal(report.review.lastEventType, "ReviewRejected");
});

test("approval shows denied", () => {
  const report = generateReport("fixture-reject");
  assert.ok(report.approval !== null);
  assert.equal(report.approval.status, "denied");
  assert.equal(report.approval.decision, "deny");
  assert.equal(report.approval.lastEventType, "ApprovalDenied");
});

test("gating shows block", () => {
  const report = generateReport("fixture-reject");
  assert.ok(report.gating !== null);
  assert.equal(report.gating.decision, "block");
  assert.equal(report.gating.reason, "approval-denied");
});

test("reject timeline has correct stage progression", () => {
  const report = generateReport("fixture-reject");
  const stages = report.timeline.map((e) => e.stage);
  assert.deepEqual(stages, ["risk", "review", "review", "approval", "approval", "gating"]);

  const types = report.timeline.map((e) => e.eventType);
  assert.deepEqual(types, [
    "RiskFactObserved",
    "ReviewRequested",
    "ReviewRejected",
    "ApprovalRequested",
    "ApprovalDenied",
    "GateDecisionIssued",
  ]);
});

test("reject timeline has correct decisions", () => {
  const report = generateReport("fixture-reject");
  assert.equal(report.timeline[2].detail.decision, "reject");
  assert.equal(report.timeline[4].detail.decision, "deny");
  assert.equal(report.timeline[5].detail.decision, "block");
});

// ── 3. Integrity validation ────────────────────────────────────────────────
console.log("\n--- Report integrity validation ---");

test("validateReportIntegrity passes for valid pass report", () => {
  const report = generateReport("fixture-pass");
  const result = validateReportIntegrity(report);
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
});

test("validateReportIntegrity passes for valid reject report", () => {
  const report = generateReport("fixture-reject");
  const result = validateReportIntegrity(report);
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
});

test("validateReportIntegrity detects out-of-order timeline", () => {
  const badReport = {
    fixtureId: "test",
    generatedAt: new Date().toISOString(),
    riskFact: null,
    review: null,
    approval: null,
    gating: null,
    timeline: [
      { stage: "review", eventType: "ReviewApproved", eventId: "id:1", recordedAt: "2026-01-01T02:00:00Z", detail: {} },
      { stage: "risk", eventType: "RiskFactObserved", eventId: "id:2", recordedAt: "2026-01-01T01:00:00Z", detail: {} },
    ],
  };
  const result = validateReportIntegrity(badReport);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("out of order")));
});

test("validateReportIntegrity detects review without risk", () => {
  const badReport = {
    fixtureId: "test",
    generatedAt: new Date().toISOString(),
    riskFact: null,
    review: null,
    approval: null,
    gating: null,
    timeline: [
      { stage: "review", eventType: "ReviewRequested", eventId: "id:1", recordedAt: "2026-01-01T01:00:00Z", detail: {} },
    ],
  };
  const result = validateReportIntegrity(badReport);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("review exists but no risk")));
});

test("validateReportIntegrity rejects non-object report", () => {
  const result = validateReportIntegrity(null);
  assert.equal(result.valid, false);
});

// ── 4. getAuditTimeline standalone query ────────────────────────────────────
console.log("\n--- getAuditTimeline standalone query ---");

test("getAuditTimeline returns same as report.timeline", () => {
  const report = generateReport("fixture-pass");
  const timeline = getAuditTimeline("fixture-pass");
  assert.deepEqual(timeline, report.timeline);
});

test("getAuditTimeline returns empty for unknown fixture", () => {
  const timeline = getAuditTimeline("fixture-unknown");
  assert.ok(Array.isArray(timeline));
  assert.equal(timeline.length, 0);
});

// ── 5. Edge cases ──────────────────────────────────────────────────────────
console.log("\n--- Edge cases ---");

test("report for fixture with only risk fact", () => {
  seedRisk("fixture-risk-only", "risk-only");
  const report = generateReport("fixture-risk-only");
  assert.ok(report.riskFact !== null);
  assert.equal(report.review, null);
  assert.equal(report.approval, null);
  assert.equal(report.gating, null);
  assert.equal(report.timeline.length, 1);
  assert.equal(report.timeline[0].stage, "risk");
});

test("report for unknown fixture returns empty summary", () => {
  const report = generateReport("fixture-nonexistent");
  assert.equal(report.fixtureId, "fixture-nonexistent");
  assert.equal(report.riskFact, null);
  assert.equal(report.review, null);
  assert.equal(report.approval, null);
  assert.equal(report.gating, null);
  assert.equal(report.timeline.length, 0);
});

// ── 6. No regression: A/B/C/D stores untouched by report ────────────────────
console.log("\n--- No regression: stores are read-only ---");

test("risk store not mutated by report generation", () => {
  const before = readFileSync(join(skillforgeDir, "risk-store.jsonl"), "utf8");
  const report = generateReport("fixture-pass");
  const after = readFileSync(join(skillforgeDir, "risk-store.jsonl"), "utf8");
  assert.equal(after, before, "risk store should be unchanged");
});

test("review store not mutated by report generation", () => {
  const path = join(skillforgeDir, "review-events.jsonl");
  const before = readFileSync(path, "utf8");
  generateReport("fixture-reject");
  const after = readFileSync(path, "utf8");
  assert.equal(after, before, "review store should be unchanged");
});

test("approval store not mutated by report generation", () => {
  const path = join(skillforgeDir, "approval-events.jsonl");
  const before = readFileSync(path, "utf8");
  generateReport("fixture-pass");
  generateReport("fixture-reject");
  const after = readFileSync(path, "utf8");
  assert.equal(after, before, "approval store should be unchanged");
});

test("gating store not mutated by report generation", () => {
  const path = join(skillforgeDir, "gating-events.jsonl");
  const before = readFileSync(path, "utf8");
  generateReport("fixture-pass");
  generateReport("fixture-reject");
  const after = readFileSync(path, "utf8");
  assert.equal(after, before, "gating store should be unchanged");
});

// ── Summary ────────────────────────────────────────────────────────────────
console.log(`\nResult: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log("❌ FAIL");
  rmSync(fakeHome, { recursive: true, force: true });
  process.exit(1);
}
console.log("✅ PASS");
rmSync(fakeHome, { recursive: true, force: true });
