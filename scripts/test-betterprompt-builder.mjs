// ── betterPrompt Builder 验证脚本 ────────────────────────────────────────
// 用真实样本跑通 buildBetterPromptPackage 全链路

import { buildBetterPromptPackage } from '../src/skillforge/betterprompt-builder.mjs';
import { validateBetterPromptOutput } from '../src/skillforge/betterprompt-contract.mjs';

// ── 样本 1: betterPrompt 契约落地任务 ───────────────────────────────────────
const sample1 = {
  version: '1.0.0',
  task: {
    id: 'betterprompt-mvp-contract',
    goal: '规划 betterPrompt MVP 的输入输出契约与校验逻辑',
    type: 'contract-implementation',
    success_criteria: ['contract 文件生成', '合法/非法校验通过', '真实样本验证通过'],
  },
  context: {
    project: 'workflow-kit',
    artifacts: ['docs/betterprompt-blueprint.md'],
    facts: ['基于 skillforge 体系', '使用 zod 做 schema 校验'],
  },
  skills: {
    candidates: ['prompt-design', 'contract-driven-dev'],
    bundle_refs: ['skillforge-core'],
  },
  constraints: {
    hard: ['只做 betterPrompt 契约与校验', '不做 skill 选择链'],
    soft: ['代码风格统一'],
    output_format: 'mjs',
    risk_level: 'low',
  },
  runtime: {
    timebox_min: 30,
    token_budget: 8000,
    language: 'zh-CN',
  },
};

// ── 样本 2: betterPrompt Builder 实现任务（当前任务本身） ────────────────────
const sample2 = {
  version: '1.0.0',
  task: {
    id: 'betterprompt-mvp-builder',
    goal: '实现 betterPrompt MVP 的 skill 选择与 prompt package 生成链最小闭环',
    type: 'implementation',
    success_criteria: [
      '文件真实存在于主工作树',
      '可从合法 BetterPromptInput 生成 package',
      'selected_skills 有最小理由',
      '有最小 qc_result',
      '用一个真实样本跑通并输出结果',
    ],
  },
  context: {
    project: 'workflow-kit',
    artifacts: ['src/skillforge/betterprompt-contract.mjs'],
    facts: [
      'betterprompt-contract.mjs 已落地并验证通过',
      '当前先做最小可运行闭环，不接 execution-log，不接 Run Center',
      '只用纯函数，无 I/O 依赖',
    ],
  },
  skills: {
    candidates: ['coding-agent-workflow', 'task-planning', 'contract-driven-dev', 'prompt-design'],
    bundle_refs: ['skillforge-core'],
  },
  constraints: {
    hard: ['只做 betterPrompt 生成链最小闭环', '不接 execution-log', '不回退到 betterWorkflow'],
    soft: ['代码风格统一', '尽量简单'],
    output_format: 'mjs',
    risk_level: 'medium',
  },
  runtime: {
    timebox_min: 45,
    token_budget: 12000,
    language: 'zh-CN',
  },
};

// ── 样本 3: 最小化输入（最低配置） ──────────────────────────────────────────
const sample3 = {
  version: '1.0.0',
  task: {
    goal: '写一个 Python 脚本自动提取 PDF 中的表格数据',
    type: 'automation-script',
  },
  context: {
    project: 'data-pipeline',
  },
  skills: {
    candidates: ['coding-agent-workflow'],
  },
  constraints: {
    hard: ['只输出 Python 代码', '不依赖付费库'],
    risk_level: 'low',
  },
  runtime: {
    language: 'zh-CN',
  },
};

// ── 运行验证 ────────────────────────────────────────────────────────────────

let total = 0;
let passed = 0;

async function runSample(label, input) {
  total++;
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📦 ${label}`);
  console.log(`${'='.repeat(60)}`);

  try {
    const result = await buildBetterPromptPackage(input);
    const { package: pkg, qc: qc_result, traces: _debug = {} } = result;

    // 1. 输出 schema 校验
    const schemaCheck = validateBetterPromptOutput(pkg);
    console.log(`\n🔍 Schema 校验: ${schemaCheck.success ? '✅ 通过' : '❌ 失败'}`);
    if (!schemaCheck.success) {
      console.log('  issues:', schemaCheck.error?.issues?.map(i => i.message));
    }

    // 2. QC 结果
    console.log(`\n📋 QC 结果: ${qc_result.pass ? '✅ 通过' : '⚠️ 有问题'}`);
    console.log(`   ${qc_result.summary}`);
    if ((qc_result.issues || []).length > 0) {
      for (const issue of qc_result.issues) {
        console.log(`   ⚠️ ${issue}`);
      }
    }
    for (const check of qc_result.checks || []) {
      console.log(`   ✓ ${check.name}: ${check.pass ? 'pass' : 'fail'}`);
    }

    // 3. Selected skills
    console.log(`\n🎯 选中技能 (${(pkg.selected_skills || []).length}):`);
    for (const s of (_debug?.scored || [])) {
      console.log(`   - ${s.id}: score=${s.score}, mustHits=[${s.mustHits.join(', ')}], shouldHits=[${s.shouldHits.join(', ')}]`);
    }

    // 4. Capability slots
    console.log(`\n🔧 能力槽位:`);
    console.log(`   must: [${(_debug?.slots?.must || []).join(', ')}]`);
    console.log(`   should: [${(_debug?.slots?.should || []).join(', ')}]`);

    // 5. Prompt summary
    console.log(`\n📝 Prompt 摘要:`);
    console.log(`   system: ${pkg.prompt.system.split('\n')[0].slice(0, 80)}...`);
    console.log(`   developer: ${pkg.prompt.developer ? pkg.prompt.developer.slice(0, 80) + '...' : '(none)'}`);
    console.log(`   user_template: ${pkg.prompt.user_template.slice(0, 80)}...`);
    console.log(`   input_slots: [${pkg.prompt.input_slots.join(', ')}]`);

    // 6. Guardrails
    console.log(`\n🛡️ Guardrails:`);
    console.log(`   must_not: [${pkg.guardrails.must_not.map(g => `"${g.slice(0, 50)}"`).join(', ')}]`);

    // 7. Metadata
    console.log(`\n📊 Metadata:`);
    console.log(`   package_id: ${pkg.package_id}`);
    console.log(`   risk_level: ${pkg.metadata?.risk_level}`);
    console.log(`   builder_version: ${pkg.metadata?.builder_version}`);

    if (schemaCheck.success && qc_result.pass) {
      passed++;
      console.log(`\n✅ ${label} — 全部通过`);
    }
  } catch (err) {
    console.log(`\n❌ ${label} — 抛出异常: ${err.message}`);
  }
}

// ── Run ──────────────────────────────────────────────────────────────────

await runSample('样本 1: 契约落地任务', sample1);
await runSample('样本 2: Builder 实现任务（自身）', sample2);
await runSample('样本 3: 最小化输入', sample3);

// ── Summary ──────────────────────────────────────────────────────────────

console.log(`\n${'='.repeat(60)}`);
console.log(`📊 总览: ${passed}/${total} 通过`);
if (passed === total) {
  console.log('🎉 全部样本验证通过！');
} else {
  console.log(`⚠️ ${total - passed} 个样本未通过`);
}
console.log(`${'='.repeat(60)}\n`);
