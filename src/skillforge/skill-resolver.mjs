// ── Skill Resolver ─────────────────────────────────────────────────────────
// Pure function: context input → resolved skills output.
//
// Pipeline:
//   1. Extract skill hints from context (tags, intent, tools)
//   2. Match hints against the frozen skill registry
//   3. Deduplicate identical skill matches
//   4. Resolve conflicts (higher priority wins)
//   5. Apply transitive requires (pull in dependencies)
//   6. Apply default fallback if nothing matched
//   7. Sort by priority, then name (stable tiebreak)
//
// Pure — no I/O, no platform deps, no model deps, no side effects.

// ── Inlined from deleted skill-prompt-contract.mjs ─────────────────────────

const RESOLVED_SKILL_KIND = "resolved-skill-result";
const RESOLVED_SKILL_VERSION = "resolved-skill-result-draft-1";

const SKILL_REGISTRY = Object.freeze({
  "coding-agent-workflow": Object.freeze({
    kind: "skill-prompt-contract-skill-definition",
    version: "skill-prompt-contract-draft-1",
    id: "coding-agent-workflow",
    name: "代码开发",
    priority: 1,
    conflicts: Object.freeze(["task-planning"]),
    requires: Object.freeze([]),
    isDefault: false,
    promptTemplate: "Act as a coding agent. Write production-quality code, follow best practices, and explain key design decisions.",
    tags: Object.freeze(["code", "implement", "develop", "build", "create", "write", "fix", "代码", "开发", "实现", "重构"]),
  }),

  explorer: Object.freeze({
    kind: "skill-prompt-contract-skill-definition",
    version: "skill-prompt-contract-draft-1",
    id: "explorer",
    name: "问题排查",
    priority: 2,
    conflicts: Object.freeze([]),
    requires: Object.freeze(["coding-agent-workflow"]),
    isDefault: false,
    promptTemplate: "Act as a debugging agent. Trace errors, analyze logs, identify root causes, and propose fixes.",
    tags: Object.freeze(["debug", "error", "bug", "trace", "diagnose", "troubleshoot", "explore", "research", "analysis", "investigation", "排查", "调试", "错误", "调研", "探索", "分析"]),
  }),

  "browser-agent-workflow": Object.freeze({
    kind: "skill-prompt-contract-skill-definition",
    version: "skill-prompt-contract-draft-1",
    id: "browser-agent-workflow",
    name: "浏览器操作",
    priority: 3,
    conflicts: Object.freeze([]),
    requires: Object.freeze([]),
    isDefault: false,
    promptTemplate: "Act as a browser agent. Navigate web pages, extract content, and interact with web interfaces.",
    tags: Object.freeze(["browser", "web", "page", "crawl", "scrape", "浏览器", "网页", "页面"]),
  }),

  "task-planning": Object.freeze({
    kind: "skill-prompt-contract-skill-definition",
    version: "skill-prompt-contract-draft-1",
    id: "task-planning",
    name: "任务规划",
    priority: 4,
    conflicts: Object.freeze(["coding-agent-workflow"]),
    requires: Object.freeze([]),
    isDefault: false,
    promptTemplate: "Act as a task planner. Decompose goals into actionable steps, create roadmaps, and organize work.",
    tags: Object.freeze(["plan", "planning", "task", "breakdown", "roadmap", "decompose", "规划", "计划", "拆解", "任务"]),
  }),

  "automation-workflows": Object.freeze({
    kind: "skill-prompt-contract-skill-definition",
    version: "skill-prompt-contract-draft-1",
    id: "automation-workflows",
    name: "自动化工作流",
    priority: 5,
    conflicts: Object.freeze([]),
    requires: Object.freeze([]),
    isDefault: false,
    promptTemplate: "Act as an automation agent. Build scripts, scheduled jobs, and automated workflows.",
    tags: Object.freeze(["automation", "workflow", "script", "scheduled", "cron", "定时", "调度", "自动化", "脚本", "抓取", "爬取"]),
  }),

  "daily-diary": Object.freeze({
    kind: "skill-prompt-contract-skill-definition",
    version: "skill-prompt-contract-draft-1",
    id: "daily-diary",
    name: "日记记录",
    priority: 6,
    conflicts: Object.freeze([]),
    requires: Object.freeze([]),
    isDefault: false,
    promptTemplate: "Act as a diary assistant. Record daily logs clearly and keep entries structured and concise.",
    tags: Object.freeze(["diary", "daily", "journal", "log", "record", "note", "日记", "记录", "日报", "周报"]),
  }),

  "default-general": Object.freeze({
    kind: "skill-prompt-contract-skill-definition",
    version: "skill-prompt-contract-draft-1",
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

// ─┬─ Normalize helpers ──────────────────────────────────────────────────────

function normalizeString(value) {
  if (value == null) return "";
  return String(value).trim().toLowerCase();
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item != null)
    .map((item) => normalizeString(item))
    .filter(Boolean);
}

// ─┬─ Context extraction ─────────────────────────────────────────────────────
// Extract skill-identifying hints from an arbitrary context object.

function isSafeContext(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Build a flat set of normalized keyword strings from the context.
 * Examines: tags, intent, tools, capabilities, and a free-text description.
 */
function splitKeywords(text = "") {
  return normalizeString(text)
    .split(/[\s,;.!?，。；：、\-_/()\[\]{}"'`]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2);
}

function extractHints(context = {}) {
  const safe = isSafeContext(context) ? context : {};
  const hints = new Set();

  // Direct tags
  for (const tag of normalizeStringArray(safe.tags)) {
    hints.add(tag);
  }

  // Intent
  for (const word of splitKeywords(safe.intent)) {
    hints.add(word);
  }

  // Tools / capabilities
  for (const tool of normalizeStringArray(safe.tools)) {
    hints.add(tool);
  }
  for (const cap of normalizeStringArray(safe.capabilities)) {
    hints.add(cap);
  }

  // Free text (natural language prompt)
  const description = normalizeString(safe.description ?? safe.text ?? "");
  for (const word of splitKeywords(description)) {
    hints.add(word);
  }

  // Chinese / phrase-level intent mapping: adds extra tags for common domain phrases.
  const phraseText = `${normalizeString(safe.intent)} ${description}`;
  const phraseRules = [
    { tests: ["自动化", "automation", "抓取", "爬取", "定时", "调度", "脚本", "workflow"], add: ["automation", "workflow", "script", "scheduled", "cron", "自动化", "脚本", "抓取"] },
    { tests: ["计划", "规划", "拆解", "路线图", "plan", "planning", "roadmap", "breakdown", "任务"], add: ["plan", "planning", "task", "breakdown", "roadmap", "规划", "拆解"] },
    { tests: ["日记", "记录", "日报", "周报", "diary", "journal", "log", "daily"], add: ["diary", "journal", "log", "record", "daily", "日记", "记录"] },
    { tests: ["浏览器", "browser", "网页", "web", "页面"], add: ["browser", "web", "page", "crawl", "scrape"] },
    { tests: ["探索", "调研", "explore", "research", "分析", "调试", "排查", "错误", "debug", "bug", "trace", "error"], add: ["debug", "explore", "research", "analysis", "investigation", "排查", "调试", "调研"] },
    { tests: ["代码", "开发", "实现", "重构", "coding", "implement", "develop", "refactor", "编写"], add: ["code", "implement", "develop", "write", "代码", "开发"] },
  ];
  for (const rule of phraseRules) {
    if (rule.tests.some((t) => phraseText.includes(t))) {
      for (const token of rule.add) hints.add(token);
    }
  }

  return [...hints];
}

// ─┬─ Skill matching ─────────────────────────────────────────────────────────
// For each hint keyword, score every registered skill by tag overlap.

/**
 * Return skills whose tags match at least one hint keyword.
 * Each match is scored by the count of overlapping tags (for dedup later).
 */
function matchSkillsByHints(hints) {
  const seen = new Set();
  const matches = [];

  for (const hint of hints) {
    // Avoid re-processing duplicate hints
    const lowerHint = hint.toLowerCase();
    if (seen.has(lowerHint)) continue;
    seen.add(lowerHint);

    // Skip very short hints (len < 3) for substring matching to avoid false positives
    const useSubstring = lowerHint.length >= 3;

    for (const skill of Object.values(SKILL_REGISTRY)) {
      let overlappingTags;
      if (useSubstring) {
        overlappingTags = skill.tags.filter((tag) => tag === lowerHint || tag.includes(lowerHint) || lowerHint.includes(tag));
      } else {
        overlappingTags = skill.tags.filter((tag) => tag === lowerHint);
      }
      if (overlappingTags.length > 0) {
        matches.push({
          skillId: skill.id,
          matchScore: overlappingTags.length,
          matchedTags: [...overlappingTags],
        });
      }
    }
  }

  return matches;
}

// ─┬─ Deduplication ──────────────────────────────────────────────────────────
// Identical skill matches (same skillId) collapse into one entry,
// keeping the highest matchScore.

function deduplicateMatches(matches) {
  const deduped = new Map();

  for (const match of matches) {
    const existing = deduped.get(match.skillId);
    if (!existing || match.matchScore > existing.matchScore) {
      deduped.set(match.skillId, { ...match });
    }
  }

  return [...deduped.values()];
}

// ─┬─ Conflict resolution ────────────────────────────────────────────────────
// When two matched skills declare mutual conflicts, the higher-priority
// (lower numeric priority value) skill wins.

function resolveConflicts(matchedSkills) {
  const skillMap = new Map();
  for (const m of matchedSkills) {
    const def = SKILL_REGISTRY[m.skillId];
    if (!def) continue;
    skillMap.set(m.skillId, { ...m, priority: def.priority, conflicts: [...def.conflicts] });
  }

  // Find conflict pairs
  const removals = new Set();
  for (const [skillId, entry] of skillMap) {
    for (const conflictId of entry.conflicts) {
      const conflictEntry = skillMap.get(conflictId);
      if (!conflictEntry) continue;
      // Higher priority (lower number) wins
      if (entry.priority < conflictEntry.priority) {
        removals.add(conflictId);
      } else if (conflictEntry.priority < entry.priority) {
        removals.add(skillId);
      }
      // If equal priority — keep first by insertion order (stable)
    }
  }

  for (const removeId of removals) {
    skillMap.delete(removeId);
  }

  return [...skillMap.values()];
}

// ─┬─ Transitive requires ────────────────────────────────────────────────────
// If a resolved skill requires another, pull it in (if not already present).

function applyTransitiveRequires(skillIds) {
  const expanded = new Set(skillIds);

  // Iterative expansion (handles transitive chains)
  let changed = true;
  while (changed) {
    changed = false;
    for (const id of [...expanded]) {
      const def = SKILL_REGISTRY[id];
      if (!def) continue;
      for (const req of def.requires) {
        if (!expanded.has(req)) {
          expanded.add(req);
          changed = true;
        }
      }
    }
  }

  return [...expanded];
}

// ─┬─ Default fallback ───────────────────────────────────────────────────────

function applyDefaultFallback(skillIds) {
  if (skillIds.length === 0) {
    const defaultSkill = Object.values(SKILL_REGISTRY).find((s) => s.isDefault === true);
    if (defaultSkill) return [defaultSkill.id];
  }
  return skillIds;
}

// ─┬─ Stable sort ────────────────────────────────────────────────────────────
// Sort by priority (ascending), then by skill name (lexicographic) for
// deterministic output.

function stableSortSkillIds(skillIds) {
  return [...skillIds].sort((a, b) => {
    const defA = SKILL_REGISTRY[a] ?? {};
    const defB = SKILL_REGISTRY[b] ?? {};
    // Lower priority number = more important = higher in list
    if (defA.priority !== defB.priority) {
      return (defA.priority ?? 999) - (defB.priority ?? 999);
    }
    // Lexicographic tiebreak on name
    return (defA.name ?? a).localeCompare(defB.name ?? b);
  });
}

// ─┬─ Build resolved records ─────────────────────────────────────────────────
// Transform sorted skill ids into full resolved-skill-result records.

function buildResolvedSkillRecords(sortedSkillIds, conflictMap) {
  return sortedSkillIds.map((skillId, index) => {
    const def = SKILL_REGISTRY[skillId] ?? {};
    const wasConflict = conflictMap.has(skillId);
    const conflictStatus = wasConflict ? "conflict-resolved-by-priority" : "no-conflict";

    return {
      kind: RESOLVED_SKILL_KIND,
      version: RESOLVED_SKILL_VERSION,
      skillId: def.id ?? skillId,
      name: def.name ?? skillId,
      priority: def.priority ?? 999,
      isDefault: def.isDefault ?? false,
      conflictStatus,
      promptTexts: def.promptTemplate ? [def.promptTemplate] : [],
      conflictInfo: wasConflict ? {
        conflictsWith: [...(def.conflicts ?? [])],
        resolution: "higher-priority-wins",
      } : null,
      stableOrder: index,
    };
  });
}

// ─┬─ Main resolver ──────────────────────────────────────────────────────────

/**
 * Resolve which skills are needed given a context object.
 *
 * @param {Object} params
 * @param {Object} [params.context={}] — Arbitrary context (tags, intent, tools, etc.)
 * @param {string[]} [params.explicitSkills=[]] — Bypass hint-based matching; explicit skill ids
 * @returns {Object} { kind, version, resolvedSkills, conflictSummary, inputContext, metadata }
 */
export function resolveSkills({
  context = {},
  explicitSkills = [],
} = {}) {
  // Snapshot input for immutability verification
  const safeContext = isSafeContext(context) ? context : {};
  const inputSnapshot = JSON.parse(JSON.stringify({ context: safeContext, explicitSkills }));

  let skillIds;
  let beforeConflict = null;
  let afterConflictIds = null;

  if (Array.isArray(explicitSkills) && explicitSkills.length > 0) {
    // Explicit path: validate and use directly
    skillIds = explicitSkills
      .map((id) => normalizeString(id))
      .filter((id) => id && SKILL_REGISTRY[id]);
  } else {
    // Hint-based path
    const hints = extractHints(safeContext);
    const matches = matchSkillsByHints(hints);
    const deduped = deduplicateMatches(matches);

    // Track conflict removals for reporting
    beforeConflict = new Set(deduped.map((m) => m.skillId));
    const afterConflict = resolveConflicts(deduped);
    afterConflictIds = new Set(afterConflict.map((m) => m.skillId));

    skillIds = afterConflict.map((m) => m.skillId);
    skillIds = applyTransitiveRequires(skillIds);
    skillIds = applyDefaultFallback(skillIds);

    // Dedup final list (transitive requires may have added duplicates)
    skillIds = [...new Set(skillIds)];
  }

  // Apply default if still empty (covers explicit-skills validation scenario too)
  if (skillIds.length === 0) {
    const defaultSkill = Object.values(SKILL_REGISTRY).find((s) => s.isDefault === true);
    if (defaultSkill) skillIds = [defaultSkill.id];
  }

  // Stable sort
  const sortedSkillIds = stableSortSkillIds(skillIds);

  // Find final conflict info for each resolved skill (after transitive expansion)
  const finalConflictMap = new Map();
  const resolvedIdSet = new Set(sortedSkillIds);
  for (const id of sortedSkillIds) {
    const def = SKILL_REGISTRY[id] ?? {};
    const originalConflicts = [...(def.conflicts ?? [])];
    // A skill has "conflict-resolved" status if any of its original conflicts
    // WERE in the candidate set but are NOT in the final resolved set
    const conflictingRemoved = originalConflicts.filter((c) => !resolvedIdSet.has(c));
    if (conflictingRemoved.length > 0 && originalConflicts.some((c) => beforeConflict?.has(c) ?? false)) {
      finalConflictMap.set(id, { conflictsWith: conflictingRemoved });
    }
  }

  // Build result records
  const resolvedSkills = buildResolvedSkillRecords(sortedSkillIds, finalConflictMap);

  return {
    kind: "skill-resolver-output",
    version: "skill-resolver-output-draft-1",
    resolvedSkills,
    conflictSummary: {
      totalCandidates: beforeConflict ? beforeConflict.size : sortedSkillIds.length,
      totalResolved: resolvedSkills.length,
      conflictsDetected: finalConflictMap.size > 0,
      defaultFallbackApplied: resolvedSkills.length === 1 && resolvedSkills[0]?.isDefault === true,
    },
    inputContext: inputSnapshot,
    metadata: {
      resolverVersion: "skill-resolver-draft-1",
      skillCount: resolvedSkills.length,
      defaultSkillId: Object.values(SKILL_REGISTRY).find((s) => s.isDefault === true)?.id ?? null,
    },
  };
}

export default resolveSkills;
