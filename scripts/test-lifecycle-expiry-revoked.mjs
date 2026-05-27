import assert from "node:assert/strict";
import { rmSync, existsSync } from "node:fs";
import { homedir } from "node:os";

import { appendRiskFactObserved } from "../src/skillforge/risk-store.mjs";
import { requestReview, approveReview, getReviewState } from "../src/skillforge/review-store.mjs";
import { requestApproval, grantApproval, getApprovalState } from "../src/skillforge/approval-store.mjs";
import {
  issueGateDecisionFromApiEntry,
  issueGateDecisionFromManualEntry,
} from "../src/skillforge/gating-entry.mjs";

function resetStore() {
  const dir = `${homedir()}/.skillforge`;
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
}

function seedApprovedFlow(fixtureId) {
  appendRiskFactObserved({
    fixtureId,
    riskType: "lifecycle-fixture",
    severity: "high",
    summary: "seed approved flow",
    observedAt: new Date().toISOString(),
    idempotencyKey: fixtureId,
    metadata: {},
  });

  requestReview(fixtureId, {});
  approveReview(fixtureId, {});
  requestApproval(fixtureId, {});
}

function assertLifecycleBlocked(result, expectedCode) {
  assert.equal(result.ok, false);
  assert.equal(result.accepted, false);
  assert.equal(result.code, expectedCode);
  assert.match(result.message, /lifecycle/i);
}

function run() {
  resetStore();

  // 1) Expired: operations must be rejected, states unchanged
  {
    const fixtureId = `fx-expired-${Date.now()}`;
    seedApprovedFlow(fixtureId);

    const approvalBefore = getApprovalState(fixtureId);
    const reviewBefore = getReviewState(fixtureId);

    const grantRes = grantApproval(fixtureId, {
      metadata: { lifecycle: { expired: true } },
    });

    assert.equal(grantRes.ok, false);
    assert.equal(grantRes.code, "LIFECYCLE_EXPIRED");

    const approvalAfter = getApprovalState(fixtureId);
    const reviewAfter = getReviewState(fixtureId);
    assert.deepEqual(approvalAfter, approvalBefore);
    assert.deepEqual(reviewAfter, reviewBefore);
  }

  // 2) Revoked: operations must be rejected, states unchanged
  {
    const fixtureId = `fx-revoked-${Date.now()}`;
    seedApprovedFlow(fixtureId);

    const approvalBefore = getApprovalState(fixtureId);

    const grantRes = grantApproval(fixtureId, {
      metadata: { lifecycle: { revoked: true } },
    });

    assert.equal(grantRes.ok, false);
    assert.equal(grantRes.code, "LIFECYCLE_REVOKED");

    const approvalAfter = getApprovalState(fixtureId);
    assert.deepEqual(approvalAfter, approvalBefore);
  }

  // 3) Manual/API semantic consistency for same lifecycle exception
  {
    const fixtureId = `fx-gate-expired-${Date.now()}`;
    const payload = { fixtureId, lifecycle: { expired: true } };

    const manual = issueGateDecisionFromManualEntry(payload);
    const api = issueGateDecisionFromApiEntry(payload);

    assertLifecycleBlocked(manual, "LIFECYCLE_EXPIRED");
    assertLifecycleBlocked(api, "LIFECYCLE_EXPIRED");
    assert.equal(manual.message, api.message);
  }

  console.log("test-lifecycle-expiry-revoked passed");
}

run();
