#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, openSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';

const REPO_ROOT = process.cwd();
const STORE_DIR = path.join(homedir(), '.skillforge');
const RUNTIME_DIR = path.join(homedir(), '.openclaw', 'runtime');
const PID_PATH = path.join(STORE_DIR, 'skillforge-admin.pid');
const LOG_PATH = path.join(RUNTIME_DIR, 'skillforge-admin.log');
const PORT = Number(process.env.SKILLFORGE_ADMIN_PORT || 4318);
const HOST = process.env.SKILLFORGE_ADMIN_HOST || '0.0.0.0';
const SERVER_ENTRY = path.join(REPO_ROOT, 'scripts', 'skillforge-admin-server.mjs');

function ensureDir(dirPath) {
  if (!existsSync(dirPath)) mkdirSync(dirPath, { recursive: true });
}

function readPid() {
  if (!existsSync(PID_PATH)) return null;
  const raw = readFileSync(PID_PATH, 'utf8').trim();
  const pid = Number(raw);
  return Number.isInteger(pid) && pid > 0 ? pid : null;
}

function isPidRunning(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function cleanupPidFileIfStale() {
  const pid = readPid();
  if (pid && !isPidRunning(pid)) {
    rmSync(PID_PATH, { force: true });
  }
}

async function healthcheck() {
  const response = await fetch(`http://127.0.0.1:${PORT}/api/health`, {
    headers: { accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`healthcheck failed with status ${response.status}`);
  }
  return response.json();
}

async function start() {
  cleanupPidFileIfStale();
  const currentPid = readPid();
  if (currentPid && isPidRunning(currentPid)) {
    console.log(JSON.stringify({ ok: true, status: 'already-running', pid: currentPid, url: `http://127.0.0.1:${PORT}` }));
    return;
  }

  ensureDir(STORE_DIR);
  ensureDir(RUNTIME_DIR);

  const stdoutFd = openSync(LOG_PATH, 'a');
  const stderrFd = openSync(LOG_PATH, 'a');
  const child = spawn(process.execPath, [SERVER_ENTRY], {
    cwd: REPO_ROOT,
    detached: true,
    stdio: ['ignore', stdoutFd, stderrFd],
    env: {
      ...process.env,
      SKILLFORGE_ADMIN_PORT: String(PORT),
      SKILLFORGE_ADMIN_HOST: HOST,
    },
  });

  child.unref();
  writeFileSync(PID_PATH, `${child.pid}\n`, 'utf8');

  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (!isPidRunning(child.pid)) {
      throw new Error(`admin server exited during startup; see ${LOG_PATH}`);
    }
    try {
      const payload = await healthcheck();
      console.log(JSON.stringify({ ok: true, status: 'started', pid: child.pid, health: payload, log: LOG_PATH }));
      return;
    } catch {
      await delay(500);
    }
  }

  throw new Error(`admin server did not become healthy on port ${PORT}; see ${LOG_PATH}`);
}

function stop() {
  cleanupPidFileIfStale();
  const pid = readPid();
  if (!pid) {
    console.log(JSON.stringify({ ok: true, status: 'stopped', pid: null }));
    return;
  }

  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    rmSync(PID_PATH, { force: true });
    console.log(JSON.stringify({ ok: true, status: 'stopped', pid: null }));
    return;
  }

  rmSync(PID_PATH, { force: true });
  console.log(JSON.stringify({ ok: true, status: 'stopped', pid }));
}

async function status() {
  cleanupPidFileIfStale();
  const pid = readPid();
  if (!pid || !isPidRunning(pid)) {
    console.log(JSON.stringify({ ok: true, status: 'stopped', pid: null }));
    return;
  }

  let health = null;
  try {
    health = await healthcheck();
  } catch (error) {
    health = { ok: false, error: error.message };
  }

  console.log(JSON.stringify({
    ok: true,
    status: 'running',
    pid,
    port: PORT,
    host: HOST,
    health,
    log: LOG_PATH,
  }));
}

async function main() {
  const command = process.argv[2] || 'status';
  if (command === 'start') return start();
  if (command === 'stop') return stop();
  if (command === 'restart') {
    stop();
    await delay(400);
    return start();
  }
  if (command === 'status') return status();

  console.error('Usage: node scripts/skillforge-admin-daemon.mjs <start|stop|restart|status>');
  process.exit(1);
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: error.message,
    pidPath: PID_PATH,
    log: LOG_PATH,
  }));
  process.exit(1);
});
