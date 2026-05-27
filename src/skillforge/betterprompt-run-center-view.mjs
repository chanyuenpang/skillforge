export function buildBetterPromptRunCenterView(record = {}) {
  const payload = record?.payload && typeof record.payload === 'object' ? record.payload : {};
  const output = record?.output && typeof record.output === 'object' ? record.output : {};

  const selectedSkills =
    payload.selected_skills ??
    output.selected_skills ??
    [];

  const qcResult =
    payload.qc_result ??
    output.qc_result ??
    null;

  const promptPackageType =
    payload.promptPackageType ??
    output.promptPackageType ??
    payload.packageType ??
    output.packageType ??
    'betterprompt-default';

  return {
    kind: 'betterPromptRunCenterView',
    source: record?.source ?? null,
    id: record?.executionId ?? record?.id ?? null,
    createdAt: record?.timestamp ?? record?.createdAt ?? null,
    status: record?.status ?? null,

    title:
      payload.title ??
      output.title ??
      record?.title ??
      'BetterPrompt Run',
    summary:
      payload.summary ??
      output.summary ??
      record?.summary ??
      null,

    selected_skills: Array.isArray(selectedSkills) ? selectedSkills : [selectedSkills].filter(Boolean),
    qc_result: qcResult,

    promptPackageType,

    planRef: record?.planRef ?? record?.consumedPlanRef?.ref ?? null,
    taskRef: record?.taskRef ?? record?.evidenceRefs?.taskRunId ?? null,
    traceRefs: record?.traceRefs ?? record?.evidenceRefs ?? null,

    artifactRef: record?.artifactRef ?? output?.artifactRef ?? null,
    durationMs: record?.durationMs ?? null,
  };
}
