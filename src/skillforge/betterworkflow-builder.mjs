import { validateWorkflowInput, validateWorkflowOutput } from "./betterworkflow-contract.mjs";

function clampPositiveInteger(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.max(1, Math.floor(n));
}

function slugFromText(text, fallback = "item") {
  const raw = String(text || "").toLowerCase();
  const slug = raw
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  return slug || fallback;
}

function buildMilestoneSpecs(input) {
  const { goal, context } = input;
  const summary = String(goal?.summary || "").trim() || "未命名目标";
  const deliverable = String(goal?.deliverable || "").trim() || "未明确交付物";
  const project = String(context?.project || "").trim() || "当前项目";
  const background = String(context?.background || "").trim() || "无补充背景";

  return [
    {
      key: "normalize-input",
      title: "语义输入规范化",
      objective: `把 LLM 提炼出的任务语义收敛为 ${project} 可消费的计划骨架`,
      doneCriteria: [
        `任务主题已整理：${summary}`,
        `目标交付已整理：${deliverable}`,
        `上下文信息已整理：${background}`,
      ],
      tasks: [
        {
          title: "整理任务主题",
          action: "承接 goal.summary，统一成可用于计划骨架的任务标题与描述",
          output: "规范化任务主题",
          doneCriteria: ["标题清晰，语义单一，可直接进入计划骨架"],
        },
        {
          title: "整理目标交付",
          action: "承接 goal.deliverable，形成适合 plan 骨架的交付物表达",
          output: "规范化交付物",
          doneCriteria: ["交付物表达可读、可落地、可验收"],
        },
      ],
    },
    {
      key: "compose-plan",
      title: "计划骨架封装",
      objective: `围绕 ${summary} 生成更好读、更好执行的 plan 骨架`,
      doneCriteria: [
        "输出保持 milestones 与 atomicTasks 的结构",
        "里程碑是对语义结果的规范封装，不做程序化语义推导",
      ],
      tasks: [
        {
          title: "封装里程碑结构",
          action: "基于规范化后的语义结果生成里程碑标题、目标与验收口径",
          output: "里程碑骨架",
          doneCriteria: ["里程碑结构完整且便于后续执行"],
        },
        {
          title: "拆分原子任务结构",
          action: "把每个里程碑封装为若干原子任务，保留最小依赖关系",
          output: "原子任务骨架",
          doneCriteria: ["原子任务可串联，依赖关系清晰"],
        },
      ],
    },
    {
      key: "output-polish",
      title: "输出整理与校验",
      objective: `把 plan 骨架整理成稳定输出，方便直接进入后续 workflow`,
      doneCriteria: [
        "输出通过 contract 校验",
        "结构稳定、字段齐全、表达一致",
      ],
      tasks: [
        {
          title: "整理输出结构",
          action: "将 milestones 和 atomicTasks 统一成规范 JSON 输出",
          output: "规范化输出",
          doneCriteria: ["输出字段符合约定"],
        },
        {
          title: "执行结果校验",
          action: "对输出结果做 contract 校验并修正结构问题",
          output: "可用 plan 骨架",
          doneCriteria: ["校验通过且可被下游消费"],
        },
      ],
    },
  ];
}

export function buildBetterWorkflow(input) {
  const inputValidation = validateWorkflowInput(input);
  if (!inputValidation.valid) {
    const error = new Error("Invalid betterWorkflow input");
    error.name = "BetterWorkflowInputValidationError";
    error.details = inputValidation.errors;
    throw error;
  }

  const maxMilestones = clampPositiveInteger(input.parameters.maxMilestones, 3);
  const maxAtomicTasksPerMilestone = clampPositiveInteger(input.parameters.maxAtomicTasksPerMilestone, 2);

  const specs = buildMilestoneSpecs(input).slice(0, maxMilestones);

  const milestones = [];
  const atomicTasks = [];
  let taskCounter = 1;

  for (let i = 0; i < specs.length; i += 1) {
    const spec = specs[i];
    const milestoneId = `ms-${i + 1}-${slugFromText(spec.key, "m")}`;
    const selectedTasks = spec.tasks.slice(0, maxAtomicTasksPerMilestone);
    const atomicTaskIds = [];

    for (let j = 0; j < selectedTasks.length; j += 1) {
      const task = selectedTasks[j];
      const taskId = `at-${taskCounter}-${slugFromText(task.title, "t")}`;
      taskCounter += 1;
      atomicTaskIds.push(taskId);

      atomicTasks.push({
        id: taskId,
        milestoneId,
        title: task.title,
        action: task.action,
        output: task.output,
        doneCriteria: task.doneCriteria,
        deps: j === 0 ? [] : [atomicTaskIds[j - 1]],
      });
    }

    milestones.push({
      id: milestoneId,
      title: spec.title,
      objective: spec.objective,
      doneCriteria: spec.doneCriteria,
      atomicTaskIds,
    });
  }

  const output = { milestones, atomicTasks };
  const outputValidation = validateWorkflowOutput(output);
  if (!outputValidation.valid) {
    const error = new Error("Generated betterWorkflow output is invalid");
    error.name = "BetterWorkflowOutputValidationError";
    error.details = outputValidation.errors;
    throw error;
  }

  return output;
}

export default buildBetterWorkflow;
