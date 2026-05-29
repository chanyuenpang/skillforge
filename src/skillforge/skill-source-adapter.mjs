import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { extractSkillSemantic } from './llm-semantic-extractor.mjs';

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(fullPath);
    } else {
      yield fullPath;
    }
  }
}

function extractDescription(markdown = '') {
  const normalized = markdown.replace(/\r\n/g, '\n').trim();
  if (!normalized) return '';

  const paragraphs = normalized
    .split(/\n\s*\n+/)
    .map((p) => p.replace(/^#+\s+/gm, '').replace(/\n+/g, ' ').trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return normalized.slice(0, 80);
  }

  const first = paragraphs[0];
  return first || normalized.slice(0, 80);
}

export async function discoverSkills(sourceDir, sourceId) {
  const skills = [];
  const root = path.resolve(sourceDir);

  for await (const filePath of walk(root)) {
    if (path.basename(filePath) !== 'SKILL.md') continue;

    const content = await fs.readFile(filePath, 'utf8');
    const skillDir = path.dirname(filePath);
    const relativePathRaw = path.relative(root, skillDir);
    const relativePath = relativePathRaw === '' ? '.' : relativePathRaw.split(path.sep).join('/');

    const semantic = await extractSkillSemantic({
      content,
      skillName: path.basename(skillDir),
      sourcePath: filePath
    });

    skills.push({
      skillId: `${sourceId}:${relativePath}`,
      name: path.basename(skillDir),
      description: extractDescription(content),
      entryPath: filePath,
      hash: createHash('sha256').update(content).digest('hex'),
      semantic
    });
  }

  skills.sort((a, b) => a.skillId.localeCompare(b.skillId));
  return skills;
}
