function buildTitle(record) {
  const goal = record?.inputSummary?.projectGoal;
  if (goal) return `Skill Bundle · ${goal}`;
  return record?.bundleRef ?? "Skill Bundle execution";
}

function buildSummary(record) {
  const parts = [];
  if (record?.inputSummary?.context) parts.push(record.inputSummary.context);
  parts.push(`Selected ${record?.selectedCount ?? 0} skill(s)`);
  if (typeof record?.score === "number") parts.push(`Score: ${record.score}`);
  if (typeof record?.durationMs === "number" && record.durationMs > 0) {
    parts.push(`Duration: ${record.durationMs}ms`);
  }
  return parts.join(" | ");
}

export function buildSkillBundleRunCenterView(record) {
  if (!record || typeof record !== "object") {
    throw new Error("buildSkillBundleRunCenterView requires a non-null record object");
  }

  return {
    kind: "skillbundle.run",
    source: record.source ?? "skill-bundle-soft-recommendation",
    id: record.id ?? record.executionId ?? null,
    createdAt: record.createdAt ?? record.timestamp ?? null,
    status: record.status ?? "unknown",

    title: buildTitle(record),
    summary: buildSummary(record),

    inputSummary: record.inputSummary ?? null,
    selectedCount: record.selectedCount ?? 0,
    selectedSkills: Array.isArray(record.selectedSkills) ? record.selectedSkills : [],
    score: typeof record.score === "number" ? record.score : null,
    reason: record.reason ?? null,

    bundleRef: record.bundleRef ?? null,
    planRef: record.planRef ?? null,
    taskRef: record.taskRef ?? null,
    traceRefs: record.traceRefs ?? null,
    artifactRef: record.artifactPath ?? null,
    durationMs: record.durationMs ?? null,
  };
}

export const toRunCenterView = buildSkillBundleRunCenterView;

export default buildSkillBundleRunCenterView;
