function normalizeString(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

function normalizeStringOrEmpty(value) {
  return normalizeString(value) ?? "";
}

export function mapWorkflowToPlanDTO(workflowOutput) {
  const source = workflowOutput ?? {};
  const milestones = Array.isArray(source.milestones) ? source.milestones : [];
  const atomicTasks = Array.isArray(source.atomicTasks) ? source.atomicTasks : [];

  const milestoneById = new Map(milestones.map((ms) => [ms?.id, ms]));

  const phases = milestones.map((ms, index) => ({
    id: normalizeString(ms?.id) ?? `phase-${index + 1}`,
    title: normalizeStringOrEmpty(ms?.title),
    order: index + 1,
    description: normalizeStringOrEmpty(ms?.objective),
    taskIds: [],
    metadata: {
      doneCriteria: Array.isArray(ms?.doneCriteria) ? ms.doneCriteria : [],
      atomicTaskIds: Array.isArray(ms?.atomicTaskIds) ? ms.atomicTaskIds : [],
    },
  }));

  const phaseIdSet = new Set(phases.map((phase) => phase.id));

  const tasks = atomicTasks.map((task, index) => {
    const id = normalizeString(task?.id) ?? `task-${index + 1}`;
    const milestoneId = normalizeString(task?.milestoneId);
    const phaseId = milestoneId && phaseIdSet.has(milestoneId) ? milestoneId : "unassigned";

    return {
      id,
      title: normalizeStringOrEmpty(task?.title),
      description: normalizeStringOrEmpty(task?.action),
      phaseId,
      dependsOn: Array.isArray(task?.deps)
        ? task.deps.map((dep) => normalizeString(dep)).filter(Boolean)
        : [],
      outputs: normalizeString(task?.output) ? [normalizeString(task?.output)] : [],
      owner: null,
      status: "pending",
      order: index + 1,
      rawRef: task,
      metadata: {
        milestoneTitle: normalizeStringOrEmpty(milestoneById.get(milestoneId)?.title),
        doneCriteria: Array.isArray(task?.doneCriteria) ? task.doneCriteria : [],
      },
    };
  });

  if (tasks.some((task) => task.phaseId === "unassigned") && !phaseIdSet.has("unassigned")) {
    phases.push({
      id: "unassigned",
      title: "Unassigned",
      order: phases.length + 1,
      description: "",
      taskIds: [],
      metadata: {},
    });
    phaseIdSet.add("unassigned");
  }

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

  return {
    planId: null,
    planTitle: "betterWorkflow mapped plan",
    version: "1.0.0",
    source: "betterworkflow",
    phases,
    tasks,
    dependencies,
    metadata: {
      trace: {
        milestoneCount: milestones.length,
        atomicTaskCount: atomicTasks.length,
      },
    },
  };
}

export default mapWorkflowToPlanDTO;
