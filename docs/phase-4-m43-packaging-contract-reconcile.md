# Phase 4 M4.3 packaging contract reconcile

Fixture: `meeting-summary-assistant`

This document records the first thin step for a packaging contract reconcile check.

## Scope

This check is a **static packaging contract reconcile**, not a runtime packaging pipeline.

It verifies that the M4.2 static synthesis sample is internally consistent across:

- `generated/skill-manifest.yaml`
- `generated/skill/SKILL.md`
- `validation-result.yaml`

## Input

- The `meeting-summary-assistant` fixture directory
- The generated static sample under `generated/`
- The validation result metadata file

## Output

A repeatable CLI check that prints readable `OK` / `FAIL` lines and exits non-zero on contract mismatches.

## What it checks

- generated manifest exists
- generated skill entry exists
- manifest declares `kind: skill-manifest`
- manifest keeps `status: static_checked`
- manifest entry path targets `generated/skill/SKILL.md`
- generated `SKILL.md` has required frontmatter fields
- validation result stays `static` and `pending`
- validation result does not claim runtime success

## Non-goals

- No runtime validation
- No full packaging pipeline
- No generator implementation
- No UI / registry / runtime integration
- No change to the default `validate` chain

## Why this exists

The goal is to make the static sample checkable in a separate, repeatable way before any runtime packaging work is introduced.

`static pass ≠ runtime pass`.
