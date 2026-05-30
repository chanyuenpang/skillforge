import { callJsonModel } from './llm-json.mjs';

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function uniq(items = []) {
  return [...new Set(items.filter((item) => hasText(item)).map((item) => String(item).trim()))];
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

export function buildTaskExtractionPrompt(context = {}) {
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

Return JSON only with these fields:
- summary: string
- projectScope: string | null
- taskTypes: string[]
- workflowStages: string[]
- artifactTargets: string[]
- toolHints: string[]
- agentArchetypes: string[]
- constraints: string[]
- reportExpectations: string[]
- openTags: string[]

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
}

export function normalizeTaskRecord(data = {}, context = {}) {
  const description = hasText(context.description || context.text) ? String(context.description || context.text).trim() : '';
  const rawSummary = hasText(data.summary) ? data.summary.trim() : '';
  const weakSummary = /^(validate|fix|review|analyze|implement|check|debug)$/i.test(rawSummary);
  const summary = rawSummary && !weakSummary
    ? rawSummary
    : hasText(context.intent)
      ? String(context.intent).trim()
      : description
        ? description.split(/\r?\n/).map((line) => line.trim()).find(Boolean)?.slice(0, 120) || ''
        : '';

  return {
    summary,
    projectScope: hasText(data.projectScope) ? data.projectScope.trim() : (hasText(context.projectScope) ? String(context.projectScope).trim() : null),
    taskTypes: uniq(toArray(data.taskTypes)),
    workflowStages: uniq(toArray(data.workflowStages)),
    artifactTargets: uniq(toArray(data.artifactTargets)),
    toolHints: uniq([...toArray(data.toolHints), ...toArray(context.tools)]),
    agentArchetypes: uniq(toArray(data.agentArchetypes)),
    constraints: uniq(toArray(data.constraints)),
    reportExpectations: uniq(toArray(data.reportExpectations)),
    openTags: uniq([...toArray(data.openTags), ...toArray(context.tags)]),
  };
}

export async function extractTaskRecord({ context = {} } = {}) {
  if (context.taskRecord && typeof context.taskRecord === 'object') {
    return {
      record: normalizeTaskRecord(context.taskRecord, context),
      meta: {
        llmCalled: false,
        model: null,
        stage: 'task_ir_extraction',
        source: 'context.taskRecord',
      },
    };
  }

  const lmResult = await callJsonModel({
    stage: 'task_ir_extraction',
    systemPrompt: 'You are a routing interpretation skill. Extract a lightweight task-side routing record and return JSON only.',
    userPrompt: buildTaskExtractionPrompt(context),
    maxTokens: 1200,
  });

  return {
    record: normalizeTaskRecord(lmResult.data, context),
    meta: {
      ...lmResult.meta,
      stage: 'task_ir_extraction',
      source: 'llm',
    },
  };
}

export default extractTaskRecord;
