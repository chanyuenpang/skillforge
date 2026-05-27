function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasText(value) {
  return typeof value === "string" && value.trim() !== "";
}

function pushError(errors, field, message) {
  errors.push({ field, message });
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isNonEmptyStringArray(value) {
  return Array.isArray(value) && value.length > 0 && value.every((item) => hasText(item));
}

function validateGoal(goal, errors, path = "goal") {
  if (!isPlainObject(goal)) {
    pushError(errors, path, "must be an object");
    return;
  }
  if (!hasText(goal.summary)) pushError(errors, `${path}.summary`, "is required");
  if (!hasText(goal.deliverable)) pushError(errors, `${path}.deliverable`, "is required");
}

function validateContext(context, errors, path = "context") {
  if (!isPlainObject(context)) {
    pushError(errors, path, "must be an object");
    return;
  }
  if (!hasText(context.project)) pushError(errors, `${path}.project`, "is required");
  if (!hasText(context.background)) pushError(errors, `${path}.background`, "is required");
}

function validateConstraints(constraints, errors, path = "constraints") {
  if (!isPlainObject(constraints)) {
    pushError(errors, path, "must be an object");
    return;
  }
  if (!hasText(constraints.timebox)) pushError(errors, `${path}.timebox`, "is required");
  if (!isStringArray(constraints.hardRules)) {
    pushError(errors, `${path}.hardRules`, "must be an array of strings");
  }
}

function validateParameters(parameters, errors, path = "parameters") {
  if (!isPlainObject(parameters)) {
    pushError(errors, path, "must be an object");
    return;
  }

  if (!Number.isFinite(parameters.maxMilestones) || parameters.maxMilestones <= 0) {
    pushError(errors, `${path}.maxMilestones`, "must be a positive number");
  }

  if (
    !Number.isFinite(parameters.maxAtomicTasksPerMilestone) ||
    parameters.maxAtomicTasksPerMilestone <= 0
  ) {
    pushError(errors, `${path}.maxAtomicTasksPerMilestone`, "must be a positive number");
  }

  if (parameters.depth !== "mvp") {
    pushError(errors, `${path}.depth`, 'must be "mvp"');
  }
}

export const BetterWorkflowInput = Object.freeze({
  name: "BetterWorkflowInput",
  version: "0.1.0",
  fields: Object.freeze({
    goal: Object.freeze({ summary: "string", deliverable: "string" }),
    context: Object.freeze({ project: "string", background: "string" }),
    constraints: Object.freeze({ timebox: "string", hardRules: ["string"] }),
    parameters: Object.freeze({
      maxMilestones: "number",
      maxAtomicTasksPerMilestone: "number",
      depth: "mvp",
    }),
  }),
});

export function validateWorkflowInput(input) {
  const errors = [];

  if (!isPlainObject(input)) {
    pushError(errors, "$", "input must be an object");
    return { valid: false, errors };
  }

  validateGoal(input.goal, errors, "goal");
  validateContext(input.context, errors, "context");
  validateConstraints(input.constraints, errors, "constraints");
  validateParameters(input.parameters, errors, "parameters");

  return {
    valid: errors.length === 0,
    errors,
  };
}

function validateMilestone(milestone, index, errors, path) {
  const itemPath = `${path}[${index}]`;

  if (!isPlainObject(milestone)) {
    pushError(errors, itemPath, "must be an object");
    return;
  }

  if (!hasText(milestone.id)) pushError(errors, `${itemPath}.id`, "is required");
  if (!hasText(milestone.title)) pushError(errors, `${itemPath}.title`, "is required");
  if (!hasText(milestone.objective)) pushError(errors, `${itemPath}.objective`, "is required");
  if (!isNonEmptyStringArray(milestone.doneCriteria)) {
    pushError(errors, `${itemPath}.doneCriteria`, "must be a non-empty array of strings");
  }
  if (!isStringArray(milestone.atomicTaskIds)) {
    pushError(errors, `${itemPath}.atomicTaskIds`, "must be an array of strings");
  }
}

function validateAtomicTask(task, index, errors, path) {
  const itemPath = `${path}[${index}]`;

  if (!isPlainObject(task)) {
    pushError(errors, itemPath, "must be an object");
    return;
  }

  if (!hasText(task.id)) pushError(errors, `${itemPath}.id`, "is required");
  if (!hasText(task.milestoneId)) pushError(errors, `${itemPath}.milestoneId`, "is required");
  if (!hasText(task.title)) pushError(errors, `${itemPath}.title`, "is required");
  if (!hasText(task.action)) pushError(errors, `${itemPath}.action`, "is required");
  if (!hasText(task.output)) pushError(errors, `${itemPath}.output`, "is required");
  if (!isNonEmptyStringArray(task.doneCriteria)) {
    pushError(errors, `${itemPath}.doneCriteria`, "must be a non-empty array of strings");
  }
  if (!isStringArray(task.deps)) {
    pushError(errors, `${itemPath}.deps`, "must be an array of strings");
  }
}

export const BetterWorkflowOutput = Object.freeze({
  name: "BetterWorkflowOutput",
  version: "0.1.0",
  fields: Object.freeze({
    milestones: [
      Object.freeze({
        id: "string",
        title: "string",
        objective: "string",
        doneCriteria: ["string"],
        atomicTaskIds: ["string"],
      }),
    ],
    atomicTasks: [
      Object.freeze({
        id: "string",
        milestoneId: "string",
        title: "string",
        action: "string",
        output: "string",
        doneCriteria: ["string"],
        deps: ["string"],
      }),
    ],
  }),
});

export function validateWorkflowOutput(output) {
  const errors = [];

  if (!isPlainObject(output)) {
    pushError(errors, "$", "output must be an object");
    return { valid: false, errors };
  }

  if (!Array.isArray(output.milestones)) {
    pushError(errors, "milestones", "must be an array");
  } else {
    output.milestones.forEach((milestone, index) => validateMilestone(milestone, index, errors, "milestones"));
  }

  if (!Array.isArray(output.atomicTasks)) {
    pushError(errors, "atomicTasks", "must be an array");
  } else {
    output.atomicTasks.forEach((task, index) => validateAtomicTask(task, index, errors, "atomicTasks"));
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
