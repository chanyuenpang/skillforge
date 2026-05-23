const DEFAULT_VERSION = '0.1.0';

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function uniqueStrings(values) {
  return [...new Set(asArray(values).map(normalizeString).filter(Boolean))];
}

function pickTitle(manifest) {
  return normalizeString(manifest?.skill?.title) || normalizeString(manifest?.skill?.name) || 'unknown-skill';
}

function pickDescription(manifest, title) {
  return normalizeString(manifest?.skill?.description) || title;
}

function buildTriggerLine(manifest) {
  const triggers = uniqueStrings(manifest?.skill?.triggerPhrases);
  if (!triggers.length) return '- 触发词：暂无显式配置';
  return `- 触发词：${triggers.join('，')}`;
}

function buildBoundaryLines(manifest) {
  const allowed = uniqueStrings(manifest?.boundaries?.allowed);
  const denied = uniqueStrings(manifest?.boundaries?.denied);
  const lines = [];
  lines.push(`- 允许边界：${allowed.length ? allowed.join('，') : '未声明'}`);
  lines.push(`- 禁止边界：${denied.length ? denied.join('，') : '未声明'}`);
  return lines;
}

function buildNotes(manifest) {
  const notes = [];
  const version = normalizeString(manifest?.version) || DEFAULT_VERSION;
  notes.push(`- 版本：${version}`);
  if (manifest?.kind) notes.push(`- 类型：${manifest.kind}`);
  if (manifest?.compatibility?.staticValidatorOnly !== undefined) {
    notes.push(`- 验证模式：${manifest.compatibility.staticValidatorOnly ? 'static-only' : 'mixed'}`);
  }
  if (manifest?.privacy?.realPrivateRepositoryDataAllowed === false) {
    notes.push('- 隐私：默认不输出真实私有仓库数据');
  }
  return notes;
}

export function compileManifestToSkillMd(skillManifest) {
  const manifest = asObject(skillManifest);
  const title = pickTitle(manifest);
  const description = pickDescription(manifest, title);
  const triggers = buildTriggerLine(manifest);
  const boundaries = buildBoundaryLines(manifest);
  const notes = buildNotes(manifest);

  return [
    `# ${title}`,
    '',
    description,
    '',
    '## 用途',
    description,
    '',
    '## 触发词',
    triggers,
    '',
    '## 边界与注意事项',
    ...boundaries,
    ...notes,
    '',
    '## 未实现内容',
    '- 任务流程展开',
    '- 资源/工具清单',
    '- 示例与运行说明',
    '- 更完整的约束与策略',
  ].join('\n');
}
