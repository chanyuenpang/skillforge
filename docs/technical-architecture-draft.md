# SkillForge Technical Architecture Draft

## Purpose

This document describes the core implementation flow of SkillForge as it should work in the current product direction.

It is not a platform-wide architecture.

It is the technical design for the core runtime loop:

- `betterPlan`
- `skill register`
- `betterPrompt`
- downstream executor
- structured logs

## Core Understanding

Yes, the core implementation flow is clear.

SkillForge is not trying to be the agent that does the task.

It is trying to sit between the leader agent and execution, and improve two critical boundaries:

1. after `plan_write`
2. before `sessionSpawn`

So the system is not:

- user request -> SkillForge directly executes everything

It is:

- user request -> leader agent thinks and writes a plan
- SkillForge reviews that plan
- leader agent reaches an execution task
- SkillForge dynamically routes skills and compiles an execution package
- a downstream executor runs that package

## LM Participation Model

LM participation is central to SkillForge and is deeply embedded in the product.

The system is not designed around "use LM only for a small semantic step".

It is designed around the fact that the core product goals are almost impossible to achieve well without LM participation.

This is especially true because:

- production skill files are not fully normalized
- skill structure is often implicit rather than explicit
- reusable workflow skeletons must be inferred rather than mechanically parsed
- spawn-time execution packages require semantic synthesis rather than template fill only

The system should still distinguish between:

- program responsibilities
- LM responsibilities
- downstream executor responsibilities

But the distinction is not "program does most things and LM fills content".

The distinction is:

- the program owns boundaries, validation, persistence, and orchestration
- the LM owns semantic extraction, interpretation, review, and synthesis

### Program Responsibilities

The program layer should own:

- input normalization
- contract validation
- candidate filtering
- tool-fit gating
- source reference tracking
- prompt assembly
- output validation
- log persistence

In short:

- the program controls structure, safety, traceability, persistence, and orchestration

### LM Responsibilities

The LM should own:

- extracting usable structure from non-standard skill files
- inferring workflow skeletons from messy skill content
- plan-quality judgment
- semantic interpretation of task intent
- semantic interpretation of skill text
- generating routing-oriented intermediate representations from skills
- selecting the most relevant candidate skills from the gated set
- compiling execution guidance from task context plus skill context
- summarizing rationale in human-readable form

In short:

- the LM controls semantic understanding, semantic extraction, review, and synthesis

### Downstream Executor Responsibilities

The downstream executor should own:

- carrying out the compiled package
- producing execution artifacts
- returning result status

In short:

- the executor controls action, not routing logic

## LM Use By Module

### `betterPlan`

LM role:

- review whether the leader agent's plan is structurally sound
- identify missing constraints, missing done criteria, decomposition issues, and ambiguity

Program role:

- validate the input
- frame the review request
- validate the output contract
- persist the review result

### `skill register`

LM role in phase 1:

- extract routing-oriented structure from non-standard skill files
- infer applicable scenes, workflow skeleton signals, tool signals, report hints, stop rules, and constraints
- produce indexable intermediate representations even when the source skill text is inconsistent

Program role:

- scan the real `skills/` directory
- provide the raw skill text to the LM
- validate returned structure
- build candidate entries

Why:

- without LM participation, non-standard skill files cannot be turned into reliable routing entries
- the program should still validate and persist the extracted structure

### `betterPrompt`

LM role:

- interpret the spawn-time task
- interpret the selected skill context
- choose the most relevant execution pattern from the available candidates
- compile the executor-facing package

Program role:

- normalize inputs
- pass only gated candidates
- assemble prompt context
- validate the compiled result
- store traces and logs

### `log retention and review`

LM role in phase 1:

- optional or none

Program role:

- persist structured records
- connect plan, retrieval, compilation, and execution artifacts

Why:

- logs should first become trustworthy evidence before they become LM-analyzed evidence

## End-to-End Runtime Flow

```text
User request
  -> Leader agent understands the request
  -> Leader agent calls plan_write
  -> SkillForge betterPlan reviews the plan
  -> Leader agent updates or keeps the plan
  -> Leader agent starts executing a concrete task
  -> Leader agent is about to call sessionSpawn
  -> SkillForge intercepts the spawn boundary
  -> skill register retrieves candidate skills
  -> betterPrompt selects and compiles an execution package
  -> Downstream executor receives the compiled package
  -> Downstream executor runs and produces artifacts/results
  -> SkillForge stores structured logs
```

## The Two Real Product Hooks

### Hook 1: `plan_write` Review

Trigger:

- the leader agent has already written a plan

SkillForge responsibility:

- review the plan quality

Technical effect:

- return a structured review object, not a rewritten full plan

Main output shape:

- findings
- severity
- suggested corrections
- workflow skeleton mismatch notes
- missing constraints
- missing done criteria
- decomposition issues

### Hook 2: `sessionSpawn` Interception

Trigger:

- the leader agent is about to route a concrete task to a subagent

SkillForge responsibility:

- stop fixed subagent routing
- dynamically find the right skills
- compile a package a downstream executor can follow

Technical effect:

- `betterPrompt` becomes the dynamic subagent compiler

Main output shape:

- selected skills
- rejected skills
- routing rationale
- ordered execution steps
- constraints
- stop rules
- report requirements

## Main Technical Components

### 1. `betterPlan`

Responsibility:

- evaluate a plan, not generate the final plan

Required input:

- original plan content
- optional top-level task context

Required output:

- review findings
- severity
- fix suggestions

Important review basis:

- general plan quality checks
- reusable workflow skeletons derived from relevant skills

Implementation note:

- the current pipeline shell can be reused
- the current output contract must change from skeleton extraction to review result

### 2. `skill register`

Responsibility:

- provide candidate skill metadata for routing

Version 1 design:

- lightweight index
- no deep workflow AST
- no final prompt generation

Required input:

- task text
- project context
- runtime context

Required output:

- candidate skill refs
- `kind`
- description
- applicable scenes
- required tools
- tool signals
- entrypoint hints
- stop-rule hints
- report hints
- source refs

Implementation note:

- this should be driven by the real `skills/` directory
- not by a frozen in-code registry

### 3. `betterPrompt`

Responsibility:

- compile executor-ready guidance from:
  - raw spawn intent
  - task context
  - selected skill metadata
  - original skill source refs

Required input:

- task context
- plan context
- raw spawn prompt
- register candidates

Required output:

- routing result
- compiled execution objective
- ordered steps
- constraints
- stop rules
- report structure
- traceability

Implementation note:

- this should stay the smart layer
- this is where most semantic compilation should live

### 4. Downstream Executor

Responsibility:

- execute what has already been compiled

Should not decide:

- which skill to use
- what routing is best
- what the plan should have been

It should only receive:

- a stable execution package

Boundary note:

- this executor is downstream from SkillForge
- it is not an internal subsystem we are trying to build here

### 5. Structured Logs

Responsibility:

- preserve enough evidence to debug failures and improve the system

Minimum diagnosis targets:

- `plan`
- `retrieval`
- `compilation`
- `execution`

Implementation note:

- transcript and artifact stores can be reused
- a new top-level routed-run record should be added

## Core Data Flow

### Phase A: Planning Review Flow

```text
leader agent plan
  -> betterPlan input normalization
  -> plan review
  -> review output
```

Question answered:

- is this plan good enough to execute

More specifically:

- does this plan satisfy general planning quality
- and does it violate or miss important workflow structure implied by relevant skills

### Phase B: Retrieval Flow

```text
task + project/runtime context
  -> skill register query
  -> candidate list
```

Question answered:

- what skills are valid candidates in this environment

### Phase C: Compilation Flow

```text
raw spawn prompt + plan/task context + candidate skills
  -> betterPrompt
  -> compiled execution package
```

Question answered:

- how should this concrete task be executed

### Phase D: Execution Flow

```text
compiled execution package
  -> downstream executor
  -> artifacts + result
```

Question answered:

- did the execution package actually work

### Phase E: Logging Flow

```text
plan review + retrieval + compilation + execution
  -> structured run record
```

Question answered:

- where did success or failure actually come from

## Retrieval Model

The intended retrieval model is:

```text
task relevance
  + project tool fit
  + runtime tool fit
  => candidate skill
```

This is important because semantically relevant skills should still be filtered out if the current project/runtime cannot actually support them.

Examples:

- Git workflow skills should not be routed if the project context does not include `git`
- `browseros-cli` skills should not be routed if the runtime does not expose that tool

Important implementation note:

- LM selection should happen after program-side hard invalidation such as obvious missing tool gates
- but the candidate preparation itself may already depend on LM-derived intermediate representations

That means the LM should not be asked to choose from candidates that are already invalid for the current environment.

## Why Real `skills/` Matter

The `skills/` directory is now the most important source of truth for the next phase.

Because the real production samples show that skills often include:

- trigger scenes
- tool entrypoints
- verification steps
- stop rules
- report formats

So the real implementation direction is not:

- use skill names as labels

It is:

- use real skill documents as execution recipe sources

## Recommended Implementation Order

### Step 1: Reframe `betterPlan`

Change:

- skeleton extraction -> review contract

Why first:

- aligns the first runtime hook with the real product definition

### Step 2: Rebuild `skill register` around scanned production skills

Change:

- frozen in-code skill table -> scanned `skills/` candidate index

Why second:

- this is the biggest realism gap in the codebase

### Step 3: Rewire `betterPrompt` to consume the new register

Change:

- template-centric assembly -> routing-aware execution compilation

Why third:

- once real candidates exist, compilation can become faithful to production

### Step 4: Add unified routed-run logs

Change:

- loose CLI JSONL append logs -> structured run records

Why fourth:

- once the real path exists, logs become meaningful enough to iterate on

## Phase 1 Deliverable

The first meaningful technical milestone should be:

- real `skills/` can be scanned
- candidate skills can be retrieved for a task
- `betterPrompt` can compile a package from those candidates
- one run record can capture the full chain

That is the first point where the system becomes truly connected to the real OpenClaw environment.

## Open Questions

These are important, but they are second-order after the framework is in place:

- how exactly project tool context is provided
- how deep register normalization should go in v1
- how much of the original skill text `betterPrompt` should inline
- how executor result review should be scored

## Bottom-Line Architecture Decision

The core technical decision is:

- keep `skill register` light
- keep `betterPrompt` smart
- make logs rich enough to separate retrieval mistakes from compilation mistakes

That is the implementation shape that best matches the product you described.

The corresponding LM decision is:

- use LM heavily in `skill register`, `betterPlan`, and `betterPrompt`
- keep logs mostly program-driven in phase 1, while allowing later LM-assisted diagnosis
