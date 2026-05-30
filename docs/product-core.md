# SkillForge Product Core

## Positioning

SkillForge is a workflow compilation layer for agent execution.

Its current purpose is not to build a large all-in-one skill platform, but to make real tasks more stable by connecting four focused capabilities:

1. `betterPlan`
2. `betterPrompt`
3. `skill register`
4. `log retention and review`

In one sentence:

> SkillForge takes a real task, decomposes it into a plan, grounds the plan with reusable skill knowledge, and produces execution guidance that can be reused, reviewed, and improved from logs.

## Core Problem

The product targets several recurring problems in agent execution:

1. Reusable workflow knowledge is hidden inside skills, but is not extracted into plan-friendly structure.
2. Fixed subagents are either too narrow or overloaded with too many backup skills.
3. Multiple skills often carry their own workflows, which creates step confusion during execution.
4. Many subagents operate step-by-step without an explicit planning phase, which lowers stability and output quality.

SkillForge exists to turn skills from static instruction packages into workflow-bearing execution assets.

## Current Core Capabilities

### 1. `betterPlan`

`betterPlan` turns a task into a more stable execution structure.

Its job is to:

- identify the goal
- split the goal into milestones
- split milestones into atomic tasks
- record constraints, ordering, and completion criteria

`betterPlan` should not be the place where skill semantics are deeply assembled. Its main responsibility is planning structure.

### 2. `skill register`

The skill register is the searchable source of reusable workflow knowledge.

Its job is to:

- expose registered skills and their metadata
- support task-time retrieval of relevant skills
- preserve references needed for later grounding and traceability

The register is not the planner and not the final prompt generator. It is the retrieval and reference layer.

### 3. `betterPrompt`

`betterPrompt` compiles execution guidance from task context, plan context, and skill context.

Its job is to:

- consume task or atomic-task level intent
- incorporate relevant skill references from the register
- produce structured execution guidance
- make subagent execution less improvisational and more step-grounded

This is the closest current capability to dynamic subagent definition.

### 4. `log retention and review`

Logs are not only for observability. They are future product assets.

Their job is to retain:

- the original task input
- `betterPlan` output
- matched or referenced skills
- `betterPrompt` output
- execution result and output artifacts
- failures, gaps, and deviations

This is the evidence base for improving planning quality, retrieval quality, and prompt grounding quality over time.

## Product Mainline

The current intended mainline is:

```text
Real task input
  -> betterPlan
  -> skill register lookup
  -> betterPrompt
  -> execution
  -> log retention and review
```

At a more structural level, the target decomposition chain is:

```text
Product Goal
  -> Milestone
  -> Atomic Task
  -> Skill-backed Execution Steps
```

This is the core idea behind the current version of SkillForge.

## What SkillForge Is Not Trying To Be Right Now

The current product focus explicitly excludes:

- a large governance-heavy skill platform
- a complete approval-centered operating system
- a broad UI-first platform rewrite
- a fully automated long-horizon self-improving agent system
- a claim that all old roadmap phases remain the active product center

Those may still have value later, but they are not the current product core.

## Dogfooding Direction

The product should be validated through real task traffic, not abstract architecture alone.

Current high-value dogfooding direction:

- connect SkillForge to real external agent workflows
- keep `betterPlan` and `betterPrompt` on real task paths
- use log review to discover where planning, retrieval, or grounding breaks down

Representative scenario:

- Godot in-game test workflow

Example expected decomposition:

1. initialize MCP access
2. verify MCP availability
3. execute game test steps
4. enforce step-specific constraints
5. generate structured report output

This scenario is useful because it contains setup, verification, execution, constraints, and reporting in one real chain.

## Near-Term Success Criteria

The current product should be considered on the right track if it can do the following reliably:

1. convert a real task into stable milestones and atomic tasks
2. retrieve relevant skills from the register at task time
3. compile better execution guidance from those skills
4. reduce subagent step confusion compared with fixed bundled prompts
5. retain enough logs to review why a run succeeded or failed

## Repository Interpretation

When reading this repository, the recommended interpretation order is:

1. `docs/product-core.md`
2. `README.md`
3. implementation under `src/skillforge/`
4. fixtures and scripts that directly support `betterPlan`, `betterPrompt`, skill retrieval, and log review

Older long-form roadmap and phase documents remain useful as historical context, but they should not override this current product core.
