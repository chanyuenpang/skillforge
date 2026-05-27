function normalizeString(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s === '' ? null : s;
}

function normalizeStringOrEmpty(value) {
  const s = normalizeString(value);
  return s ?? '';
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
}

function normalizeDependsOn(dependsOn) {
  return normalizeArray(dependsOn)
    .flatMap((item) => {
      if (item === null || item === undefined) return [];
      if (typeof item === 'string' || typeof item === 'number') {
        const id = normalizeString(item);
        return id ? [id] : [];
      }
      if (typeof item === 'object') {
        const candidate = item.taskId ?? item.id ?? item.ref ?? item.value;
        const id = normalizeString(candidate);
        return id ? [id] : [];
      }
      return [];
    });
}

function normalizeOutputs(outputs) {
  return normalizeArray(outputs)
    .map((item) => normalizeString(item))
    .filter(Boolean);
}

export function mapPlanSkeletonToPlanDTO(planSkeleton) {
  const skeleton = planSkeleton == null ? {} : planSkeleton;
  const metadata = {};

  const phasesInput = Array.isArray(skeleton.phases) ? skeleton.phases : [];
  const phases = phasesInput.map((phase, index) => {
    const id = normalizeString(phase?.id) ?? `phase-${index + 1}`;
    return {
      id,
      title: normalizeStringOrEmpty(phase?.title),
      order: Number.isFinite(phase?.phaseOrder) ? phase.phaseOrder : index + 1,
      description: normalizeStringOrEmpty(phase?.description),
      taskIds: []
    };
  });

  const phaseIdSet = new Set(phases.map((p) => p.id));
  const hasUnassignedPhase = () => phases.some((p) => p.id === 'unassigned');

  const orphanTaskWarnings = [];
  const tasksInput = Array.isArray(skeleton.tasks) ? skeleton.tasks : [];
  const tasks = tasksInput.map((task, index) => {
    const id = normalizeString(task?.id) ?? `task-${index + 1}`;
    const requestedPhaseId = normalizeString(task?.phase);

    let phaseId = requestedPhaseId;
    if (!phaseId || !phaseIdSet.has(phaseId)) {
      phaseId = 'unassigned';
      const reason = !requestedPhaseId ? 'missing phase' : `unknown phase: ${requestedPhaseId}`;
      orphanTaskWarnings.push({ taskId: id, reason });
      if (!hasUnassignedPhase()) {
        phases.push({
          id: 'unassigned',
          title: 'Unassigned',
          order: phases.length + 1,
          description: '',
          taskIds: []
        });
        phaseIdSet.add('unassigned');
      }
    }

    return {
      id,
      title: normalizeStringOrEmpty(task?.title),
      description: normalizeStringOrEmpty(task?.description),
      phaseId,
      dependsOn: normalizeDependsOn(task?.dependsOn),
      outputs: normalizeOutputs(task?.outputs),
      owner: normalizeString(task?.owner),
      status: normalizeString(task?.status) ?? 'pending',
      order: Number.isFinite(task?.order) ? task.order : index + 1,
      rawRef: task
    };
  });

  const phaseTaskMap = new Map(phases.map((phase) => [phase.id, []]));
  for (const task of tasks) {
    if (!phaseTaskMap.has(task.phaseId)) phaseTaskMap.set(task.phaseId, []);
    phaseTaskMap.get(task.phaseId).push(task.id);
  }

  for (const phase of phases) {
    phase.taskIds = phaseTaskMap.get(phase.id) ?? [];
  }

  const dependencies = tasks.flatMap((task) =>
    task.dependsOn.map((depId) => ({ taskId: task.id, dependsOn: depId }))
  );

  if (orphanTaskWarnings.length > 0) {
    metadata.orphanTaskWarnings = orphanTaskWarnings;
  }

  return {
    planId: normalizeString(skeleton.planId) ?? normalizeString(skeleton.id) ?? null,
    planTitle: normalizeStringOrEmpty(skeleton.planTitle ?? skeleton.title),
    version: normalizeString(skeleton.version) ?? '1.0.0',
    source: normalizeString(skeleton.source) ?? 'planSkeleton',
    phases,
    tasks,
    dependencies,
    metadata
  };
}

export default mapPlanSkeletonToPlanDTO;
