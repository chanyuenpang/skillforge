import { validateBetterPromptOutput } from './betterprompt-contract.mjs';

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function hasAnyConstraintField(metadata) {
  if (!metadata || typeof metadata !== 'object') return false;
  return ['risk_level', 'task_type', 'builder_version'].some((k) => k in metadata);
}

export function evaluateBetterPromptPackage(pkg) {
  const checks = [];
  const issues = [];
  const tags = [];

  const addCheck = (name, pass, detail) => {
    checks.push({ name, pass, detail });
    if (!pass) issues.push({ check: name, detail });
  };

  // 0) Contract-level sanity
  const parsed = validateBetterPromptOutput(pkg);
  addCheck(
    'contract_validation',
    parsed.success,
    parsed.success
      ? '通过 BetterPromptOutput 合约校验'
      : (parsed.error?.issues || [])
          .map((e) => `${e.path?.join('.') || '<root>'}: ${e.message}`)
          .join('; ')
  );

  // 1) 结构完整性
  addCheck('structure.version', isNonEmptyString(pkg?.version), 'version 必填且非空字符串');
  addCheck('structure.package_id', isNonEmptyString(pkg?.package_id), 'package_id 必填且非空字符串');
  addCheck('structure.intent.goal', isNonEmptyString(pkg?.intent?.goal), 'intent.goal 必填且非空字符串');
  addCheck('structure.prompt.system', isNonEmptyString(pkg?.prompt?.system), 'prompt.system 必填且非空字符串');
  addCheck('structure.prompt.user_template', isNonEmptyString(pkg?.prompt?.user_template), 'prompt.user_template 必填且非空字符串');
  addCheck(
    'structure.prompt.input_slots',
    Array.isArray(pkg?.prompt?.input_slots) && pkg.prompt.input_slots.length > 0,
    'prompt.input_slots 需要至少一个槽位'
  );
  addCheck(
    'structure.guardrails.must_not',
    Array.isArray(pkg?.guardrails?.must_not) && pkg.guardrails.must_not.length > 0,
    'guardrails.must_not 需要至少一条约束'
  );

  // 2) 可执行性一致性
  const slots = Array.isArray(pkg?.prompt?.input_slots) ? pkg.prompt.input_slots : [];
  const userTemplate = pkg?.prompt?.user_template || '';
  const strictSlots = slots.filter((s) => s === 'task_goal');
  const missingSlotRefs = strictSlots.filter((s) => !userTemplate.includes(`{{${s}}}`));
  addCheck(
    'executable.slot_binding',
    missingSlotRefs.length === 0,
    missingSlotRefs.length === 0
      ? 'user_template 已覆盖所有 input_slots 变量占位'
      : `user_template 缺少槽位引用: ${missingSlotRefs.join(', ')}`
  );

  addCheck(
    'executable.system_user_alignment',
    isNonEmptyString(pkg?.prompt?.system) && isNonEmptyString(userTemplate),
    'system 与 user_template 均可执行'
  );

  addCheck(
    'executable.output_hints',
    pkg?.execution_hints === undefined || Array.isArray(pkg.execution_hints),
    'execution_hints 可为空，若存在需为数组'
  );

  // 3) 约束遵循
  const mustNotNonEmpty = (pkg?.guardrails?.must_not || []).every(isNonEmptyString);
  addCheck('constraints.must_not_non_empty', mustNotNonEmpty, 'must_not 中每项都应为非空字符串');

  addCheck(
    'constraints.constraint_fields_present',
    hasAnyConstraintField(pkg?.metadata),
    'metadata 至少保留一个约束相关字段（risk_level/task_type/builder_version）'
  );

  // 4) 可追踪性
  addCheck(
    'traceability.metadata_present',
    !!pkg?.metadata && typeof pkg.metadata === 'object',
    'metadata 应存在且为对象'
  );

  addCheck(
    'traceability.metadata_created_at',
    isNonEmptyString(pkg?.metadata?.created_at),
    'metadata.created_at 应存在'
  );

  const passCount = checks.filter((c) => c.pass).length;
  const score = checks.length === 0 ? 0 : Math.round((passCount / checks.length) * 100);
  const pass = issues.length === 0;

  tags.push(pass ? 'ready-for-downstream' : 'needs-fix');
  if (score >= 90) tags.push('high-confidence');
  else if (score >= 70) tags.push('medium-confidence');
  else tags.push('low-confidence');

  return {
    pass,
    score,
    tags,
    checks,
    issues,
  };
}

export default evaluateBetterPromptPackage;
