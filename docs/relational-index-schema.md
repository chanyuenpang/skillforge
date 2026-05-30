# Relational Index Schema

## Purpose

This document defines the first SQLite schema for SkillForge relational fuzzy recall.

This schema is intentionally narrow.

It is designed for:

- locally materialized index builds
- read-only live consumption of local index assets
- bounded bundle recall

It is not yet designed for:

- learned weights
- online mutation
- heavy graph traversal

It also does not define an offline fallback execution mode.
If a live routing step still needs model or network access and those dependencies are unavailable, the request should fail explicitly.

## Tables

### `skills`

Stores normalized skill records.

Columns:

- `id` TEXT PRIMARY KEY
- `name` TEXT NOT NULL
- `skill_kind` TEXT NOT NULL
- `description` TEXT NOT NULL
- `source_id` TEXT
- `source_path` TEXT NOT NULL
- `scope_type` TEXT NOT NULL
- `project_scope` TEXT
- `scan_id` TEXT
- `updated_at` TEXT NOT NULL
- `payload_json` TEXT NOT NULL

### `tags`

Stores lightweight tag registry records.

Columns:

- `id` TEXT PRIMARY KEY
- `name` TEXT NOT NULL
- `tag_type` TEXT NOT NULL
- `short_description` TEXT NOT NULL
- `scope_type` TEXT NOT NULL
- `project_scope` TEXT
- `metadata_json` TEXT NOT NULL
- `updated_at` TEXT NOT NULL

### `tag_aliases`

Stores tag alias strings.

Columns:

- `tag_id` TEXT NOT NULL
- `alias` TEXT NOT NULL
- `updated_at` TEXT NOT NULL

Primary key:

- `(tag_id, alias)`

### `skill_tags`

Links skills to tags.

Columns:

- `skill_id` TEXT NOT NULL
- `tag_id` TEXT NOT NULL
- `match_kind` TEXT NOT NULL
- `weight` REAL NOT NULL
- `source` TEXT NOT NULL
- `updated_at` TEXT NOT NULL

Primary key:

- `(skill_id, tag_id, match_kind)`

### `project_scopes`

Stores known project scopes.

Columns:

- `project_scope` TEXT PRIMARY KEY
- `description` TEXT NOT NULL
- `metadata_json` TEXT NOT NULL
- `updated_at` TEXT NOT NULL

### `skill_scopes`

Links skills to scopes.

Columns:

- `skill_id` TEXT NOT NULL
- `scope_type` TEXT NOT NULL
- `project_scope` TEXT
- `updated_at` TEXT NOT NULL

Primary key:

- `(skill_id, scope_type, project_scope)`

### `entity_relations`

Stores lightweight graph-shaped relations in relational form.

Columns:

- `source_type` TEXT NOT NULL
- `source_id` TEXT NOT NULL
- `relation_type` TEXT NOT NULL
- `target_type` TEXT NOT NULL
- `target_id` TEXT NOT NULL
- `weight` REAL NOT NULL
- `metadata_json` TEXT NOT NULL
- `updated_at` TEXT NOT NULL

Primary key:

- `(source_type, source_id, relation_type, target_type, target_id)`

### `index_meta`

Stores index lifecycle metadata.

Columns:

- `meta_key` TEXT PRIMARY KEY
- `meta_value` TEXT NOT NULL
- `updated_at` TEXT NOT NULL

## Required Metadata Keys

- `indexVersion`
- `schemaVersion`
- `builtAt`
- `sourceId`
- `scanId`
- `skillCount`
- `tagCount`
- `relationCount`
- `buildMode`

## Read-Only Consumption Rule

Live routing must only consume a previously built local index.

It must not:

- create missing tables
- rebuild rows
- rescan skill files
- run skill-side LM extraction
