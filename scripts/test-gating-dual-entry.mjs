import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const fakeHome = mkdtempSync(join(tmpdir(), "skillforge-gating-dual-entry-"));
process.env.HOME = fakeHome;

const { appendRiskFactObserved } = await import("../src/skillforge/risk-store.mjs");
const { issueGateDecisionFromManualEntry, issueGateDecisionFromApiEntry } = await import(
  "../src/skillforge/gating-entry.mjs"
);

function testSameSuccessSemantics() {
  const fixtureId = `fixture-${randomUUID()}`;
  appendRiskFactObserved({
    fixtureId,
    riskType: "data-loss",
    severity: "high",
    summary: "dual entry success semantics",
    idempotencyKey: `risk-${fixtureId}`,
  });

  const manual = issueGateDecisionFromManualEntry({ fixtureId });
  const api = issueGateDecisionFromApiEntry({ fixtureId });

  assert.equal(manual.ok, true);
  assert.equal(api.ok, true);
  assert.equal(manual.accepted, true);
  assert.equal(api.accepted, true);
  assert.equal(manual.decision, api.decision);
  assert.equal(manual.reason, api.reason);
}

function testSameRejectSemantics() {
  const manual = issueGateDecisionFromManualEntry({ fixtureId: "  " });
  const api = issueGateDecisionFromApiEntry({ fixtureId: "" });

  assert.equal(manual.ok, false);
  assert.equal(api.ok, false);
  assert.equal(manual.accepted, false);
  assert.equal(api.accepted, false);
  assert.equal(manual.code, "INVALID_INPUT");
  assert.equal(api.code, "INVALID_INPUT");
  assert.equal(manual.message, api.message);
}

testSameSuccessSemantics();
testSameRejectSemantics();

console.log("test-gating-dual-entry: ok");
