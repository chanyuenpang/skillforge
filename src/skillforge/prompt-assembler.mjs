// ── Prompt Assembler ───────────────────────────────────────────────────────
// Pure function: resolvedSkills → structured assembled prompt.
//
// Pipeline:
//   1. Validate resolved skill records
//   2. Aggregate prompt text parts in priority order
//   3. Build a structured prompt result containing:
//      - promptText (merged prompt string)
//      - promptParts (individual paragraph per skill)
//      - referencedSkills (ids + names of referenced skills)
//      - metadata (version, skill count, timestamps, etc.)
//   4. Attach optional user-provided preamble / suffix
//
// Pure — no I/O, no platform deps, no model deps, no side effects.

import {
  ASSEMBLED_PROMPT_KIND,
  ASSEMBLED_PROMPT_VERSION,
  validateAssembledPrompt,
  SKILL_REGISTRY,
} from "./skill-prompt-contract.mjs";

// ─┬─ Helpers ────────────────────────────────────────────────────────────────

function normalizeString(value) {
  if (value == null) return "";
  return String(value).trim();
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cloneObject(value, fallback = {}) {
  return isPlainObject(value) ? { ...value } : { ...fallback };
}

// ─┬─ Prompt text aggregation ────────────────────────────────────────────────

/**
 * Aggregate prompt text from resolved skill records, one paragraph per skill.
 * Skill records are already in priority order from the resolver.
 */
function aggregatePromptParts(resolvedSkills) {
  return resolvedSkills.map((record) => ({
    skillId: record.skillId,
    skillName: record.name,
    text: record.promptTexts.join("\n"),
    priority: record.priority,
    isDefault: record.isDefault,
  }));
}

/**
 * Merge all parts into a single prompt text string, separated by double-newline.
 */
function mergePromptText(promptParts) {
  return promptParts
    .filter((p) => p.text.trim().length > 0)
    .map((p) => p.text.trim())
    .join("\n\n");
}

// ─┬─ Referenced skills extraction ───────────────────────────────────────────

function buildReferencedSkills(resolvedSkills) {
  return resolvedSkills.map((record) => ({
    skillId: record.skillId,
    skillName: record.name,
    priority: record.priority,
    isDefault: record.isDefault,
  }));
}

// ─┬─ Metadata assembly ──────────────────────────────────────────────────────

function buildAssemblerMetadata({
  resolvedSkills = [],
  options = {},
} = {}) {
  const skillIds = resolvedSkills.map((s) => s.skillId);
  const hasDefault = resolvedSkills.some((s) => s.isDefault === true);

  return {
    assemblerVersion: "prompt-assembler-draft-1",
    skillCount: resolvedSkills.length,
    skillIds,
    hasDefaultSkill: hasDefault,
    defaultSkillId: resolvedSkills.find((s) => s.isDefault === true)?.skillId ?? null,
    preambleIncluded: normalizeString(options.preamble).length > 0,
    suffixIncluded: normalizeString(options.suffix).length > 0,
    generatedAt: new Date().toISOString(),
    options: cloneObject(options),
  };
}

// ─┬─ Main assembler ─────────────────────────────────────────────────────────

/**
 * Assemble a structured prompt from resolved skill records.
 *
 * @param {Object} params
 * @param {Object[]} params.resolvedSkills — Array of resolved-skill-result records
 * @param {Object} [params.options={}] — Assembler options
 * @param {string} [params.options.preamble] — Optional text prepended to prompt
 * @param {string} [params.options.suffix] — Optional text appended to prompt
 * @param {string} [params.options.separator] — Custom separator between parts (default "\n\n")
 * @returns {Object} Structured assembled prompt result
 */
export function assemblePrompt({
  resolvedSkills = [],
  options = {},
} = {}) {
  // Validate input
  if (!Array.isArray(resolvedSkills)) {
    throw new TypeError("assemblePrompt: resolvedSkills must be an array");
  }

  const preamble = normalizeString(options.preamble);
  const suffix = normalizeString(options.suffix);
  const separator = normalizeString(options.separator) || "\n\n";

  // Aggregate
  const promptParts = aggregatePromptParts(resolvedSkills);
  let promptText = mergePromptText(promptParts);

  // Apply preamble / suffix
  if (preamble) {
    promptText = preamble + "\n\n" + promptText;
  }
  if (suffix) {
    promptText = promptText + "\n\n" + suffix;
  }

  // If custom separator differs from default, rebuild with custom separator
  if (separator !== "\n\n") {
    promptText = promptParts
      .filter((p) => p.text.trim().length > 0)
      .map((p) => p.text.trim())
      .join(separator);
    if (preamble) promptText = preamble + separator + promptText;
    if (suffix) promptText = promptText + separator + suffix;
  }

  const referencedSkills = buildReferencedSkills(resolvedSkills);
  const metadata = buildAssemblerMetadata({ resolvedSkills, options });

  const result = {
    kind: ASSEMBLED_PROMPT_KIND,
    version: ASSEMBLED_PROMPT_VERSION,
    promptText,
    promptParts: promptParts.map((p) => ({
      ...p,
      text: preamble ? p.text : p.text, // keep original part text in parts
    })),
    referencedSkills,
    metadata,
  };

  // Self-validate
  const validation = validateAssembledPrompt(result);
  if (!validation.valid) {
    throw new Error(
      `Prompt assembler produced invalid output: ${validation.errors.map((e) => `${e.field}: ${e.message}`).join("; ")}`,
    );
  }

  return result;
}

export default assemblePrompt;
