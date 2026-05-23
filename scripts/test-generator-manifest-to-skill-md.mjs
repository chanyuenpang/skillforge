import { compileManifestToSkillMd } from '../src/skillforge/generator-manifest-to-skill-md.mjs';

function fail(message) {
  console.error(`❌ FAIL: ${message}`);
  process.exitCode = 1;
}

function pass(message) {
  console.log(`✅ PASS: ${message}`);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
    return false;
  }
  return true;
}

const minimalSkillManifest = {
  skill: {
    name: 'demo-skill',
    title: 'Demo Skill',
    description: '用于验证 SkillManifest 转 SKILL.md 骨架生成。',
    triggerPhrases: ['demo', '测试触发词'],
  },
  boundaries: {
    allowed: ['仅生成骨架内容'],
    denied: ['不要依赖 npm 包'],
  },
};

try {
  const md = compileManifestToSkillMd(minimalSkillManifest);

  if (!assert(typeof md === 'string', '输出必须是 string')) process.exit(1);
  if (!assert(md.includes('# '), '输出必须包含 markdown 标题')) process.exit(1);
  if (!assert(md.includes('## 用途'), '输出必须包含“## 用途”')) process.exit(1);
  if (!assert(md.includes('## 触发词'), '输出必须包含“## 触发词”')) process.exit(1);
  if (!assert(md.includes('## 边界与注意事项'), '输出必须包含“## 边界与注意事项”')) process.exit(1);

  pass('compileManifestToSkillMd 骨架输出校验通过');
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
