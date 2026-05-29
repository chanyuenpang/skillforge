function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function getPath(obj, path) {
  return path.reduce((cur, key) => (cur && typeof cur === 'object' ? cur[key] : undefined), obj);
}

export function evaluateBetterPromptPackage(pkg) {
  const checks = [];
  const issues = [];

  const addCheck = (name, pass, detail) => {
    checks.push({ name, pass, detail });
    if (!pass) issues.push({ check: name, detail });
  };

  const version = pkg?.version;
  const packageId = pkg?.package_id;
  const intentGoal = getPath(pkg, ['intent', 'goal']);
  const promptSystem = getPath(pkg, ['prompt', 'system']);
  const promptUserTemplate = getPath(pkg, ['prompt', 'user_template']);
  const promptInputSlots = pkg?.prompt?.input_slots;
  const guardrailsMustNot = pkg?.guardrails?.must_not;
  const metadata = pkg?.metadata;
  const sourceSkillRef = pkg?.source_skill_ref;
  const normalizedTag = pkg?.normalized_tag;

  addCheck('structure.version', isNonEmptyString(version), 'version 必须存在且为非空字符串');
  addCheck('structure.package_id', isNonEmptyString(packageId), 'package_id 必须存在且为非空字符串');
  addCheck('structure.intent.goal', isNonEmptyString(intentGoal), 'intent.goal 必须存在且为非空字符串');
  addCheck('structure.prompt.system', isNonEmptyString(promptSystem), 'prompt.system 必须存在且为非空字符串');
  addCheck('structure.prompt.user_template', isNonEmptyString(promptUserTemplate), 'prompt.user_template 必须存在且为非空字符串');
  addCheck('structure.prompt.input_slots', Array.isArray(promptInputSlots) && promptInputSlots.length > 0, 'prompt.input_slots 必须存在且至少包含 1 项');
  addCheck('structure.guardrails.must_not', Array.isArray(guardrailsMustNot) && guardrailsMustNot.length > 0, 'guardrails.must_not 必须存在且至少包含 1 项');
  addCheck('structure.metadata', metadata && typeof metadata === 'object' && !Array.isArray(metadata), 'metadata 必须存在且为对象');
  addCheck('structure.source_skill_ref', isNonEmptyString(sourceSkillRef), 'source_skill_ref 必须存在且为非空字符串');
  addCheck('structure.normalized_tag', isNonEmptyString(normalizedTag), 'normalized_tag 必须存在且为非空字符串');

  const requiredSlots = Array.isArray(promptInputSlots) ? promptInputSlots.filter(isNonEmptyString) : [];
  const missingSlotRefs = requiredSlots.filter((slot) => !String(promptUserTemplate || '').includes(`{{${slot}}}`));
  addCheck(
    'integrity.prompt_slots_referenced',
    missingSlotRefs.length === 0,
    missingSlotRefs.length === 0
      ? 'prompt.user_template 已引用所有 prompt.input_slots'
      : `prompt.user_template 缺少槽位引用: ${missingSlotRefs.join(', ')}`
  );

  const mustNotNonEmpty = Array.isArray(guardrailsMustNot) && guardrailsMustNot.every(isNonEmptyString);
  addCheck('integrity.guardrails.must_not_strings', mustNotNonEmpty, 'guardrails.must_not 每项都必须是非空字符串');

  const metadataOk = metadata && typeof metadata === 'object' && !Array.isArray(metadata);
  addCheck('integrity.metadata_created_at', metadataOk && isNonEmptyString(metadata.created_at), 'metadata.created_at 必须存在且为非空字符串');

  const passCount = checks.filter((c) => c.pass).length;
  const score = checks.length === 0 ? 0 : Math.round((passCount / checks.length) * 100);
  const pass = issues.length === 0;

  return {
    pass,
    score,
    tags: [pass ? 'ready-for-downstream' : 'needs-fix'],
    checks,
    issues,
  };
}

export default evaluateBetterPromptPackage;
