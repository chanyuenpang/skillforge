import { callJsonModel } from './llm-json.mjs';
import { TASK_INTERPRETATION_SKILL } from './system-skills.mjs';

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
  return TASK_INTERPRETATION_SKILL.buildUserPrompt(context);
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
    systemPrompt: TASK_INTERPRETATION_SKILL.systemPrompt,
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
