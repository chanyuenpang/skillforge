# OpenClaw Logging Readiness

## Purpose

This document records the current state of OpenClaw-side SkillForge logging and whether it is sufficient for the next phase:

- stop treating OpenClaw as a no-consume tryout harness
- improve output quality until it is strong enough for daily real usage

## Scope

This is based on the current shared runtime:

- host: `yankeeting@192.168.0.12`
- OpenClaw repo: `~/.openclaw/projects/openclaw-dev`
- SkillForge runtime repo: `~/.openclaw/projects/workflow-kit`

## Runtime Status Snapshot

At inspection time:

- `betterPlan` audit log existed
- `betterPrompt` audit log was missing
- routed run records existed under `~/.skillforge/routed-run-store.jsonl`
- legacy execution log existed under `~/.skillforge/execution-log.jsonl`

Observed file presence:

- `/home/yankeeting/.openclaw/runtime/skillforge-betterplan-audit.jsonl`
- `/home/yankeeting/.openclaw/runtime/skillforge-betterprompt-audit.jsonl` -> missing
- `/home/yankeeting/.skillforge/routed-run-store.jsonl`
- `/home/yankeeting/.skillforge/execution-log.jsonl`

## Key Finding

Current logging is enough for:

- confirming whether hooks fired
- confirming whether CLI invocation failed
- seeing some structured SkillForge-side records

Current logging is not enough for:

- systematic quality optimization of `betterPlan`
- systematic quality optimization of `betterPrompt`
- deciding whether outputs are ready for daily real consumption

So the answer is:

- enough for smoke validation
- not enough for the next quality-driven phase

## What Exists Today

### 1. `betterPlan` audit

Source:

- OpenClaw side fire helper writes `/home/yankeeting/.openclaw/runtime/skillforge-betterplan-audit.jsonl`

Current value:

- confirms trigger happened
- captures `ok`, `stdout`, `stderr`, `signal`, and error text

Current limitation:

- optimized for integration debugging, not quality analysis
- does not expose normalized review findings as top-level analyzable fields
- does not separate retrieval failure from review failure in a durable way

### 2. `betterPrompt` audit

Expected path:

- `/home/yankeeting/.openclaw/runtime/skillforge-betterprompt-audit.jsonl`

Current value:

- none, because the currently active trigger path does not write it

Root cause:

- older `betterprompt-fire.ts` writes audit
- current `sessions-spawn-tool.ts` uses `triggerSkillforgeBetterprompt()` from `src/auto-reply/reply/skillforge/betterprompt.ts`
- that implementation uses detached `spawn(..., stdio: "ignore")`
- it logs only through application logger, not through audit JSONL

Impact:

- the real `sessions_spawn` path lacks a stable per-call audit trail
- this is the biggest current observability gap

### 3. `routed-run-store`

Path:

- `/home/yankeeting/.skillforge/routed-run-store.jsonl`

Current value:

- most promising log surface for next phase
- includes structured fields such as:
  - `status`
  - `failureStage`
  - `userRequest`
  - some `retrieval` / `compilation` payload

Current limitation:

- only reflects what SkillForge CLI persisted
- not yet fully joined with OpenClaw session or tool-call identity
- not yet guaranteed for every real OpenClaw trigger

### 4. legacy `execution-log`

Path:

- `/home/yankeeting/.skillforge/execution-log.jsonl`

Current value:

- useful as historical corpus
- contains older `betterPlan v1` / `betterPrompt v1` style outputs

Current limitation:

- mixed schemas
- mixed generations of behavior
- includes old fallback-era records
- poor primary source for next-phase quality baselines

## Readiness Against Next-Phase Goal

The next-phase goal is:

- outputs should become good enough for daily real usage quality

To support that, logs must answer:

1. what task or spawn-side prompt was sent
2. what skills were considered
3. what skills were selected
4. what review or compiled package was returned
5. whether the result was useful
6. where failure happened: `plan`, `retrieval`, `compilation`, or `execution`

Current logging does not fully answer all six.

The biggest misses are:

- no stable `betterPrompt` audit on the real `sessions_spawn` path
- weak linkage between OpenClaw-side trigger identity and SkillForge-side run identity
- legacy logs still dominate historical volume

## Minimum Logging Upgrades Required

### Upgrade 1. Restore real `betterPrompt` audit on the active OpenClaw path

Required outcome:

- every real `sessions_spawn` tryout call produces an audit record

Minimum fields:

- timestamp
- trigger source
- prompt preview or source prompt ref
- whether budget was consumed
- whether the child process launched
- exit or spawn error summary
- optional run id when available

### Upgrade 2. Add OpenClaw-to-SkillForge correlation ids

Required outcome:

- one OpenClaw-side trigger can be matched to one SkillForge-side routed run

Minimum fields:

- session key
- tool name
- trigger timestamp
- correlation id or run id

### Upgrade 3. Prefer structured run records over legacy execution log for analysis

Required outcome:

- quality review work should primarily use `routed-run-store`

Legacy execution log can remain for:

- archival history
- rough backfill mining

But it should not be the primary truth source for the next phase.

### Upgrade 4. Preserve stage-specific failure semantics

Required outcome:

- logs should clearly distinguish:
  - `plan`
  - `retrieval`
  - `compilation`
  - `execution`

This is required because the next optimization phase is not about "did the tool run", but about "which stage is making quality unacceptable".

## Practical Recommendation

Before moving OpenClaw from tryout mentality toward real daily-consumption quality, do these first:

1. instrument the active `betterPrompt` trigger path so it writes audit JSONL
2. attach a correlation id from OpenClaw trigger to SkillForge run record
3. use `routed-run-store` as the main optimization dataset
4. treat `execution-log.jsonl` as historical legacy data only

## Bottom Line

Current logs are enough to prove integration exists.

Current logs are not yet strong enough to support the next quality-driven phase without extra plumbing.

The first required fix is:

- restore structured `betterPrompt` audit on the real `sessions_spawn` path
