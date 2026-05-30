# System Skills

## Position

SkillForge should treat several core LLM stages as fixed `system skills`.

These are not ordinary domain skills like `browser-agent-workflow` or `godot-mcp-cli`.

They are program design assets for the model itself.

Their job is to shape how the model:

- interprets tasks
- reviews plans
- fuses routed skills into final executor guidance

In that sense, SkillForge is not only storing skills.

It is also maintaining a small set of model-facing programs.

## Current System Skills

### 1. `task-interpretation-skill`

Purpose:

- read agent-side task or prompt input
- preserve routing-relevant semantics
- produce lightweight anchors for recall

This skill should not try to produce a heavy ontology.

It should only extract enough structure to support retrieval.

### 2. `betterplan-review-skill`

Purpose:

- review an agent-authored plan
- ground part of the review in routed workflow knowledge
- return direct natural-language review text

This skill is not a planner.

It is a plan review program for the model.

### 3. `betterprompt-compilation-skill`

Purpose:

- take the original task prompt plus routed skills
- treat routed skills as execution programs for the model
- synthesize a final natural-language executor prompt

This skill is the most important system skill for execution-time routing.

Its primary output is `executorPrompt`.

## Why Use System Skills

This design prevents the implementation from drifting into:

- shallow programmatic keyword guessing
- heavy program-side prompt assembly
- overly rigid field-by-field schema forcing

Instead, it keeps the main semantic work where it belongs:

- in model-facing skills

## Schema Principle

System skills may require lightweight schema output.

But that schema should remain lightweight.

Schema exists mainly for:

1. persistence
2. basic validation
3. lightweight normalization

Schema does **not** exist to fully define the semantic output.

In most cases, semantic precision should come from the skill itself, not from a heavy output contract.

For example:

- `betterPrompt` may still ask for step hints or deliverable hints
- but those should primarily be expressed naturally inside the final executor prompt
- not because the program needs deeply structured arrays in order to function

## Design Rule

When adding or modifying LM behavior in SkillForge:

1. ask whether this should be a system skill
2. keep the schema light
3. let the skill carry most of the behavioral constraint
4. let the program validate only the minimum needed for storage, traceability, and runtime safety
