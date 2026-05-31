function toArray(value) {
  return Array.isArray(value) ? value : [];
}

export const TASK_INTERPRETATION_SKILL = Object.freeze({
  id: 'task-interpretation-skill',
  purpose: 'Interpret an agent task into lightweight routing anchors.',
  outputSchema: {
    type: 'object',
    required: ['summary', 'taskTypes', 'workflowStages', 'artifactTargets', 'toolHints', 'agentArchetypes', 'constraints', 'reportExpectations', 'openTags'],
    properties: {
      summary: { type: 'string' },
      projectScope: { type: ['string', 'null'] },
      taskTypes: { type: 'array', items: { type: 'string' } },
      workflowStages: { type: 'array', items: { type: 'string' } },
      artifactTargets: { type: 'array', items: { type: 'string' } },
      toolHints: { type: 'array', items: { type: 'string' } },
      agentArchetypes: { type: 'array', items: { type: 'string' } },
      constraints: { type: 'array', items: { type: 'string' } },
      reportExpectations: { type: 'array', items: { type: 'string' } },
      openTags: { type: 'array', items: { type: 'string' } },
    },
  },
  systemPrompt:
    'You are a task-interpretation skill. Read an agent task, preserve the important routing signals, keep the output lightweight, and return JSON only.',
  buildUserPrompt(context = {}) {
    return `You are a task-interpretation skill for routing.

Your job is to read an agent task and extract a lightweight routing record.

Think like this:
- what kind of task is this
- what workflow stage is it in
- what concrete target is being acted on
- what tools are clearly involved
- what kind of agent behavior is implied
- what output/report shape is expected

Important guidance:
- keep the result lightweight and routing-oriented
- preserve concrete targets instead of collapsing everything into a single verb
- if the task mentions a browser page flow, runtime gameplay test, code review, schema validation, compile pipeline, asset ids, or project names, keep those specifics alive
- if the task asks for evidence, concise report, review conclusion, or specific sections, reflect that in reportExpectations
- if the task clearly acts on code, config, ui/page, runtime, document, or assets, reflect that in artifactTargets

Return JSON only with this lightweight schema:
${JSON.stringify(this.outputSchema, null, 2)}

Task context:
${JSON.stringify({
  intent: context.intent || '',
  description: context.description || context.text || '',
  tags: toArray(context.tags),
  tools: toArray(context.tools),
  capabilities: toArray(context.capabilities),
  projectScope: context.projectScope || null,
  planContext: context.planContext || null,
  runtimeContext: context.runtimeContext || null,
}, null, 2)}`;
  },
});

export const BETTERPLAN_REVIEW_SKILL = Object.freeze({
  id: 'betterplan-review-skill',
  purpose: 'Review an agent-authored plan with workflow grounding, plan-quality rules, and natural-language feedback.',
  outputSchema: {
    type: 'object',
    required: ['reviewText', 'summary', 'workflowBasis', 'findings', 'confidence'],
    properties: {
      reviewText: { type: 'string' },
      summary: { type: 'string' },
      workflowBasis: { type: 'array', items: { type: 'string' } },
      findings: {
        type: 'array',
        items: {
          type: 'object',
          required: ['severity', 'basis', 'type', 'message', 'suggestion'],
          properties: {
            severity: { type: 'string' },
            basis: { type: 'string' },
            type: { type: 'string' },
            message: { type: 'string' },
            suggestion: { type: 'string' },
            source_skill_ref: { type: 'string' },
          },
        },
      },
      confidence: { type: 'number' },
    },
  },
  systemPrompt:
    'You are a plan-review skill for agent-authored plans. Review against workflow expectations and planning quality, keep the response actionable, and return JSON only.',
  buildUserPrompt(planText, goalHint, workflowBasis = []) {
    return `You are reviewing a plan written by an agent.

Goal hint:
${goalHint || '(none)'}

Workflow basis from relevant skills:
${JSON.stringify(workflowBasis, null, 2)}

Plan text:
---
${planText}
---

Review this like a planning-review skill:
- do not rewrite the whole plan
- produce a direct natural-language review that an agent can immediately act on
- first classify the plan type in your own reasoning:
  - execution plan
  - research / exploration plan
  - review / verification plan
  - coordination / dispatch plan
- then infer the closest lightweight workflow family in your own reasoning:
  - engineering: research -> implement -> verify -> finish
  - research: explore -> analyze -> summarize
  - documentation: research -> write -> review
  - ops: prepare -> execute -> verify -> rollback-plan
  - discussion: discuss -> summarize -> decide
- review from two angles:
  1. workflow-grounded review based on the retrieved workflow basis
  2. general planning review based on constraints, dependencies, done criteria, granularity, and ambiguity
- keep four review dimensions active in your reasoning:
  1. atomicity
  2. stage completeness
  3. workflow fit
  4. completion clarity
- use a stable "good plan" standard:
  - the plan goal is concrete and not overly broad
  - the plan tasks have the right granularity for the plan type
  - the plan makes task boundaries, dependencies, and done criteria legible
  - the plan does not mix too many responsibilities inside one task
- prefer the best habits from strong planning skills:
  - action items should be concrete and preferably verb-first
  - implementation, verification, and review should usually be separate tasks rather than one mixed task
  - validation should be visible as its own part of the plan, not implied vaguely at the end
- if the plan is an execution plan, treat atomicity as a primary review rule
- for an execution plan, a task should be atomic enough that one subagent can finish it independently without extra back-and-forth clarification
- if one task mixes implementation, verification, review, environment setup, or reporting in a way that breaks atomicity, call that out clearly
- if task scope is too large, too vague, or bundles multiple deliverables, call that out as a granularity problem
- if several tasks are individually clear but ordered badly or missing dependency edges, call that out as a sequencing problem
- use workflow-family rules when they help:
  - engineering plans should usually make research, implement, verify, and finish legible
  - engineering plans should usually keep research separate from implement
  - engineering plans should usually keep verify separate from implement
  - documentation plans should usually keep review separate from writing
  - ops plans should usually keep execute separate from verify and keep rollback or recovery visible
  - research plans should still make the summary or conclusion explicit
- if useful, recommend a better task shape using ideas like:
  - objective
  - scope
  - inputs
  - expected output
  - done criteria
  - dependencies
- keep feedback concise, actionable, and execution-oriented
- return at least 2 findings unless the plan is exceptionally complete
- use basis=workflow when the issue is derived from workflow skeleton expectations
- use basis=general for broader planning quality issues
- when a plan is already strong, still mention the strongest part briefly before listing any remaining issues
- suggestions should be concrete plan edits, not vague advice
- when possible, name the affected task or task id and say exactly what to split, add, reorder, or clarify

Return JSON only with this lightweight schema:
${JSON.stringify(this.outputSchema, null, 2)}`;
  },
});

export const BETTERPROMPT_COMPILATION_SKILL = Object.freeze({
  id: 'betterprompt-compilation-skill',
  purpose: 'Fuse routed skills and the current task into a final executor-facing natural-language prompt.',
  outputSchema: {
    type: 'object',
    required: ['executorPrompt', 'rationale'],
    properties: {
      executorPrompt: { type: 'string' },
      objective: { type: 'string' },
      stepOutline: { type: 'array', items: { type: 'string' } },
      hardConstraints: { type: 'array', items: { type: 'string' } },
      stopRules: { type: 'array', items: { type: 'string' } },
      nonGoals: { type: 'array', items: { type: 'string' } },
      reportSections: { type: 'array', items: { type: 'string' } },
      artifacts: { type: 'array', items: { type: 'string' } },
      rationale: { type: 'array', items: { type: 'string' } },
    },
  },
  systemPrompt:
    'You are a prompt-compilation skill. Use the routed skills as programs for the model, synthesize a final executor-facing natural-language prompt, keep the schema lightweight, and return JSON only.',
  buildUserPrompt(input, routedSkills = []) {
    return `You are a prompt-compilation skill for a general downstream executor.

Your job is to digest the current task together with the routed skills, then produce guidance that a capable general executor agent can directly follow.

Treat the routed skills as programs for the model:
- preserve the workflow shape they imply
- preserve concrete entrypoint and tool expectations when they matter
- preserve stop conditions and deliverable expectations when they matter
- write the final result as natural language for the executor

Important guidance:
- executorPrompt is the primary output and must be directly usable by a downstream executor
- executorPrompt should read like a concise execution brief for a capable agent, not a tutorial
- do not name or explain the workflow in the main body unless the task explicitly requires it
- prefer compact imperative language over explanatory prose
- do not mechanically mirror the original prompt structure if a shorter brief can preserve the same intent
- strip wrapper language like:
  - "you are ..."
  - "please execute ..."
  - "first optimize the prompt ..."
  - long background restatements that do not change execution
- compress background facts into only the few constraints or assumptions that materially affect execution
- prefer turning a verbose task into:
  - a sharp objective
  - the critical execution path
  - the non-negotiable constraints
  - the expected deliverable
- if the task naturally benefits from steps or deliverables, make them explicit inside executorPrompt, but only when they improve execution accuracy
- only make steps explicit when they are necessary for execution accuracy
- keep deliverables explicit, but keep narration minimal
- you may also return stepOutline, reportSections, artifacts, or constraint hints, but they are secondary
- keep the schema lightweight; do not over-engineer it

Return JSON only with this lightweight schema:
${JSON.stringify(this.outputSchema, null, 2)}

Task input:
${JSON.stringify({
  rawPrompt: input.rawPrompt,
  goal_hint: input.goal_hint || null,
  taskContext: input.taskContext || null,
  planContext: input.planContext || null,
}, null, 2)}

Selected routed skills:
${JSON.stringify(routedSkills, null, 2)}`;
  },
});

export default {
  TASK_INTERPRETATION_SKILL,
  BETTERPLAN_REVIEW_SKILL,
  BETTERPROMPT_COMPILATION_SKILL,
};
