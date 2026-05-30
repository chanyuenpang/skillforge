# Relational Fuzzy Routing Design

> Based on current SkillForge routing discussions and validated against the existing OpenClaw runtime stack on `yankeeting@192.168.0.12`.

## Goal

Design a practical first version of SkillForge retrieval and routing that:

- does not require exact tag matching
- uses LM on both `skill` and `agent input`
- uses a lightweight relational index for fuzzy recall
- produces a bounded skill bundle for final LM digestion

## Why This Design Exists

Current routing has two real problems:

1. task-side understanding is too weak
2. candidate retrieval is too lexical and too brittle

That causes the routing LM to receive the wrong candidate set.

This design shifts the system toward:

- better task-side interpretation
- structured skill-side extraction
- lightweight relation-backed fuzzy recall
- final LM decision over a smaller bundle

## Core Decision

The retrieval system should not try to make the final skill decision directly.

It should do three things well:

1. interpret runtime input into usable semantic anchors
2. recall a bounded relevant bundle from project + skill + tag context
3. hand that bundle to LM for final digestion and prompt compilation

## Final Architecture

```text
SKILL.md corpus
  -> LM skill extraction
  -> skill records
  -> tag registry
  -> relation index

agent input
  -> LM task extraction
  -> task record
  -> semantic anchors

task anchors + relation index
  -> fuzzy recall
  -> bounded bundle

bounded bundle + task
  -> LM routing / digestion
  -> executor-facing prompt / steps
```

## Local Index vs Live Routing Boundary

This design allows locally materialized retrieval assets.
It does not introduce an offline fallback mode for live routing.

### Local index materialization responsibilities

- scan `skills/`
- run LM skill extraction
- normalize skill records
- build tag registry entries
- build relational index rows
- write a versioned index artifact

### Live routing responsibilities

- load a previously built index
- run task-side LM extraction
- perform fuzzy recall against the loaded index
- run final LM digestion over the bounded bundle

### Explicit rule

`resolveSkills()` must not trigger:

- full skill corpus scan
- full skill LM extraction
- silent index rebuild

Those belong to the local index materialization flow only.

### Non-goal

If live routing still needs model or network access and those dependencies are unavailable, the request must fail.
The local index is not a substitute for LM-required steps.

## Index Lifecycle

The relational index needs an explicit lifecycle rather than implicit rebuild behavior.

### Index actions

- `full rebuild`
  - rescan all skills
  - rerun LM extraction for all inputs
  - regenerate all relational rows
  - emit a new index version

- `incremental refresh`
  - rerun extraction only for changed or newly added skills
  - update affected tag and relation records
  - emit a new index version

- `read-only consume`
  - live routing loads an existing version
  - no scan side effects
  - no write side effects

### Index metadata

Every built index should expose:

- `indexVersion`
- `builtAt`
- `sourceId`
- `scanId`
- `skillCount`
- `tagCount`
- `relationCount`
- `schemaVersion`

### Runtime validation

Before live routing uses the index, the runtime should verify:

- the index file exists
- `schemaVersion` is supported
- the index is readable
- the expected core tables are present

If these checks fail, the request should fail explicitly.

## Shared Extraction Frame

The system should not force a rigid global tag dictionary first.

Instead, it should use a stable extraction frame with open values.

### Stable fields

- `taskTypes`
- `workflowStages`
- `artifactTargets`
- `toolHints`
- `agentArchetypes`
- `constraints`
- `reportExpectations`
- `openTags`

These are stable slots.

Their values are allowed to grow from real skills and real prompts.

## Tag Strategy

Tags are important assets, but they should not start as heavyweight prose documents.

The first version should maintain a lightweight `tag registry`.

### Tag registry record

Each tag record should contain:

- `id`
- `type`
- `name`
- `shortDescription`
- `aliases`
- `scope`
- `linkedSkills`

### Recommended first tag types

- `project`
- `workflow`
- `tool`
- `agent_archetype`
- `artifact_target`

These types should be maintained separately because they should not receive the same ranking treatment.

## Fuzzy Recall Design

Retrieval should not be exact tag lookup.

It should be fuzzy recall driven by semantic anchors.

### Retrieval inputs

- task record
- tag registry
- skill records
- project scope

### Retrieval outputs

- bounded candidate skill bundle

### Retrieval rules

1. remove only obvious mismatches
2. score direct skill matches
3. score tag hits
4. when a tag hits, boost linked skills
5. expand through simple project-scoped relations where useful
6. return a small bundle, not a single winner

This means retrieval success in v1 is already meaningful if:

- 20 project skills can be reduced to 5 to 8 likely candidates
- obvious non-matching skills are excluded

## Ranking Explainability

The retrieval layer must return structured scoring evidence.

Recommended explain structure per candidate:

- `candidateId`
- `matchedFields`
- `matchedTags`
- `matchedAliases`
- `scopeBoosts`
- `relationBoosts`
- `finalScore`

This explain payload is not optional observability sugar.

It is required to distinguish:

- bad task extraction
- bad index content
- bad fuzzy recall
- bad final LM judgment

## Final LM Role

The final LM should decide:

- which bundle members are truly central
- which are only supporting context
- which steps should be compiled into the final executor package

The relational layer should not replace this final semantic judgment.

## Relational Index Recommendation

For v1, use a lightweight relational database.

Do not start with a graph database.

Do not start with a heavyweight ontology engine.

### Why relational DB is enough

The first version mainly needs:

- skills
- tags
- skill-tag links
- project scopes
- simple relation links
- optional weights later

This is naturally representable in relational form.

## Existing Runtime Stack We Should Reuse

The current OpenClaw host already has the right foundation.

Validated on `yankeeting@192.168.0.12`:

- SQLite runtime support via [src/infra/node-sqlite.ts](</home/yankeeting/.openclaw/projects/openclaw-dev/src/infra/node-sqlite.ts>)
- `sqlite-vec` available and already smoke-tested via [scripts/sqlite-vec-smoke.mjs](</home/yankeeting/.openclaw/projects/openclaw-dev/scripts/sqlite-vec-smoke.mjs>)
- existing embedding provider abstraction in [src/plugins/memory-embedding-providers.ts](</home/yankeeting/.openclaw/projects/openclaw-dev/src/plugins/memory-embedding-providers.ts>)
- existing embeddings HTTP entry in [src/gateway/embeddings-http.ts](</home/yankeeting/.openclaw/projects/openclaw-dev/src/gateway/embeddings-http.ts>)
- existing vector-writing pattern in [src/agents/truth-source-vector-index.ts](</home/yankeeting/.openclaw/projects/openclaw-dev/src/agents/truth-source-vector-index.ts>)

This means SkillForge does not need to invent a new storage substrate first.

## Recommendation For V1 Storage

### Use now

- SQLite
- ordinary relational tables
- optional `sqlite-vec` support for later fuzzy similarity or hybrid ranking

### Do not require in first cut

- graph database
- advanced graph traversal engine
- heavy weight learning system

## Proposed V1 Tables

- `skills`
- `skill_fields`
- `tags`
- `tag_aliases`
- `skill_tags`
- `project_scopes`
- `skill_scopes`
- `entity_relations`

Optional later:

- `tag_embeddings`
- `skill_embeddings`
- `relation_weights`
- `selection_feedback`
- `routing_runs`

## Ranking Logic v1

The ranking logic should stay simple.

### Base signals

- direct skill field overlap
- direct tag hit
- alias hit
- project scope hit

### Weighted signals

- `project`
- `workflow`
- `tool`

### Weak weighted signals

- `agent_archetype`
- `artifact_target`

This avoids generic tags like `review` or `coding` from dominating every search.

The first version should store or emit explain fields alongside this logic.

## Ranking Logic v2

Only after enough real traffic and logged decisions:

- add relation weights
- add tag co-occurrence weights
- add project-specific learned boosts
- optionally add vector-assisted reranking

## Why This Is Better Than Exact Matching

Exact tag matching assumes:

- tags are clean
- prompts are explicit
- meaning is literal

In real agent workflows, none of those assumptions are stable enough.

The better approach is:

- LM creates anchors
- relational index performs fuzzy recall
- LM performs final digestion

## Scope Boundary

This design is intentionally first-version scoped.

It does not try to solve:

- perfect routing
- autonomous ontology design
- full semantic graph governance
- learned ranking from day one
- fully automated online index mutation

It only tries to create a retrieval system that is materially better than:

- raw full-skill loading
- brittle lexical overlap

## Recommendation

Build v1 on:

- LM extraction on both sides
- lightweight relational fuzzy recall
- sqlite + sqlite-vec-compatible storage path
- final LM bundle digestion

This is the most practical route that matches both the product goal and the existing runtime stack.

## Failure Model

No silent fallback is allowed in the production path.

### Failure categories

- `TASK_EXTRACTION_FAILED`
- `INDEX_NOT_FOUND`
- `INDEX_SCHEMA_MISMATCH`
- `INDEX_LOAD_FAILED`
- `RECALL_EMPTY`
- `FINAL_ROUTING_FAILED`
- `FINAL_COMPILATION_FAILED`

### Policy

- task extraction failure: hard fail
- missing or unreadable index: hard fail
- unsupported index version: hard fail
- empty recall: allowed product result only if explicitly represented and logged; otherwise treated as `RECALL_EMPTY`
- final LM routing failure: hard fail
- final compilation failure: hard fail

### Required structured diagnostics

Every failed run should record:

- `failureCode`
- `failureStage`
- `indexVersion`
- `scanId`
- task extraction result if available
- candidate explain payload if available
- raw LM error metadata if available

## Test Strategy

The majority of tests should not depend on live LM behavior.

### Deterministic tests

- schema/bootstrap tests
- tag normalization tests
- index read/write tests
- recall scoring tests
- resolver contract tests

### Live-model tests

- a very small number of smoke tests
- a very small number of remote runtime validation tests

The system should avoid treating model drift as normal unit-test regression.
