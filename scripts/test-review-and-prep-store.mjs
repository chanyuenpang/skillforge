#!/usr/bin/env node
/**
 * test-review-and-prep-store.mjs — Validates review-store.mjs and prep-store.mjs
 *
 * Steps:
 *   1. Clean both stores
 *   2. Create a valid review-record, save it, load it, list it
 *   3. Create a publish-prep from that review, save it, load it, list it
 *
 * Usage:
 *   node scripts/test-review-and-prep-store.mjs
 */

import { existsSync, unlinkSync } from "node:fs";
import { homedir } from "node:os";
import { createReviewRecord, validateReviewRecord } from "../src/skillforge/review-record.mjs";
import { createPublishPrep, validatePublishPrep } from "../src/skillforge/publish-prep.mjs";
import { save as saveReview, loadById as loadReviewById, list as listReview } from "../src/skillforge/review-store.mjs";
import { save as savePrep, loadById as loadPrepById, list as listPrep } from "../src/skillforge/prep-store.mjs";

const STORE_FILES = [
  `${homedir()}/.skillforge/review-store.jsonl`,
  `${homedir()}/.skillforge/prep-store.jsonl`,
];

let passed = 0;
let failed = 0;

function assert(cond, label) {
  if (cond) { passed++; console.log(`  PASS: ${label}`); }
  else { failed++; console.error(`  FAIL: ${label}`); }
}

// ---- Step 0: Clean slate ----
for (const f of STORE_FILES) {
  if (existsSync(f)) unlinkSync(f);
}
console.log("Cleaned stores.\n");

// ---- Step 1: Review-record roundtrip ----
console.log("--- Review-store roundtrip ---");
const reviewRecord = createReviewRecord("test-review-1", ["ev1"], ["src.yaml"]);
reviewRecord.status = "approved";
reviewRecord.decision = "approve";
reviewRecord.updatedAt = new Date().toISOString();

const reviewCheck = validateReviewRecord(reviewRecord);
assert("review-record is valid", reviewCheck.valid);

const reviewSaved = saveReview(reviewRecord);
assert("review-store save returns ok", reviewSaved.ok);
assert("review-store save returns fixtureId", reviewSaved.fixtureId === "test-review-1");

const loadedReview = loadReviewById("test-review-1");
assert("review-store loadById returns entry", loadedReview !== null);
assert("review-store loadById fixtureId matches", loadedReview?.fixtureId === "test-review-1");
assert("review-store loadById kind matches", loadedReview?.kind === "review-record");

const allReviews = listReview();
assert("review-store list returns 1 entry", allReviews.length === 1);
assert("review-store list entry matches fixtureId", allReviews[0].fixtureId === "test-review-1");

// ---- Step 2: Publish-prep roundtrip ----
console.log("\n--- Prep-store roundtrip ---");
const publishPrep = createPublishPrep(reviewRecord, {
  staticValidationPassed: true,
  preflightPassed: true,
  reviewGatePassed: true,
});

const prepCheck = validatePublishPrep(publishPrep);
assert("publish-prep is valid", prepCheck.valid);

const prepSaved = savePrep(publishPrep);
assert("prep-store save returns ok", prepSaved.ok);
assert("prep-store save returns fixtureId", prepSaved.fixtureId === "test-review-1");

const loadedPrep = loadPrepById("test-review-1");
assert("prep-store loadById returns entry", loadedPrep !== null);
assert("prep-store loadById fixtureId matches", loadedPrep?.reviewRecordRef?.fixtureId === "test-review-1");
assert("prep-store loadById kind matches", loadedPrep?.kind === "publish-prep");

const allPreps = listPrep();
assert("prep-store list returns 1 entry", allPreps.length === 1);
assert("prep-store list entry matches fixtureId", allPreps[0]?.reviewRecordRef?.fixtureId === "test-review-1");

// ---- Summary ----
console.log(`\nResult: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log("❌ FAIL");
  process.exit(1);
} else {
  console.log("✅ PASS");
}
