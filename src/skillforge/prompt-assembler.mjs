// ── Prompt Assembler ───────────────────────────────────────────────────────
// Pure program-side assembler:
// - template stitching
// - field merging
// - order control
//
// No semantic interpretation, no rule inference, no quality judgment.

export const ASSEMBLED_PROMPT_KIND = "assembled-prompt";
export const ASSEMBLED_PROMPT_VERSION = "assembled-prompt-draft-1";

export function validateAssembledPrompt(value) {
  const errors = [];
  const obj = value && typeof value === "object" ? value : null;

  if (!obj) {
    errors.push({ field: "root", message: "must be an object" });
  } else {
    if (obj.kind !== ASSEMBLED_PROMPT_KIND) {
      errors.push({ field: "kind", message: `must equal ${ASSEMBLED_PROMPT_KIND}` });
    }
    if (obj.version !== ASSEMBLED_PROMPT_VERSION) {
      errors.push({ field: "version", message: `must equal ${ASSEMBLED_PROMPT_VERSION}` });
    }
    if (typeof obj.promptText !== "string") {
      errors.push({ field: "promptText", message: "must be a string" });
    }
    if (!Array.isArray(obj.promptParts)) {
      errors.push({ field: "promptParts", message: "must be an array" });
    }
    if (!Array.isArray(obj.referencedSkills)) {
      errors.push({ field: "referencedSkills", message: "must be an array" });
    }
    if (!obj.metadata || typeof obj.metadata !== "object" || Array.isArray(obj.metadata)) {
      errors.push({ field: "metadata", message: "must be an object" });
    }
  }

  return { valid: errors.length === 0, errors };
}

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
  return {
    assemblerVersion: "prompt-assembler-draft-1",
    skillCount: resolvedSkills.length,
    skillIds: resolvedSkills.map((s) => s.skillId),
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
  if (!Array.isArray(resolvedSkills)) {
    throw new TypeError("assemblePrompt: resolvedSkills must be an array");
  }

  const preamble = normalizeString(options.preamble);
  const suffix = normalizeString(options.suffix);
  const separator = normalizeString(options.separator) || "\n\n";

  const promptParts = aggregatePromptParts(resolvedSkills);
  let promptText = promptParts
    .filter((p) => p.text.trim().length > 0)
    .map((p) => p.text.trim())
    .join(separator);

  if (preamble) promptText = promptText ? preamble + separator + promptText : preamble;
  if (suffix) promptText = promptText ? promptText + separator + suffix : suffix;

  const referencedSkills = buildReferencedSkills(resolvedSkills);
  const metadata = buildAssemblerMetadata({ resolvedSkills, options });

  const result = {
    kind: ASSEMBLED_PROMPT_KIND,
    version: ASSEMBLED_PROMPT_VERSION,
    promptText,
    promptParts,
    referencedSkills,
    metadata,
  };

  const validation = validateAssembledPrompt(result);
  if (!validation.valid) {
    throw new Error(
      `Prompt assembler produced invalid output: ${validation.errors.map((e) => `${e.field}: ${e.message}`).join("; ")}`,
    );
  }

  return result;
}

export default assemblePrompt;
