import assert from "node:assert/strict";
import { createReviewRecord } from "../src/skillforge/review-record.mjs";
import { createPublishPrep, validatePublishPrep, HANDOFF_STATUS_VALUES } from "../src/skillforge/publish-prep.mjs";

function expectValid(record, message) {
  const result = validatePublishPrep(record);
  assert.equal(result.valid, true, message ?? JSON.stringify(result.errors));
}

function expectInvalid(record, field) {
  const result = validatePublishPrep(record);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.field === field), `expected error for field '${field}', got: ${JSON.stringify(result.errors.map(e => e.field))}`);
}

// --- Setup: an approved ReviewRecord as source ---
const approvedRecord = createReviewRecord("fixture-approve-1", ["evidence:static-ok", "evidence:preflight-ok"], ["https://example.com/source"]);
approvedRecord.status = "approved";
approvedRecord.decision = "approve";
approvedRecord.updatedAt = new Date().toISOString();

// --- 1. Happy path: approved record produces valid PublishPrep ---
const prep = createPublishPrep(approvedRecord);
expectValid(prep, "base publish-prep from approved record should validate");

// Verify structural boundaries: readiness, provenance, handoffMeta
assert.equal(prep.kind, "publish-prep");
assert.equal(prep.readiness.reviewGatePassed, true);
assert.equal(prep.readiness.overall, "ready");
assert.equal(prep.handoffMeta.status, "pending");
assert.ok(prep.provenance.evidenceRefs.length >= 2, "should carry evidence from review record");
assert.ok(prep.provenance.sourceLinks.length >= 1, "should carry source links from review record");
assert.ok(prep.provenance.preparedAt, "preparedAt should be set");

// Verify approved != publish complete
assert.equal(prep.handoffMeta.status, "pending", "approved/publish-prep must start as pending, not complete");
assert.equal(prep.readiness.overall, "ready", "readiness overall is 'ready', not 'handed-off'");

// --- 2. Rejects non-approved review records ---
const idleRecord = createReviewRecord("fixture-idle-1");
assert.throws(() => createPublishPrep(idleRecord), /reviewRecord status must be 'approved'/);

const rejectedRecord = createReviewRecord("fixture-rejected-1");
rejectedRecord.status = "rejected";
rejectedRecord.decision = "reject";
rejectedRecord.updatedAt = new Date().toISOString();
assert.throws(() => createPublishPrep(rejectedRecord), /reviewRecord status must be 'approved'/);

// Approved but wrong decision
const approvedHoldRecord = createReviewRecord("fixture-hold-1");
approvedHoldRecord.status = "approved";
approvedHoldRecord.decision = "hold";
approvedHoldRecord.updatedAt = new Date().toISOString();
assert.throws(() => createPublishPrep(approvedHoldRecord), /reviewRecord decision must be 'approve'/);

// --- 3. Validation rejects malformed objects ---
expectInvalid({}, "kind");
expectInvalid({ kind: "publish-prep" }, "reviewRecordRef");
expectInvalid({ kind: "publish-prep", reviewRecordRef: {}, readiness: {} }, "reviewRecordRef.fixtureId");

// Missing readiness
expectInvalid({ kind: "publish-prep", reviewRecordRef: { fixtureId: "x", reviewStatus: "approved", reviewDecision: "approve" } }, "readiness");

// Missing provenance
const hasGoodRef = { kind: "publish-prep", reviewRecordRef: { fixtureId: "x", reviewStatus: "approved", reviewDecision: "approve" }, readiness: { staticValidationPassed: true, preflightPassed: true, reviewGatePassed: true, overall: "ready", blockingReasons: [] } };
expectInvalid(hasGoodRef, "provenance");

// --- 4. Readiness aggregation with blocking inputs ---
const blockedPrep = createPublishPrep(approvedRecord, { staticValidationPassed: false, preflightPassed: false });
assert.equal(blockedPrep.readiness.overall, "failed");
assert.ok(blockedPrep.readiness.blockingReasons.length > 0, "should report blocking reasons");
expectValid(blockedPrep, "even blocked readiness should produce a structurally valid publish-prep");

// --- 5. HandoffMeta status transitions ---
assert.ok(HANDOFF_STATUS_VALUES.has("pending"), "pending is valid");
assert.ok(HANDOFF_STATUS_VALUES.has("in-progress"), "in-progress is valid");
assert.ok(HANDOFF_STATUS_VALUES.has("ready"), "ready is valid");
assert.ok(HANDOFF_STATUS_VALUES.has("handed-off"), "handed-off is valid");
assert.ok(HANDOFF_STATUS_VALUES.has("failed"), "failed is valid");

// --- 6. Provenance extends with external inputs ---
const enhancedPrep = createPublishPrep(approvedRecord, {}, {
  evidenceRefs: ["evidence:external-audit"],
  sourceLinks: ["https://audit.example.com/report"],
});
assert.ok(enhancedPrep.provenance.evidenceRefs.length >= 3, "should merge external evidence refs");
assert.ok(enhancedPrep.provenance.sourceLinks.length >= 2, "should merge external source links");

console.log("publish-prep contract tests passed");
