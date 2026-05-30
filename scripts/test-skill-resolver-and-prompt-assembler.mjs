#!/usr/bin/env node
// ── Test: Skill Resolver + Prompt Assembler ────────────────────────────────
//
// Covers:
//   - Empty input → default fallback
//   - Duplicate skill hints → deduplication
//   - Conflicting skills → priority-based conflict resolution
//   - Default fallback when nothing matches
//   - Stable sort ordering
//   - Prompt output structure validation
//   - Input immutability
//   - Explicit skills path
//   - Transitive requires

import { resolveSkills } from "../src/skillforge/skill-resolver.mjs";
import { assemblePrompt } from "../src/skillforge/prompt-assembler.mjs";
import { ASSEMBLED_PROMPT_KIND, validateAssembledPrompt } from "../src/skillforge/prompt-assembler.mjs";

const CONFLICT_STATUS_VALUES = Object.freeze([
  "no-conflict",
  "conflict-resolved-by-priority",
  "conflict-deduped",
]);

function validateResolvedSkillRecord(record) {
  const errors = [];
  const isObject = Boolean(record) && typeof record === "object" && !Array.isArray(record);

  if (!isObject) {
    errors.push({ field: "$", message: "must be an object" });
    return { valid: false, errors };
  }

  if (record.kind !== "resolved-skill-result") {
    errors.push({ field: "kind", message: `expected "resolved-skill-result", got "${record.kind}"` });
  }

  if (!CONFLICT_STATUS_VALUES.includes(record.conflictStatus)) {
    errors.push({ field: "conflictStatus", message: `must be one of ${CONFLICT_STATUS_VALUES.join(", ")}` });
  }

  if (typeof record.priority !== "number") {
    errors.push({ field: "priority", message: "must be a number" });
  }

  if (typeof record.isDefault !== "boolean") {
    errors.push({ field: "isDefault", message: "must be a boolean" });
  }

  if (!Array.isArray(record.promptTexts)) {
    errors.push({ field: "promptTexts", message: "must be an array" });
  }

  return { valid: errors.length === 0, errors };
}

// ─┬─ Test utilities ─────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.error(`  ❌ ${label}`);
  }
}

function assertEqual(actual, expected, label) {
  const result = actual === expected;
  if (result) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.error(`  ❌ ${label}`);
    console.error(`     expected: ${JSON.stringify(expected)}`);
    console.error(`     actual:   ${JSON.stringify(actual)}`);
  }
}

function assertDeepEqual(actual, expected, label) {
  const result = JSON.stringify(actual) === JSON.stringify(expected);
  if (result) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.error(`  ❌ ${label}`);
    console.error(`     expected: ${JSON.stringify(expected)}`);
    console.error(`     actual:   ${JSON.stringify(actual)}`);
  }
}

function section(title) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${"═".repeat(60)}`);
}

// ─┬─ Test 1: Empty input → Default fallback ────────────────────────────────

section("Test 1: Empty input — should fall back to default-general");

{
  const result = resolveSkills({ context: {} });

  assert(result.resolvedSkills.length > 0, "resolvedSkills is non-empty");
  assert(result.resolvedSkills.length === 1, "exactly one skill resolved for empty input");
  assert(
    result.resolvedSkills[0]?.skillId === "default-general",
    "resolved skill is default-general",
  );
  assert(result.resolvedSkills[0]?.isDefault === true, "resolved skill is marked as default");
  assert(
    result.conflictSummary.defaultFallbackApplied === true,
    "defaultFallbackApplied is true",
  );
}

// ─┬─ Test 2: Duplicate skill hints → dedup ─────────────────────────────────

section("Test 2: Duplicate hints — should deduplicate");

{
  const context = {
    tags: ["code", "code", "develop", "build", "develop"],
    intent: "write some code and build it",
  };

  const result = resolveSkills({ context });

  // "coding" should appear only once
  const codingCount = result.resolvedSkills.filter((s) => s.skillId === "coding").length;
  assert(codingCount === 1, "coding skill appears exactly once (dedup)");

  // Second run with same input should produce identical output (stability)
  const result2 = resolveSkills({ context });
  assertDeepEqual(result.resolvedSkills, result2.resolvedSkills, "same input → same output (stable)");
}

// ─┬─ Test 3: Conflict resolution (coding vs summarizing) ───────────────────

section("Test 3: Conflicting skills (coding vs summarizing)");

{
  const context = {
    tags: ["code", "summarize", "develop", "summary"],
    intent: "write code and summarize results",
  };

  const result = resolveSkills({ context });

  // coding (priority 1) and summarizing (priority 4) conflict.
  // coding has higher priority (lower number) → coding wins.
  const hasCoding = result.resolvedSkills.some((s) => s.skillId === "coding");
  const hasSummarizing = result.resolvedSkills.some((s) => s.skillId === "summarizing");

  assert(hasCoding, "coding skill present (higher priority wins)");
  assert(!hasSummarizing, "summarizing skill removed (lower priority loses)");

  // coding should have conflictStatus = "conflict-resolved-by-priority"
  const codingRecord = result.resolvedSkills.find((s) => s.skillId === "coding");
  assert(
    codingRecord?.conflictStatus === "conflict-resolved-by-priority",
    `coding has conflict-resolved-by-priority status (got: ${codingRecord?.conflictStatus})`,
  );

  assert(result.conflictSummary.conflictsDetected === true, "conflictsDetected is true");
}

// ─┬─ Test 4: Default fallback when nothing matches ─────────────────────────

section("Test 4: No matching skills → default fallback");

{
  const context = {
    tags: ["xyz_unknown_tag", "abc_nonexistent"],
    intent: "do something nobody has ever heard of",
  };

  const result = resolveSkills({ context });

  assert(result.resolvedSkills.length === 1, "exactly one fallback skill");
  assert(result.resolvedSkills[0]?.skillId === "default-general", "fallback is default-general");
  assert(result.resolvedSkills[0]?.isDefault === true, "fallback is marked as default");
}

// ─┬─ Test 5: Stable sort ordering ──────────────────────────────────────────

section("Test 5: Stable sort — same-priority skills ordered by name");

{
  // debugging (priority 2) and reviewing (priority 3) — different priorities,
  // should order by priority first
  const context = {
    tags: ["debug", "review", "evaluate"],
    intent: "debug and review",
  };

  const result = resolveSkills({ context });
  const skillIds = result.resolvedSkills.map((s) => s.skillId);

  // Coding should be first (priority 1, pulled via transitive require from debugging)
  assert(skillIds[0] === "coding", "first skill is coding (priority 1, transitive require)");
  assert(skillIds[1] === "debugging", "second skill is debugging (priority 2)");
  assert(skillIds[2] === "reviewing", "third skill is reviewing (priority 3)");
}

// ─┬─ Test 6: Prompt output structure ───────────────────────────────────────

section("Test 6: Prompt assembler — structured output");

{
  const resolved = resolveSkills({ context: { tags: ["code", "develop"] } });
  const prompt = assemblePrompt({ resolvedSkills: resolved.resolvedSkills });

  // Validate contract shape
  assert(prompt.kind === ASSEMBLED_PROMPT_KIND, "prompt.kind is correct");
  assert(Array.isArray(prompt.promptParts), "promptParts is an array");
  assert(prompt.promptParts.length > 0, "promptParts is non-empty");
  assert(Array.isArray(prompt.referencedSkills), "referencedSkills is an array");
  assert(typeof prompt.promptText === "string", "promptText is a string");
  assert(prompt.promptText.length > 0, "promptText is non-empty");
  assert(typeof prompt.metadata === "object" && prompt.metadata !== null, "metadata is an object");
  assert(prompt.metadata.skillCount > 0, "metadata.skillCount > 0");

  // promptParts should have text
  for (const part of prompt.promptParts) {
    assert(typeof part.text === "string", `part ${part.skillId} has text`);
    assert(typeof part.skillId === "string", `part ${part.skillId} has skillId`);
  }

  // referencedSkills should match resolvedSkills length
  assert(
    prompt.referencedSkills.length === resolved.resolvedSkills.length,
    "referencedSkills count matches resolved count",
  );

  // Self-validation passes
  const validation = validateAssembledPrompt(prompt);
  assert(validation.valid === true, `assembled prompt passes contract validation (errors: ${JSON.stringify(validation.errors)})`);
}

// ─┬─ Test 7: Input immutability ────────────────────────────────────────────

section("Test 7: Input immutability");

{
  const originalContext = {
    tags: ["code", "summarize", "debug"],
    intent: "write code and summarize",
    tools: ["editor", "debugger"],
  };

  const contextCopy = JSON.parse(JSON.stringify(originalContext));

  resolveSkills({ context: originalContext });

  assertDeepEqual(originalContext, contextCopy, "context object is unmodified after resolveSkills");

  const resolved = resolveSkills({ context: contextCopy });
  resolveSkills({ context: contextCopy });

  assertDeepEqual(contextCopy, originalContext, "context object still unmodified after repeated calls");
}

// ─┬─ Test 8: Explicit skills path ──────────────────────────────────────────

section("Test 8: Explicit skills array (bypass hint matching)");

{
  const result = resolveSkills({
    context: { tags: ["code"] }, // would normally match coding
    explicitSkills: ["reviewing", "searching"], // explicit overrides
  });

  const skillIds = result.resolvedSkills.map((s) => s.skillId);
  assert(skillIds.includes("reviewing"), "explicit: reviewing included");
  assert(skillIds.includes("searching"), "explicit: searching included");
  assert(!skillIds.includes("coding"), "explicit: coding NOT auto-matched (explicit overrides hints)");
}

// ─┬─ Test 9: Transitive requires ───────────────────────────────────────────

section("Test 9: Transitive requires (debugging requires coding)");

{
  const context = {
    tags: ["debug", "bug", "fix", "troubleshoot"],
    intent: "debug a problem",
  };

  const result = resolveSkills({ context });

  const hasCoding = result.resolvedSkills.some((s) => s.skillId === "coding");
  const hasDebugging = result.resolvedSkills.some((s) => s.skillId === "debugging");

  assert(hasDebugging, "debugging skill present (matched)");
  assert(hasCoding, "coding skill present (transitive require from debugging)");
}

// ─┬─ Test 10: Multiple independent skills with stable order ────────────────

section("Test 10: Multiple independent skills — stable order");

{
  // Run the same resolve 3 times and verify identical output order
  const context = {
    tags: ["code", "debug", "review", "search", "evaluate"],
    intent: "code, debug, review and search",
  };

  const results = [];
  for (let i = 0; i < 3; i++) {
    results.push(resolveSkills({ context }));
  }

  const order0 = results[0].resolvedSkills.map((s) => s.skillId);
  const order1 = results[1].resolvedSkills.map((s) => s.skillId);
  const order2 = results[2].resolvedSkills.map((s) => s.skillId);

  assertDeepEqual(order0, order1, "run 0 and run 1 produce identical skill order");
  assertDeepEqual(order0, order2, "run 0 and run 2 produce identical skill order");

  // Verify order: coding(1) < debugging(2) < reviewing(3) < searching(5)
  assert(order0[0] === "coding", "position 0: coding (priority 1)");
  assert(order0[1] === "debugging", "position 1: debugging (priority 2)");
  assert(order0[2] === "reviewing", "position 2: reviewing (priority 3)");
  assert(order0[3] === "searching", "position 3: searching (priority 5)");
}

// ─┬─ Test 11: Prompt with preamble and suffix ──────────────────────────────

section("Test 11: Prompt with preamble and suffix");

{
  const resolved = resolveSkills({ context: { tags: ["review"] } });
  const prompt = assemblePrompt({
    resolvedSkills: resolved.resolvedSkills,
    options: {
      preamble: "SYSTEM: You are a helpful assistant.",
      suffix: "END OF PROMPT",
    },
  });

  assert(prompt.promptText.startsWith("SYSTEM:"), "promptText starts with preamble");
  assert(prompt.promptText.endsWith("END OF PROMPT"), "promptText ends with suffix");
  assert(prompt.metadata.preambleIncluded === true, "preambleIncluded is true");
  assert(prompt.metadata.suffixIncluded === true, "suffixIncluded is true");
}

// ─┬─ Test 12: Contract validation of each resolved skill record ────────────

section("Test 12: Each resolved skill record passes contract validation");

{
  const context = {
    tags: ["code", "debug", "search", "build"],
    intent: "build a feature",
  };

  const result = resolveSkills({ context });

  for (const record of result.resolvedSkills) {
    const validation = validateResolvedSkillRecord(record);
    assert(
      validation.valid === true,
      `record ${record.skillId} passes contract validation (${JSON.stringify(validation.errors)})`,
    );
  }
}

// ─┬─ Test 13: Nil/undefined context protections ────────────────────────────

section("Test 13: Nil/undefined context protections");

{
  // null context
  const r1 = resolveSkills({ context: null });
  assert(r1.resolvedSkills.length === 1, "null context → default fallback");

  // undefined context
  const r2 = resolveSkills({ context: undefined });
  assert(r2.resolvedSkills.length === 1, "undefined context → default fallback");

  // no context at all
  const r3 = resolveSkills();
  assert(r3.resolvedSkills.length === 1, "no context → default fallback");
}

// ─┬─ Summary ───────────────────────────────────────────────────────────────

console.log(`\n${"=" .repeat(60)}`);
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log(`${"=" .repeat(60)}`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log("\n  ✅ All tests passed!");
  process.exit(0);
}
