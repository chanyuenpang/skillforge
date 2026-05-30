# Implementation Gap Analysis

## Purpose

This document maps the current codebase against the new SkillForge product framework.

It answers:

1. what already exists in code
2. what is partially aligned
3. what is still carrying the old product shape
4. what the next implementation cuts should be

## Executive Summary

The current repository is not empty or directionless.

It already has a usable minimal spine:

- a working `betterPlan` pipeline
- a working `betterPrompt` builder
- lightweight persistence stores
- CLI entrypoints

However, the codebase still contains three different product shapes:

1. `betterPlan` as skeleton extraction
2. old registry/publish metadata chain
3. new routing-oriented `betterPrompt`

So the main implementation problem is not lack of infrastructure.

It is misalignment between module intent and the new product definition.

## Module-by-Module Assessment

### 1. `betterPlan`

Relevant files:

- [src/skillforge/betterplan-contract.mjs](D:/Users/chany/Documents/SkillForge/src/skillforge/betterplan-contract.mjs)
- [src/skillforge/betterplan-pipeline.mjs](D:/Users/chany/Documents/SkillForge/src/skillforge/betterplan-pipeline.mjs)
- [scripts/skillforge-operate-betterplan.mjs](D:/Users/chany/Documents/SkillForge/scripts/skillforge-operate-betterplan.mjs)

Current reality:

- input is `plan` text plus optional `goal_hint`
- output is a structured skeleton
- pipeline validates input, calls model, normalizes output, and now fails explicitly when LM invocation is unavailable or invalid

What is already good:

- clear CLI entry
- stable validation layer
- explicit failure semantics with structured error codes and routed-run logging
- structured output instead of loose prose

Main gap against new product definition:

- it is still generating a task skeleton
- it is not acting as a plan review engine
- it does not return review findings, severity, or suggested corrections
- it does not preserve the original plan structure as a reviewed object

Judgment:

- keep the pipeline shell
- replace the contract and output shape
- repurpose normalization logic toward review findings

### 2. `betterPrompt`

Relevant files:

- [src/skillforge/betterprompt-v1-contract.mjs](D:/Users/chany/Documents/SkillForge/src/skillforge/betterprompt-v1-contract.mjs)
- [src/skillforge/betterprompt-builder.mjs](D:/Users/chany/Documents/SkillForge/src/skillforge/betterprompt-builder.mjs)
- [src/skillforge/prompt-assembler.mjs](D:/Users/chany/Documents/SkillForge/src/skillforge/prompt-assembler.mjs)
- [scripts/skillforge-operate-betterprompt.mjs](D:/Users/chany/Documents/SkillForge/scripts/skillforge-operate-betterprompt.mjs)

Current reality:

- accepts `prompt`, optional `goal_hint`, optional `skillAssets`
- resolves skills
- assembles a seven-section prompt template
- emits a package payload plus lightweight QC

What is already good:

- this is the module closest to the new direction
- it already combines input normalization, skill references, assembly, and output packaging
- it already produces more than a prose rewrite

Main gap against new product definition:

- input is still prompt-centric, not spawn-boundary-centric
- output is still framed as a seven-section template package
- routing result is implicit rather than a first-class object
- no explicit task context / plan context / retrieval context separation
- no explicit selected vs rejected skill rationale
- no explicit tool-gate decision record

Judgment:

- keep this module as the center of the new execution compilation path
- evolve the contract instead of replacing the whole implementation

### 3. `skill register`

Relevant files:

- [src/skillforge/registry-entry.mjs](D:/Users/chany/Documents/SkillForge/src/skillforge/registry-entry.mjs)
- [src/skillforge/registry-scan-pipeline.mjs](D:/Users/chany/Documents/SkillForge/src/skillforge/registry-scan-pipeline.mjs)
- [src/skillforge/registry-store.mjs](D:/Users/chany/Documents/SkillForge/src/skillforge/registry-store.mjs)
- [src/skillforge/skill-resolver.mjs](D:/Users/chany/Documents/SkillForge/src/skillforge/skill-resolver.mjs)

Current reality:

- `registry-entry` and `registry-store` are still shaped around an older publish/fixture/provenance chain
- `registry-scan-pipeline` can scan `SKILL.md` files but only extracts shallow frontmatter
- `skill-resolver` is not using scanned production skills at all
- `skill-resolver` uses a frozen in-code registry with hand-authored tags and prompt templates

What is already good:

- there is already a scan path
- there is already a resolver abstraction
- there is already a local store abstraction

Main gap against new product definition:

- the current register is not a routing register
- scan output does not match the new schema
- resolver is not grounded in the real `skills/` corpus
- no `requiredTools`, `toolSignals`, `entrypointHints`, `reportHints`, or `stopRuleHints`
- no project/runtime tool gating

Judgment:

- this is the biggest mismatch in the codebase
- keep the idea of scan + resolve
- replace the data model and resolution source

### 4. `log retention and review`

Relevant files:

- [src/skillforge/transcript-store.mjs](D:/Users/chany/Documents/SkillForge/src/skillforge/transcript-store.mjs)
- [src/skillforge/raw-artifact-store.mjs](D:/Users/chany/Documents/SkillForge/src/skillforge/raw-artifact-store.mjs)
- CLI inline logging in:
  - [scripts/skillforge-operate-betterplan.mjs](D:/Users/chany/Documents/SkillForge/scripts/skillforge-operate-betterplan.mjs)
  - [scripts/skillforge-operate-betterprompt.mjs](D:/Users/chany/Documents/SkillForge/scripts/skillforge-operate-betterprompt.mjs)

Current reality:

- there is append-only transcript persistence
- there is raw artifact persistence
- CLI scripts also append ad hoc execution-log lines

What is already good:

- basic storage primitives exist
- artifact/reference split is already possible
- transcript structure already tracks provider/model/execution ids

Main gap against new product definition:

- no unified run record across plan, retrieval, compilation, and execution
- no explicit failure stage classification
- no link between `betterPlan`, register, and `betterPrompt` in one record
- ad hoc CLI logs duplicate but do not structure the run chain

Judgment:

- keep transcript/artifact stores
- add one top-level routed-run log record instead of relying on loose JSONL append lines

## Cross-Cutting Misalignments

### 1. The codebase still uses old terminology in key places

Examples:

- publish-prep
- fixtureId
- registry publish metadata
- skill prompt contract style frozen definitions

These terms are survivals from the old product narrative and will keep confusing implementation decisions if left in the core path.

### 2. Real production skills are not yet first-class input

The repository now contains a rich `skills/` corpus, but the live resolver path does not actually depend on it.

This is the single most important realism gap.

### 3. The current CLI logs are too thin

They prove invocation happened, but they do not preserve the decision chain we now care about.

## What Can Be Reused Safely

Safe to reuse:

- `betterPlan` pipeline shell
- `betterPrompt` builder shell
- `prompt-assembler` as a low-level assembly primitive
- transcript and raw artifact stores
- registry scan traversal logic

Needs replacement or strong reshaping:

- `betterPlan` contract
- `skill-resolver` data source and schema
- `registry-entry` / `registry-store` semantics
- CLI logging payload shape

## Recommended Cut Sequence

### Cut 1: Reframe `betterPlan`

Change from:

- skeleton extraction

To:

- plan review contract

Minimal target:

- findings
- severity
- suggested corrections

### Cut 2: Rebuild register around real `skills/`

Change from:

- publish/fixture registry plus frozen in-code resolver registry

To:

- scanned production skill index plus routing hints

Minimal target:

- `kind`
- `description`
- `applicableScenes`
- `requiredTools`
- `toolSignals`
- `entrypointHints`
- `reportHints`
- `stopRuleHints`
- `sourceRef`

### Cut 3: Rewire `betterPrompt` to consume the new register

Change from:

- prompt-centric template generation

To:

- spawn-boundary routing and compilation

Minimal target:

- selected skills
- rejected skills
- routing rationale
- execution objective
- ordered steps
- report requirements

### Cut 4: Introduce unified routed-run logs

Change from:

- ad hoc CLI execution log lines

To:

- one structured run record per routed execution

Minimal target:

- plan
- retrieval
- compilation
- execution
- diagnosis

## Immediate Coding Target

If we start implementing now, the highest-value first coding target is:

1. replace the in-code frozen resolver registry with scanned `skills/`-based candidates

Reason:

- it connects the product to the real production environment
- it unlocks both routing realism and log realism
- it removes the biggest mismatch between docs and code
