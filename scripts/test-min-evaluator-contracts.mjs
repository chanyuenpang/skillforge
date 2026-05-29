import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

function runPnpm(args) {
  return execFileSync("pnpm", ["--silent", ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function main() {
  const stdout = runPnpm(["validate:min-evaluator"]);
  let report;

  try {
    report = JSON.parse(stdout);
  } catch (error) {
    throw new assert.AssertionError({
      message: "validate:min-evaluator stdout must be valid JSON",
      actual: stdout,
      expected: "json",
      operator: "json-parse",
      stackStartFn: main,
    });
  }

  assert.equal(report.kind, "multi-fixture-validation-report", "kind drifted");
  assert.equal(report.status, "passed", "status drifted");
  assert.equal(report.summary?.passed, true, "summary.passed drifted");
  assert.equal(typeof report.summary?.totalFixtures, "number", "summary.totalFixtures must be number");
  assert.equal(Array.isArray(report.fixtures), true, "fixtures must be an array");

  console.log("Min evaluator output contract checks passed.");
}

main();
