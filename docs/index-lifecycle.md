# Index Lifecycle

## Purpose

This document defines how the SkillForge relational index is generated, consumed, and validated.

The index may be materialized locally.
That does not create an offline fallback mode for the product.
If live routing still requires network or model access and those dependencies are unavailable, the request should fail explicitly.

## Lifecycle Modes

### `full rebuild`

- rescan all skills
- rerun LM extraction for all skills
- rebuild all index rows
- write a new metadata version

### `incremental refresh`

- rescan only changed inputs
- update affected skills / tags / links
- write a new metadata version

This mode is not required in the first implementation.

### `read-only consume`

- load an existing index
- verify metadata and schema
- answer recall queries without mutation

This is the only allowed live runtime behavior for the index layer.

## Build Artifact

The index should be stored as a single SQLite file under the SkillForge runtime data directory.

Recommended path:

- `~/.skillforge/relational-index.sqlite`

## Required Validation Before Runtime Use

Before online routing uses the index:

1. file exists
2. SQLite file is readable
3. `schemaVersion` is supported
4. required tables are present
5. core metadata keys exist

If any check fails, the request should hard fail.

## Prohibited Live Behaviors

Online routing must not:

- trigger full skill scans
- trigger full skill LM extraction
- silently rebuild the index
- silently drop into an offline fallback retrieval path

## Build Commands

The first version should support:

- `rebuild-skill-index`
- `verify-relational-index`

`rebuild-skill-index` mutates.

`verify-relational-index` does not mutate.
