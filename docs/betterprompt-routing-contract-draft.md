# betterPrompt Routing Contract Draft

## Purpose

This document defines the next working target for `betterPrompt`.

The goal is not to polish prose. The goal is to intercept `sessionSpawn`, perform dynamic skill routing, and produce a compiled execution package for a downstream executor agent.

## Working Scene

The expected runtime scene is:

1. the leader agent is executing a plan
2. the leader agent reaches a concrete task, or receives a direct execution instruction
3. the original system would call `sessionSpawn`
4. SkillForge intercepts that boundary
5. SkillForge performs dynamic routing instead of choosing a predefined subagent
6. SkillForge returns compiled guidance for a downstream executor

## What Production Skills Tell Us

The current `skills/` corpus from OpenClaw production changes how this contract should be interpreted.

The routing target is not a neat library of short capability blurbs.

It is a mixed corpus containing both `skill` and `subagent` style entries, and many of those entries already contain workflow structure such as:

- trigger scenes
- ordered steps
- command or script entrypoints
- verification steps
- stop conditions
- output format

So the contract should aim to preserve and normalize those signals instead of flattening them away.

## Input Shape

The next contract should conceptually accept the following categories of input:

### 1. Task Context

- `taskId`
- `taskTitle`
- `taskDescription`
- `taskGoal`
- `taskConstraints`
- `taskDoneCriteria`

### 2. Plan Context

- `planId`
- `milestoneId`
- `upstreamDependencies`
- `planLevelConstraints`

### 3. Spawn Context

- `rawPrompt`
- `spawnIntent`
- `requestingAgent`

### 4. Routing Context

- `candidateSkillRefs`
- `skillMetadata`
- `skillWorkflowSignals`
- `candidateKinds`
- `requiredTools`
- `projectToolContext`
- `runtimeToolContext`
- `entrypointHints`
- `reportHints`
- `stopRuleHints`

### 5. Optional User Direct Instruction Context

- `directInstruction`

This exists because the trigger may come from either:

- a concrete task inside a plan
- a direct user instruction that still flows through the spawn boundary

## Output Shape

The output should be centered on a final natural-language executor prompt.

That prompt may clearly include sections such as steps, deliverables, constraints, and report expectations.

But those expectations should be expressed as part of the skill-guided prompt design for the model, not as a rigid program-validated schema that the model must satisfy field by field.

The program layer may still keep lightweight trace and routing metadata, but the actual execution guidance should remain model-authored natural language.

The working package should therefore include:

### 1. Routing Result

- selected skills
- rejected skills
- routing rationale
- tool-gate decisions
- selected entrypoints
- source kind notes such as `skill` vs `subagent`

### 2. Executor Prompt

- a final natural-language prompt directly usable by the downstream executor
- when helpful, it should clearly include:
  - steps
  - deliverables
  - constraints
  - report expectations
- these should be phrased naturally, as part of the prompt itself

### 3. Lightweight Guidance Hints

- optional objective restatement
- optional step outline
- optional report hints
- optional constraint hints

These hints exist to help observability and debugging.

They are not the primary execution artifact.

### 4. Traceability

- source skill refs
- source prompt reference
- task reference

## Minimum Structured Output Candidate

The next implementation target can be approximated with the following structure:

```json
{
  "executorPrompt": "Check prerequisites first. Then use the canonical browser workflow to validate the requested page flow. Follow the expected interaction path carefully, stop immediately if prerequisite checks fail, and return a concise evidence-oriented report with completed actions, key evidence, blockers, and any warnings.",
  "routing": {
    "selected": ["skills/browser-agent-workflow"],
    "rejected": ["skills/executor"],
    "rationale": ["task requires browser interaction and standardized CLI workflow"]
  },
  "guidance": {
    "objective": "validate the requested page flow and collect evidence",
    "stepOutline": [
      "verify prerequisites",
      "execute the browser flow",
      "return an evidence-oriented report"
    ],
    "reportHints": [
      "completed actions",
      "key evidence",
      "failures or warnings"
    ]
  },
  "trace": {
    "taskId": "task-123",
    "planId": "plan-456",
    "sourcePromptRef": "spawn-input",
    "skillRefs": ["skills/browser-agent-workflow/SKILL.md"]
  }
}
```

## Required Product Behavior

The next version of `betterPrompt` should behave as follows:

1. it should not assume a predefined subagent must exist
2. it should dynamically route skills at execution time
3. it should consume the original agent prompt instead of ignoring it
4. it should produce a final natural-language prompt directly usable by a downstream executor agent
5. it should preserve enough traceability for log review
6. it should preserve routed workflow structure such as steps, stop rules, and report requirements inside that natural-language prompt

## Non-Goals

This contract draft does not require:

- a full skill ontology
- a complete long-term routing engine
- a UI
- a marketplace
- user-facing authoring

It only defines the minimum structure needed to make spawn-time routing reliable enough to iterate on.
