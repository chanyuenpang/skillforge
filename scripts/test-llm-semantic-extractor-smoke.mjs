import path from 'node:path';
import { promises as fs } from 'node:fs';
import { extractSkillSemantic } from '../src/skillforge/llm-semantic-extractor.mjs';

const rootDir = process.cwd();

const skillPaths = [
  path.join(rootDir, 'fixtures/release-notes-assistant/skill/SKILL.md'),
  path.join(rootDir, 'fixtures/meeting-summary-assistant/skill/SKILL.md'),
  path.join(rootDir, 'fixtures/study-card-assistant/skill/SKILL.md')
];

function pickSummary(result) {
  return {
    summary: result?.summary,
    capabilities: Array.isArray(result?.capabilities) ? result.capabilities.slice(0, 3) : [],
    constraints: Array.isArray(result?.constraints) ? result.constraints.slice(0, 3) : [],
    intent: Array.isArray(result?.intent) ? result.intent.slice(0, 3) : []
  };
}

for (const skillPath of skillPaths) {
  const content = await fs.readFile(skillPath, 'utf8');
  const skillName = path.basename(path.dirname(skillPath));

  const result = await extractSkillSemantic({
    content,
    skillName,
    sourcePath: skillPath
  });

  const report = {
    sourcePath: skillPath,
    usedFallback: result?.usedFallback ?? null,
    fallbackReason: result?.fallbackReason ?? null,
    qualityPassed: result?.quality?.passed ?? null,
    extractor: result?.extractor ?? null,
    model: result?.model ?? null,
    core: pickSummary(result)
  };

  console.log(JSON.stringify(report, null, 2));
}
