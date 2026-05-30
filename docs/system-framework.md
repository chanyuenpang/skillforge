# SkillForge System Framework

## Purpose

This document defines the current end-to-end framework for SkillForge.

It is the working system view that connects:

- `betterPlan`
- `skill register`
- `betterPrompt`
- downstream executor
- `log retention and review`

This is not a broad platform architecture.

It is the minimum runtime framework needed to guide the next implementation phase.

## One-Sentence Model

SkillForge is an agent-side interception layer that:

1. reviews plans after `plan_write`
2. compiles executor-ready guidance before `sessionSpawn`

## Runtime Position

SkillForge sits inside the leader agent execution chain:

```text
User request
  -> leader agent
  -> plan_write
  -> betterPlan review
  -> leader agent execution
  -> task reaches sessionSpawn boundary
  -> skill register retrieval
  -> betterPrompt compilation
  -> downstream executor
  -> execution result
  -> log retention and review
```

## Core Modules

### 1. `betterPlan`

Role:

- review agent-authored plans

Input:

- plan structure produced by the leader agent
- optional task or project context

Output:

- structured review
- workflow-grounded findings
- decomposition concerns
- missing constraints
- missing acceptance criteria
- missing dependencies
- execution ambiguity warnings

Non-goal:

- writing the plan on behalf of the agent

### 2. `skill register`

Role:

- provide retrieval-ready skill candidates to `betterPrompt`

Input:

- task text or spawn-side intent
- optional project context
- optional runtime context

Output:

- candidate skill refs
- `skill` vs `subagent` kind
- description and scene hints
- tool requirements and tool signals
- entrypoint hints
- stop-rule hints
- report hints
- source refs

Non-goal:

- final routing decision
- full workflow planning
- final prompt compilation

### 3. `betterPrompt`

Role:

- intercept `sessionSpawn`
- replace fixed subagent routing with dynamic routing
- compile executor-ready guidance

Input:

- task context
- plan context
- raw spawn prompt
- candidate skills from register
- source skill refs

Output:

- selected skill set
- routing rationale
- execution objective
- ordered execution steps
- constraints and stop rules
- report requirements
- traceability payload

Non-goal:

- acting as the executor itself

### 4. Downstream Executor

Role:

- run the compiled execution package outside SkillForge

Input:

- compiled guidance from `betterPrompt`

Output:

- execution result
- artifacts
- warnings
- failures

Non-goal:

- deciding which skill should have been used

Boundary note:

- this executor is not part of SkillForge itself
- SkillForge only prepares the execution package that the downstream executor consumes

### 5. `log retention and review`

Role:

- preserve the full reasoning and execution chain for iteration

Input:

- upstream request and planning artifacts
- routing artifacts
- execution artifacts

Output:

- searchable, reviewable run record

Non-goal:

- only storing raw transcripts without structure

## Main Data Flow

### A. Planning Phase

```text
leader agent writes plan
  -> betterPlan reviews plan
  -> leader agent adjusts plan
```

Primary goal:

- improve structure before execution begins
- check whether the plan matches reusable workflow skeleton expectations when relevant

### B. Spawn Interception Phase

```text
leader agent prepares spawn task
  -> skill register returns candidates
  -> betterPrompt selects and compiles
  -> downstream executor receives compiled package
```

Primary goal:

- replace fixed subagent routing with task-specific dynamic routing

### C. Execution Review Phase

```text
downstream executor runs compiled package
  -> artifacts and result captured
  -> logs preserved
  -> future iterations compare success and failure patterns
```

Primary goal:

- turn real traffic into product learning material

## Contracts By Boundary

### Boundary 1: `plan_write` -> `betterPlan`

Question answered:

- is this plan good enough to execute

Minimum output needed:

- review findings
- severity or importance hints
- suggested corrections

Important review basis:

- generic planning quality rules
- reusable workflow skeletons retrieved from relevant skills

### Boundary 2: `sessionSpawn` -> `skill register`

Question answered:

- what skill candidates are even worth considering here

Minimum output needed:

- candidate refs
- kind
- scene hints
- tool requirements
- entrypoint hints
- report and stop-rule hints

### Boundary 3: `skill register` -> `betterPrompt`

Question answered:

- how do we turn these candidates into an executor-ready package

Minimum output needed:

- selected candidates
- source refs
- normalized execution objective
- ordered steps
- constraints
- report structure

### Boundary 4: `betterPrompt` -> downstream executor

Question answered:

- what should the executor do, in what order, under what constraints

Minimum output needed:

- stable ordered steps
- checks
- stop rules
- expected output format

### Boundary 5: runtime -> logs

Question answered:

- why did this run succeed or fail

Minimum output needed:

- original task
- original plan
- plan review
- retrieved skills
- selected skills
- compiled prompt package
- execution result
- artifacts

## Current Design Direction

The current design direction is intentionally asymmetric:

- `skill register` stays light
- `betterPrompt` stays smart

This means:

- register should be cheap and stable
- compilation complexity should live in `betterPrompt`
- logs should make retrieval and compilation separable for diagnosis

## What Is In Scope Now

In scope now:

- plan review
- candidate retrieval
- dynamic routing
- execution compilation
- structured logs

Out of scope now:

- UI-heavy platform work
- approval workflows
- registry marketplace experiences
- deep skill governance
- fully autonomous long-horizon self-improvement

## Immediate Implementation Sequence

1. stabilize `betterPlan` review contract
2. stabilize `skill register` v1 schema
3. stabilize `betterPrompt` compiled package shape
4. define minimum log payload across the full chain
5. validate against real OpenClaw traffic

## Reading Order

Read these documents in this order:

1. `docs/product-core.md`
2. `docs/system-framework.md`
3. `docs/betterprompt-routing-contract-draft.md`
4. `docs/skill-register-schema-draft.md`
5. `docs/log-payload-draft.md`
6. `docs/production-skill-observations.md`
