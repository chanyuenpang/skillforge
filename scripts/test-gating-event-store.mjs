import { strict as assert } from "node:assert";
import { existsSync, rmSync } from "node:fs";
import { homedir } from "node:os";

const base = `${homedir()}/.skillforge`;
for (const f of ["risk-store.jsonl", "review-events.jsonl", "approval-events.jsonl", "gating-events.jsonl"]) {
  const p = `${base}/${f}`;
  if (existsSync(p)) rmSync(p);
}

const { appendRiskFactObserved } = await import("../src/skillforge/risk-store.mjs");
const { requestReview, approveReview, rejectReview } = await import("../src/skillforge/review-store.mjs");
const { requestApproval, grantApproval, denyApproval } = await import("../src/skillforge/approval-store.mjs");
const { computeGatingDecision, getGatingState, loadGatingEvents } = await import("../src/skillforge/gating-store.mjs");

function t(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    console.error(`✗ ${name}`);
    throw e;
  }
}

function mkRisk(fixtureId, idk) {
  return appendRiskFactObserved({
    fixtureId,
    riskType: "contract",
    severity: "high",
    summary: `risk for ${fixtureId}`,
    observedAt: "2026-05-24T00:00:00.000Z",
    idempotencyKey: idk,
    evidenceRefs: ["ev:1"],
    sourceLinks: ["https://example.com"],
  });
}

mkRisk("fixture-gate-granted", "risk:granted");
requestReview("fixture-gate-granted");
approveReview("fixture-gate-granted");
requestApproval("fixture-gate-granted");
grantApproval("fixture-gate-granted", { reason: "ok" });

t("granted -> allow", () => {
  const r = computeGatingDecision("fixture-gate-granted");
  assert.equal(r.decision, "allow");
  assert.equal(r.reason, "approval-granted");
  const s = getGatingState("fixture-gate-granted");
  assert.equal(s?.decision, "allow");
});

mkRisk("fixture-gate-denied", "risk:denied");
requestReview("fixture-gate-denied");
rejectReview("fixture-gate-denied");
requestApproval("fixture-gate-denied");
denyApproval("fixture-gate-denied", { reason: "no" });

t("denied -> block", () => {
  const r = computeGatingDecision("fixture-gate-denied");
  assert.equal(r.decision, "block");
  assert.equal(r.reason, "approval-denied");
});

mkRisk("fixture-gate-pending", "risk:pending");
requestReview("fixture-gate-pending");
approveReview("fixture-gate-pending");
requestApproval("fixture-gate-pending");

t("approval not satisfied -> block", () => {
  const r = computeGatingDecision("fixture-gate-pending");
  assert.equal(r.decision, "block");
  assert.equal(r.reason, "approval-not-satisfied");
});

t("repeat compute is idempotent and stable", () => {
  const first = computeGatingDecision("fixture-gate-pending");
  const second = computeGatingDecision("fixture-gate-pending");
  assert.equal(second.duplicate, true);
  assert.equal(second.eventId, first.eventId);

  const events = loadGatingEvents("fixture-gate-pending");
  assert.equal(events.length, 1);
  assert.equal(events[0].decision, "block");

  const state = getGatingState("fixture-gate-pending");
  assert.equal(state?.decision, "block");
});

console.log("\nAll gating tests passed.");
