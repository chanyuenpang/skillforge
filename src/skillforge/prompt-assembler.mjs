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

function splitSentences(text) {
  return normalizeString(text)
    .split(/[\n。！？!?；;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function extractConstraintCandidates(text = "") {
  const indicators = /(必须|不得|禁止|不要|仅|只|不做|不改|must|must not|do not|only|without)\b/i;
  return splitSentences(text)
    .map((s) => s.replace(/^[-*]\s*/, "").trim())
    .filter((s) => indicators.test(s));
}

function summarizeGoalFromText(text = "", skills = []) {
  const skillIds = skills.map((s) => s.skillId);
  const hasWorkflow = skillIds.some((id) => /workflow|automation/i.test(id));
  const hasPlanning = skillIds.some((id) => /plan/i.test(id));
  const hasCoding = skillIds.some((id) => /coding|debug|review/i.test(id));

  const base = splitSentences(text)[0] || "完成任务并输出可执行结果";
  let taskType = "任务执行";
  if (hasWorkflow) taskType = "工作流能力改造";
  else if (hasPlanning) taskType = "任务规划优化";
  else if (hasCoding) taskType = "代码实现与修复";

  return `${taskType}：聚焦${base.slice(0, 40)}，以最小改动达成可稳定执行。`;
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
  // 禁止原文搬运到 goal/constraints
  if (!Array.isArray(resolvedSkills)) {
    throw new TypeError("assemblePrompt: resolvedSkills must be an array");
  }

  const preamble = normalizeString(options.preamble);
  const suffix = normalizeString(options.suffix);
  const separator = normalizeString(options.separator) || "\n\n";

  const promptParts = aggregatePromptParts(resolvedSkills);
  const semanticSource = `${preamble}${separator}${suffix}`.trim();
  const semanticSummary = normalizeString(options.semanticSummary || options.summary || "");
  const semanticGoal = semanticSummary || (semanticSource ? `${semanticSource.slice(0, 100)}…` : summarizeGoalFromText(semanticSource, resolvedSkills));
  const constraintIndicators = /(不要|不能|禁止|必须|只做|仅|不超过|必须保证)/;
  const semanticConstraints = splitSentences(semanticSource)
    .map((s) => s.replace(/^[-*]\s*/, "").trim())
    .filter((s) => constraintIndicators.test(s))
    .filter((s) => !semanticGoal.includes(s));

  let promptText = promptParts
    .filter((p) => p.text.trim().length > 0)
    .map((p) => p.text.trim())
    .join(separator);

  if (preamble) promptText = promptText ? preamble + separator + promptText : preamble;
  if (suffix) promptText = promptText ? promptText + separator + suffix : suffix;

  const antiCopyRule = '规则：禁止原文搬运到 goal/constraints，必须重述与提炼。';
  const semanticBlock = [
    '## semantic_goal',
    `- ${semanticGoal}`,
    '',
    '## semantic_constraints',
    ...(semanticConstraints.length > 0 ? semanticConstraints.map((c) => `- ${c}`) : ['- 无显式硬约束，按最小改动与可执行性约束处理']),
    `- ${antiCopyRule}`,
  ].join('\n');
  promptText = promptText ? `${promptText}${separator}${semanticBlock}` : semanticBlock;

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
