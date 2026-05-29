#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join, resolve } from 'path';

const AGENTS_DIR = resolve(process.env.HOME, '.openclaw/agents');
const MAX_PW = parseInt(process.env.MAX_PW || '50', 10);
const MAX_SP = parseInt(process.env.MAX_SP || '100', 10);
const OUT = process.env.OUT || 'tmp/task7-samples.json';

function safeSnippet(val, maxLen = 3000) {
  if (!val) return null;
  const s = typeof val === 'string' ? val : JSON.stringify(val);
  return s.length > maxLen ? s.slice(0, maxLen) + '...[truncated]' : s;
}

const planWriteAll = [], spawnAll = [];
const pwByAgent = new Map(), spByAgent = new Map();
let filesScanned = 0;

function processFile(agent, fp) {
  filesScanned++;
  try {
    const lines = readFileSync(fp, 'utf8').split('\n').filter(l => l.trim());
    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        const msg = obj?.message;
        if (!msg) continue;
        const carr = Array.isArray(msg.content) ? msg.content : [msg.content].filter(Boolean);
        for (const c of carr) {
          if (c?.type !== 'toolCall') continue;
          const name = c.name;
          if (name !== 'plan_write' && name !== 'sessions_spawn') continue;
          const args = c.arguments || {};
          const sample = {
            agent,
            toolName: name,
            timestamp: obj.timestamp || msg.timestamp || null,
            toolCallId: c.id || null,
            argsSnippet: safeSnippet(args, 3000),
            sourceFile: fp,
          };
          if (name === 'plan_write') {
            planWriteAll.push(sample);
            pwByAgent.set(agent, (pwByAgent.get(agent)||0)+1);
          } else {
            spawnAll.push(sample);
            spByAgent.set(agent, (spByAgent.get(agent)||0)+1);
          }
        }
      } catch {}
    }
  } catch {}
}

for (const d of readdirSync(AGENTS_DIR, { withFileTypes: true })) {
  if (!d.isDirectory() || d.name.startsWith('_')) continue;
  const sd = join(AGENTS_DIR, d.name, 'sessions');
  if (!existsSync(sd)) continue;
  for (const f of readdirSync(sd)) {
    const fp = join(sd, f);
    try { if (statSync(fp).size === 0) continue; } catch { continue; }
    processFile(d.name, fp);
  }
}

// Stratified sampling: take from each agent proportionally
function stratifiedSample(all, byAgent, max) {
  if (all.length <= max) return all;
  const agents = Array.from(byAgent.keys());
  if (agents.length === 0) return all.slice(0, max);
  const perAgent = Math.max(1, Math.floor(max / agents.length));
  const picked = new Set();
  const result = [];
  // Round-robin from each agent
  const queues = new Map();
  for (const a of agents) queues.set(a, []);
  for (const s of all) queues.get(s.agent).push(s);
  let remaining = max;
  while (remaining > 0) {
    let added = false;
    for (const a of agents) {
      const q = queues.get(a);
      if (q.length > 0) {
        result.push(q.shift());
        remaining--;
        added = true;
        if (remaining === 0) break;
      }
    }
    if (!added) break;
  }
  return result;
}

const planWrite = stratifiedSample(planWriteAll, pwByAgent, MAX_PW);
const spawn = stratifiedSample(spawnAll, spByAgent, MAX_SP);

const result = {
  summary: {
    filesScanned,
    planWriteTotal: planWriteAll.length,
    sessionsSpawnTotal: spawnAll.length,
    planWriteHit: planWrite.length,
    sessionsSpawnHit: spawn.length,
    planWriteByAgent: Object.fromEntries(pwByAgent),
    sessionsSpawnByAgent: Object.fromEntries(spByAgent),
  },
  planWrite,
  sessionsSpawn: spawn,
};

writeFileSync(OUT, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result.summary, null, 2));
