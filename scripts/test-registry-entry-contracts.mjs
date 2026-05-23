import {
  REGISTRY_STATUS_VALUES,
  createRegistryEntry,
  validateRegistryEntry,
} from "../src/skillforge/registry-entry.mjs";
import { createPublishPrep } from "../src/skillforge/publish-prep.mjs";
import { createReviewRecord } from "../src/skillforge/review-record.mjs";

let passed = 0;
let failed = 0;
function assert(cond, label) {
  if (cond) { passed++; console.log(`  PASS: ${label}`); }
  else { failed++; console.error(`  FAIL: ${label}`); }
}

// ---- Constants ----
assert(REGISTRY_STATUS_VALUES instanceof Set, "REGISTRY_STATUS_VALUES is a Set");
assert(REGISTRY_STATUS_VALUES.has("registered"), "has registered");
assert(REGISTRY_STATUS_VALUES.has("pending-publish"), "has pending-publish");
assert(REGISTRY_STATUS_VALUES.has("failed"), "has failed");
assert(!REGISTRY_STATUS_VALUES.has("published"), "published is excluded");

// ---- Happy path ----
const reviewRecord = createReviewRecord(
  "fixture-1",
  { generateRef: "gen-1", validateRef: "val-1" },
  ["ws.yaml"],
);
reviewRecord.status = "approved";
reviewRecord.decision = "approve";
reviewRecord.updatedAt = new Date().toISOString();

const publishPrep = createPublishPrep(reviewRecord);

const entry = createRegistryEntry(publishPrep, {
  registryId: "reg-1",
  version: "1.0.0",
  source: { type: "skillforge-fixture", location: "fixtures/fixture-1" },
  notes: ["first entry"],
});
assert(entry.kind === "registry-entry", "kind is registry-entry");
assert(entry.fixtureId === "fixture-1", "fixtureId propagated");
assert(entry.publishPrepRef === "fixture-1", "publishPrepRef points to fixtureId");
assert(entry.registryMeta.status === "registered", "initial status is registered");
assert(entry.reviewDecision.decision === "approve", "reviewDecision preserved");
assert(entry.reviewDecision.reviewRef === "fixture-1", "reviewRef preserved");
assert(entry.provenance.chain.length > 0, "provenance chain is non-empty");
assert(entry.registryMeta.status !== "published", "status is not published");

// ---- Validate happy path ----
const vr1 = validateRegistryEntry(entry);
assert(vr1.valid === true, "validate happy path returns valid");

// ---- Gate: non-publish-prep throws ----
try {
  createRegistryEntry({ kind: "not-publish-prep" });
  assert(false, "should have thrown for non-publish-prep");
} catch (e) {
  assert(e.message.includes("publish-prep"), "throws for non-publish-prep");
}

// ---- Gate: null publish-prep throws ----
try {
  createRegistryEntry(null);
  assert(false, "should have thrown for null");
} catch (e) {
  assert(e.message.includes("object"), "throws for null");
}

// ---- Validate: missing kind ----
const vr2 = validateRegistryEntry({});
assert(vr2.valid === false, "empty object is invalid");

// ---- Validate: missing fixtureId ----
const vr3 = validateRegistryEntry({ kind: "registry-entry" });
assert(vr3.valid === false, "missing fixtureId is invalid");

// ---- Validate: missing source ----
const vr4 = validateRegistryEntry({ kind: "registry-entry", fixtureId: "f1" });
assert(vr4.valid === false, "missing source is invalid");

// ---- Validate: missing publishPrepRef ----
const vr5 = validateRegistryEntry({
  kind: "registry-entry",
  fixtureId: "f1",
  source: { type: "skillforge-fixture" },
  reviewDecision: { decision: "approve", reviewRef: "r1", evidenceRefs: [] },
  provenance: { chain: ["r1"] },
  registryMeta: { status: "registered", registeredAt: new Date().toISOString() },
});
assert(vr5.valid === false, "missing publishPrepRef is invalid");

// ---- Validate: published status rejected ----
const vr6 = validateRegistryEntry({
  kind: "registry-entry",
  fixtureId: "f1",
  source: { type: "skillforge-fixture" },
  reviewDecision: { decision: "approve", reviewRef: "r1", evidenceRefs: [] },
  publishPrepRef: "f1",
  provenance: { chain: ["r1"] },
  registryMeta: { status: "published", registeredAt: new Date().toISOString() },
});
assert(vr6.valid === false, "published status is rejected");

// ---- Default status fallback ----
const entry2 = createRegistryEntry(publishPrep, { initialStatus: "published" });
assert(entry2.registryMeta.status === "registered", "invalid initialStatus falls back to registered");

const entry3 = createRegistryEntry(publishPrep, { initialStatus: "failed" });
assert(entry3.registryMeta.status === "failed", "valid initialStatus 'failed' accepted");

const entry4 = createRegistryEntry(publishPrep, { initialStatus: "pending-publish" });
assert(entry4.registryMeta.status === "pending-publish", "valid initialStatus 'pending-publish' accepted");

// ---- Summary ----
console.log(`\nRegistryEntry contract tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
