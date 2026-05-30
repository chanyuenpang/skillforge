# SkillForge Product Core

## Positioning

SkillForge is not primarily a user-facing product.

Its current target user is the agent system itself.

SkillForge sits inside an agent execution chain and intervenes at two specific moments:

1. after `plan_write`
2. before `sessionSpawn`

In one sentence:

> SkillForge is an agent-side planning review and execution routing layer.

It does not currently aim to be a general end-user planning product, because the system still depends on agent-side context that end users do not naturally provide.

## Core Working Scene

The product is designed around an existing agent workflow, not around direct human operation.

The intended chain is:

```text
User request
  -> leader agent understands the task
  -> leader agent calls plan_write
  -> SkillForge betterPlan reviews the plan
  -> leader agent executes the plan
  -> leader agent reaches a task that would normally call sessionSpawn
  -> SkillForge betterPrompt intercepts the spawn boundary
  -> SkillForge routes skills dynamically and compiles execution guidance
  -> downstream executor agent runs the compiled output
```

This is the current real product scene.

## Production Reality

The repository now includes a `skills/` directory pulled from the current OpenClaw production environment.

This matters because it shows the real shape of the inputs SkillForge must route against.

The important observation is that production skills are not only "capability labels".

They usually carry some combination of:

- trigger cues or applicable scenes
- role identity such as `skill` or `subagent`
- standard operating sequence
- tool or script entrypoints
- verification steps
- stop conditions
- output or report format
- source-specific constraints

That means SkillForge should treat a skill as an execution asset with workflow structure, not just as descriptive text.

There is one more important distinction:

- some skills are domain execution assets
- some skills should be treated as system skills for the model itself

Current system-skill examples:

- task interpretation
- betterPlan review
- betterPrompt compilation

These should be understood as program design assets for LLM behavior, not merely prompt snippets.

## Core Problem

The product targets several recurring problems in agent execution:

1. Reusable workflow knowledge is hidden inside skills, but is not extracted into plan-friendly structure.
2. Fixed subagents are either too narrow or overloaded with too many backup skills.
3. Multiple skills often carry their own workflows, which creates step confusion during execution.
4. Many agents do not have a strong planning review phase before execution.
5. Existing spawn flows often assume subagents must be predefined, instead of dynamically composed at execution time.

SkillForge exists to turn skills from static instruction packages into routing-ready execution assets.

## Product Mainline

The current mainline should be understood as two agent-side interceptors:

```text
plan_write
  -> betterPlan review

sessionSpawn
  -> betterPrompt routing and compilation
```

Everything else in the current repository exists to support those two moments:

- `skill register` provides retrieval and reference material
- `log retention and review` preserves evidence for iteration
- `system skills` provide fixed model-facing programs for interpretation, review, and compilation

The next product-stage interpretation is important:

- OpenClaw should not remain a permanent “fire-and-forget tryout layer”
- the next phase goal is to make SkillForge outputs good enough for daily real usage quality
- that means the evaluation target is no longer “did the call happen” but “was the returned review or compiled package actually worth consuming”

## Current Core Capabilities

### 1. `betterPlan`

`betterPlan` is not a planner that writes the plan for the agent.

Its current working scene is:

- the agent has already received the user task
- the agent is creating a plan
- the agent calls `plan_write`
- SkillForge receives the plan structure the agent believes is reasonable
- SkillForge returns a review of that plan

So `betterPlan` is a planning review layer, not a planning authoring layer.

Its job is to review:

- workflow skeleton fit
- structure quality
- decomposition quality
- missing constraints
- missing acceptance criteria
- missing dependencies
- task granularity problems
- likely execution ambiguity

The important nuance is that `betterPlan` should not review plans only against generic planning rules.

It should also use reusable workflow skeletons extracted or retrieved from skills as review evidence.

That means `betterPlan` is best understood as:

- a planning review layer
- grounded partly in skill-derived workflow skeletons
- and partly in general planning quality rules

The output should help the leader agent improve the plan before execution begins.

### 2. `skill register`

The skill register is not primarily a showcase of skills.

Its current role is to support dynamic routing at execution time.

Its job is to provide:

- searchable skill references
- skill metadata usable at routing time
- reusable workflow signals
- execution entrypoint hints
- output and report expectations
- stop and safety constraints
- traceable source references

The register is not the planner and not the final execution prompt. It is the routing support layer.

### 3. `betterPrompt`

`betterPrompt` is not merely prompt polishing.

Its current working scene is:

- the agent is executing a plan
- the agent reaches a concrete task, or receives a direct execution instruction
- the original system would route to a predefined subagent via `sessionSpawn`
- SkillForge intercepts this moment
- instead of reusing a predefined subagent, SkillForge performs dynamic skill routing
- SkillForge consumes the original agent prompt and relevant skill context
- SkillForge outputs a compiled execution package for a downstream executor agent

So `betterPrompt` is effectively a dynamic subagent compiler.

Its job is to:

- replace fixed subagent routing with dynamic routing
- match relevant skills at execution time
- digest the original agent prompt
- extract or preserve executable workflow structure from routed skills
- produce execution guidance that a downstream executor can run directly

### 4. `log retention and review`

Logs are not only for observability. They are future product assets.

Their job is to retain:

- the original task input
- the plan written by the leader agent
- the `betterPlan` review output
- matched or referenced skills
- the original spawn-side prompt
- the `betterPrompt` compiled output
- execution result and output artifacts
- failures, gaps, and deviations

This is the evidence base for improving plan review quality, routing quality, and compiled execution quality over time.

## What SkillForge Is Not Trying To Be Right Now

The current product focus explicitly excludes:

- a large governance-heavy skill platform
- a complete approval-centered operating system
- a broad UI-first platform rewrite
- a user-facing planning workspace
- a fully automated long-horizon self-improving agent system
- a claim that all old roadmap phases remain the active product center

Those may still have value later, but they are not the current product core.

## Dogfooding Direction

The product should be validated through real agent traffic, not abstract architecture alone.

Current high-value dogfooding direction:

- connect SkillForge to real external agent workflows
- keep `betterPlan` on real `plan_write` events
- keep `betterPrompt` on real `sessionSpawn` boundaries
- use logs to discover where review, routing, or compiled execution breaks down

Important shift for the next phase:

- OpenClaw trial invocation is no longer the end goal
- OpenClaw should become the realism harness for judging whether SkillForge output is strong enough for daily real calls
- “non-consuming tryout” is now only a temporary safety posture, not the product target

Representative scenario:

- Godot in-game test workflow

Why it is valuable:

- it has real setup steps
- it has environment validation
- it has ordered execution
- it has step-specific constraints
- it has structured report expectations

That makes it a strong end-to-end scenario for both planning review and execution routing.

## Near-Term Success Criteria

The current product should be considered on the right track if it can do the following reliably:

1. improve the quality of agent-authored plans at the `plan_write` stage
2. dynamically route skills at the `sessionSpawn` stage without relying on predefined subagents
3. compile more stable execution guidance for a downstream executor agent
4. reduce step confusion compared with fixed skill bundles
5. retain enough logs to explain why a run succeeded or failed

6. preserve enough routed skill structure that a downstream executor can follow a stable operating path instead of improvising every step

For the next phase specifically, an additional success test applies:

7. the observed output quality should become strong enough that the team can seriously consider moving from “trial invoke only” toward real daily consumption, instead of treating OpenClaw as a permanent no-consume harness

## Repository Interpretation

When reading this repository, the recommended interpretation order is:

1. `docs/product-core.md`
2. `docs/system-framework.md`
3. `docs/betterprompt-routing-contract-draft.md`
4. `docs/skill-register-schema-draft.md`
5. `README.md`
6. implementation under `src/skillforge/`
7. real production samples under `skills/`
8. the remaining fixture skills under `fixtures/`

The repository should be interpreted as the minimal core for:

- plan review
- spawn-time routing
- execution compilation
- evidence retention
- system-skill based LLM programming
