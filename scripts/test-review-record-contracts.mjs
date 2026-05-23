import assert from "node:assert/strict";
import { createReviewRecord, validateReviewRecord } from "../src/skillforge/review-record.mjs";

function expectValid(record, message) {
  const result = validateReviewRecord(record);
  assert.equal(result.valid, true, message ?? JSON.stringify(result.errors));
}

function expectInvalid(record, field) {
  const result = validateReviewRecord(record);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.field === field), `expected ${field} error`);
}

const base = createReviewRecord("fixture-1", ["evidence:a"], ["https://example.com"]);
expectValid(base, "base record should validate");

expectInvalid({ ...base, status: "approved", decision: null }, "decision");
expectInvalid({ ...base, status: "ready", blockingReasons: ["missing_generate_evidence"] }, "blockingReasons");
expectInvalid({ ...base, status: "blocked", blockingReasons: [], decision: "approve" }, "decision");

expectValid({ ...base, status: "blocked", blockingReasons: ["missing_generate_evidence"], decision: null });
expectValid({ ...base, status: "approved", decision: "approve", blockingReasons: [] });
expectValid({ ...base, status: "rejected", decision: "reject", blockingReasons: [] });

console.log("review-record contract tests passed");
