#!/usr/bin/env node
// ── test tag retrieval via betterPrompt ──
// No hardcoded candidates — let tag search pick skills
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildBetterPromptPackage } from '../src/skillforge/betterprompt-builder.mjs';
import { list, searchByTags } from '../src/skillforge/registry-store.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sanity check: what does searchByTags return for common tags?
console.log('=== searchByTags smoke test ===');
const testQueries = ['automation', 'search', 'file-management'];
for (const q of testQueries) {
  const hits = searchByTags([q]);
  console.log(`  "${q}" -> ${hits.length} hits:`, hits.map(h => h.entry.fixtureId));
}

console.log('\n=== betterPrompt run ===');

const tagged = list().filter(e => Array.isArray(e.tags) && e.tags.length > 0);
console.log(`registry: ${list().length} total, ${tagged.length} tagged\n`);

// Read tag schema for reference
const tagSchema = JSON.parse(readFileSync(path.resolve(__dirname, '../src/skillforge/tag-schema.json'), 'utf8'));

const input = {
  version: '1.0.0',
  task: {
    id: 'test-tag-retrieval-001',
    goal: '我需要写一个脚本来自动抓取网页上的公告，每天自动运行，把结果保存到本地文件并发出通知',
    type: 'atomic',
  },
  context: {
    project: 'workflow-kit',
    facts: ['需要定时任务', '需要网页抓取', '需要文件存储', '需要通知'],
  },
  constraints: {
    hard: ['只做抓取和存储', '不要用外部服务'],
    soft: ['优先用轻量方案'],
  },
  runtime: {
    language: 'zh-CN',
    token_budget: 4096,
  },
  // Intentionally NO candidates → should use tag retrieval
  skills: {},
};

(async () => {
  const result = await buildBetterPromptPackage(input);
  const pkg = result?.package || result;
  const selectedSkills = pkg?.selected_skills || [];
  console.log('\n--- result ---');
  console.log('package_id:', pkg?.package_id);
  console.log('selected_skills:', JSON.stringify(selectedSkills));
  console.log('num selected:', selectedSkills.length);
  console.log('source:', selectedSkills.length > 0 ? '✅ tag检索命中' : '❌ tag检索未命中');

  // Determine source
  const tagMatched = pkg?.metadata?.tag_matched_count > 0 ||
    pkg?.metadata?.tagSearchSelectedCount > 0;
  console.log('source_detail:', {
    tagMatched,
    fallback_used: pkg?.metadata?.fallback_used,
    fallback_mode: pkg?.metadata?.fallback_mode,
  });
})().catch(e => { console.error(e); process.exit(1); });
