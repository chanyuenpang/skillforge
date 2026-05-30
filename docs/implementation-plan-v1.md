# SkillForge Implementation Plan v1

## Purpose

This document turns the current product and technical framework into a practical implementation sequence.

It is intentionally narrow.

The goal is not to rebuild everything at once.

The goal is to move the repository from:

- partially aligned prototype modules

to:

- one coherent runtime path connected to the real OpenClaw `skills/` corpus

## Guiding Principle

The first implementation phase should optimize for:

1. realism
2. continuity
3. debuggability

That means:

- use real production skill samples
- preserve working CLI entrypoints where possible
- introduce structured logs early enough to explain failures

## LM Boundary For Phase 1

Phase 1 should use LM in every place where semantic extraction or synthesis is fundamental.

Use LM for:

- extracting indexable structure from non-standard skill files
- `betterPlan` review
- `betterPrompt` compilation

Do not depend on LM for:

- tool-fit gating
- structured log persistence

Why:

- the product cannot reliably achieve its goals without deep LM participation
- the stable programmatic layer should still own validation and persistence

## Phase 1 Goal

Phase 1 is successful if all of the following are true:

1. `betterPlan` behaves like a review layer instead of a skeleton extractor
2. `skill register` can scan and return routing candidates from the real `skills/` directory
3. `betterPrompt` consumes those candidates and emits a routing-aware compiled package
4. one routed run can be captured as a structured log record

Phase 1 is not trying to solve:

- deep workflow AST extraction
- full agent orchestration
- UI
- replay engine
- advanced governance

## Implementation Order

### Step 1. Reframe `betterPlan`

Target files:

- [src/skillforge/betterplan-contract.mjs](D:/Users/chany/Documents/SkillForge/src/skillforge/betterplan-contract.mjs)
- [src/skillforge/betterplan-pipeline.mjs](D:/Users/chany/Documents/SkillForge/src/skillforge/betterplan-pipeline.mjs)
- [scripts/skillforge-operate-betterplan.mjs](D:/Users/chany/Documents/SkillForge/scripts/skillforge-operate-betterplan.mjs)

Change:

- keep the pipeline shell
- replace the output contract
- stop treating the result as a task skeleton
- start treating the result as a workflow-grounded plan review object

New minimum output:

```json
{
  "summary": "plan is mostly executable but missing explicit final verification",
  "workflowBasis": [
    "skills/browser-agent-workflow"
  ],
  "findings": [
    {
      "severity": "warning",
      "type": "missing_done_criteria",
      "message": "final verification criteria are underspecified",
      "suggestion": "add a concrete success check for the final task"
    },
    {
      "severity": "warning",
      "type": "workflow_step_gap",
      "message": "the plan skips preflight tool validation expected by the matched workflow skeleton",
      "suggestion": "add an explicit environment or tool-availability check before execution"
    }
  ]
}
```

What we are not doing yet:

- rewriting the plan structure itself
- generating a replacement plan

What we are doing:

- reviewing the plan against both:
  - generic planning rules
  - reusable workflow skeleton expectations from relevant skills

Why this step comes first:

- it aligns the first runtime hook with the current product definition
- it is relatively contained

### Step 2. Introduce register v1 schema into the scanner

Target files:

- [src/skillforge/registry-scan-pipeline.mjs](D:/Users/chany/Documents/SkillForge/src/skillforge/registry-scan-pipeline.mjs)
- [src/skillforge/registry-entry.mjs](D:/Users/chany/Documents/SkillForge/src/skillforge/registry-entry.mjs)

Change:

- keep directory walking and `SKILL.md` discovery
- stop centering scan output around publish/fixture metadata
- produce lightweight routing entries aligned with [docs/skill-register-schema-draft.md](D:/Users/chany/Documents/SkillForge/docs/skill-register-schema-draft.md)

New minimum scanned fields:

- `id`
- `name`
- `kind`
- `description`
- `sourceRef`
- `applicableScenes`
- `requiredTools`
- `toolSignals`
- `entrypointHints`
- `reportHints`
- `stopRuleHints`
- `constraintHints`

What we are not doing yet:

- deep workflow step extraction
- scoring in the scanner

LM note:

- this step should explicitly use LM to convert messy skill files into routing-oriented intermediate structure
- the program should validate and persist the returned structure instead of trying to replace the semantic extraction itself

Why this step comes second:

- it turns the real `skills/` corpus into usable routing data

### Step 3. Replace the frozen resolver source

Target files:

- [src/skillforge/skill-resolver.mjs](D:/Users/chany/Documents/SkillForge/src/skillforge/skill-resolver.mjs)
- potentially a new file such as `src/skillforge/skill-register-query.mjs`

Change:

- stop using the frozen in-code registry as the main source
- resolve from scanned register entries instead
- fail explicitly if scanned entries cannot be produced; do not hide missing LM/provider conditions behind fallback behavior

New minimum resolver behavior:

1. accept task text plus optional tool context
2. filter candidates by tool fit
3. score remaining candidates by scene/tag/text relevance
4. return selected and rejected candidates

LM note:

- phase 1 resolver can combine:
  - LM-derived index structure from the scanner
  - programmatic gating and filtering
  - optional lightweight ranking logic
- the important point is that retrieval is already built on LM-derived intermediate representations

New minimum resolver output:

```json
{
  "candidates": [...],
  "selected": [...],
  "rejected": [
    { "id": "skills/git-workflow", "reason": "missing required tool: git" }
  ]
}
```

What we are not doing yet:

- sophisticated ranking models
- multi-stage ensemble retrieval

Why this step comes third:

- this is the biggest realism upgrade in the codebase

### Step 4. Rewire `betterPrompt` around routing-aware input

Target files:

- [src/skillforge/betterprompt-v1-contract.mjs](D:/Users/chany/Documents/SkillForge/src/skillforge/betterprompt-v1-contract.mjs)
- [src/skillforge/betterprompt-builder.mjs](D:/Users/chany/Documents/SkillForge/src/skillforge/betterprompt-builder.mjs)
- [src/skillforge/prompt-assembler.mjs](D:/Users/chany/Documents/SkillForge/src/skillforge/prompt-assembler.mjs)
- [scripts/skillforge-operate-betterprompt.mjs](D:/Users/chany/Documents/SkillForge/scripts/skillforge-operate-betterprompt.mjs)

Change:

- evolve from prompt-centric template generation
- toward spawn-boundary execution compilation

New minimum input:

- `rawPrompt`
- `taskContext`
- `planContext`
- register candidates

New minimum output:

- `routing.selected`
- `routing.rejected`
- `routing.rationale`
- `execution.objective`
- `execution.steps`
- `constraints`
- `report`
- `trace`

What we are not doing yet:

- deep executor specialization
- large workflow synthesis from many skills

Why this step comes fourth:

- it depends on register realism
- it is the heart of the product differentiation

Boundary note:

- the executor that consumes this package is downstream from SkillForge
- phase 1 does not implement an internal executor subsystem

LM note:

- this is the main semantic synthesis point in the phase 1 system
- most routing interpretation should happen here after program-side candidate preparation

### Step 5. Add a unified routed-run log record

Target files:

- [src/skillforge/transcript-store.mjs](D:/Users/chany/Documents/SkillForge/src/skillforge/transcript-store.mjs)
- [src/skillforge/raw-artifact-store.mjs](D:/Users/chany/Documents/SkillForge/src/skillforge/raw-artifact-store.mjs)
- likely a new file such as `src/skillforge/routed-run-store.mjs`
- [scripts/skillforge-operate-betterplan.mjs](D:/Users/chany/Documents/SkillForge/scripts/skillforge-operate-betterplan.mjs)
- [scripts/skillforge-operate-betterprompt.mjs](D:/Users/chany/Documents/SkillForge/scripts/skillforge-operate-betterprompt.mjs)

Change:

- stop relying only on ad hoc execution-log append lines
- add one structured run record per routed flow

Minimum stored sections:

- `userRequest`
- `plan`
- `retrieval`
- `compilation`
- `execution`
- `diagnosis`

What we are not doing yet:

- analytics dashboards
- automatic root-cause inference

Why this step comes fifth:

- once the other boundaries are aligned, logs become genuinely meaningful

## Workstreams

### Workstream A: Contract Alignment

Includes:

- `betterPlan` contract rewrite
- `betterPrompt` contract rewrite
- register schema alignment

Success condition:

- docs and code shapes match closely enough that CLI output can be judged against the docs

### Workstream B: Real Skill Ingestion

Includes:

- scan real `skills/`
- normalize minimal routing metadata
- expose candidate entries

Success condition:

- the resolver path no longer depends primarily on hand-written in-code skill definitions

### Workstream C: Routing and Compilation

Includes:

- candidate filtering
- selected vs rejected rationale
- compiled execution package generation

Success condition:

- `betterPrompt` output clearly shows how routing informed execution

### Workstream D: Logging

Includes:

- routed run record
- transcript and artifact linking
- failure-stage visibility

Success condition:

- one real run can be reviewed end-to-end

## Safe Reuse vs Replacement

### Safe to Reuse

- CLI entrypoints
- provider config path
- transcript store
- raw artifact store
- skill scanning directory traversal
- low-level prompt assembly helper

### Must Be Reworked

- `betterPlan` output contract
- `registry-entry` semantics
- frozen resolver registry
- `betterPrompt` output framing
- ad hoc execution log format

## Risk Control

### Risk 1: Range Explosion

Mitigation:

- do not implement deep workflow parsing in phase 1
- do not touch UI
- do not rebuild everything under `src/skillforge/` at once

### Risk 2: Breaking Existing CLI Usage

Mitigation:

- preserve current script entrypoints
- evolve payloads behind the same commands where possible

### Risk 3: Resolver Rewrite Becomes Too Big

Mitigation:

- use explicit failure semantics and structured logs instead of hidden fallback paths
- start with exact and shallow normalization
- avoid model-dependent retrieval logic in v1

## Suggested File-Level Sequence

1. rewrite `betterplan-contract.mjs`
2. adapt `betterplan-pipeline.mjs`
3. add scanned register entry shape
4. build register query path from scanned entries
5. replace resolver source
6. evolve `betterprompt-v1-contract.mjs`
7. evolve `betterprompt-builder.mjs`
8. add structured routed-run store
9. update CLI scripts to emit the new records

## Verification Strategy

After each step, verify at the CLI level before moving on.

Minimum checks:

1. `pnpm betterplan` returns a review-shaped payload
2. register scan returns entries from real `skills/`
3. `pnpm betterprompt` returns routing-aware compiled output
4. one run produces a structured log record

## Immediate Next Coding Step

The next coding step should be:

- rewrite `betterPlan` contract from skeleton output to review output

Reason:

- smallest contained cut
- aligns the first runtime hook
- creates momentum without forcing the resolver rewrite immediately
