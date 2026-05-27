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
  const { goal, context, constraints } = input;
  return [
    {
      key: "align-goal",
      title: "目标与边界对齐",
      objective: `将 ${goal.summary} 在 ${context.project} 的约束下收敛为可执行范围`,
      doneCriteria: [
        `目标交付物已明确：${goal.deliverable}`,
        `关键背景已吸收：${context.background}`,
        `硬约束已固化：${constraints.hardRules.join("；") || "无"}`,
      ],
      tasks: [
        {
          title: "提炼目标与交付定义",
          action: `从 goal.summary / goal.deliverable 产出一段可执行目标说明`,
          output: "目标说明草案",
          doneCriteria: ["目标说明包含范围、交付物、验收口径"],
        },
        {
          title: "固化背景与约束",
          action: `整理 context.background 与 constraints.timebox/hardRules 为执行边界`,
          output: "执行边界清单",
          doneCriteria: ["边界清单覆盖时间盒与硬规则"],
        },
      ],
    },
    {
      key: "prototype-build",
      title: "最小原型生成链实现",
      objective: `围绕 ${goal.deliverable} 实现可运行的最小里程碑+原子任务生成链`,
      doneCriteria: [
        "核心 builder 可以从合法输入生成 milestones 与 atomicTasks",
        "生成结果满足 betterWorkflow output contract",
      ],
      tasks: [
        {
          title: "实现 builder 主流程",
          action: "实现 buildBetterWorkflow(input)，完成输入校验、结构生成、输出校验",
          output: "可运行 builder 模块",
          doneCriteria: ["主流程包含双向校验并返回结构化输出"],
        },
        {
          title: "实现最小拆解策略",
          action: "按 milestone -> atomic task 的固定模板进行 MVP 拆解",
          output: "最小拆解策略逻辑",
          doneCriteria: ["每个里程碑包含可追踪 atomicTaskIds 且任务依赖可解析"],
        },
      ],
    },
    {
      key: "sample-verify",
      title: "真实样本验证",
      objective: `使用 SkillForge 主计划相关样本验证 ${goal.summary} 的可运行性`,
      doneCriteria: [
        "验证脚本可执行且输出生成结果",
        "样本输出通过 contract 校验",
      ],
      tasks: [
        {
          title: "编写最小验证脚本",
          action: "新增 scripts/test-betterworkflow-builder.mjs 并调用 builder",
          output: "验证脚本",
          doneCriteria: ["脚本可在本地直接运行"],
        },
        {
          title: "执行并检查样本结果",
          action: "使用 SkillForge 主计划样本执行脚本并打印 milestones/atomicTasks 摘要",
          output: "验证运行结果",
          doneCriteria: ["运行成功且结果字段完整"],
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
