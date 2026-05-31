import { createServer } from 'node:http';
import { existsSync, createReadStream } from 'node:fs';
import { networkInterfaces } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getAdminOverview,
  listAdminSkills,
  listAdminRuns,
  getSkillDetails,
  getRunDetails,
} from '../src/skillforge/admin-data.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(__dirname, '../web/admin');
const PORT = Number(process.env.SKILLFORGE_ADMIN_PORT || 4318);
const HOST = process.env.SKILLFORGE_ADMIN_HOST || '0.0.0.0';
const STARTED_AT = new Date().toISOString();

const MIME_TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'application/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
]);

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(payload));
}

function sendNotFound(res) {
  sendJson(res, 404, { error: 'Not found' });
}

function safeDecode(value = '') {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function listLanAddresses() {
  const interfaces = networkInterfaces();
  const addresses = [];
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries || []) {
      if (!entry || entry.internal) continue;
      if (entry.family !== 'IPv4') continue;
      addresses.push(entry.address);
    }
  }
  return [...new Set(addresses)];
}

function serveStatic(res, requestPath) {
  const normalizedPath = requestPath === '/' ? '/index.html' : requestPath;
  const filePath = path.join(WEB_ROOT, normalizedPath.replace(/^\/+/, ''));
  if (!filePath.startsWith(WEB_ROOT) || !existsSync(filePath)) return false;

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    'Content-Type': MIME_TYPES.get(ext) || 'application/octet-stream',
    'Cache-Control': ext === '.html' ? 'no-store' : 'public, max-age=300',
  });
  createReadStream(filePath).pipe(res);
  return true;
}

function handleApi(req, res, pathname) {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  if (pathname === '/api/overview') {
    sendJson(res, 200, getAdminOverview());
    return;
  }

  if (pathname === '/api/health') {
    sendJson(res, 200, {
      ok: true,
      host: HOST,
      port: PORT,
      startedAt: STARTED_AT,
      now: new Date().toISOString(),
    });
    return;
  }

  if (pathname === '/api/skills') {
    sendJson(res, 200, listAdminSkills());
    return;
  }

  if (pathname.startsWith('/api/skills/')) {
    const id = safeDecode(pathname.slice('/api/skills/'.length));
    const skill = getSkillDetails(id);
    if (!skill) return sendNotFound(res);
    sendJson(res, 200, skill);
    return;
  }

  if (pathname === '/api/runs') {
    sendJson(res, 200, { runs: listAdminRuns() });
    return;
  }

  if (pathname.startsWith('/api/runs/')) {
    const runId = safeDecode(pathname.slice('/api/runs/'.length));
    const run = getRunDetails(runId);
    if (!run) return sendNotFound(res);
    sendJson(res, 200, run);
    return;
  }

  sendNotFound(res);
}

const server = createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || `127.0.0.1:${PORT}`}`);
  const pathname = url.pathname;

  if (pathname.startsWith('/api/')) {
    try {
      handleApi(req, res, pathname);
    } catch (error) {
      sendJson(res, 500, {
        error: error?.message || 'Internal server error',
        code: error?.code || 'ADMIN_SERVER_ERROR',
      });
    }
    return;
  }

  if (serveStatic(res, pathname)) return;
  if (serveStatic(res, '/index.html')) return;
  sendNotFound(res);
});

server.listen(PORT, HOST, () => {
  const urls = [`http://127.0.0.1:${PORT}`];
  for (const address of listLanAddresses()) {
    urls.push(`http://${address}:${PORT}`);
  }
  console.log(`SkillForge admin ready on ${HOST}:${PORT}`);
  for (const url of urls) {
    console.log(`- ${url}`);
  }
});

process.on('uncaughtException', (error) => {
  console.error('[skillforge-admin] uncaughtException', error);
  process.exitCode = 1;
});

process.on('unhandledRejection', (error) => {
  console.error('[skillforge-admin] unhandledRejection', error);
  process.exitCode = 1;
});
