function inferObservabilityStatus(record = {}) {
  const status = String(record?.status ?? '').toLowerCase();
  if (['failed', 'error'].includes(status)) return 'error';
  if (['running', 'pending'].includes(status)) return 'degraded';
  return 'ok';
}

function inferAlertLevel(obsStatus) {
  if (obsStatus === 'error') return 'error';
  if (obsStatus === 'degraded') return 'warn';
  return 'info';
}

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

  const fallback = payload.fallback ?? output.fallback ?? null;
  const observabilityStatus = inferObservabilityStatus(record);

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
    fallback,

    promptPackageType,

    planRef: record?.planRef ?? record?.consumedPlanRef?.ref ?? null,
    taskRef: record?.taskRef ?? record?.evidenceRefs?.taskRunId ?? null,
    traceRefs: record?.traceRefs ?? record?.evidenceRefs ?? null,

    artifactRef: record?.artifactRef ?? output?.artifactRef ?? null,
    durationMs: record?.durationMs ?? null,

    observability: {
      status: observabilityStatus,
      duration_ms: Number.isFinite(Number(record?.durationMs)) ? Number(record.durationMs) : 0,
      trace_refs: Array.isArray(record?.traceRefs)
        ? record.traceRefs.filter((x) => typeof x === 'string' && x.trim())
        : [],
      alert_level: fallback?.alert_level ?? inferAlertLevel(observabilityStatus),
    },
  };
}
