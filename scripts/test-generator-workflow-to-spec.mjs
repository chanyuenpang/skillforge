/**
 * Phase 10.G1.1 — 验证 generator-workflow-to-spec 编译函数
 *
 * 独立运行：node scripts/test-generator-workflow-to-spec.mjs
 * 约束：仅使用 Node 内置模块，不引入任何 npm 包
 */

import { compileWorkflowToSpec } from '../src/skillforge/generator-workflow-to-spec.mjs';

// ───── 辅助断言 ─────
let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    passed++;
    console.log(`  ✅ 断言通过: ${label}`);
  } else {
    failed++;
    console.log(`  ❌ 断言失败: ${label}`);
  }
}

// ───── 测试 1: 完整合法 workflowSource ─────
console.log('');
console.log('━━━ Test 1: 完整合法 workflowSource ─━━');
{
  const workflowSource = {
    fixtureId: 'release-notes-assistant',
    fixtureVersion: '0.1.0',
    kind: 'workflow-source',
    profile: 'standard',
    name: 'Release Notes Assistant 工作流',
    summary: '将公开、虚构或合成 changelog、PR 摘要、版本变更列表整理为中文发布说明。',
    source: {
      type: 'public-fictional-synthetic-sample',
      language: 'zh-CN',
      inputContract: {
        acceptedInputs: [
          '合成 changelog 条目',
          '虚构 PR 摘要',
          '公开版本变更列表',
        ],
        rejectedInputs: [
          '真实私有 repo 内容或内部缺陷系统访问请求',
          '真实客户、账号、凭证或访问令牌',
        ],
      },
      outputContract: {
        format: 'markdown',
        sections: [
          'highlights',
          'breakingChanges',
          'migrationNotes',
          'knownLimitations',
          'upgradeChecklist',
        ],
      },
    },
    permissions: {
      network: false,
      externalSend: false,
      fileRead: false,
      fileWrite: false,
      destructiveOperations: false,
      privatePathRead: false,
    },
    dependencies: {
      noneDeclared: true,
      items: [],
    },
    checklist: {
      structure: '工作流源声明 fixtureId、版本、profile。',
      trigger: '主题明确为将 changelog 整理成发布说明。',
      boundary: '明确拒绝私有仓库、内部系统、敏感凭证。',
      dependency: '不依赖外部服务、网络、本地文件。',
      replay: '可被静态校验器读取。',
      privacy: '仅使用公开、虚构或合成发布材料。',
      compatibility: 'runtime、跨平台、跨模型、CI 均 pending。',
    },
  };

  const result = compileWorkflowToSpec(workflowSource);

  assert(result.kind === 'skill-spec', 'kind 应为 "skill-spec"');
  assert(typeof result.skill.name === 'string' && result.skill.name.length > 0, 'skill.name 应为非空字符串');
  assert(
    typeof result.outputs.format === 'string' && result.outputs.format.length > 0,
    'outputs.format 应为非空字符串',
  );
  assert(result.outputs.format === 'markdown', 'outputs.format 应为 "markdown"');
  assert(Array.isArray(result.outputs.requiredSections), 'outputs.requiredSections 应为数组');
  assert(
    result.outputs.requiredSections.length === 5,
    'requiredSections 应包含 5 个 section',
  );
  assert(
    result.outputs.requiredSections.includes('highlights'),
    'requiredSections 应包含 highlights',
  );
  assert(
    result.outputs.requiredSections.includes('breakingchanges'),
    'requiredSections 应包含 "breakingchanges"（当前实现仅 toLowerCase，不插入空格）',
  );
  assert(
    result.skill.version === '0.1.0',
    'skill.version 应从 fixtureVersion 继承',
  );
  assert(
    result.fixtureId === 'release-notes-assistant',
    'fixtureId 应透传',
  );
  assert(
    Array.isArray(result.skill.triggerPhrases) && result.skill.triggerPhrases.length >= 1,
    'triggerPhrases 应至少包含 1 条短语',
  );
  assert(
    result.permissions.network === false,
    'permissions.network 应为 false',
  );
  assert(
    result.dependencies.noneDeclared === true,
    'dependencies.noneDeclared 应为 true',
  );
  assert(
    Array.isArray(result.privacy.sourceTypes),
    'privacy.sourceTypes 应为数组',
  );
}

// ───── 测试 2: 最小 workflowSource（仅必填字段）─────
console.log('');
console.log('━━━ Test 2: 最小 workflowSource（仅必填字段） ━━━');
{
  const minimalSource = {
    name: 'test-minimal',
    source: {
      outputContract: {
        format: 'json',
      },
    },
  };

  const result = compileWorkflowToSpec(minimalSource);

  assert(result.kind === 'skill-spec', 'kind 应始终为 "skill-spec"');
  assert(result.skill.name === 'test-minimal', 'skill.name 应从 name 字段继承');
  assert(result.outputs.format === 'json', 'outputs.format 应透传为 "json"');
  assert(
    Array.isArray(result.outputs.requiredSections) && result.outputs.requiredSections.length === 0,
    '无 outputContract.sections 时 requiredSections 应为空数组',
  );
  assert(
    result.outputs.primary === 'releaseNotes',
    'outputs.primary 应使用默认值 "releaseNotes"',
  );
  assert(
    result.skill.version === '0.1.0',
    '无 fixtureVersion 时 skill.version 应使用默认值 "0.1.0"',
  );
  assert(
    result.fixtureId === undefined,
    '无 fixtureId 时应返回 undefined',
  );
}

// ───── 测试 3: 空对象 / 边界情况 ─────
console.log('');
console.log('━━━ Test 3: 空对象 / 边界情况 ━━━');
{
  // 完全空对象
  const emptyResult = compileWorkflowToSpec({});
  assert(emptyResult.kind === 'skill-spec', '空对象也应输出 skill-spec');
  assert(emptyResult.skill.name === 'unknown-skill', '空对象时 skill.name 应 fallback 为 "unknown-skill"');
  assert(emptyResult.skill.version === '0.1.0', '空对象时 skill.version 应使用默认值');

  // undefined 输入
  const undefResult = compileWorkflowToSpec(undefined);
  assert(undefResult.kind === 'skill-spec', 'undefined 输入也应输出 skill-spec');
  assert(undefResult.skill.name === 'unknown-skill', 'undefined 输入时 skill.name 应 fallback');

  // null 输入
  const nullResult = compileWorkflowToSpec(null);
  assert(nullResult.kind === 'skill-spec', 'null 输入也应输出 skill-spec');
}

// ───── 测试 4: triggerPhrases 构造逻辑 ─────
console.log('');
console.log('━━━ Test 4: triggerPhrases 构造逻辑 ━━━');
{
  const source = {
    name: 'my-skill',
    summary: 'Do something',
    source: {
      outputContract: { format: 'text' },
    },
    checklist: {
      triggerPhrases: ['手动触发 phrase A', '手动触发 phrase B'],
    },
  };

  const result = compileWorkflowToSpec(source);
  assert(result.skill.triggerPhrases.includes('手动触发 phrase A'), '应包含手动设置触发词');
  assert(result.skill.triggerPhrases.includes('手动触发 phrase B'), '应包含手动设置触发词');
  assert(result.skill.triggerPhrases.includes('整理my-skill'), '应自动生成 "整理{skillName}"');
  assert(result.skill.triggerPhrases.includes('Do something'), '应包含 summary 内容');
}

// ───── 统计 ─────
console.log('');
console.log('═══════════════════════════════════════');
console.log(`  总断言: ${passed + failed}  |  ✅ 通过: ${passed}  |  ❌ 失败: ${failed}`);
console.log('═══════════════════════════════════════');
console.log('');

if (failed > 0) {
  console.log('❌ FAIL — 存在未通过的断言');
  process.exit(1);
} else {
  console.log('✅ PASS — 所有断言均通过');
}
