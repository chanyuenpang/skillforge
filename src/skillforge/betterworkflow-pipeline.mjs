import { validateWorkflowInput, validateWorkflowOutput } from "./betterworkflow-contract.mjs";

function normalizeText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function pickText(obj, keys) {
  for (const key of keys) {
    const value = normalizeText(obj?.[key]);
    if (value) return value;
  }
  return "";
}

function extractPlanCoreFromPrompt(planText) {
  const text = normalizeText(planText);
  const lines = text ? text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean) : [];
  const firstLine = lines[0] ?? "";
  const secondLine = lines[1] ?? "";
  const summary = firstLine || pickText({ summary: text }, ["summary", "goal", "title"]);
  const deliverable = secondLine || pickText({ deliverable: text }, ["deliverable", "output", "result"]);

  return {
    summary: summary || "未命名计划",
    deliverable: deliverable || "轻量任务骨架",
    sourceText: text,
    keyPoints: lines.slice(0, 8),
  };
}

function buildTaskSkeleton(extracted, input) {
  const summary = extracted.summary || "未命名计划";
  const deliverable = extracted.deliverable || "轻量任务骨架";
  const context = input?.context ?? {};
  const constraints = input?.constraints ?? {};
  const parameters = input?.parameters ?? {};

  return {
    goal: {
      summary,
      deliverable,
    },
    context: {
      project: normalizeText(context.project) || "未提供项目",
      background: normalizeText(context.background) || extracted.sourceText || "未提供背景",
    },
    constraints: {
      timebox: normalizeText(constraints.timebox) || "未提供时间盒",
      hardRules: Array.isArray(constraints.hardRules) ? constraints.hardRules.filter((item) => normalizeText(item)) : [],
    },
    execution: {
      skeleton: [
        `先确认目标：${summary}`,
        `再围绕交付物：${deliverable} 展开`,
        "按最小可交付顺序推进",
      ],
      dependencies: Array.isArray(input?.dependencies) ? input.dependencies : [],
    },
    gaps: extracted.keyPoints.slice(0, 5).filter(Boolean),
    closeConditions: [
      "目标、边界、执行骨架已齐备",
      "依赖与缺口已列出",
      "可以直接进入下一步执行",
    ],
    parameters: {
      maxMilestones: Number.isFinite(parameters.maxMilestones) ? parameters.maxMilestones : 1,
      maxAtomicTasksPerMilestone: Number.isFinite(parameters.maxAtomicTasksPerMilestone)
        ? parameters.maxAtomicTasksPerMilestone
        : 3,
      depth: "mvp",
    },
  };
}

function assemblePlanSkeleton(input, extracted) {
  return buildTaskSkeleton(extracted, input);
}

function validatePipelineOutput(output) {
  const wrapped = {
    milestones: [
      {
        id: "ms-1-skeleton",
        title: output.goal.summary,
        objective: output.goal.deliverable,
        doneCriteria: output.closeConditions,
        atomicTaskIds: ["at-1-extract", "at-2-assemble", "at-3-validate"],
      },
    ],
    atomicTasks: [
      {
        id: "at-1-extract",
        milestoneId: "ms-1-skeleton",
        title: "提炼计划原文",
        action: "从输入计划中抽取目标、边界和关键要点",
        output: "提炼结果",
        doneCriteria: ["完成要点抽取"],
        deps: [],
      },
      {
        id: "at-2-assemble",
        milestoneId: "ms-1-skeleton",
        title: "组装轻量骨架",
        action: "拼装目标、边界、执行骨架、依赖、缺口与收口条件",
        output: "任务骨架",
        doneCriteria: ["骨架字段完整"],
        deps: ["at-1-extract"],
      },
      {
        id: "at-3-validate",
        milestoneId: "ms-1-skeleton",
        title: "校验输出",
        action: "检查结果是否满足轻量任务骨架要求",
        output: "可用输出",
        doneCriteria: ["结构可直接消费"],
        deps: ["at-2-assemble"],
      },
    ],
  };

  const validation = validateWorkflowOutput(wrapped);
  if (!validation.valid) {
    const error = new Error("Invalid betterworkflow pipeline output");
    error.name = "BetterWorkflowPipelineOutputValidationError";
    error.details = validation.errors;
    throw error;
  }

  return output;
}

export function runBetterWorkflowPipeline(input) {
  const inputValidation = validateWorkflowInput(input);
  if (!inputValidation.valid) {
    const error = new Error("Invalid betterWorkflow pipeline input");
    error.name = "BetterWorkflowPipelineInputValidationError";
    error.details = inputValidation.errors;
    throw error;
  }

  const extracted = extractPlanCoreFromPrompt(input.plan ?? input.planText ?? input.rawPlan ?? input.text ?? "");
  const assembled = assemblePlanSkeleton(input, extracted);
  const validated = validatePipelineOutput(assembled);

  return {
    extracted,
    skeleton: validated,
  };
}

export default runBetterWorkflowPipeline;
