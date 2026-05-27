// ── Skill Prompt Contract ──────────────────────────────────────────────────
// Frozen type definitions, constants, and validation helpers for the
// skill resolver → prompt assembler data pipeline.
//
// This module defines:
//   1. The canonical skill registry (frozen set of known skills)
//   2. Skill metadata shape (id, name, priority, conflicts, requires, etc.)
//   3. Conflict resolution contracts
//   4. Assembled prompt output shape
//
// It is a pure-data contract module — no I/O, no platform deps, no model deps.

// ─┬─ Skill identity ────────────────────────────────────────────────────────

const SKILL_ID_VALUES = Object.freeze([
  "coding",
  "debugging",
  "reviewing",
  "summarizing",
  "searching",
  "default-general",
]);

const SKILL_VERSION = "skill-prompt-contract-draft-1";
const SKILL_KIND = "skill-prompt-contract-skill-definition";

// ─┬─ Conflict taxonomy ─────────────────────────────────────────────────────

const CONFLICT_RESOLUTION_KIND = "skill-conflict-resolution";
const CONFLICT_RESOLUTION_VERSION = "skill-conflict-resolution-draft-1";

const CONFLICT_RESOLUTION_STRATEGIES = Object.freeze([
  "higher-priority-wins",
  "dedup-identical",
]);

const CONFLICT_STATUS_VALUES = Object.freeze([
  "no-conflict",
  "conflict-resolved-by-priority",
  "conflict-deduped",
]);

// ─┬─ Assembled prompt output shape ──────────────────────────────────────────

const ASSEMBLED_PROMPT_KIND = "assembled-prompt";
const ASSEMBLED_PROMPT_VERSION = "assembled-prompt-draft-1";

// ─┬─ Resolved skill output shape ───────────────────────────────────────────

const RESOLVED_SKILL_KIND = "resolved-skill-result";
const RESOLVED_SKILL_VERSION = "resolved-skill-result-draft-1";

// ─┬─ Frozen skill registry ─────────────────────────────────────────────────
// Each skill entry defines:
//   id         – unique identifier
//   name       – human-readable label
//   priority   – numeric (lower = more important), used for ordering & conflict
//   conflicts  – ids of skills known to be mutually exclusive
//   requires   – ids of skills that must also be present
//   isDefault  – fallback when nothing else matches
//   promptTemplate – template text used by the assembler
//   tags       – context keywords that trigger this skill

const SKILL_REGISTRY = Object.freeze({
  coding: Object.freeze({
    kind: SKILL_KIND,
    version: SKILL_VERSION,
    id: "coding",
    name: "代码开发",
    priority: 1,
    conflicts: Object.freeze(["summarizing"]),
    requires: Object.freeze([]),
    isDefault: false,
    promptTemplate: "Act as a coding agent. Write production-quality code, follow best practices, and explain key design decisions.",
    tags: Object.freeze(["code", "implement", "develop", "build", "create", "write", "fix"]),
  }),

  debugging: Object.freeze({
    kind: SKILL_KIND,
    version: SKILL_VERSION,
    id: "debugging",
    name: "问题排查",
    priority: 2,
    conflicts: Object.freeze([]),
    requires: Object.freeze(["coding"]),
    isDefault: false,
    promptTemplate: "Act as a debugging agent. Trace errors, analyze logs, identify root causes, and propose fixes.",
    tags: Object.freeze(["debug", "error", "bug", "trace", "diagnose", "troubleshoot"]),
  }),

  reviewing: Object.freeze({
    kind: SKILL_KIND,
    version: SKILL_VERSION,
    id: "reviewing",
    name: "代码审查",
    priority: 3,
    conflicts: Object.freeze([]),
    requires: Object.freeze([]),
    isDefault: false,
    promptTemplate: "Act as a code reviewer. Assess correctness, style, security, and performance. Suggest improvements.",
    tags: Object.freeze(["review", "check", "audit", "assess", "evaluate"]),
  }),

  summarizing: Object.freeze({
    kind: SKILL_KIND,
    version: SKILL_VERSION,
    id: "summarizing",
    name: "信息总结",
    priority: 4,
    conflicts: Object.freeze(["coding"]),
    requires: Object.freeze([]),
    isDefault: false,
    promptTemplate: "Act as a summarizer. Condense information, extract key points, and present findings concisely.",
    tags: Object.freeze(["summarize", "summary", "condense", "extract", "brief"]),
  }),

  searching: Object.freeze({
    kind: SKILL_KIND,
    version: SKILL_VERSION,
    id: "searching",
    name: "信息搜索",
    priority: 5,
    conflicts: Object.freeze([]),
    requires: Object.freeze([]),
    isDefault: false,
    promptTemplate: "Act as a research agent. Search, gather, and organize information from available sources.",
    tags: Object.freeze(["search", "find", "research", "lookup", "query"]),
  }),

  "default-general": Object.freeze({
    kind: SKILL_KIND,
    version: SKILL_VERSION,
    id: "default-general",
    name: "通用助手",
    priority: 100,
    conflicts: Object.freeze([]),
    requires: Object.freeze([]),
    isDefault: true,
    promptTemplate: "Act as a general-purpose assistant. Help with any task using your full capabilities.",
    tags: Object.freeze([]),
  }),
});

// ─┬─ Validation helpers ─────────────────────────────────────────────────────

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cloneArray(value) {
  return Array.isArray(value) ? [...value] : [];
}

function cloneObject(value, fallback = {}) {
  return isPlainObject(value) ? { ...value } : { ...fallback };
}

/**
 * Validate a skill id against the known registry.
 */
function isValidSkillId(id) {
  return typeof id === "string" && SKILL_ID_VALUES.includes(id);
}

/**
 * Validate that a resolved skill record matches the contract shape.
 */
function validateResolvedSkillRecord(record) {
  const errors = [];

  if (!isPlainObject(record)) {
    errors.push({ field: "$", message: "must be an object" });
    return { valid: false, errors };
  }

  if (record.kind !== RESOLVED_SKILL_KIND) {
    errors.push({ field: "kind", message: `expected "${RESOLVED_SKILL_KIND}", got "${record.kind}"` });
  }

  if (!isValidSkillId(record.skillId)) {
    errors.push({ field: "skillId", message: `invalid skill id: "${record.skillId}"` });
  }

  if (typeof record.priority !== "number") {
    errors.push({ field: "priority", message: "must be a number" });
  }

  if (typeof record.isDefault !== "boolean") {
    errors.push({ field: "isDefault", message: "must be a boolean" });
  }

  if (!CONFLICT_STATUS_VALUES.includes(record.conflictStatus)) {
    errors.push({ field: "conflictStatus", message: `must be one of ${CONFLICT_STATUS_VALUES.join(", ")}` });
  }

  if (!Array.isArray(record.promptTexts)) {
    errors.push({ field: "promptTexts", message: "must be an array" });
  }

  if (typeof record.stableOrder !== "number") {
    errors.push({ field: "stableOrder", message: "must be a number" });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate an assembled prompt result against the contract shape.
 */
function validateAssembledPrompt(result) {
  const errors = [];

  if (!isPlainObject(result)) {
    errors.push({ field: "$", message: "must be an object" });
    return { valid: false, errors };
  }

  if (result.kind !== ASSEMBLED_PROMPT_KIND) {
    errors.push({ field: "kind", message: `expected "${ASSEMBLED_PROMPT_KIND}", got "${result.kind}"` });
  }

  if (!Array.isArray(result.promptParts)) {
    errors.push({ field: "promptParts", message: "must be an array" });
  }

  if (!Array.isArray(result.referencedSkills)) {
    errors.push({ field: "referencedSkills", message: "must be an array" });
  }

  if (!isPlainObject(result.metadata)) {
    errors.push({ field: "metadata", message: "must be an object" });
  }

  return { valid: errors.length === 0, errors };
}

// ─┬─ Frozen exports ─────────────────────────────────────────────────────────

export {
  SKILL_KIND,
  SKILL_VERSION,
  SKILL_ID_VALUES,
  SKILL_REGISTRY,
  CONFLICT_RESOLUTION_KIND,
  CONFLICT_RESOLUTION_VERSION,
  CONFLICT_RESOLUTION_STRATEGIES,
  CONFLICT_STATUS_VALUES,
  ASSEMBLED_PROMPT_KIND,
  ASSEMBLED_PROMPT_VERSION,
  RESOLVED_SKILL_KIND,
  RESOLVED_SKILL_VERSION,
  isPlainObject,
  cloneArray,
  cloneObject,
  isValidSkillId,
  validateResolvedSkillRecord,
  validateAssembledPrompt,
};
