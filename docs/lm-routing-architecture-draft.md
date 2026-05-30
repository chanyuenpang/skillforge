# LM-First Routing Architecture Draft

## Purpose

This document defines the technical direction for prompt understanding, skill routing, and execution-package compilation in SkillForge.

It responds to a core reality:

- prompt understanding is not reliably solvable by programmatic rules alone
- skill routing is not reliably solvable by metadata matching alone
- production skill files are too inconsistent to serve as a deterministic routing source without LM participation

So the architecture should be designed as:

- LM-first for semantic extraction and routing
- program-bounded for validation, storage, gating, and traceability

## Core Thesis

The product goal is not "find a skill whose description overlaps with the prompt".

The product goal is:

- understand what the task really is
- understand what workflow shape it implies
- understand which skills are relevant
- understand how those skills should be combined
- compile a stable execution package for a downstream executor

That means the routing problem is fundamentally semantic.

A purely programmatic router will fail for the exact cases SkillForge is supposed to solve well.

## Why Program-Only Routing Is Not Enough

Program-only routing breaks down in at least four places:

### 1. Prompt understanding

The incoming prompt may contain:

- implicit goals
- mixed constraints
- hidden subgoals
- domain-specific wording
- underspecified execution expectations

This cannot be reduced well to:

- keyword search
- tag overlap
- tool-name matching

### 2. Skill-file inconsistency

Real skill files often contain:

- uneven frontmatter
- implicit workflow structure
- mixed examples and rules
- inconsistent formatting
- missing explicit tags

So the system must infer structure, not merely parse it.

### 3. Multi-skill composition

A task often does not map to one skill.

It maps to:

- one dominant workflow skill
- several supporting constraint or tool skills
- sometimes one reporting-oriented skill

This composition step is semantic, not just set intersection.

### 4. Output shaping

Even after the right skills are found, the system still has to decide:

- what matters for this task
- what can be ignored
- what order the executor should follow
- what checks and report sections are necessary

That is again an LM synthesis problem.

## Recommended Architecture

The most reasonable technical architecture is:

```text
raw prompt / task input
  -> LM task interpretation
  -> LM skill-index extraction
  -> program storage + validation
  -> LM routing over candidate skills
  -> program gating / traceability
  -> LM execution-package compilation
  -> program validation + logging
  -> downstream executor
```

This is not "LM does everything".

It is:

- LM does the semantic work
- program does the control-plane work

## Three LM Layers

### Layer 1. Skill Ingestion LM

Purpose:

- convert messy skill files into routing-oriented intermediate representations

Input:

- raw `SKILL.md`
- optional neighboring files
- optional project-wide extraction instructions

Output:

- normalized skill index entry
- workflow skeleton summary
- tool requirements
- tool signals
- scene hints
- constraint hints
- report hints
- stop-rule hints

This layer is not routing a task yet.

It is preparing the skill corpus so later routing has better substrate.

### Layer 2. Prompt Interpretation and Routing LM

Purpose:

- understand the incoming task and decide which skills matter

Input:

- raw prompt
- plan/task context
- project context
- runtime/tool context
- candidate skill entries from the index

Output:

- interpreted task intent
- routing rationale
- selected skills
- rejected skills
- why the selected set makes sense

This layer is the actual routing brain.

It should not be reduced to keyword scoring.

### Layer 3. Compilation LM

Purpose:

- turn routed skills plus task context into an executor-facing package

Input:

- raw prompt
- selected skill entries
- selected skill source refs
- plan context
- routing rationale

Output:

- execution objective
- ordered steps
- checks
- constraints
- stop rules
- report requirements

This layer is the execution-package compiler.

## Program Responsibilities In This Architecture

The program should still own:

- loading raw skill files
- calling LM pipelines in the right order
- validating intermediate structures
- caching or persisting extracted skill indices
- enforcing hard tool gates
- maintaining traceability
- logging every stage
- exposing stable CLI and runtime entrypoints

The program should not pretend it can replace the semantic parts with heuristics.

## Proposed Routing Flow

### Stage A. Skill Extraction

```text
raw skill file
  -> LM extracts routing-oriented intermediate representation
  -> program validates and stores
```

Stored result should be lightweight, but LM-derived.

### Stage B. Task Interpretation

```text
raw prompt / task
  -> LM extracts:
     - true task intent
     - likely workflow shape
     - tool expectations
     - hidden constraints
```

This should produce a task-side intermediate representation, not only free text.

### Stage C. Candidate Preparation

```text
task-side intermediate representation
  + stored skill-side intermediate representations
  -> program narrows candidate pool
```

This stage can still use:

- tool constraints
- scope constraints
- obvious exclusions

But it should not make the final semantic decision alone.

### Stage D. LM Routing

```text
task-side IR
  + candidate skill-side IR
  -> LM selects / rejects / explains
```

This is where the main routing judgment happens.

### Stage E. LM Compilation

```text
selected skills
  + task context
  + plan context
  -> LM compiles execution package
```

### Stage F. Program Validation and Logging

```text
compiled package
  -> schema validation
  -> trace recording
  -> artifact persistence
```

## Intermediate Representations

The architecture becomes much more stable if both sides have LM-derived IR.

### Skill-Side IR

Example categories:

- identity
- applicable scenes
- workflow skeleton summary
- tool requirements
- tool signals
- constraints
- report expectations
- stop rules

### Task-Side IR

Example categories:

- true objective
- task type
- likely workflow shape
- hard constraints
- tool expectations
- report expectations
- ambiguity notes

This means routing becomes:

- task IR matched against skill IR

instead of:

- raw prompt matched against raw skill text

## The Right Place For Heuristics

Heuristics still matter, but only in the right place.

Good uses of programmatic heuristics:

- hard tool filtering
- deduplication
- score boosting for exact tool matches
- result validation

Bad uses of programmatic heuristics:

- pretending keyword overlap is real routing
- pretending raw frontmatter is sufficient skill understanding
- pretending multi-skill composition can be solved by tag union alone

## Failure Strategy

The system should fail explicitly if a required LM stage is unavailable or invalid.

Recommended failure handling:

### Skill Extraction Failure

- stop the scan
- return a structured LM/provider error
- record the failure in routed logs or scan artifacts

### Routing Failure

- stop before selection
- return a structured routing-stage error
- preserve candidate context for diagnosis

### Compilation Failure

- stop before emitting an execution package
- return a structured compilation-stage error
- preserve selected skill refs and prompt refs for diagnosis

This failure strategy is important because the product is LM-heavy and should not silently degrade into a lower-quality behavior that looks successful.

## Recommended Design Decision

The most reasonable technical solution is:

- not a program-first router
- not a naive metadata-first router
- not a fully uncontrolled LM chain

It should be:

- LM-first semantic architecture
- bounded by programmatic validation, gating, storage, and logs

## Architecture Implication For Current Modules

### `skill register`

Should become:

- LM-assisted skill IR extraction plus storage layer

### `betterPlan`

Should become:

- LM review layer that can use skill-derived workflow skeletons as evidence

### `betterPrompt`

Should become:

- LM routing plus LM compilation layer

### logs

Should preserve:

- prompt interpretation result
- skill extraction source refs
- routing rationale
- compilation package

## Bottom-Line Recommendation

If the goal is truly "better routing than today's skill tools", then the reasonable technical path is:

1. use LM to extract skill-side intermediate representations
2. use LM to extract task-side intermediate representations
3. let LM perform the final routing over narrowed candidates
4. let LM compile the executor-facing package
5. let the program own control, validation, storage, and traceability

Anything substantially weaker than that will likely recreate the same routing ceiling that current metadata-driven skill systems already have.
