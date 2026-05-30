# Log Payload Draft

## Purpose

This document defines the minimum structured log payload for SkillForge.

The goal is not to archive everything blindly.

The goal is to retain enough structured evidence to answer:

1. what the leader agent was trying to do
2. how `betterPlan` reviewed it
3. what `skill register` returned
4. what `betterPrompt` compiled
5. what the executor actually did
6. where the run failed or succeeded

## Design Principle

Logs should help us separate failures into four buckets:

- plan problem
- retrieval problem
- compilation problem
- execution problem

If the payload cannot support that diagnosis, it is not enough.

## Minimum Run Record

A single routed run should ideally produce one top-level record like this:

```json
{
  "runId": "run-20260530-001",
  "timestamp": "2026-05-30T10:00:00Z",
  "userRequest": {
    "text": "validate the page flow and produce a report"
  },
  "plan": {
    "planId": "plan-123",
    "taskId": "task-7",
    "rawPlanRef": "artifacts/plan-123.json",
    "betterPlanReview": {
      "summary": "plan is executable but missing explicit done criteria for final verification",
      "findings": [
        {
          "severity": "warning",
          "message": "final verification criteria are underspecified"
        }
      ]
    }
  },
  "retrieval": {
    "queryText": "validate page flow and collect evidence",
    "projectToolContext": ["browseros-cli", "git"],
    "runtimeToolContext": ["browseros-cli"],
    "candidates": [
      {
        "id": "skills/browser-agent-workflow",
        "kind": "skill"
      },
      {
        "id": "skills/executor",
        "kind": "subagent"
      }
    ],
    "selected": [
      "skills/browser-agent-workflow"
    ],
    "rejected": [
      {
        "id": "skills/executor",
        "reason": "not selected as primary routing source"
      }
    ]
  },
  "compilation": {
    "sourcePrompt": "please validate the flow and collect screenshots",
    "selectedSkillRefs": [
      "skills/browser-agent-workflow/SKILL.md"
    ],
    "compiledPackage": {
      "objective": "validate the page flow and collect evidence",
      "stepsRef": "artifacts/compiled-steps.json",
      "reportSections": [
        "completed actions",
        "key evidence",
        "failures or warnings"
      ]
    }
  },
  "execution": {
    "executorId": "generic-executor",
    "status": "success",
    "artifacts": [
      "artifacts/screenshot-1.png"
    ],
    "warnings": [],
    "error": null
  },
  "diagnosis": {
    "failureStage": null,
    "notes": []
  }
}
```

## Required Sections

### 1. Run Identity

- `runId`
- timestamp
- stable correlation ids when available

This is what lets us join routing, compilation, and execution records later.

### 2. User Request

- original task text
- optional user metadata if needed later

We need the real request, not only the rewritten task.

### 3. Plan Section

- plan id
- task id
- raw plan reference
- `betterPlan` review output

This is what helps us tell whether execution failed because the task was already poorly planned.

### 4. Retrieval Section

- retrieval query text
- project tool context
- runtime tool context
- candidate skills returned
- selected skills
- rejected skills with short reasons

This is what helps us tell whether we chose the wrong candidates or filtered out the right ones.

### 5. Compilation Section

- original spawn-side prompt
- selected skill refs
- compiled objective
- compiled steps reference
- constraints or report requirements

This is what helps us tell whether `betterPrompt` miscompiled the task even when retrieval was fine.

### 6. Execution Section

- executor id
- execution status
- artifact refs
- warnings
- terminal error when present

This is what helps us tell whether the executor failed despite a reasonable compiled package.

### 7. Diagnosis Section

- failure stage
- short notes

Suggested values for `failureStage`:

- `plan`
- `retrieval`
- `compilation`
- `execution`
- `unknown`

This field can start as nullable and be filled later by review logic.

## Minimum Persistence Strategy

Version 1 does not need a complex analytics backend.

It only needs a stable way to preserve:

- a structured JSON record
- references to larger artifacts
- enough ids to reconnect related files

Recommended shape:

- one structured JSON per routed run
- large payloads stored as referenced artifacts

## Artifact Strategy

Do not force the main log record to embed everything inline.

Prefer storing references for large items such as:

- full plan JSON
- full compiled step package
- screenshots
- raw executor transcript

This keeps the main log payload cheap to inspect.

## Non-Goals

This draft does not require:

- full analytics dashboards
- automatic root-cause labeling
- complete token accounting
- full replay engine support

Those can come later.

## Relationship To Other Docs

This document connects to:

1. `docs/system-framework.md`
2. `docs/betterprompt-routing-contract-draft.md`
3. `docs/skill-register-schema-draft.md`
4. `docs/product-core.md`

## Immediate Next Step

The next implementation-level question is:

- which fields are already available in `src/skillforge/`
- which fields need new plumbing from `betterPlan`, register, and `betterPrompt`
