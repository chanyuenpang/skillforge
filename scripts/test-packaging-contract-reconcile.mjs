#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const fixtureArg = process.argv[2];
const root = fixtureArg
  ? path.resolve(process.cwd(), fixtureArg)
  : path.resolve(process.cwd(), 'fixtures/meeting-summary-assistant');

const generatedSkillPath = path.join(root, 'generated/skill/SKILL.md');
const generatedManifestPath = path.join(root, 'generated/skill-manifest.yaml');
const validationResultPath = path.join(root, 'validation-result.yaml');
const fixtureId = 'meeting-summary-assistant';

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

function ok(message) {
  console.log(`OK: ${message}`);
}

function read(filePath) {
  if (!fs.existsSync(filePath)) {
    fail(`missing file: ${path.relative(root, filePath) || filePath}`);
    return '';
  }
  return fs.readFileSync(filePath, 'utf8');
}

function scalarValue(text, key) {
  const pattern = new RegExp(`^\\s*${key}:\\s*(.+)$`, 'm');
  const match = text.match(pattern);
  return match ? match[1].trim() : '';
}

function frontmatterField(md, key) {
  const frontmatterMatch = md.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return '';
  const frontmatter = frontmatterMatch[1];
  const pattern = new RegExp(`^${key}:\\s*(.+)$`, 'm');
  const match = frontmatter.match(pattern);
  return match ? match[1].trim() : '';
}

function frontmatterHasNested(md, parent, child, expected) {
  const frontmatterMatch = md.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return false;
  const frontmatter = frontmatterMatch[1];
  const lines = frontmatter.split('\n');
  const parentIndex = lines.findIndex((line) => line === `${parent}:`);
  if (parentIndex === -1) return false;
  for (let i = parentIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.startsWith('  ')) break;
    if (line.trim() === `${child}: ${expected}`) return true;
  }
  return false;
}

function manifestEntry(manifestText) {
  const match = manifestText.match(/^\s*entry:\s*(.+)$/m);
  return match ? match[1].trim() : '';
}

const manifest = read(generatedManifestPath);
const skill = read(generatedSkillPath);
const validationResult = read(validationResultPath);

const checks = [
  ['generated manifest exists', !!manifest],
  ['generated skill exists', !!skill],
  ['validation result exists', !!validationResult],
  ['manifest kind is skill-manifest', scalarValue(manifest, 'kind') === 'skill-manifest'],
  ['manifest status is static_checked', scalarValue(manifest, 'status') === 'static_checked'],
  ['manifest entry points to generated skill', manifestEntry(manifest) === 'generated/skill/SKILL.md'],
  ['manifest spec points to skill-spec', /path:\s*\.\.\/skill-spec\.yaml/.test(manifest)],
  ['skill frontmatter name present', frontmatterField(skill, 'name') === 'meeting-summary-assistant'],
  ['skill frontmatter version present', frontmatterField(skill, 'version') === '0.1.0'],
  ['skill frontmatter description present', frontmatterField(skill, 'description').length > 0],
  ['skill frontmatter metadata.profile is static_checked', frontmatterHasNested(skill, 'metadata', 'profile', 'static_checked')],
  ['validation result declares static mode', /^validation:\n[\s\S]*?^\s*mode:\s*static$/m.test(validationResult)],
  ['validation result is pending, not runtime pass', /\bstatus:\s*pending\b/.test(validationResult) && !/runtime_passed/.test(validationResult)],
  ['validation result lists compatibility check', /\bcompatibility:\s*\n\s*status:\s*pending/.test(validationResult)],
  ['validation result is static-only', /静态验证入口尚未执行/.test(validationResult)],
  ['all required packaging contract fields are present', Boolean(frontmatterField(skill, 'name') && frontmatterField(skill, 'version') && frontmatterField(skill, 'description') && frontmatterHasNested(skill, 'metadata', 'profile', 'static_checked'))],
];

let passed = 0;
for (const [name, result] of checks) {
  if (result) {
    passed += 1;
    ok(name);
  } else {
    fail(name);
  }
}

if (!process.exitCode) {
  console.log(`PASS ${passed}/${checks.length}`);
}
