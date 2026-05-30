import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

// ── Inline discoverSkills (replaces deleted skill-source-adapter.mjs) ──
async function discoverSkills(sourceDir, sourceId) {
  const skillEntries = [];
  async function walk(dir) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // Check for SKILL.md inside this directory
        const skillMd = path.join(full, 'SKILL.md');
        try {
          const stat = await fs.stat(skillMd);
          if (stat.isFile()) {
            const raw = await fs.readFile(skillMd, 'utf8');
            skillEntries.push({ raw, filePath: skillMd, relativeDir: path.relative(sourceDir, full) });
          }
        } catch {
          // No SKILL.md here, walk deeper
          await walk(full);
        }
      }
    }
  }

  await walk(sourceDir);

  const skills = [];
  for (const { raw, filePath, relativeDir } of skillEntries) {
    try {
      const frontmatter = extractFrontmatter(raw, filePath);
      skills.push({
        skillId: frontmatter.id || `${sourceId}:${relativeDir || path.basename(path.dirname(filePath))}`,
        entryPath: path.relative(process.cwd(), filePath),
        name: frontmatter.name || frontmatter.id || relativeDir || 'unknown',
        description: frontmatter.description || '',
        hash: frontmatter.hash || '',
        semantic: frontmatter.semantic || {},
      });
    } catch {
      // skip unparseable skills
    }
  }

  return skills;
}

function extractFrontmatter(text, file) {
  const normalized = text.replace(/^\uFEFF/u, '').replace(/\r\n?/g, '\n');
  if (!normalized.startsWith('---\n')) {
    throw new Error('No frontmatter');
  }
  const closeIdx = normalized.indexOf('\n---\n', 4);
  if (closeIdx === -1) {
    throw new Error('No closing frontmatter');
  }
  const fmText = normalized.slice(4, closeIdx);
  const result = {};
  for (const line of fmText.split('\n')) {
    const sep = line.indexOf(':');
    if (sep > 0) {
      const key = line.slice(0, sep).trim();
      let value = line.slice(sep + 1).trim();
      // Strip quotes
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      result[key] = value;
    }
  }
  return result;
}

function nowIso() {
  return new Date().toISOString();
}

function bucketizeErrors(records) {
  const buckets = {};
  for (const record of records) {
    for (const error of record.errors || []) {
      const code = error?.code || 'UNKNOWN';
      buckets[code] = (buckets[code] || 0) + 1;
    }
  }
  return buckets;
}

function buildSummary(records) {
  const summary = {
    total: records.length,
    ok: 0,
    error: 0,
    skipped: 0,
    errorBuckets: {}
  };

  for (const record of records) {
    if (record.status === 'ok') summary.ok += 1;
    else if (record.status === 'error') summary.error += 1;
    else if (record.status === 'skipped') summary.skipped += 1;
  }

  summary.errorBuckets = bucketizeErrors(records);
  return summary;
}

function validateSkill(rawSkill) {
  const errors = [];

  if (!rawSkill.skillId || typeof rawSkill.skillId !== 'string') {
    errors.push({ code: 'INVALID_SKILL_ID', message: 'skillId is missing or invalid' });
  }
  if (!rawSkill.entryPath || typeof rawSkill.entryPath !== 'string') {
    errors.push({ code: 'INVALID_ENTRY_PATH', message: 'entryPath is missing or invalid' });
  }
  if (!rawSkill.name || typeof rawSkill.name !== 'string') {
    errors.push({ code: 'INVALID_NAME', message: 'name is missing or invalid' });
  }
  if (!rawSkill.description || typeof rawSkill.description !== 'string') {
    errors.push({ code: 'INVALID_DESCRIPTION', message: 'description is missing or invalid' });
  }
  if (!rawSkill.hash || typeof rawSkill.hash !== 'string') {
    errors.push({ code: 'INVALID_HASH', message: 'hash is missing or invalid' });
  }
  if (!rawSkill.semantic || typeof rawSkill.semantic !== 'object') {
    errors.push({ code: 'INVALID_SEMANTIC', message: 'semantic is missing or invalid' });
  }

  return errors;
}

function toRecord(rawSkill, sourceId) {
  const validationErrors = validateSkill(rawSkill);
  const status = validationErrors.length > 0 ? 'error' : 'ok';

  return {
    sourceId,
    skillId: rawSkill.skillId || `${sourceId}:unknown`,
    entryPath: rawSkill.entryPath || '',
    status,
    fields: {
      name: rawSkill.name || '',
      description: rawSkill.description || '',
      hash: rawSkill.hash || '',
      semantic: rawSkill.semantic || null
    },
    errors: validationErrors
  };
}

async function persistScanArtifact(result, artifactDir) {
  await fs.mkdir(artifactDir, { recursive: true });
  const artifactPath = path.join(artifactDir, `${result.scanId}.json`);
  await fs.writeFile(artifactPath, JSON.stringify(result, null, 2), 'utf8');
  return artifactPath;
}

export async function runRegistryScanPipeline({ sourceDir, sourceId }) {
  if (!sourceDir || !sourceId) {
    throw new Error('runRegistryScanPipeline requires sourceDir and sourceId');
  }

  const scanId = `scan_${randomUUID()}`;
  const startedAt = nowIso();
  const records = [];

  let discoveredSkills = [];
  try {
    discoveredSkills = await discoverSkills(sourceDir, sourceId);
  } catch (error) {
    records.push({
      sourceId,
      skillId: `${sourceId}:discover`,
      entryPath: sourceDir,
      status: 'error',
      fields: { name: '', description: '', hash: '' },
      errors: [
        {
          code: 'DISCOVER_FAILED',
          message: error instanceof Error ? error.message : String(error)
        }
      ]
    });
  }

  for (const skill of discoveredSkills) {
    records.push(toRecord(skill, sourceId));
  }

  const summary = buildSummary(records);
  const finishedAt = nowIso();

  const result = {
    scanId,
    sourceId,
    sourceDir: path.resolve(sourceDir),
    startedAt,
    finishedAt,
    summary,
    records
  };

  const artifactDir = path.resolve('.skillforge/registry/scans');
  const artifactPath = await persistScanArtifact(result, artifactDir);

  return {
    ...result,
    artifactPath
  };
}
