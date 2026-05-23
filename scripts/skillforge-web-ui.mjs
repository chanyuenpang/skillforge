#!/usr/bin/env node
import http from 'node:http';
import { URL } from 'node:url';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { loadById as loadTranscriptById, list as listTranscripts } from '../src/skillforge/transcript-store.mjs';
import { loadById as loadExecutionById, list as listExecutions } from '../src/skillforge/execution-log-store.mjs';
import { createRegistryEntry } from '../src/skillforge/registry-entry.mjs';
import { save as saveRegistryEntry, loadById as loadRegistryEntryById, list as listRegistryEntries, restoreById as restoreRegistryEntryById } from '../src/skillforge/registry-store.mjs';
import { spawn } from 'node:child_process';

const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || '127.0.0.1';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stateFromRecord(record) {
  if (!record) return { state: 'idle', label: 'idle', detail: 'No replay/operate data yet.' };
  if (record.status === 'failed' || record.status === 'error') return { state: 'error', label: 'error', detail: record.errorMessage || 'Latest record indicates an error.' };
  return { state: 'success', label: 'success', detail: `Latest record ${record.status || 'completed'}.` };
}

function summarizeText(text, maxLines = 24, maxChars = 3200) {
  const lines = String(text ?? '').split(/\r?\n/);
  const clipped = lines.slice(0, maxLines).join('\n');
  return clipped.length > maxChars ? `${clipped.slice(0, maxChars)}\n…(truncated)` : clipped;
}

function parseJsonFromOutput(stdout) {
  const text = String(stdout ?? '');
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) return null;
  try {
    return JSON.parse(text.slice(first, last + 1));
  } catch {
    return null;
  }
}

function createShellResult({ kind, intent, fixtureId, mode, statusCode, stdout, stderr = '', payload = null, error = null }) {
  const outputText = `${stdout || ''}${stderr ? (stdout ? '\n' : '') + stderr : ''}`.trim();
  return {
    kind,
    payload: {
      fixtureId,
      intent,
      mode,
      statusCode,
      status: statusCode === 0 ? 'success' : 'error',
      stdoutSummary: summarizeText(stdout),
      stderrSummary: summarizeText(stderr),
      outputSummary: summarizeText(outputText),
      payload,
      error,
    },
  };
}

function runNodeScript(scriptPath, args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [scriptPath, ...args], { cwd: process.cwd(), env: process.env });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (statusCode) => resolve({ statusCode: statusCode ?? 1, stdout, stderr }));
    child.on('error', (error) => resolve({ statusCode: 1, stdout, stderr: `${stderr}${stderr ? '\n' : ''}${error.message}` }));
  });
}

function latestSnapshot() {
  const executions = listExecutions();
  const transcripts = listTranscripts();
  const latestExecution = executions.at(-1) || null;
  const latestTranscript = transcripts.at(-1) || null;
  if (latestExecution) return { kind: 'operate', record: latestExecution, ...stateFromRecord(latestExecution) };
  if (latestTranscript) return { kind: 'replay', record: latestTranscript, ...stateFromRecord(latestTranscript) };
  return { kind: 'empty', record: null, state: 'idle', label: 'idle', detail: 'No replay/operate data yet.' };
}

function normalizeHistoryItems() {
  const executions = listExecutions().map((item) => ({
    source: 'execution-log-store',
    fixtureId: item.fixtureId || item.fixture_id || 'unknown',
    status: item.status || 'unknown',
    time: item.createdAt || item.timestamp || item.time || item.updatedAt || '',
    raw: item,
  }));
  const transcripts = listTranscripts().map((item) => ({
    source: 'transcript-store',
    fixtureId: item.fixtureId || item.fixture_id || 'unknown',
    status: item.status || 'unknown',
    time: item.createdAt || item.timestamp || item.time || item.updatedAt || '',
    raw: item,
  }));
  return [...executions, ...transcripts].sort((a, b) => String(b.time || '').localeCompare(String(a.time || '')));
}

function renderShell({ title, body, snapshot, actionResult = null }) {
  const resultBox = actionResult ? `<div class="panel ${actionResult.kind}"><strong>${escapeHtml(actionResult.kind)}</strong><pre>${escapeHtml(JSON.stringify(actionResult.payload, null, 2))}</pre></div>` : '';
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)} - SkillForge Web UI</title>
<style>
  body{font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:24px;background:#0b1020;color:#e8ecff}
  .wrap{max-width:980px;margin:0 auto}
  .card,.panel{background:#141b34;border:1px solid #2a355f;border-radius:14px;padding:16px;margin:12px 0}
  .row{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
  input,select,button,a.nav{border-radius:10px;border:1px solid #3a4a84;background:#0e1430;color:#fff;padding:10px 12px;text-decoration:none;display:inline-block}
  button{cursor:pointer;background:#4b6bff}
  .badge{display:inline-block;padding:4px 10px;border-radius:999px;font-size:12px;text-transform:uppercase}
  .idle{background:#334155}.running{background:#92400e}.success{background:#166534}.error{background:#7f1d1d}
  .muted{color:#aab3d6}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:10px;border-bottom:1px solid #2a355f;vertical-align:top}
  pre{white-space:pre-wrap;word-break:break-word;background:#0a0f20;padding:12px;border-radius:10px;overflow:auto}
</style></head><body><div class="wrap">
  <h1>SkillForge Web UI</h1>
  <div class="card">
    <div class="row">
      <span class="badge ${snapshot.state}">${escapeHtml(snapshot.label)}</span>
      <span class="muted">状态：${escapeHtml(snapshot.detail)}</span>
      <a class="nav" href="/">首页</a>
      <a class="nav" href="/history">Execution history</a>
      <a class="nav" href="/transcripts">Transcripts</a>
      <a class="nav" href="/registry">Registry</a>
    </div>
    ${body}
  </div>
  ${resultBox}
  <div class="card"><h3>Latest snapshot</h3><pre>${escapeHtml(JSON.stringify(snapshot, null, 2))}</pre></div>
</div></body></html>`;
}

function normalizeTranscriptItems() {
  return listTranscripts().map((item) => ({
    caseId: item.caseId || item.case_id || item.fixtureId || item.fixture_id || 'unknown',
    fixtureId: item.fixtureId || item.fixture_id || 'unknown',
    provider: item.provider || item.llmProvider || item.modelProvider || 'unknown',
    model: item.model || item.modelName || 'unknown',
    status: item.status || 'unknown',
    timestamp: item.timestamp || item.createdAt || item.time || item.updatedAt || '',
    raw: item,
  }));
}

function registryPage({ snapshot = latestSnapshot() }) {
  const items = listRegistryEntries();
  const rows = items.length
    ? items.map((item) => `<tr><td>${escapeHtml(item.fixtureId)}</td><td>${escapeHtml(item.version || '-')}</td><td>${escapeHtml(item.registryMeta?.status || 'unknown')}</td><td>${escapeHtml(item.registryMeta?.registeredAt || '-')}</td><td>${escapeHtml(item.reviewer || item.registryMeta?.reviewer || '-')}</td><td>${escapeHtml(item.approver || item.registryMeta?.approver || '-')}</td><td><a class="nav" href="/api/registry/skills/${encodeURIComponent(item.fixtureId)}">detail</a> <a class="nav" href="/api/registry/skills/${encodeURIComponent(item.fixtureId)}/versions">versions</a> <a class="nav" href="/api/registry/skills/${encodeURIComponent(item.fixtureId)}/rollback">rollback</a></td></tr>`).join('')
    : `<tr><td colspan="7" class="muted">暂无 registry entry</td></tr>`;
  return renderShell({
    title: 'Registry',
    snapshot,
    body: `<p class="muted">Registry 分发 API 端点。</p><div class="card"><h3>Registry entries</h3><table><thead><tr><th>fixtureId</th><th>version</th><th>status</th><th>registeredAt</th><th>reviewer</th><th>approver</th><th>action</th></tr></thead><tbody>${rows}</tbody></table></div>`,
  });
}

function listVersionsForFixture(fixtureId) {
  return listRegistryEntries()
    .filter((item) => item.fixtureId === fixtureId)
    .map((item) => ({
      version: item.version || 'unknown',
      status: item.registryMeta?.status || 'unknown',
      registeredAt: item.registryMeta?.registeredAt || null,
      reviewer: item.reviewer || item.registryMeta?.reviewer || null,
      approver: item.approver || item.registryMeta?.approver || null,
      restoredFromVersion: item.recoveryMeta?.restoredFromVersion || null,
      restoredAt: item.recoveryMeta?.restoredAt || null,
      item,
    }))
    .sort((a, b) => String(b.registeredAt || b.restoredAt || '').localeCompare(String(a.registeredAt || a.restoredAt || '')));
}

function versionListPage(fixtureId, { snapshot = latestSnapshot() } = {}) {
  const versions = listVersionsForFixture(fixtureId);
  const rows = versions.length
    ? versions.map((item) => `<tr><td>${escapeHtml(item.version)}</td><td>${escapeHtml(item.status)}</td><td>${escapeHtml(item.reviewer || '-')}</td><td>${escapeHtml(item.approver || '-')}</td><td>${escapeHtml(item.registeredAt || '-')}</td><td><a class="nav" href="/api/registry/skills/${encodeURIComponent(fixtureId)}/versions/${encodeURIComponent(item.version)}">detail</a></td></tr>`).join('')
    : `<tr><td colspan="6" class="muted">暂无版本</td></tr>`;
  return renderShell({
    title: `Versions ${fixtureId}`,
    snapshot,
    body: `<p class="muted">版本列表：${escapeHtml(fixtureId)}</p><div class="card"><h3>Versions</h3><table><thead><tr><th>version</th><th>status</th><th>reviewer</th><th>approver</th><th>registeredAt</th><th>action</th></tr></thead><tbody>${rows}</tbody></table></div>`,
  });
}

function versionDetailPage(fixtureId, version, { snapshot = latestSnapshot() } = {}) {
  const item = listVersionsForFixture(fixtureId).find((entry) => entry.version === version)?.item || null;
  const body = item
    ? `<p class="muted">单版本详情：${escapeHtml(fixtureId)} @ ${escapeHtml(version)}</p><div class="card"><pre>${escapeHtml(JSON.stringify(item, null, 2))}</pre></div>`
    : `<p class="muted">未找到版本 ${escapeHtml(version)}</p>`;
  return renderShell({
    title: `Version detail ${fixtureId}@${version}`,
    snapshot,
    body,
  });
}

function installShellPage({ snapshot = latestSnapshot() }) {
  return renderShell({
    title: 'Install',
    snapshot,
    body: `<p class="muted">最小 install 入口：POST /api/install 或脚本 scripts/install-skill.mjs。</p><div class="card"><h3>Install</h3><p>支持 fixtureId + version，写入 registry-store 后可通过 versions/detail 查询。</p></div>`,
  });
}

function homePage({ query = {}, actionResult = null, snapshot = latestSnapshot() }) {
  const qFixture = escapeHtml(query.fixtureId || 'demo-v1');
  const qMode = escapeHtml(query.mode || 'operate');
  const emptyHint = snapshot.kind === 'empty' ? '<p class="muted">空态：尚未触发 replay / operate。</p>' : '';
  return renderShell({
    title: 'Home',
    snapshot,
    actionResult,
    body: `
      <div class="row" style="margin-top:12px">
        <form method="POST" action="/action" class="row">
          <input name="fixtureId" value="${qFixture}" placeholder="fixtureId" />
          <select name="mode"><option value="replay" ${qMode==='replay'?'selected':''}>replay</option><option value="operate" ${qMode==='operate'?'selected':''}>operate</option></select>
          <button name="intent" value="replay">Replay</button>
          <button name="intent" value="operate">Operate</button>
        </form>
      </div>
      ${emptyHint}
      <div class="grid">
        <div class="card"><h3>Replay / Operate 入口</h3><p class="muted">Replay 直连 run-runtime-draft.mjs；Operate 直连 skillforge-operate.mjs。</p></div>
        <div class="card"><h3>现有状态源</h3><p class="muted">transcript-store / execution-log-store 作为事实源。</p></div>
      </div>
      <div class="card"><h3>导航</h3><a class="nav" href="/history">去 execution history</a></div>
    `,
  });
}

function historyPage({ snapshot = latestSnapshot() }) {
  const historyItems = normalizeHistoryItems();
  const historyRows = historyItems.length
    ? historyItems.map((item) => `<tr><td>${escapeHtml(item.time || '-')}</td><td>${escapeHtml(item.fixtureId)}</td><td>${escapeHtml(item.status)}</td><td>${escapeHtml(item.source)}</td></tr>`).join('')
    : `<tr><td colspan="4" class="muted">暂无 execution log</td></tr>`;
  return renderShell({
    title: 'Execution history',
    snapshot,
    body: `
      <p class="muted">展示最近 execution log 列表。</p>
      <div class="card"><h3>Execution log 列表</h3><table><thead><tr><th>timestamp</th><th>fixtureId</th><th>status</th><th>source</th></tr></thead><tbody>${historyRows}</tbody></table></div>
    `,
  });
}

function transcriptsPage({ snapshot = latestSnapshot() }) {
  const transcriptItems = normalizeTranscriptItems();
  const transcriptRows = transcriptItems.length
    ? transcriptItems.map((item) => `<tr><td>${escapeHtml(item.caseId)}</td><td>${escapeHtml(item.fixtureId)}</td><td>${escapeHtml(item.provider)}</td><td>${escapeHtml(item.model)}</td><td>${escapeHtml(item.status)}</td><td>${escapeHtml(item.timestamp || '-')}</td></tr>`).join('')
    : `<tr><td colspan="6" class="muted">暂无 transcript</td></tr>`;
  return renderShell({
    title: 'Transcripts',
    snapshot,
    body: `
      <p class="muted">展示 transcript 列表。</p>
      <div class="card"><h3>Transcript 列表</h3><table><thead><tr><th>caseId</th><th>fixtureId</th><th>provider</th><th>model</th><th>status</th><th>timestamp</th></tr></thead><tbody>${transcriptRows}</tbody></table></div>
    `,
  });
}

function parseForm(body) {
  const out = {};
  for (const part of body.split('&')) {
    const [k, v = ''] = part.split('=');
    if (!k) continue;
    out[decodeURIComponent(k.replace(/\+/g, ' '))] = decodeURIComponent(v.replace(/\+/g, ' '));
  }
  return out;
}

async function parseJsonBody(req) {
  let body = '';
  for await (const chunk of req) body += chunk;
  if (!body.trim()) return {};
  return JSON.parse(body);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === 'GET' && url.pathname === '/') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(homePage({ query: Object.fromEntries(url.searchParams) }));
    return;
  }
  if (req.method === 'GET' && url.pathname === '/transcripts') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(transcriptsPage({ snapshot: latestSnapshot() }));
    return;
  }
  if (req.method === 'GET' && url.pathname === '/registry') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(registryPage({ snapshot: latestSnapshot() }));
    return;
  }
  if (req.method === 'GET' && url.pathname === '/install') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(installShellPage({ snapshot: latestSnapshot() }));
    return;
  }
  if (req.method === 'POST' && url.pathname === '/action') {
    let body = '';
    for await (const chunk of req) body += chunk;
    const form = parseForm(body);
    const fixtureId = form.fixtureId || 'demo-v1';
    const intent = form.intent || 'operate';
    const mode = form.mode || 'dry-run';

    try {
      let actionResult;
      if (intent === 'replay') {
        const child = await runNodeScript(resolve(__dirname, 'run-runtime-draft.mjs'), [fixtureId, '--mode', mode, '--format', 'json']);
        const payload = parseJsonFromOutput(child.stdout) || { stdout: child.stdout, stderr: child.stderr };
        actionResult = createShellResult({ kind: 'replay', intent, fixtureId, mode, statusCode: child.statusCode, stdout: child.stdout, stderr: child.stderr, payload });
      } else if (intent === 'operate') {
        const child = await runNodeScript(resolve(__dirname, 'skillforge-operate.mjs'), ['--fixture-id', fixtureId]);
        actionResult = createShellResult({ kind: 'operate', intent, fixtureId, mode, statusCode: child.statusCode, stdout: child.stdout, stderr: child.stderr, payload: { fixtureId, stdout: summarizeText(child.stdout), stderr: summarizeText(child.stderr) } });
      } else {
        actionResult = createShellResult({ kind: 'error', intent, fixtureId, mode, statusCode: 2, stdout: '', stderr: `Unsupported intent: ${intent}`, error: `Unsupported intent: ${intent}` });
      }
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(homePage({ query: form, actionResult, snapshot: latestSnapshot() }));
      return;
    } catch (error) {
      const actionResult = createShellResult({ kind: 'error', intent, fixtureId, mode, statusCode: 1, stdout: '', stderr: error?.stack || error?.message || String(error), error: error?.message || String(error) });
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(homePage({ query: form, actionResult, snapshot: latestSnapshot() }));
      return;
    }
  }
  if (req.method === 'POST' && url.pathname === '/api/registry/publish') {
    try {
      const input = await parseJsonBody(req);
      const publishPrep = input.publishPrep && typeof input.publishPrep === 'object'
        ? input.publishPrep
        : input;
      const registryInputs = input.registryInputs && typeof input.registryInputs === 'object'
        ? input.registryInputs
        : {};
      const reviewer = input.reviewer ?? registryInputs.reviewer ?? input.reviewers?.[0] ?? null;
      const approver = input.approver ?? registryInputs.approver ?? input.approvers?.[0] ?? null;
      const normalizedPublishPrep = publishPrep.kind === 'publish-prep'
        ? publishPrep
        : {
            kind: 'publish-prep',
            reviewRecordRef: publishPrep.reviewRecordRef ?? {
              fixtureId: publishPrep.fixtureId ?? input.fixtureId ?? input.id ?? 'publish-demo',
              reviewDecision: publishPrep.reviewDecision?.decision ?? input.reviewDecision?.decision ?? input.reviewDecision ?? 'approved',
              reviewUpdatedAt: publishPrep.reviewUpdatedAt ?? input.reviewUpdatedAt ?? new Date().toISOString(),
            },
            provenance: publishPrep.provenance && typeof publishPrep.provenance === 'object'
              ? publishPrep.provenance
              : {
                  preparedAt: publishPrep.preparedAt ?? input.preparedAt ?? new Date().toISOString(),
                  evidenceRefs: Array.isArray(publishPrep.evidenceRefs)
                    ? publishPrep.evidenceRefs
                    : Array.isArray(input.evidenceRefs)
                      ? input.evidenceRefs
                      : [],
                  sourceLinks: Array.isArray(publishPrep.sourceLinks)
                    ? publishPrep.sourceLinks
                    : Array.isArray(input.sourceLinks)
                      ? input.sourceLinks
                      : [],
                },
          };
      const entry = createRegistryEntry(normalizedPublishPrep, { ...registryInputs, reviewer, approver });
      const persisted = saveRegistryEntry({
        ...entry,
        reviewer,
        approver,
        registryMeta: {
          ...entry.registryMeta,
          reviewer,
          approver,
        },
      });
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, entry: { ...entry, reviewer, approver, registryMeta: { ...entry.registryMeta, reviewer, approver } }, persisted, reviewer, approver }, null, 2));
      return;
    } catch (error) {
      res.writeHead(400, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }, null, 2));
      return;
    }
  }
  if (req.method === 'POST' && url.pathname === '/api/registry/skills/rollback') {
    try {
      const input = await parseJsonBody(req);
      const fixtureId = input.fixtureId || input.id || 'demo-v1';
      const result = restoreRegistryEntryById(fixtureId);
      const items = listRegistryEntries().filter((entry) => entry.fixtureId === fixtureId);
      const latest = items.at(-1) || null;
      const previous = items.at(-2) || null;
      res.writeHead(result.ok ? 200 : 409, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: result.ok, fixtureId, result, latest, previous }, null, 2));
      return;
    } catch (error) {
      res.writeHead(400, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }, null, 2));
      return;
    }
  }
  if (req.method === 'POST' && url.pathname === '/api/install') {
    try {
      const input = await parseJsonBody(req);
      const fixtureId = input.fixtureId || input.id || 'demo-v1';
      const version = input.version || '0.1.0';
      const child = await runNodeScript(resolve(__dirname, 'install-skill.mjs'), ['--fixture-id', fixtureId, '--version', version]);
      const payload = parseJsonFromOutput(child.stdout) || { stdout: child.stdout, stderr: child.stderr };
      res.writeHead(child.statusCode === 0 ? 200 : 400, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: child.statusCode === 0, fixtureId, version, statusCode: child.statusCode, payload }, null, 2));
      return;
    } catch (error) {
      res.writeHead(400, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }, null, 2));
      return;
    }
  }
  if (req.method === 'GET' && url.pathname === '/api/registry/versions') {
    const items = listRegistryEntries().map((item) => ({ fixtureId: item.fixtureId, version: item.version || 'unknown', status: item.registryMeta?.status || 'unknown', registeredAt: item.registryMeta?.registeredAt || null, reviewer: item.reviewer || item.registryMeta?.reviewer || null, approver: item.approver || item.registryMeta?.approver || null }));
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, items }, null, 2));
    return;
  }
  if (req.method === 'GET' && url.pathname.startsWith('/api/registry/skills/') && url.pathname.endsWith('/versions')) {
    const fixtureId = decodeURIComponent(url.pathname.slice('/api/registry/skills/'.length, -'/versions'.length));
    const items = listVersionsForFixture(fixtureId).map(({ item, ...rest }) => rest);
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, fixtureId, items }, null, 2));
    return;
  }
  if (req.method === 'GET' && url.pathname.startsWith('/api/registry/skills/') && url.pathname.includes('/versions/')) {
    const suffix = url.pathname.slice('/api/registry/skills/'.length);
    const [fixtureIdPart, ...rest] = suffix.split('/versions/');
    const fixtureId = decodeURIComponent(fixtureIdPart);
    const version = decodeURIComponent(rest.join('/versions/'));
    const item = listVersionsForFixture(fixtureId).find((entry) => entry.version === version) || null;
    if (!item) {
      res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: 'Not found', fixtureId, version }, null, 2));
      return;
    }
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, fixtureId, version, item }, null, 2));
    return;
  }
  if (req.method === 'GET' && url.pathname === '/api/registry/skills') {
    const items = listRegistryEntries();
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, items }, null, 2));
    return;
  }
  if (req.method === 'GET' && url.pathname === '/api/status') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, snapshot: latestSnapshot() }, null, 2));
    return;
  }
  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('Not found');
});

server.listen(PORT, HOST, () => {
  console.log(`SkillForge Web UI listening on http://${HOST}:${PORT}`);
});