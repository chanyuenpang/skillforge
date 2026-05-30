# Production Skill Observations

This document captures what the current `skills/` directory tells us about the real OpenClaw production environment.

It is meant to guide `skill register`, `betterPrompt`, and future log design.

## Why This Matters

These production samples are the closest thing we have to the real routing surface.

They show what a leader agent and a spawn boundary are actually working with today.

That means our contracts should fit these samples instead of assuming an idealized skill system.

It also means that purely programmatic parsing will be insufficient for many real skills.

The skill files are useful, but they are not consistently normalized enough to serve directly as a deterministic routing index without LM-assisted extraction.

## High-Confidence Patterns

### 1. Skills are mixed with subagent definitions

The production corpus contains both:

- workflow-oriented `skill` entries
- persona or role-oriented `subagent` entries

This means routing cannot assume the source library is already cleanly normalized.

`betterPrompt` will often be matching against a mixed pool where some entries describe:

- what to do
- who should do it
- how to do it

## 2. Real skills frequently contain workflow structure

Several samples include explicit operating sequences instead of only high-level advice.

Common structures include:

- preflight checks
- standard step order
- command or tool invocation examples
- verification checkpoints
- failure handling
- output format or report format

This is the strongest signal that `betterPrompt` should compile execution recipes, not just rewrite prompts.

## 3. Tool entrypoints are often concrete and opinionated

Examples in the corpus show skills anchoring on specific execution entrypoints such as:

- a fixed CLI command family
- a fixed helper script
- a constrained call pattern
- a prohibition against bypassing the standard entrypoint

This means register data should expose:

- required tool identifiers
- project or runtime tool gates
- preferred tool family
- canonical command pattern
- whether the entrypoint is mandatory or only recommended

This also means a skill should not be surfaced only because its text is relevant.

It should usually be surfaced only when the current project or runtime context actually includes the required tool surface.

## 4. Output expectations are often part of the skill itself

Many samples define how the executor should report results.

Typical report content includes:

- completed actions
- modified files
- evidence or artifacts
- warnings
- failure summaries

This means `betterPrompt` output should include a report spec, not just task instructions.

## 5. Failure handling is usually explicit

Some samples define concrete stop rules such as:

- try at most a limited number of times
- do not invent unsupported commands
- stop after the first real error
- distinguish environment failure from task failure

This means routed skills carry operational guardrails that should survive compilation.

## 6. Verification is a first-class concern

Production samples often include a verification stage or verification criteria:

- health checks
- tool availability checks
- focused test or lint commands
- page or DOM checks
- result validation after each step

This means compiled execution should include explicit checks instead of assuming success after an action.

## Implications For Skill Register

The register should gradually move from plain metadata to routing-ready fields.

At minimum, a useful register entry should be able to surface:

- `kind`: `skill` or `subagent`
- `applicableScenes`
- `requiredTools`
- `toolSignals`
- `entrypoints`
- `workflowSteps`
- `checks`
- `constraints`
- `stopRules`
- `reportSpec`
- `sourceRef`

## Implications For betterPrompt

`betterPrompt` should not output only a prose rewrite.

It should return a compiled execution package with:

- selected skill refs
- why they were selected
- normalized execution objective
- ordered steps
- per-step checks
- hard constraints
- stop rules
- expected report structure
- traceability back to source skills

## Immediate Next Use

This document should feed the next revision of:

1. `docs/betterprompt-routing-contract-draft.md`
2. the future register schema
3. the log payload definition
