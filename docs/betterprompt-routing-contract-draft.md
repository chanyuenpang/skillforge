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

The output should not be a vague rewritten prompt.

It should be a compiled execution package with at least these sections:

### 1. Routing Result

- selected skills
- rejected skills
- routing rationale
- tool-gate decisions
- selected entrypoints
- source kind notes such as `skill` vs `subagent`

### 2. Execution Intent

- executor objective
- task goal restatement
- completion condition

### 3. Execution Steps

- ordered steps
- per-step intent
- per-step checks
- per-step entrypoint or tool family

### 4. Constraints

- hard constraints
- non-goals
- failure stop conditions
- do-not-invent rules when a skill requires a canonical interface

### 5. Output Requirements

- expected report structure
- required artifacts
- formatting expectations

### 6. Traceability

- source skill refs
- source prompt reference
- task reference

## Minimum Structured Output Candidate

The next implementation target can be approximated with the following structure:

```json
{
  "routing": {
    "selected": ["skills/browser-agent-workflow"],
    "rejected": ["skills/executor"],
    "rationale": ["task requires browser interaction and standardized CLI workflow"],
    "toolGate": {
      "required": ["browseros-cli"],
      "matched": ["browseros-cli"],
      "missing": []
    },
    "entrypoints": ["python3 -m browseros_cli"]
  },
  "execution": {
    "objective": "validate the requested page flow and collect evidence",
    "completionCriteria": [
      "target page actions completed",
      "expected page state verified",
      "report includes evidence"
    ],
    "steps": [
      {
        "id": "step-1",
        "title": "Verify tool availability",
        "intent": "confirm the browser execution path is usable",
        "entrypoint": "python3 -m browseros_cli --help",
        "checks": ["command returns successfully"]
      }
    ]
  },
  "constraints": {
    "hard": [
      "use the canonical browser CLI path before inventing alternative commands"
    ],
    "stopRules": [
      "if health checks fail, stop and report the failure point"
    ],
    "nonGoals": [
      "do not route a predefined specialized subagent unless explicitly required"
    ]
  },
  "report": {
    "requiredSections": [
      "completed actions",
      "key evidence",
      "failures or warnings"
    ],
    "artifacts": [
      "screenshots if produced by the skill workflow"
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
4. it should produce something directly usable by a downstream executor agent
5. it should preserve enough traceability for log review
6. it should preserve routed workflow structure such as entrypoints, checks, stop rules, and report requirements

## Non-Goals

This contract draft does not require:

- a full skill ontology
- a complete long-term routing engine
- a UI
- a marketplace
- user-facing authoring

It only defines the minimum structure needed to make spawn-time routing reliable enough to iterate on.
