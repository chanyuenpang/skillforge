#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(process.cwd(), 'fixtures/meeting-summary-assistant');
const manifestPath = path.join(root, 'generated/skill-manifest.yaml');
const skillPath = path.join(root, 'generated/skill/SKILL.md');

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

function ok(message) {
  console.log(`OK: ${message}`);
}

function read(filePath) {
  if (!fs.existsSync(filePath)) fail(`missing file: ${filePath}`);
  return fs.readFileSync(filePath, 'utf8');
}

const manifest = read(manifestPath);
const skill = read(skillPath);

const checks = [
  ['manifest has kind', /\bkind:\s*skill-manifest\b/.test(manifest)],
  ['manifest has spec association', /\bspec:\s*[\s\S]*?\bkind:\s*skill-spec\b/.test(manifest) && /\bpath:\s*\.\.\/skill-spec\.yaml\b/.test(manifest)],
  ['manifest has entry path', /\bentry:\s*generated\/skill\/SKILL\.md\b/.test(manifest)],
  ['manifest has dependencies field', /\bdependencies:\s*[\s\S]*?-\s*none\b/.test(manifest)],
  ['manifest has status static_checked', /\bstatus:\s*static_checked\b/.test(manifest)],
  ['manifest avoids runtime_passed', !/runtime_passed/.test(manifest)],
  ['skill frontmatter has name', /^---\n[\s\S]*?^name:\s*meeting-summary-assistant$/m.test(skill)],
  ['skill frontmatter has version', /^---\n[\s\S]*?^version:\s*0\.1\.0$/m.test(skill)],
  ['skill frontmatter has description', /^---\n[\s\S]*?^description:\s*.+$/m.test(skill)],
  ['skill frontmatter has metadata.profile', /\bmetadata:\n[\s\S]*?\bprofile:\s*static_checked\b/.test(skill)],
  ['skill frontmatter avoids runtime_passed', !/runtime_passed/.test(skill)],
  ['entry file matches manifest path', fs.existsSync(skillPath)],
  ['boundary wording is static-only', /static_checked/.test(manifest) && read(path.join(root, 'docs/phase-4-m42-minimal-synthesis-note.md')).includes('static-only')],
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
