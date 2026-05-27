import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const fakeHome = mkdtempSync(join(tmpdir(), "workflow-kit-risk-store-"));
process.env.HOME = fakeHome;

const { appendRiskFactObserved, loadEventsByFixtureId } = await import("../src/skillforge/risk-store.mjs");

try {
  const okInput = {
    idempotencyKey: "idem-risk-001",
    fixtureId: "fixture-risk-A",
    riskType: "policy_violation",
    severity: "high",
    summary: "contains disallowed operation",
    observedAt: "2026-05-24T05:00:00.000Z",
    evidenceRefs: ["ev:001"],
    sourceLinks: ["https://example.test/evidence/1"],
    metadata: { actor: "validator" },
  };

  const first = appendRiskFactObserved(okInput);
  assert.equal(first.ok, true);
  assert.equal(first.duplicate, false);

  const events = loadEventsByFixtureId("fixture-risk-A");
  assert.equal(events.length, 1);
  assert.equal(events[0].type, "RiskFactObserved");
  assert.equal(events[0].idempotencyKey, "idem-risk-001");

  assert.throws(
    () =>
      appendRiskFactObserved({
        fixtureId: "fixture-risk-A",
        riskType: "policy_violation",
        severity: "high",
        summary: "missing key",
      }),
    /idempotencyKey: is required/
  );

  const replay = appendRiskFactObserved(okInput);
  assert.equal(replay.ok, true);
  assert.equal(replay.duplicate, true);
  assert.equal(replay.eventId, first.eventId);

  const storeRaw = readFileSync(first.path, "utf8").trim();
  const lines = storeRaw ? storeRaw.split("\n") : [];
  assert.equal(lines.length, 1);

  console.log("test-risk-store-contracts: ok");
} finally {
  rmSync(fakeHome, { recursive: true, force: true });
}
