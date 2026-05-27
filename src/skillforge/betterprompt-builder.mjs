// ── betterPrompt Builder ──────────────────────────────────────────────────
// Minimal skill selection + prompt package generation chain.
//
// Pipeline: Validate → Capability Slotting → Skill Scoring → Selection →
//            Package Build → QC
//
// Pure — no I/O, no execution-log, no Run Center.

import { validateBetterPromptInput, validateBetterPromptOutput } from './betterprompt-contract.mjs';
import { loadSkillBundlesFromDir } from './skill-bundle-loader.mjs';
import { matchBundles } from './skill-bundle-matcher.mjs';
import { buildBetterPromptFallbackEnvelope } from './betterprompt-fallback.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Built-in skill catalog (minimal MVP) ───────────────────────────────────

const BUILTIN_SKILLS = {
  'contract-driven-dev': {
    id: 'contract-driven-dev',
    name: 'Contract-Driven Development',
    capabilities: new Set(['contract', 'schema', 'validation', 'api-design', 'type-system']),
    description: '契约驱动开发：以接口契约为先，通过 schema 校验确保实现合规',
  },
  'prompt-design': {
    id: 'prompt-design',
    name: 'Prompt Design',
    capabilities: new Set(['prompt-engineering', 'ai-interaction', 'system-design', 'template']),
    description: '提示词设计：设计高质量的 AI prompt 模板与交互流程',
  },
  'coding-agent-workflow': {
    id: 'coding-agent-workflow',
    name: 'Coding Agent Workflow',
    capabilities: new Set(['code-generation', 'workflow', 'automation', 'agent', 'implementation']),
    description: '编码 agent 工作流：自动化代码生成与任务执行',
  },
  'task-planning': {
    id: 'task-planning',
    name: 'Task Planning',
    capabilities: new Set(['task-decomposition', 'planning', 'estimation', 'milestones']),
    description: '任务规划：将复杂需求拆解为可执行的任务树',
  },
  'skillforge-core': {
    id: 'skillforge-core',
    name: 'SkillForge Core',
    capabilities: new Set(['skill-management', 'manifest', 'lifecycle', 'fixture']),
    description: 'SkillForge 核心：技能生命周期管理与 fixtures 体系',
  },
};

// ── Keyword → capability mapping ───────────────────────────────────────────

const KEYWORD_CAPABILITIES = [
  { keywords: ['契约', 'contract', 'schema', '校验', 'validate', 'validation', '接口'], caps: ['contract', 'schema', 'validation'] },
  { keywords: ['prompt', '提示词', '模板', 'template', 'system prompt'], caps: ['prompt-engineering', 'template'] },
  { keywords: ['代码', 'implement', 'coding', '编码', '写代码', 'build code', '生成代码'], caps: ['code-generation', 'implementation'] },
  { keywords: ['任务拆解', '任务分解', '拆解任务', 'plan tasks', 'milestone', '里程碑'], caps: ['task-decomposition', 'planning'] },
  { keywords: ['skill', '技能', 'skillforge'], caps: ['skill-management'] },
  { keywords: ['自动化', 'automation', '工作流', 'workflow'], caps: ['automation', 'workflow'] },
  { keywords: ['设计', 'design', '架构'], caps: ['system-design'] },
  { keywords: ['AI', '模型', 'LLM', 'agent'], caps: ['ai-interaction', 'agent'] },
  { keywords: ['选择', 'selection', '打分', 'scoring', 'score'], caps: ['task-decomposition'] },
  { keywords: ['闭环', 'pipeline', '链', 'chain', 'orchestrat'], caps: ['workflow'] },
  { keywords: ['fixture', 'manifest', 'lifecycle'], caps: ['fixture', 'lifecycle', 'manifest'] },
  { keywords: ['类型', 'type', 'typescript', '模块'], caps: ['type-system'] },
  { keywords: ['最小可运行', '最小闭环'], caps: ['implementation'] },
  { keywords: ['package', '包', '打包', 'bundle'], caps: ['implementation', 'workflow'] },
  { keywords: ['QC', '质量', '检查', 'check', 'test', '测试', '校验'], caps: ['validation'] },
];

// ── Helpers ────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function generatePackageId() {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `bp-${ts}-${rand}`;
}

function normalizeString(v) {
  return (v ?? '').toString().trim().toLowerCase();
}

// ── Step 1: Capability Slot Extraction ─────────────────────────────────────

function extractCapabilitiesFromText(text) {
  const caps = new Set();
  const lower = normalizeString(text);
  for (const entry of KEYWORD_CAPABILITIES) {
    if (entry.keywords.some(kw => lower.includes(normalizeString(kw)))) {
      entry.caps.forEach(c => caps.add(c));
    }
  }
  return caps;
}

function extractMustCapsFromConstraint(constraintText) {
  return extractCapabilitiesFromText(constraintText);
}

/**
 * Extract capability slots from task and constraints.
 * Returns { must: Set<string>, should: Set<string> }
 */
function extractCapabilitySlots(task, constraints) {
  const must = new Set();
  const should = new Set();

  // From task goal
  for (const cap of extractCapabilitiesFromText(task.goal)) {
    must.add(cap);
  }

  // From task type
  for (const cap of extractCapabilitiesFromText(task.type)) {
    must.add(cap);
  }

  // From constraints.hard → must
  for (const c of constraints.hard || []) {
    for (const cap of extractMustCapsFromConstraint(c)) {
      must.add(cap);
    }
  }

  // From constraints.soft → should
  for (const c of constraints.soft || []) {
    for (const cap of extractCapabilitiesFromText(c)) {
      // Only add to should if not already covered by must
      if (!must.has(cap)) {
        should.add(cap);
      }
    }
  }

  return { must, should };
}

// ── Step 2: Skill Scoring ──────────────────────────────────────────────────

/**
 * Score a candidate skill against capability slots.
 * Returns { skillId, name, score, mustHits, shouldHits, reason }
 */
function scoreSkill(skillId, slots, isBundleRef) {
  const skill = BUILTIN_SKILLS[skillId];
  if (!skill) {
    return {
      skillId,
      name: skillId,
      score: isBundleRef ? 1 : 0, // bundle_refs get a tiny bonus as soft hint
      mustHits: [],
      shouldHits: [],
      reason: isBundleRef
        ? `bundle_ref 软提示（未在内置目录中找到 ${skillId}）`
        : `未找到技能 ${skillId}，跳过`,
      isInCatalog: false,
    };
  }

  const mustHits = [];
  const shouldHits = [];

  for (const cap of slots.must) {
    if (skill.capabilities.has(cap)) mustHits.push(cap);
  }
  for (const cap of slots.should) {
    if (skill.capabilities.has(cap)) shouldHits.push(cap);
  }

  const score = mustHits.length * 2 + shouldHits.length + (isBundleRef ? 0.5 : 0);

  return {
    skillId: skill.id,
    name: skill.name,
    description: skill.description,
    score,
    mustHits,
    shouldHits,
    reason: '',
    isInCatalog: true,
  };
}

// ── Step 3: Skill Selection ────────────────────────────────────────────────

/**
 * Select skills: cover all must-have capabilities, optionally add 0-1 should-have.
 * bundle_refs are soft hints that add a bonus to scores but never guarantee selection.
 */
function selectSkills(skillsInput, slots, constraints) {
  const riskLevel = constraints.risk_level || 'low';

  // Gather candidates: explicit candidates + bundle_refs (as soft hints)
  const candidateIds = new Set();
  const bundleRefIds = new Set();

  for (const c of skillsInput.candidates || []) candidateIds.add(c);
  for (const ref of skillsInput.bundle_refs || []) {
    bundleRefIds.add(ref);
    candidateIds.add(ref); // bundle_refs are also considered as candidates
  }

  // Score all candidates
  const scored = [];
  for (const id of candidateIds) {
    const isBundleRef = bundleRefIds.has(id) && !(skillsInput.candidates || []).includes(id);
    scored.push(scoreSkill(id, slots, isBundleRef));
  }

  // Sort: highest score first, then by name
  scored.sort((a, b) => b.score - a.score || a.skillId.localeCompare(b.skillId));

  // Coverage strategy: pick until all must-hits are covered
  const selected = [];
  const coveredMustCaps = new Set();

  for (const s of scored) {
    if (s.score <= 0 && coveredMustCaps.size >= slots.must.size) break;

    const newMustHits = s.mustHits.filter(c => !coveredMustCaps.has(c));
    if (newMustHits.length > 0 || s.score > 0) {
      selected.push(s);
      s.mustHits.forEach(c => coveredMustCaps.add(c));
    }
  }

  // For medium/high risk: optionally add one more should-hit skill
  if (riskLevel !== 'low') {
    const extraPicks = scored.filter(s => !selected.includes(s) && s.shouldHits.length > 0);
    if (extraPicks.length > 0) {
      selected.push(extraPicks[0]);
    }
  }

  // Generate reasons
  for (const s of selected) {
    const parts = [];
    if (s.mustHits.length > 0) {
      parts.push(`覆盖 must 能力: ${s.mustHits.join(', ')}`);
    }
    if (s.shouldHits.length > 0) {
      parts.push(`覆盖 should 能力: ${s.shouldHits.join(', ')}`);
    }
    if (bundleRefIds.has(s.skillId) && !s.mustHits.length && !s.shouldHits.length) {
      parts.push(`来自 bundle_ref 软提示（低分入选）`);
    }
    if (s.isInCatalog && s.description) {
      parts.push(s.description);
    }
    s.reason = parts.join('；');
  }

  return selected;
}

// ── Step 4: Prompt Package Build ───────────────────────────────────────────

function buildSystemPrompt(task, selectedSkills, constraints, context) {
  const skillNames = selectedSkills.map(s => s.name).join('、');

  let system = `你是一个 AI 编程助手，当前任务需要你调用以下技能：${skillNames || '通用编程能力'}。\n\n`;

  system += `## 任务目标\n${task.goal}\n\n`;

  if (constraints.hard && constraints.hard.length > 0) {
    system += `## 硬性约束\n`;
    for (const c of constraints.hard) {
      system += `- ${c}\n`;
    }
    system += '\n';
  }

  if (constraints.soft && constraints.soft.length > 0) {
    system += `## 软性建议\n`;
    for (const c of constraints.soft) {
      system += `- ${c}\n`;
    }
    system += '\n';
  }

  system += `## 项目上下文\n项目: ${context.project}\n`;
  if (context.facts && context.facts.length > 0) {
    system += `已知事实:\n`;
    for (const f of context.facts) {
      system += `- ${f}\n`;
    }
  }

  return system;
}

function buildDeveloperPrompt(task, selectedSkills) {
  // Concise developer instruction
  const skillDesc = selectedSkills.map(s => `- ${s.name}: ${s.description || ''}`).join('\n');
  return `执行以下任务：${task.goal}\n任务类型：${task.type}\n\n调用的技能：\n${skillDesc}`;
}

function buildUserTemplate(task, runtime) {
  const language = runtime.language || 'zh-CN';
  if (language.startsWith('zh')) {
    return '请根据上述 system prompt 和 developer 指令完成以下任务：\n\n{{task_goal}}';
  }
  return 'Complete the following task based on the system prompt and developer instructions:\n\n{{task_goal}}';
}

function buildInputSlots(task) {
  const slots = ['task_goal'];
  if (task.id) slots.push('task_id');
  if (task.success_criteria) slots.push('success_criteria');
  return slots;
}

function buildExecutionHints(constraints, selectedSkills) {
  const hints = [];

  if (constraints.output_format) {
    hints.push(`输出格式：${constraints.output_format}`);
  }
  if (constraints.risk_level) {
    hints.push(`风险等级：${constraints.risk_level}`);
  }
  if (selectedSkills.length > 0) {
    hints.push(`已选择 ${selectedSkills.length} 个技能：${selectedSkills.map(s => s.skillId).join(', ')}`);
  }

  return hints.length > 0 ? hints : undefined;
}

function buildGuardrails(constraints) {
  const mustNot = [];

  // From hard constraints, extract "don't do" patterns
  for (const c of constraints.hard || []) {
    const lower = normalizeString(c);
    if (lower.includes('不做') || lower.includes('不接') || lower.includes('不回退') || lower.includes('不') || lower.includes('don\'t') || lower.includes('do not') || lower.includes('must not')) {
      mustNot.push(c);
    }
  }

  // Minimum: always include basic guardrail
  if (mustNot.length === 0) {
    mustNot.push('不做超出任务范围的操作');
  }

  const guardrails = { must_not: mustNot };
  return guardrails;
}

function buildMetadata(task, selectedSkills, constraints) {
  return {
    created_at: new Date().toISOString(),
    task_id: task.id || null,
    task_type: task.type,
    skill_count: selectedSkills.length,
    selected_skill_ids: selectedSkills.map(s => s.skillId),
    risk_level: constraints.risk_level || 'low',
    builder_version: 'betterprompt-builder-draft-1',
  };
}

// ── Step 5: QC ─────────────────────────────────────────────────────────────

function runQC(outputPkg, selectedSkills, input) {
  const issues = [];
  const checks = [];

  // Check 1: selected_skills is non-empty
  if (!outputPkg.selected_skills || outputPkg.selected_skills.length === 0) {
    issues.push('selected_skills 为空，未选择任何技能');
  } else {
    checks.push(`已选择 ${outputPkg.selected_skills.length} 个技能`);
  }

  // Check 2: each selected skill has a reason
  const noReason = selectedSkills.filter(s => !s.reason || s.reason.trim() === '');
  if (noReason.length > 0) {
    issues.push(`${noReason.length} 个技能缺少选择理由: ${noReason.map(s => s.skillId).join(', ')}`);
  } else {
    checks.push('所有选中技能均有选择理由');
  }

  // Check 3: prompt has required fields
  const p = outputPkg.prompt;
  if (!p.system || p.system.trim().length === 0) {
    issues.push('prompt.system 为空');
  } else {
    checks.push('prompt.system 已填充');
  }
  if (!p.user_template || p.user_template.trim().length === 0) {
    issues.push('prompt.user_template 为空');
  } else {
    checks.push('prompt.user_template 已填充');
  }
  if (!p.input_slots || p.input_slots.length === 0) {
    issues.push('prompt.input_slots 为空');
  } else {
    checks.push(`prompt.input_slots: ${p.input_slots.join(', ')}`);
  }

  // Check 4: guardrails.must_not is non-empty
  if (!outputPkg.guardrails.must_not || outputPkg.guardrails.must_not.length === 0) {
    issues.push('guardrails.must_not 为空');
  } else {
    checks.push('guardrails.must_not 已设置');
  }

  // Check 5: all must-capabilities covered
  const coveredMustCaps = new Set();
  for (const s of selectedSkills) {
    s.mustHits.forEach(c => coveredMustCaps.add(c));
  }
  const slots = extractCapabilitySlots(input.task, input.constraints);
  const uncoveredMust = [...slots.must].filter(c => !coveredMustCaps.has(c));
  if (uncoveredMust.length > 0) {
    const risk = (input.constraints.risk_level || 'low');
    if (risk === 'high') {
      issues.push(`未覆盖的 must 能力: ${uncoveredMust.join(', ')}`);
    } else {
      checks.push(`⚠ 部分 must 能力未被候选技能覆盖 (风险=${risk}): ${uncoveredMust.join(', ')}`);
    }
  } else {
    checks.push('所有 must 能力已覆盖');
  }

  // Check 6: output format
  if (input.constraints.output_format) {
    checks.push(`期望输出格式: ${input.constraints.output_format}`);
  }

  const pass = issues.length === 0;

  return {
    pass,
    checks,
    issues,
    summary: pass ? 'QC 通过' : `QC 未通过: ${issues.length} 个问题`,
  };
}

// ── Main Builder ───────────────────────────────────────────────────────────

/**
 * Build a betterPrompt package from a BetterPromptInput.
 *
 * @param {Object} input - BetterPromptInput object
 * @returns {{ package: Object, qc_result: Object }}
 */
export async function buildBetterPromptPackage(input) {
  // Step 0: Validate input
  const validated = validateBetterPromptInput(input);
  if (!validated.success) {
    const errs = (validated.error?.issues || [validated.error])
      .map(e => e.message || JSON.stringify(e))
      .join('; ');
    throw new Error(`BetterPromptInput 校验失败: ${errs}`);
  }

  const data = validated.data;
  const { task, context, skills, constraints, runtime } = data;

  // Step 1: Extract capability slots
  const slots = extractCapabilitySlots(task, constraints);

  // Step 1.5: Soft bundle recommendation (best effort, no hard binding)
  const queryText = `${task.goal} ${task.type} ${context?.project || ''} ${(context?.facts || []).join(' ')} ${(constraints.hard || []).join(' ')} ${(constraints.soft || []).join(' ')}`;
  let recommendedBundleRefs = [];
  let suggestedSkillRefs = [];
  try {
    const bundleDir = path.resolve(__dirname, '../../fixtures/skill-bundles');
    const loaded = await loadSkillBundlesFromDir(bundleDir);
    const match = matchBundles({
      query: queryText,
      bundles: loaded.usableBundles,
      context: {
        task_type: task.type,
        project: context.project,
        threshold: 8,
        topN: 3,
      },
    });
    const top = Array.isArray(match?.hits) ? match.hits.slice(0, 2) : [];
    recommendedBundleRefs = top.map((m) => m.bundle_id).filter(Boolean);
    suggestedSkillRefs = [...new Set(top.flatMap((m) => m.suggested_skill_refs || []).filter(Boolean))];
  } catch {
    // ignore matcher errors to keep betterPrompt non-blocking
  }

  // merge soft suggested skill refs as extra candidates (still soft)
  const mergedSkillsInput = {
    ...skills,
    candidates: [...new Set([...(skills?.candidates || []), ...suggestedSkillRefs])],
  };

  // Step 2+3: Score & Select skills
  const selectedSkills = selectSkills(mergedSkillsInput, slots, constraints);

  // Step 4: Build prompt package
  const package_id = generatePackageId();

  const selectedSkillIds = selectedSkills.map(s => s.skillId);
  const selectedSkillNames = selectedSkills.map(s => s.name);

  const output = {
    version: data.version,
    package_id,
    intent: {
      task_id: task.id,
      goal: task.goal,
      done_definition: task.success_criteria,
    },
    selected_skills: selectedSkillIds.length > 0 ? selectedSkillIds : undefined,
    recommended_bundle_refs: recommendedBundleRefs.length > 0 ? recommendedBundleRefs : undefined,
    suggested_skill_refs: suggestedSkillRefs.length > 0 ? suggestedSkillRefs : undefined,
    prompt: {
      system: buildSystemPrompt(task, selectedSkills, constraints, context),
      developer: buildDeveloperPrompt(task, selectedSkills),
      user_template: buildUserTemplate(task, runtime),
      input_slots: buildInputSlots(task),
    },
    execution_hints: buildExecutionHints(constraints, selectedSkills),
    guardrails: buildGuardrails(constraints),
    metadata: buildMetadata(task, selectedSkills, constraints),
  };

  // Step 5: Self-validate output
  const outputValidation = validateBetterPromptOutput(output);
  if (!outputValidation.success) {
    const errs = (outputValidation.error?.issues || [outputValidation.error])
      .map(e => `${e.path?.join('.') || ''}: ${e.message || JSON.stringify(e)}`)
      .join('; ');
    throw new Error(`BetterPromptOutput 自校验失败: ${errs}`);
  }

  // Step 6: QC
  const qc_result = runQC(output, selectedSkills, data);
  const fallback = buildBetterPromptFallbackEnvelope({
    package: output,
    qc_result,
    reason: qc_result?.pass === true ? null : 'qc_gate_failed',
  });

  output.metadata = {
    ...(output.metadata || {}),
    fallback_used: fallback.fallback_used,
    fallback_mode: fallback.fallback_mode,
    alert_level: fallback.alert_level,
    recoverable: fallback.recoverable,
    package_minimal_ready: fallback.package_minimal_ready,
  };

  output.guardrails = {
    ...(output.guardrails || {}),
    fallback: {
      used: fallback.fallback_used,
      mode: fallback.fallback_mode,
      recoverable: fallback.recoverable,
      reason: fallback.reason,
      qc_issue_count: fallback.qc_issue_count,
    },
  };

  return {
    package: output,
    qc_result,
    fallback,
    _debug: {
      slots: { must: [...slots.must], should: [...slots.should] },
      scored: selectedSkills.map(s => ({
        id: s.skillId,
        score: s.score,
        mustHits: s.mustHits,
        shouldHits: s.shouldHits,
      })),
    },
  };
}

export default buildBetterPromptPackage;
