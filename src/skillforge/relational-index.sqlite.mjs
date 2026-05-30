import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { homedir } from 'node:os';
import { DatabaseSync } from 'node:sqlite';

export const RELATIONAL_INDEX_SCHEMA_VERSION = '1';
export const RELATIONAL_INDEX_VERSION = '1';
export const RELATIONAL_INDEX_DIR = path.join(homedir(), '.skillforge');
export const RELATIONAL_INDEX_PATH = path.join(RELATIONAL_INDEX_DIR, 'relational-index.sqlite');

const REQUIRED_TABLES = Object.freeze([
  'skills',
  'tags',
  'tag_aliases',
  'skill_tags',
  'project_scopes',
  'skill_scopes',
  'entity_relations',
  'index_meta',
]);

const REQUIRED_META_KEYS = Object.freeze([
  'indexVersion',
  'schemaVersion',
  'builtAt',
  'sourceId',
  'scanId',
  'skillCount',
  'tagCount',
  'relationCount',
  'buildMode',
]);

function nowIso() {
  return new Date().toISOString();
}

function ensureDbDir(dbPath) {
  const dir = path.dirname(dbPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function stringifyJson(value) {
  return JSON.stringify(value ?? {});
}

function hasText(value) {
  return typeof value === 'string' && value.trim() !== '';
}

export function openRelationalIndexDb(dbPath = RELATIONAL_INDEX_PATH) {
  ensureDbDir(dbPath);
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA synchronous = NORMAL;');
  db.exec('PRAGMA busy_timeout = 5000;');
  return { db, path: dbPath };
}

export function ensureRelationalIndexSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      skill_kind TEXT NOT NULL,
      description TEXT NOT NULL,
      source_id TEXT,
      source_path TEXT NOT NULL,
      scope_type TEXT NOT NULL,
      project_scope TEXT,
      scan_id TEXT,
      updated_at TEXT NOT NULL,
      payload_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      tag_type TEXT NOT NULL,
      short_description TEXT NOT NULL,
      scope_type TEXT NOT NULL,
      project_scope TEXT,
      metadata_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tag_aliases (
      tag_id TEXT NOT NULL,
      alias TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (tag_id, alias)
    );

    CREATE TABLE IF NOT EXISTS skill_tags (
      skill_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      match_kind TEXT NOT NULL,
      weight REAL NOT NULL,
      source TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (skill_id, tag_id, match_kind)
    );

    CREATE TABLE IF NOT EXISTS project_scopes (
      project_scope TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      metadata_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS skill_scopes (
      skill_id TEXT NOT NULL,
      scope_type TEXT NOT NULL,
      project_scope TEXT,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (skill_id, scope_type, project_scope)
    );

    CREATE TABLE IF NOT EXISTS entity_relations (
      source_type TEXT NOT NULL,
      source_id TEXT NOT NULL,
      relation_type TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      weight REAL NOT NULL,
      metadata_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (source_type, source_id, relation_type, target_type, target_id)
    );

    CREATE TABLE IF NOT EXISTS index_meta (
      meta_key TEXT PRIMARY KEY,
      meta_value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

export function clearRelationalIndex(db) {
  db.exec(`
    DELETE FROM skill_tags;
    DELETE FROM tag_aliases;
    DELETE FROM entity_relations;
    DELETE FROM skill_scopes;
    DELETE FROM project_scopes;
    DELETE FROM tags;
    DELETE FROM skills;
    DELETE FROM index_meta;
  `);
}

export function writeIndexMeta(db, meta = {}) {
  const stmt = db.prepare(`
    INSERT INTO index_meta (meta_key, meta_value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(meta_key) DO UPDATE SET
      meta_value = excluded.meta_value,
      updated_at = excluded.updated_at
  `);
  const updatedAt = nowIso();
  for (const [key, value] of Object.entries(meta)) {
    stmt.run(key, typeof value === 'string' ? value : JSON.stringify(value), updatedAt);
  }
}

export function readIndexMeta(db) {
  const rows = db.prepare(`SELECT meta_key, meta_value FROM index_meta`).all();
  const meta = {};
  for (const row of rows) {
    let value = row.meta_value;
    const trimmed = String(row.meta_value).trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        value = JSON.parse(row.meta_value);
      } catch {
        value = row.meta_value;
      }
    }
    meta[row.meta_key] = value;
  }
  return meta;
}

export function assertReadableIndex(db) {
  const tableStmt = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name = ?`);
  for (const tableName of REQUIRED_TABLES) {
    const row = tableStmt.get(tableName);
    if (!row?.name) {
      const error = new Error(`relational index missing required table: ${tableName}`);
      error.code = 'INDEX_SCHEMA_MISMATCH';
      throw error;
    }
  }

  const meta = readIndexMeta(db);
  for (const key of REQUIRED_META_KEYS) {
    if (!(key in meta)) {
      const error = new Error(`relational index missing required meta key: ${key}`);
      error.code = 'INDEX_META_MISSING';
      throw error;
    }
  }

  if (String(meta.schemaVersion) !== RELATIONAL_INDEX_SCHEMA_VERSION) {
    const error = new Error(`unsupported relational index schema version: ${meta.schemaVersion}`);
    error.code = 'INDEX_SCHEMA_VERSION_UNSUPPORTED';
    throw error;
  }

  return meta;
}

export function normalizeSkillRecord(entry, { scanId = null, sourceId = null } = {}) {
  const scopeType = 'global';
  const projectScope = null;
  return {
    id: entry.registryId,
    name: entry.name,
    skill_kind: entry.skillKind,
    description: entry.description,
    source_id: sourceId ?? entry.sourceId ?? null,
    source_path: entry.sourceRef?.path || '',
    scope_type: scopeType,
    project_scope: projectScope,
    scan_id: scanId ?? entry.registryMeta?.scanId ?? null,
    updated_at: nowIso(),
    payload_json: stringifyJson(entry),
  };
}

export function normalizeTagRecords(entry) {
  const tags = [];
  const profile = entry.routingProfile || {};
  const makeTag = (tagId, tagType, description, source) => ({
    id: `${tagType}:${tagId}`,
    name: tagId,
    tag_type: tagType,
    short_description: description,
    scope_type: 'global',
    project_scope: null,
    aliases: [tagId],
    metadata_json: stringifyJson({ source }),
    updated_at: nowIso(),
  });

  if (hasText(profile.skillRole)) {
    tags.push(makeTag(profile.skillRole, 'skill_role', `Skill role extracted from skill ${entry.name}`, 'routingProfile.skillRole'));
  }
  if (hasText(profile.skillCategory)) {
    tags.push(makeTag(profile.skillCategory, 'skill_category', `Skill category extracted from skill ${entry.name}`, 'routingProfile.skillCategory'));
  }
  for (const tag of profile.tags || []) {
    tags.push(makeTag(tag, 'open_tag', `Open tag extracted from skill ${entry.name}`, 'routingProfile.tags'));
  }
  for (const tool of profile.requiredTools || []) {
    tags.push(makeTag(tool, 'tool', `Tool hint extracted from skill ${entry.name}`, 'routingProfile.requiredTools'));
  }
  for (const scene of profile.applicableScenes || []) {
    tags.push(makeTag(scene, 'workflow', `Applicable scene extracted from skill ${entry.name}`, 'routingProfile.applicableScenes'));
  }
  return dedupeTagRecords(tags);
}

function dedupeTagRecords(records = []) {
  const seen = new Map();
  for (const record of records) {
    if (!seen.has(record.id)) seen.set(record.id, record);
  }
  return [...seen.values()];
}

export function upsertSkillRecord(db, skillRecord) {
  db.prepare(`
    INSERT INTO skills (id, name, skill_kind, description, source_id, source_path, scope_type, project_scope, scan_id, updated_at, payload_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      skill_kind = excluded.skill_kind,
      description = excluded.description,
      source_id = excluded.source_id,
      source_path = excluded.source_path,
      scope_type = excluded.scope_type,
      project_scope = excluded.project_scope,
      scan_id = excluded.scan_id,
      updated_at = excluded.updated_at,
      payload_json = excluded.payload_json
  `).run(
    skillRecord.id,
    skillRecord.name,
    skillRecord.skill_kind,
    skillRecord.description,
    skillRecord.source_id,
    skillRecord.source_path,
    skillRecord.scope_type,
    skillRecord.project_scope,
    skillRecord.scan_id,
    skillRecord.updated_at,
    skillRecord.payload_json,
  );
}

export function upsertTagRecord(db, tagRecord) {
  db.prepare(`
    INSERT INTO tags (id, name, tag_type, short_description, scope_type, project_scope, metadata_json, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      tag_type = excluded.tag_type,
      short_description = excluded.short_description,
      scope_type = excluded.scope_type,
      project_scope = excluded.project_scope,
      metadata_json = excluded.metadata_json,
      updated_at = excluded.updated_at
  `).run(
    tagRecord.id,
    tagRecord.name,
    tagRecord.tag_type,
    tagRecord.short_description,
    tagRecord.scope_type,
    tagRecord.project_scope,
    tagRecord.metadata_json,
    tagRecord.updated_at,
  );

  const aliasStmt = db.prepare(`
    INSERT INTO tag_aliases (tag_id, alias, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(tag_id, alias) DO UPDATE SET
      updated_at = excluded.updated_at
  `);
  for (const alias of tagRecord.aliases || []) {
    aliasStmt.run(tagRecord.id, alias, tagRecord.updated_at);
  }
}

export function linkSkillTag(db, { skillId, tagId, matchKind = 'direct', weight = 1, source = 'scan' }) {
  db.prepare(`
    INSERT INTO skill_tags (skill_id, tag_id, match_kind, weight, source, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(skill_id, tag_id, match_kind) DO UPDATE SET
      weight = excluded.weight,
      source = excluded.source,
      updated_at = excluded.updated_at
  `).run(skillId, tagId, matchKind, weight, source, nowIso());
}

export function countIndexRows(db) {
  const count = (table) => db.prepare(`SELECT count(*) AS count FROM ${table}`).get().count;
  return {
    skills: count('skills'),
    tags: count('tags'),
    tagAliases: count('tag_aliases'),
    skillTags: count('skill_tags'),
    projectScopes: count('project_scopes'),
    skillScopes: count('skill_scopes'),
    entityRelations: count('entity_relations'),
  };
}

export default {
  RELATIONAL_INDEX_SCHEMA_VERSION,
  RELATIONAL_INDEX_VERSION,
  RELATIONAL_INDEX_PATH,
  openRelationalIndexDb,
  ensureRelationalIndexSchema,
  clearRelationalIndex,
  writeIndexMeta,
  readIndexMeta,
  assertReadableIndex,
  normalizeSkillRecord,
  normalizeTagRecords,
  upsertSkillRecord,
  upsertTagRecord,
  linkSkillTag,
  countIndexRows,
};
