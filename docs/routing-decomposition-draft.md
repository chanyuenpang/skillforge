# Routing Decomposition Draft

## Purpose

This document decomposes "routing" into smaller technical stages.

The goal is to avoid treating routing as one black-box decision such as:

- "let the LM do routing"
- or "let the program do routing"

Instead, SkillForge should treat routing as a pipeline of related but distinct problems.

This makes it easier to decide:

- what should be LM-driven now
- what should be programmatic now
- what may later be distilled into cheaper and more stable mechanisms

## Core Position

The real question is not:

- should we use LM for routing

The real question is:

- which subproblems inside routing require LM
- which subproblems benefit from deterministic control
- which subproblems may later be learned or distilled from accumulated data

## Routing Is Not One Thing

In SkillForge, routing should be decomposed into at least these stages:

1. task interpretation
2. task-side intermediate representation generation
3. skill-side intermediate representation generation
4. candidate retrieval
5. candidate hard filtering
6. candidate ranking
7. multi-skill composition
8. execution-package compilation
9. run diagnosis feedback

Each stage has different technical requirements.

## Stage 1. Task Interpretation

Question:

- what is the task really asking for

Examples of hidden content:

- implicit goal
- domain
- missing but assumed constraints
- desired output style
- likely execution type

Current best approach:

- LM-heavy

Why:

- the input prompt is often understructured
- the user or leader agent may not express workflow needs explicitly

Program role:

- collect prompt and context
- preserve source text
- pass structured wrapper

Likely future evolution:

- some high-frequency task type classification may be distilled
- but full task interpretation will likely remain LM-heavy

## Stage 2. Task-Side IR Generation

Question:

- can we turn the interpreted task into a structured task-side intermediate representation

Example fields:

- objective
- task type
- likely workflow shape
- tool expectations
- report expectations
- ambiguity flags

Current best approach:

- LM-first, schema-validated by program

Why:

- the IR is semantic compression of messy input

Program role:

- validate schema
- reject malformed output
- persist trace

Likely future evolution:

- partial distillation possible for narrow domains

## Stage 3. Skill-Side IR Generation

Question:

- can we turn non-standard skill files into structured routing assets

Example fields:

- applicable scenes
- workflow skeleton summary
- tool requirements
- entrypoint hints
- report hints
- stop rules
- constraints

Current best approach:

- LM-first extraction from raw skill files

Why:

- source skills are not normalized enough for deterministic parsing alone

Program role:

- scan files
- segment input
- validate extracted structure
- cache results

Likely future evolution:

- once enough normalized outputs exist, some extraction helpers may become programmatic
- but deep interpretation will likely remain LM-assisted

## Stage 4. Candidate Retrieval

Question:

- given a task-side IR and a skill-side IR corpus, which candidates should enter consideration

Current best approach:

- hybrid

Good ingredients:

- lexical match
- tag match
- scene overlap
- tool overlap
- vector retrieval later if needed

Why hybrid:

- pure keyword retrieval is weak
- full LM over the whole corpus is too expensive and too loose

Program role:

- narrow the search space
- apply cheap retrieval strategies

LM role:

- not always necessary at this first narrowing step

Likely future evolution:

- this is a strong candidate for learned retrieval or embedding-based retrieval

## Stage 5. Candidate Hard Filtering

Question:

- which candidates are definitely invalid

Examples:

- missing required tool
- wrong runtime surface
- incompatible execution environment
- forbidden tool family

Current best approach:

- programmatic first

Why:

- these are hard constraints
- deterministic filtering is safer and cheaper

Program role:

- remove impossible candidates
- record reasons for removal

LM role:

- optional only for ambiguous constraints

Likely future evolution:

- should remain mostly deterministic

## Stage 6. Candidate Ranking

Question:

- among valid candidates, which are most relevant

Current best approach:

- hybrid ranking

Reasonable design:

- program computes a cheap prior score
- LM reranks the narrowed candidate set when needed

Why:

- fully programmatic ranking is too shallow
- fully LM ranking over a large set is expensive and unstable

Program role:

- create bounded candidate list
- preserve score features

LM role:

- compare semantic fit
- explain preference

Likely future evolution:

- this is a strong candidate for distillation into a learned reranker

## Stage 7. Multi-Skill Composition

Question:

- if more than one skill is needed, how should they be combined

Examples:

- one dominant workflow skill
- one tool-entry skill
- one reporting skill

Current best approach:

- LM-heavy

Why:

- composition is not just ranking several skills
- it requires reasoning about role, overlap, order, and redundancy

Program role:

- enforce limits
- keep source refs
- prevent illegal combinations if there are hard rules

Likely future evolution:

- some repeated compositions may be cached or templated
- but novel composition will remain LM-heavy

## Stage 8. Execution-Package Compilation

Question:

- how do we turn selected skills plus task context into a package the downstream executor can run

Current best approach:

- LM-heavy

Why:

- compilation must synthesize:
  - objective
  - ordered steps
  - checks
  - constraints
  - stop rules
  - report requirements

Program role:

- enforce output contract
- validate required sections
- persist trace

Likely future evolution:

- some package templates may stabilize
- but semantic compilation remains a core LM function

## Stage 9. Run Diagnosis Feedback

Question:

- what can we learn from the result to improve future routing

Current best approach:

- program-first logging
- optional later LM-assisted analysis

Why:

- the evidence layer must be trustworthy before it becomes interpretive

Program role:

- store plan/retrieval/compilation/execution traces
- preserve artifacts and failure stage

LM role later:

- summarize failure patterns
- suggest better routing choices
- help derive future heuristics or training signals

## Current Recommended Architecture

If we map these stages to current implementation philosophy:

### LM-Heavy Now

- task interpretation
- task-side IR generation
- skill-side IR generation
- multi-skill composition
- execution-package compilation

### Hybrid Now

- candidate retrieval
- candidate ranking

### Program-First Now

- candidate hard filtering
- schema validation
- persistence
- traceability
- logs

## Future Distillation Opportunities

Not every stage should stay equally LM-dependent forever.

Most promising distillation targets:

- candidate retrieval
- candidate ranking
- common task-type classification
- common tool-chain routing
- repeated multi-skill compositions in stable domains

Less promising distillation targets:

- deep task interpretation for messy prompts
- novel composition across inconsistent skills
- final execution-package synthesis

## Practical Design Recommendation

The most reasonable near-term routing design is:

```text
raw prompt
  -> LM task interpretation
  -> LM task-side IR
raw skills
  -> LM skill-side IR extraction
task IR + skill IR corpus
  -> programmatic retrieval + hard filtering
  -> optional LM reranking / composition
  -> LM execution-package compilation
  -> programmatic validation + logging
```

This is better than:

- pure rule-based routing
- pure metadata routing
- one-shot unconstrained LM routing

## Architecture Decision

SkillForge should not optimize for:

- minimizing LM usage at all costs

SkillForge should optimize for:

- using LM where routing is fundamentally semantic
- using the program where routing is fundamentally structural or deterministic
- leaving room to distill repeated routing behavior later

That is the most technically reasonable path if the goal is truly better routing rather than simply a cheaper implementation.
