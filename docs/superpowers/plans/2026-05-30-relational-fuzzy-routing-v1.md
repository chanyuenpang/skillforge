# Relational Fuzzy Routing V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a first working SkillForge routing stack that uses LM extraction plus SQLite-backed fuzzy recall to reduce candidate skills before final LM routing, with a locally materialized index, no offline fallback path, and an explicit failure model.

**Architecture:** Keep the first version narrow. Reuse the current LM skill extraction path, add task-side extraction, store skill/tag relationships in SQLite, and retrieve a bounded bundle for final LM digestion. Live routing may consume a previously built local index and must not trigger a full skill scan. Do not build a heavy graph engine or learned weighting system in v1. If a step still needs model or network access and those dependencies are unavailable, fail directly.

**Tech Stack:** Node.js ESM, `node:sqlite`, existing SkillForge LM pipeline, OpenClaw-compatible embedding provider abstractions, optional `sqlite-vec`.

---

## File Map

### Existing files to modify

- `src/skillforge/registry-scan-pipeline.mjs`
  - extend skill extraction output with typed tags and semantic anchor fields
- `src/skillforge/registry-entry.mjs`
  - add normalized relational/indexable fields
- `src/skillforge/skill-resolver.mjs`
  - replace lexical-first shortlist with task-side extraction + relational recall over a loaded index
- `src/skillforge/betterprompt-builder.mjs`
  - consume bounded bundle metadata and preserve routing diagnostics
- `scripts/debug-skill-routing.mjs`
  - print task-side extraction, tag hits, and relation-backed bundle details

### New files to create

- `src/skillforge/task-extraction.mjs`
  - LM task-side extraction for runtime input
- `src/skillforge/tag-registry.mjs`
  - in-memory record normalization and shape helpers
- `src/skillforge/relational-index.sqlite.mjs`
  - SQLite bootstrap and CRUD helpers for skills/tags/links plus version metadata
- `src/skillforge/relational-recall.mjs`
  - bounded fuzzy recall over skill/tag/project links
- `scripts/rebuild-skill-index.mjs`
  - CLI to rescan skills and rebuild SQLite relational index
- `scripts/verify-relational-index.mjs`
  - CLI to validate an existing built index without mutating it

### New docs/tests to create

- `docs/relational-index-schema.md`
  - final table schema reference for SkillForge
- `docs/index-lifecycle.md`
  - full rebuild / incremental refresh / read-only consume rules
- `tests/skillforge/task-extraction.test.mjs`
- `tests/skillforge/relational-recall.test.mjs`
- `tests/skillforge/routing-bundle.test.mjs`
- `tests/skillforge/index-bootstrap.test.mjs`

---

## Phase Boundaries

### Phase 1: Local index materialization loop

Deliverables:

- schema bootstrap
- skill scan to SQLite
- tag registry rows
- index metadata/versioning
- read-only verification command

Acceptance:

- building the index does not require the online resolver
- this phase does not create an offline fallback route for live requests

### Phase 2: Live routing integration

Deliverables:

- task extraction
- read-only index loading
- relational fuzzy recall
- final LM digestion
- observability payloads

Acceptance:

- live requests do not trigger full skill scans
- routing failures can be localized to extraction / index / recall / final LM

---

### Task 1: Define the V1 relational schema and lifecycle

**Files:**
- Create: `docs/relational-index-schema.md`
- Create: `docs/index-lifecycle.md`
- Create: `src/skillforge/relational-index.sqlite.mjs`
- Test: `tests/skillforge/index-bootstrap.test.mjs`

- [ ] **Step 1: Write the schema doc first**

Document these tables and columns:

- `skills`
- `tags`
- `tag_aliases`
- `skill_tags`
- `project_scopes`
- `skill_scopes`
- `entity_relations`
- `index_meta`

Include primary keys and intended lookup columns.

Document lifecycle actions:

- full rebuild
- incremental refresh
- read-only consume

- [ ] **Step 2: Write a failing schema bootstrap test**

Create a test that opens a temporary SQLite DB and asserts those tables exist after bootstrap, and that metadata can be written and read.

- [ ] **Step 3: Implement SQLite bootstrap**

In `src/skillforge/relational-index.sqlite.mjs`, add:

- `openRelationalIndexDb(dbPath?)`
- `ensureRelationalIndexSchema(db)`
- `readIndexMeta(db)`
- `writeIndexMeta(db, meta)`
- `assertReadableIndex(db)`

Reuse the `node:sqlite` access pattern already used in OpenClaw.

- [ ] **Step 4: Run the schema bootstrap test**

Run: `node --test tests/skillforge/index-bootstrap.test.mjs`

Expected: table existence assertions pass.

- [ ] **Step 5: Commit**

```bash
git add docs/relational-index-schema.md docs/index-lifecycle.md src/skillforge/relational-index.sqlite.mjs tests/skillforge/index-bootstrap.test.mjs
git commit -m "feat: add relational routing index lifecycle"
```

### Task 2: Add task-side LM extraction

**Files:**
- Create: `src/skillforge/task-extraction.mjs`
- Test: `tests/skillforge/task-extraction.test.mjs`
- Modify: `src/skillforge/skill-resolver.mjs`

- [ ] **Step 1: Write a failing task extraction test**

Test that a runtime task like `run a runtime gameplay test for tiny-world` produces a structured record with:

- `taskTypes`
- `workflowStages`
- `artifactTargets`
- `toolHints`
- `agentArchetypes`
- `openTags`

- [ ] **Step 2: Implement task extraction module**

Create `extractTaskRecord({ text, planContext, runtimeContext, projectScope })`.

Use `callJsonModel()` and require a JSON object with the shared stable fields.

- [ ] **Step 3: Wire task extraction into resolver entry**

In `skill-resolver.mjs`, replace direct lexical-only `collectContextSignals()` as the primary understanding layer with:

- task extraction first
- lexical baseline only as a debug comparison signal, not a production fallback

- [ ] **Step 4: Run the task extraction test**

Run: `node --test tests/skillforge/task-extraction.test.mjs`

Expected: extracted record matches schema shape.

- [ ] **Step 5: Commit**

```bash
git add src/skillforge/task-extraction.mjs src/skillforge/skill-resolver.mjs tests/skillforge/task-extraction.test.mjs
git commit -m "feat: add task-side routing extraction"
```

### Task 3: Normalize skill-side typed tags

**Files:**
- Modify: `src/skillforge/registry-scan-pipeline.mjs`
- Modify: `src/skillforge/registry-entry.mjs`
- Create: `src/skillforge/tag-registry.mjs`
- Test: `tests/skillforge/routing-bundle.test.mjs`

- [ ] **Step 1: Write a failing skill extraction shape test**

Test that a scanned skill can emit typed tags under:

- `project`
- `workflow`
- `tool`
- `agent_archetype`
- `artifact_target`

- [ ] **Step 2: Extend LM extraction prompt**

Update `registry-scan-pipeline.mjs` so skill-side extraction returns:

- stable fields
- open tags
- typed tag buckets

- [ ] **Step 3: Extend registry entry shape**

Update `registry-entry.mjs` to preserve those typed tags in a stable stored form.

- [ ] **Step 4: Add tag normalization helper**

In `tag-registry.mjs`, implement:

- `normalizeTagRecord`
- `normalizeTagType`
- `collectLinkedSkills`

- [ ] **Step 5: Run skill extraction shape test**

Run: `node --test tests/skillforge/routing-bundle.test.mjs`

Expected: extracted skill record exposes typed tags.

- [ ] **Step 6: Commit**

```bash
git add src/skillforge/registry-scan-pipeline.mjs src/skillforge/registry-entry.mjs src/skillforge/tag-registry.mjs tests/skillforge/routing-bundle.test.mjs
git commit -m "feat: add typed skill tags for routing"
```

### Task 4: Persist skill-tag links in SQLite

**Files:**
- Modify: `src/skillforge/registry-scan-pipeline.mjs`
- Modify: `src/skillforge/relational-index.sqlite.mjs`
- Create: `scripts/rebuild-skill-index.mjs`
- Create: `scripts/verify-relational-index.mjs`
- Test: `tests/skillforge/relational-recall.test.mjs`

- [ ] **Step 1: Write a failing persistence test**

Test that scanning one skill writes:

- one `skills` row
- multiple `tags` rows
- multiple `skill_tags` rows

- [ ] **Step 2: Implement write helpers**

In `relational-index.sqlite.mjs`, add:

- `upsertSkillRecord`
- `upsertTagRecord`
- `linkSkillTag`

- [ ] **Step 3: Update scan pipeline to persist into SQLite**

After successful skill extraction, write:

- skill row
- typed tag rows
- skill-tag links

- [ ] **Step 4: Add rebuild CLI**

Create `scripts/rebuild-skill-index.mjs` to:

- rescan `skills/`
- rebuild relational rows
- print summary counts

Create `scripts/verify-relational-index.mjs` to:

- load an existing index
- assert schema compatibility
- print metadata and row counts
- not mutate the index

- [ ] **Step 5: Run the persistence test**

Run: `node --test tests/skillforge/relational-recall.test.mjs`

Expected: DB row counts match the extracted record.

- [ ] **Step 6: Commit**

```bash
git add src/skillforge/registry-scan-pipeline.mjs src/skillforge/relational-index.sqlite.mjs scripts/rebuild-skill-index.mjs tests/skillforge/relational-recall.test.mjs
git commit -m "feat: persist skill tag links in sqlite"
```

### Task 5: Implement bounded fuzzy recall

**Files:**
- Create: `src/skillforge/relational-recall.mjs`
- Modify: `src/skillforge/skill-resolver.mjs`
- Test: `tests/skillforge/relational-recall.test.mjs`

- [ ] **Step 1: Write failing recall tests**

Cover:

- direct skill hit
- tag hit boosting linked skills
- project-scoped hit
- generic archetype hit staying lower weight than workflow/tool hits

- [ ] **Step 2: Implement relational recall**

In `relational-recall.mjs`, implement:

- `recallSkillBundle(taskRecord, options)`
- score direct skill overlap
- score tag hits
- boost linked skills
- return top 5 to 8 candidates
- emit explain payloads per candidate

- [ ] **Step 3: Replace lexical shortlist path**

In `skill-resolver.mjs`, change the main retrieval path to:

- task extraction
- read-only index loading
- relational recall
- routing LM over recalled bundle

Keep lexical overlap only as a debug or local comparison baseline.

- [ ] **Step 4: Run recall tests**

Run: `node --test tests/skillforge/relational-recall.test.mjs`

Expected: bundle contains relevant workflow/tool/archetype entries in sensible order, and exposes explain fields such as matched tags, boosts, and final score.

- [ ] **Step 5: Commit**

```bash
git add src/skillforge/relational-recall.mjs src/skillforge/skill-resolver.mjs tests/skillforge/relational-recall.test.mjs
git commit -m "feat: add relational fuzzy recall for routing"
```

### Task 6: Improve debug and routed-run observability

**Files:**
- Modify: `scripts/debug-skill-routing.mjs`
- Modify: `scripts/skillforge-operate-betterprompt.mjs`
- Modify: `src/skillforge/routed-run-store.mjs`
- Test: `tests/skillforge/routing-bundle.test.mjs`

- [ ] **Step 1: Write a failing observability test**

Test that a routing failure now persists:

- task record
- recalled bundle
- tag hits
- routing rationale
- index version
- explain payload

- [ ] **Step 2: Extend debug script output**

Print:

- task-side extraction
- tag hits
- bundle composition
- LM raw selection

- [ ] **Step 3: Extend routed-run failure payload**

Persist:

- selected bundle ids
- boost reasons
- task extraction summary
- index version / scan id
- failure code

- [ ] **Step 4: Run observability test**

Run: `node --test tests/skillforge/routing-bundle.test.mjs`

Expected: failure records include retrieval evidence.

- [ ] **Step 5: Commit**

```bash
git add scripts/debug-skill-routing.mjs scripts/skillforge-operate-betterprompt.mjs src/skillforge/routed-run-store.mjs tests/skillforge/routing-bundle.test.mjs
git commit -m "feat: improve routing observability"
```

### Task 7: Validate end-to-end on the OpenClaw runtime host

**Files:**
- Modify: `docs/openclaw-logging-readiness.md`
- Modify: `docs/routing-implementation-proposal.md`

- [ ] **Step 1: Rebuild skill index locally**

Run: `node scripts/rebuild-skill-index.mjs`

Expected: summary counts for skills, tags, and links.

- [ ] **Step 2: Run local debug routing**

Run: `node scripts/debug-skill-routing.mjs --prompt "run a runtime gameplay test for tiny-world" --json`

Expected: bounded bundle with plausible workflow/tool skills.

- [ ] **Step 3: Pull to remote OpenClaw runtime**
- [ ] **Step 3: Validate a fixed revision on the remote runtime**

Run on host against an explicit revision and record it in the validation notes.

- [ ] **Step 4: Run remote smoke test**

Run on host:

```bash
node scripts/skillforge-operate-betterprompt.mjs --prompt "run a runtime gameplay test for tiny-world"
```

Expected: no “0 skill” routing collapse; routed-run log captures bundle details.

Also record:

- single request latency
- bundle size
- whether the request triggered any scan or rebuild side effects

- [ ] **Step 5: Update docs with real findings**

Record:

- actual runtime stack used
- any performance bottlenecks
- any relation/weight gaps observed

- [ ] **Step 6: Commit**

```bash
git add docs/openclaw-logging-readiness.md docs/routing-implementation-proposal.md
git commit -m "docs: record relational routing runtime validation"
```

---

## Self-Review Notes

### Spec coverage

This plan covers:

- LM task extraction
- typed skill tags
- lightweight SQLite relational index
- fuzzy bundle recall
- observability
- remote validation

### Placeholder scan

No `TODO` / `TBD` placeholders intentionally left in steps.

### Scope check

This plan is intentionally scoped to retrieval + bundle formation.

It does not include:

- learned relation weights
- automatic feedback tuning
- vector-based reranking as a hard dependency

It also does not include:

- online index mutation
- implicit rebuild on live requests

Those belong to a later plan after v1 is validated.
