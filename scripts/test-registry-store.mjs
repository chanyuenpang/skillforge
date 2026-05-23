import {
  createRegistryEntry,
} from "../src/skillforge/registry-entry.mjs";
import { createPublishPrep } from "../src/skillforge/publish-prep.mjs";
import { createReviewRecord } from "../src/skillforge/review-record.mjs";
import {
  save,
  loadById,
  list,
} from "../src/skillforge/registry-store.mjs";
import { existsSync, unlinkSync } from "node:fs";
import { homedir } from "node:os";

const STORE_PATH = `${homedir()}/.skillforge/registry-store.jsonl`;

let passed = 0;
let failed = 0;
function assert(cond, label) {
  if (cond) { passed++; console.log(`  PASS: ${label}`); }
  else { failed++; console.error(`  FAIL: ${label}`); }
}

// Clean slate: remove any previous test data
const storeDir = `${homedir()}/.skillforge`;
if (existsSync(STORE_PATH)) {
  unlinkSync(STORE_PATH);
}

// ---- Setup: create a valid registry-entry chain ----
const reviewRecord = createReviewRecord(
  "fixture-store-test",
  { generateRef: "gen-store", validateRef: "val-store" },
  ["ws.yaml"],
);
reviewRecord.status = "approved";
reviewRecord.decision = "approve";
reviewRecord.updatedAt = new Date().toISOString();

const publishPrep = createPublishPrep(reviewRecord);

const entry1 = createRegistryEntry(publishPrep, {
  registryId: "reg-001",
  version: "1.0.0",
  source: { type: "skillforge-fixture", location: "fixtures/fixture-store-test" },
  notes: ["persistence test entry 1"],
});

const entry2 = createRegistryEntry(publishPrep, {
  registryId: "reg-002",
  version: "2.0.0",
  source: { type: "skillforge-fixture", location: "fixtures/fixture-store-test" },
  initialStatus: "pending-publish",
  notes: ["persistence test entry 2"],
});

// ---- Test: save ----
const r1 = save(entry1);
assert(r1.ok === true, "save(entry1) returns ok");
assert(r1.fixtureId === "fixture-store-test", "save returns correct fixtureId");
assert(typeof r1.path === "string" && r1.path.length > 0, "save returns path");

const r2 = save(entry2);
assert(r2.ok === true, "save(entry2) returns ok");

// ---- Test: loadById returns latest ----
const loaded = loadById("fixture-store-test");
assert(loaded !== null, "loadById finds entry");
assert(loaded.kind === "registry-entry", "loaded entry has correct kind");
assert(loaded.fixtureId === "fixture-store-test", "loaded entry has correct fixtureId");
assert(loaded.registryId === "reg-002", "loadById returns the latest entry (reg-002)");
assert(loaded.registryMeta.status === "pending-publish", "loaded entry has updated status");

// ---- Test: loadById returns null for missing ----
const missing = loadById("non-existent-fixture");
assert(missing === null, "loadById returns null for unknown id");

// ---- Test: list returns all unique entries ----
const all = list();
assert(Array.isArray(all), "list returns an array");
assert(all.length === 1, "list returns 1 unique entry (same fixtureId deduplicated to latest)");
assert(all[0].registryId === "reg-002", "list deduplicates and returns latest");

// ---- Test: save throws on invalid entry ----
try {
  save({ kind: "not-registry-entry" });
  assert(false, "save throws for invalid entry");
} catch (e) {
  assert(e.message.includes("validation failed"), "save error mentions validation");
}

// ---- Test: multiple distinct fixtureIds ----
const reviewRecord2 = createReviewRecord(
  "fixture-second",
  { generateRef: "gen-2", validateRef: "val-2" },
  ["ws.yaml"],
);
reviewRecord2.status = "approved";
reviewRecord2.decision = "approve";
reviewRecord2.updatedAt = new Date().toISOString();
const publishPrep2 = createPublishPrep(reviewRecord2);
const entry3 = createRegistryEntry(publishPrep2, {
  registryId: "reg-003",
  version: "1.0.0",
  source: { type: "skillforge-fixture", location: "fixtures/fixture-second" },
  notes: ["second fixture"],
});
save(entry3);

const all2 = list();
assert(all2.length === 2, "list returns 2 entries with distinct fixtureIds");

const loaded2 = loadById("fixture-second");
assert(loaded2 !== null, "loadById finds second fixture");
assert(loaded2.registryId === "reg-003", "second fixture has correct registryId");

// ---- Summary ----
console.log(`\nRegistryStore test: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.log("❌ FAIL");
  process.exit(1);
} else {
  console.log("✅ PASS");
}
