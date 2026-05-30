# Skill Register Schema Draft

## Purpose

This document defines the first practical target for `skill register`.

Version 1 is intentionally lightweight.

It is not a full workflow parser.

It is a routing-oriented index layer that helps `betterPrompt` find relevant production skills and preserve enough execution signals to compile a stable executor package.

Important note:

The register may be lightweight as a stored schema, but producing that schema from real skill files is not a lightweight semantic problem.

Because the source skill files are often inconsistent or only partially structured, LM participation is expected in the extraction pipeline.

## Version 1 Position

The chosen direction for version 1 is:

- light indexing
- heavy compilation in `betterPrompt`

That means `skill register` should:

- scan and index candidate skills
- normalize a minimum set of routing fields
- expose retrieval-friendly metadata
- preserve source references
- gate retrieval by tool requirements

It should not yet:

- fully decompose every skill into a canonical workflow AST
- precompile complete execution plans
- try to solve prompt compilation by itself

## Design Principle

The register should return enough information to answer:

1. should this skill be considered for this task
2. what kind of entry it is
3. what project tools or technical surface it requires
4. what execution path or tool family it hints at
5. what reporting or stop-rule signals it carries
6. where the source came from

Everything deeper than that should remain the job of `betterPrompt`.

## Tool Gate Principle

A skill should not be retrieved only because it is semantically related.

It should also pass a tool-fit gate.

Examples:

- a Git workflow skill should only be retrieved when the current project or runtime context actually involves `git`
- a `browseros-cli` skill should only be retrieved when the project context explicitly allows or requires `browseros-cli`
- an MCP-oriented skill should only be retrieved when the runtime context includes that MCP surface

This means routing should work like:

```text
task relevance
  + project tool fit
  + runtime tool fit
  => candidate skill
```

Without the tool-fit layer, retrieval will keep surfacing skills that look relevant in language but are not truly usable in the current execution environment.

## V1 Entry Shape

The minimum useful entry can be represented as:

```json
{
  "id": "skills/browser-agent-workflow",
  "name": "browser-agent-workflow",
  "kind": "skill",
  "version": "1.2.0",
  "description": "BrowserOS CLI unified browser workflow entrypoint",
  "sourceRef": {
    "path": "skills/browser-agent-workflow/SKILL.md"
  },
  "applicableScenes": [
    "browser interaction",
    "DOM inspection",
    "page verification"
  ],
  "triggerHints": [
    "browser",
    "page",
    "DOM"
  ],
  "requiredTools": [
    "browseros-cli"
  ],
  "toolSignals": [
    "python3 -m browseros_cli",
    "browseros-cli"
  ],
  "entrypointHints": [
    "python3 -m browseros_cli",
    "browseros-cli"
  ],
  "toolFamilies": [
    "browseros-cli"
  ],
  "reportHints": [
    "return completed status",
    "include key commands",
    "include evidence summary"
  ],
  "stopRuleHints": [
    "if health checks fail, stop and report"
  ],
  "constraintHints": [
    "use canonical CLI path",
    "do not invent unsupported commands"
  ],
  "tags": [
    "browser",
    "verification",
    "cli"
  ]
}
```

## Field Definitions

### Identity

- `id`
  - stable repository-local identifier
  - recommended format: directory path without `/SKILL.md`

- `name`
  - human-readable skill name
  - usually derived from frontmatter `name`

- `kind`
  - `skill` or `subagent`
  - must be explicit because production corpus mixes both

- `version`
  - optional but useful when present

### Source

- `sourceRef`
  - minimum: path to the source `SKILL.md`
  - may later include checksum or last indexed timestamp

### Retrieval-Oriented Fields

- `description`
  - concise text summary

- `applicableScenes`
  - normalized short phrases describing when the skill is relevant
  - example: `browser interaction`, `plan review`, `code verification`

- `triggerHints`
  - raw or normalized cue words extracted from description/body
  - used for low-cost matching before deeper prompt compilation

- `tags`
  - compact labels that help search and filtering

### Tool Gate Fields

- `requiredTools`
  - canonical tool identifiers that must be present in project or runtime context before this skill becomes retrievable
  - examples:
    - `git`
    - `browseros-cli`
    - `godot-mcp`

- `toolSignals`
  - concrete command or string signals extracted from the skill text
  - examples:
    - `python3 -m browseros_cli`
    - `git`
    - `openclaw-config.py`

These two fields are different:

- `requiredTools` is normalized and used for gating
- `toolSignals` is rawer evidence extracted from the source

### Routing Hints

- `entrypointHints`
  - concrete command, script, or invocation family hinted by the skill
  - examples:
    - `python3 -m browseros_cli`
    - `~/.openclaw/scripts/openclaw-config.py`

- `toolFamilies`
  - normalized tool bucket names
  - examples:
    - `browseros-cli`
    - `python-script`
    - `shell`

- `constraintHints`
  - short normalized rules that affect execution compilation
  - examples:
    - `use canonical script`
    - `do not bypass standard CLI`

- `stopRuleHints`
  - short normalized failure boundaries
  - examples:
    - `stop after health-check failure`
    - `stop after first real code error`

- `reportHints`
  - short normalized signals about expected output structure
  - examples:
    - `include modified files`
    - `include evidence summary`

## Retrieval Gate Inputs

To make tool-fit work, register queries should gradually include a lightweight project/runtime capability context such as:

```json
{
  "taskText": "validate page flow and collect screenshots",
  "projectTools": ["browseros-cli", "git"],
  "runtimeTools": ["browseros-cli"],
  "allowedToolFamilies": ["browseros-cli", "shell"]
}
```

The first retrieval rule can stay simple:

1. reject skills whose `requiredTools` are not satisfied
2. score the remaining skills by task relevance
3. return compact routing hints to `betterPrompt`

## Normalization Guidance

Version 1 should prefer safe, validated extraction.

That does not mean "regex only" or "program-only parsing".

For real production skill files, the expected approach is:

1. program scans and loads source skill text
2. LM extracts a routing-oriented intermediate representation
3. program validates, normalizes, and stores the result

Good sources for initial normalization:

- frontmatter fields
- skill title
- obvious "适用场景" or "Usage" sections
- obvious command examples
- obvious "输出格式" or "Output" sections
- obvious failure or stop-rule sections
- obvious tool requirements or command families

Version 1 should avoid pretending that arbitrary prose can be fully normalized without semantic interpretation.

If a signal cannot be extracted confidently, omit it instead of hallucinating structure.

## Required Behaviors

The first useful `skill register` should be able to:

1. index both `skill` and `subagent` entries
2. return source paths for traceability
3. return compact retrieval hints for routing
4. expose tool requirements for retrieval gating
5. expose entrypoint, report, and stop-rule hints when available
6. degrade gracefully when a skill only provides partial structure

## Non-Goals

Version 1 does not need:

- normalized full workflow steps
- step-level checks
- dependency graphs between skills
- scoring logic baked into the register
- final executor prompt generation

Those belong later or belong in `betterPrompt`.

## Relationship To betterPrompt

`skill register` v1 should be understood as a candidate provider.

It gives `betterPrompt`:

- who the candidates are
- what kind of entries they are
- what tools they require
- which execution families they suggest
- which output and stop-rule hints they carry
- where to read the original skill text

Then `betterPrompt` is responsible for:

- selecting final candidates
- reading deeper source context when needed
- compiling ordered execution steps
- producing the final executor package

## Relationship To Logs

For each routed run, logs should ideally preserve:

- register query input
- query-side project tool context
- returned candidate ids
- selected candidate ids
- selected source refs
- selected hints actually used in compilation

This will later help us answer whether a failure came from:

- bad retrieval
- bad tool gating
- bad compilation
- bad execution

## Immediate Next Step

This schema should feed:

1. the next revision of `src/skillforge/registry-*`
2. `betterPrompt` input expectations
3. future log payload design
