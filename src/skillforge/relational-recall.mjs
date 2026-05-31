import {
  RELATIONAL_INDEX_PATH,
  openRelationalIndexDb,
  assertReadableIndex,
} from './relational-index.sqlite.mjs';

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function uniq(items = []) {
  return [...new Set(items.filter((item) => hasText(item)).map((item) => String(item).trim()))];
}

function normalizeString(value) {
  return hasText(value) ? String(value).trim().toLowerCase() : '';
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function tokenize(text = '') {
  return uniq(
    String(text)
      .toLowerCase()
      .split(/[\s,;.!?，。；、/\\()[\]{}"'`:_-]+/)
      .filter((token) => token.length >= 2),
  );
}

function buildSkillSearchText(skill = {}) {
  return [
    skill.name,
    skill.description,
    ...(skill.applicableScenes || []),
    ...(skill.triggerHints || []),
    ...(skill.requiredTools || []),
    ...(skill.toolSignals || []),
    ...(skill.entrypointHints || []),
    ...(skill.toolFamilies || []),
    ...(skill.reportHints || []),
    ...(skill.constraintHints || []),
    skill.workflowSkeletonSummary,
    ...(skill.tags || []),
  ]
    .filter(hasText)
    .join('\n')
    .toLowerCase();
}

const TAG_TYPE_WEIGHT = Object.freeze({
  project: 3,
  workflow: 2.5,
  tool: 2.5,
  artifact_target: 1.5,
  agent_archetype: 1,
  skill_role: 2,
  skill_category: 1.5,
  open_tag: 1.5,
});

function registryEntryToSkillFields(entry) {
  const profile = entry?.routingProfile || {};
  return {
    id: entry.registryId,
    name: entry.name,
    kind: entry.skillKind === 'subagent' ? 'subagent' : 'skill',
    skillRole: hasText(profile.skillRole) ? profile.skillRole.trim() : 'reference',
    skillCategory: hasText(profile.skillCategory) ? profile.skillCategory.trim() : 'general',
    description: entry.description,
    sourceRef: entry.sourceRef || { path: null },
    applicableScenes: uniq(profile.applicableScenes || []),
    triggerHints: uniq(profile.triggerHints || []),
    requiredTools: uniq(profile.requiredTools || []),
    toolSignals: uniq(profile.toolSignals || []),
    entrypointHints: uniq(profile.entrypointHints || []),
    toolFamilies: uniq(profile.toolFamilies || []),
    reportHints: uniq(profile.reportHints || []),
    stopRuleHints: uniq(profile.stopRuleHints || []),
    constraintHints: uniq(profile.constraintHints || []),
    workflowSkeletonSummary: hasText(profile.workflowSkeletonSummary) ? profile.workflowSkeletonSummary.trim() : '',
    tags: uniq(profile.tags || []),
  };
}

function buildTagMaps(tags = [], aliases = []) {
  const tagById = new Map(tags.map((tag) => [tag.id, tag]));
  const tagsByAlias = new Map();

  for (const tag of tags) {
    const nameKey = normalizeString(tag.name);
    if (nameKey) {
      const existing = tagsByAlias.get(nameKey) || [];
      existing.push(tag.id);
      tagsByAlias.set(nameKey, existing);
    }
  }

  for (const alias of aliases) {
    const key = normalizeString(alias.alias);
    if (!key) continue;
    const existing = tagsByAlias.get(key) || [];
    existing.push(alias.tag_id);
    tagsByAlias.set(key, uniq(existing));
  }

  return { tagById, tagsByAlias };
}

function buildSkillLinks(skillTags = []) {
  const linksByTagId = new Map();
  for (const row of skillTags) {
    const existing = linksByTagId.get(row.tag_id) || [];
    existing.push(row);
    linksByTagId.set(row.tag_id, existing);
  }
  return linksByTagId;
}

function collectTaskAnchors(taskRecord = {}, context = {}) {
  return uniq([
    taskRecord.projectScope,
    ...toArray(taskRecord.taskTypes),
    ...toArray(taskRecord.workflowStages),
    ...toArray(taskRecord.artifactTargets),
    ...toArray(taskRecord.toolHints),
    ...toArray(taskRecord.agentArchetypes),
    ...toArray(taskRecord.openTags),
    ...toArray(context.tags),
    ...toArray(context.tools),
    ...tokenize(taskRecord.summary || ''),
    ...tokenize(context.intent || ''),
    ...tokenize(context.description || context.text || ''),
  ]);
}

function scoreDirectSkillOverlap(skill, taskRecord, context = {}) {
  const anchors = collectTaskAnchors(taskRecord, context).map(normalizeString).filter(Boolean);
  const matchedFields = [];
  let score = 0;

  const fieldMatches = [
    ['name', [skill.name || '']],
    ['description', [skill.description || '']],
    ['applicableScenes', skill.applicableScenes || []],
    ['triggerHints', skill.triggerHints || []],
    ['requiredTools', skill.requiredTools || []],
    ['toolSignals', skill.toolSignals || []],
    ['entrypointHints', skill.entrypointHints || []],
    ['toolFamilies', skill.toolFamilies || []],
    ['reportHints', skill.reportHints || []],
    ['constraintHints', skill.constraintHints || []],
    ['workflowSkeletonSummary', [skill.workflowSkeletonSummary || '']],
    ['tags', skill.tags || []],
    ['skillRole', [skill.skillRole || '']],
    ['skillCategory', [skill.skillCategory || '']],
  ];

  for (const [field, values] of fieldMatches) {
    const exactMatches = values.filter((value) => anchors.includes(normalizeString(value)));
    const tokenMatches = [];
    for (const value of values) {
      const tokens = tokenize(value);
      for (const token of tokens) {
        if (anchors.includes(token)) tokenMatches.push(token);
      }
    }
    const matches = uniq([...exactMatches, ...tokenMatches]);
    if (matches.length === 0) continue;
    matchedFields.push({ field, values: matches });
    score += field === 'name' || field === 'description' ? matches.length * 0.5 : matches.length;
  }

  return { score, matchedFields };
}

function scoreRoleBoost(skill, taskRecord = {}, directScore = 0, tagScore = 0) {
  const taskTypes = toArray(taskRecord.taskTypes).map(normalizeString);
  const workflowStages = toArray(taskRecord.workflowStages).map(normalizeString);
  const role = normalizeString(skill.skillRole);
  const category = normalizeString(skill.skillCategory);
  const boosts = [];
  let score = 0;
  const searchText = buildSkillSearchText(skill);

  const isCodeExecutionTask = taskTypes.some((item) => /code|implementation|develop|modify|execution/.test(item))
    || workflowStages.some((item) => /implementation|development|execution/.test(item));
  const isBrowserValidationTask = taskTypes.some((item) => /validation|testing|verification|flow_testing/.test(item))
    && (
      toArray(taskRecord.artifactTargets).some((item) => /browser|page|dom|ui/i.test(String(item)))
      || toArray(taskRecord.toolHints).some((item) => /browser|playwright|browseros/i.test(String(item)))
    );
  const anchorEvidence = directScore + tagScore;

  let affinityScore = 0;
  if (isCodeExecutionTask) {
    if (/(coding|code|implementation|implement|developer|feature|bug|refactor|modify|edit)/.test(searchText)) affinityScore += 3;
    if (/(compile|compiler|build|python)/.test(searchText)) affinityScore += 1;
  }
  if (isBrowserValidationTask && /(browser|browseros|playwright|page|dom|e2e|validation|verify|evidence)/.test(searchText)) {
    affinityScore += 3;
  }

  if (anchorEvidence <= 0 && affinityScore <= 0) {
    return { boosts, score };
  }

  if (isCodeExecutionTask && role === 'primary') {
    boosts.push({ kind: 'skillRole', value: 'primary', weight: 3 });
    score += 3;
  }
  if (isCodeExecutionTask && category === 'execution') {
    boosts.push({ kind: 'skillCategory', value: 'execution', weight: 2 });
    score += 2;
  }
  if (isCodeExecutionTask && role === 'tooling') {
    boosts.push({ kind: 'skillRole', value: 'tooling', weight: 1 });
    score += 1;
  }
  if (isCodeExecutionTask && affinityScore > 0) {
    boosts.push({ kind: 'taskAffinity', value: 'code_execution', weight: affinityScore });
    score += affinityScore;
  }
  if (isBrowserValidationTask && role === 'primary') {
    boosts.push({ kind: 'skillRole', value: 'primary', weight: 2 });
    score += 2;
  }
  if (isBrowserValidationTask && role === 'verification') {
    boosts.push({ kind: 'skillRole', value: 'verification', weight: 1.5 });
    score += 1.5;
  }
  if (isBrowserValidationTask && affinityScore > 0) {
    boosts.push({ kind: 'taskAffinity', value: 'browser_validation', weight: affinityScore });
    score += affinityScore;
  }

  return { boosts, score };
}

function scoreTagHits(skillId, anchors, tagMaps, linksByTagId) {
  const { tagById, tagsByAlias } = tagMaps;
  const matchedTags = [];
  const matchedAliases = [];
  const relationBoosts = [];
  let finalScore = 0;

  for (const anchor of anchors.map(normalizeString).filter(Boolean)) {
    const tagIds = tagsByAlias.get(anchor) || [];
    for (const tagId of tagIds) {
      const tag = tagById.get(tagId);
      if (!tag) continue;
      const links = linksByTagId.get(tagId) || [];
      const link = links.find((item) => item.skill_id === skillId);
      if (!link) continue;

      const weight = Number(link.weight || 1) * (TAG_TYPE_WEIGHT[tag.tag_type] || 1);
      matchedTags.push({ id: tag.id, name: tag.name, type: tag.tag_type });
      if (normalizeString(tag.name) !== anchor) {
        matchedAliases.push({ anchor, tagId: tag.id, alias: anchor });
      }
      relationBoosts.push({
        tagId: tag.id,
        tagType: tag.tag_type,
        weight,
      });
      finalScore += weight;
    }
  }

  return {
    matchedTags: uniq(matchedTags.map((item) => JSON.stringify(item))).map((item) => JSON.parse(item)),
    matchedAliases: uniq(matchedAliases.map((item) => JSON.stringify(item))).map((item) => JSON.parse(item)),
    relationBoosts,
    score: finalScore,
  };
}

export function loadIndexSnapshot({ dbPath = RELATIONAL_INDEX_PATH } = {}) {
  const { db, path } = openRelationalIndexDb(dbPath);
  const meta = assertReadableIndex(db);
  const skillRows = db.prepare(`
    SELECT id, payload_json, project_scope
    FROM skills
    ORDER BY id ASC
  `).all();
  const tagRows = db.prepare(`
    SELECT id, name, tag_type, short_description, scope_type, project_scope, metadata_json
    FROM tags
    ORDER BY id ASC
  `).all();
  const aliasRows = db.prepare(`
    SELECT tag_id, alias
    FROM tag_aliases
    ORDER BY tag_id ASC, alias ASC
  `).all();
  const skillTagRows = db.prepare(`
    SELECT skill_id, tag_id, match_kind, weight, source
    FROM skill_tags
    ORDER BY skill_id ASC, tag_id ASC
  `).all();

  const entries = skillRows.map((row) => {
    const payload = JSON.parse(row.payload_json);
    return {
      ...registryEntryToSkillFields(payload),
      projectScope: row.project_scope || null,
    };
  });

  return {
    dbPath: path,
    meta,
    entries,
    tags: tagRows,
    tagAliases: aliasRows,
    skillTags: skillTagRows,
  };
}

export function recallSkillBundle({
  snapshot,
  taskRecord = {},
  context = {},
  explicitSkills = [],
  maxCandidates = 8,
} = {}) {
  const entries = snapshot.entries || [];
  const explicit = explicitSkills.map(normalizeString).filter(Boolean);
  const anchors = collectTaskAnchors(taskRecord, context);
  const tagMaps = buildTagMaps(snapshot.tags || [], snapshot.tagAliases || []);
  const linksByTagId = buildSkillLinks(snapshot.skillTags || []);

  const scored = [];
  const rejected = [];

  for (const entry of entries) {
    const id = normalizeString(entry.id);
    if (explicit.length > 0 && !explicit.includes(id) && !explicit.includes(normalizeString(entry.name))) {
      rejected.push({ id: entry.id, reason: 'not_in_explicit_skill_set' });
      continue;
    }

    const direct = scoreDirectSkillOverlap(entry, taskRecord, context);
    const tagHit = scoreTagHits(entry.id, anchors, tagMaps, linksByTagId);
    const roleBoost = scoreRoleBoost(entry, taskRecord, direct.score, tagHit.score);
    const scopeBoosts = [];
    let scopeScore = 0;

    if (hasText(taskRecord.projectScope) && normalizeString(taskRecord.projectScope) === normalizeString(entry.projectScope)) {
      scopeBoosts.push({ projectScope: taskRecord.projectScope, weight: 3 });
      scopeScore += 3;
    }

    const finalScore = direct.score + tagHit.score + scopeScore + roleBoost.score;
    if (finalScore <= 0) {
      rejected.push({ id: entry.id, reason: 'no_anchor_match' });
      continue;
    }

    scored.push({
      ...entry,
      recallExplain: {
        matchedFields: direct.matchedFields,
        matchedTags: tagHit.matchedTags,
        matchedAliases: tagHit.matchedAliases,
        scopeBoosts,
        relationBoosts: [...tagHit.relationBoosts, ...roleBoost.boosts],
        finalScore,
      },
      heuristicScore: finalScore,
    });
  }

  scored.sort((a, b) => b.heuristicScore - a.heuristicScore || String(a.id).localeCompare(String(b.id)));
  return {
    shortlisted: scored.slice(0, Math.max(1, maxCandidates)),
    rejected,
    anchors,
  };
}

export default {
  loadIndexSnapshot,
  recallSkillBundle,
};
