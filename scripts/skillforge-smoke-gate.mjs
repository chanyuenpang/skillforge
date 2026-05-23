#!/usr/bin/env node
/**
 * skillforge-smoke-gate.mjs — Minimal launch gate for SkillForge delivery
 *
 * Purpose:
 *   Run the existing status and operator entrypoints, collect exit codes,
 *   and print a single launch verdict for the smallest possible smoke gate.
 *
 * Usage:
 *   node scripts/skillforge-smoke-gate.mjs
 */

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');
const statusScript = resolve(__dirname, 'skillforge-status.mjs');
const operateScript = resolve(__dirname, 'skillforge-operate.mjs');

function runStep(name, scriptPath) {
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: projectRoot,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });

  return {
    name,
    scriptPath,
    status: result.status ?? 1,
    signal: result.signal ?? null,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    ok: (result.status ?? 1) === 0,
  };
}

function printSection(title) {
  console.log(`\n═══ ${title} ═══`);
}

function preview(text, maxLines = 20) {
  const lines = String(text || '').trimEnd().split('\n');
  if (lines.length <= maxLines) return lines.join('\n');
  return [...lines.slice(0, maxLines), `... (${lines.length - maxLines} more lines)`].join('\n');
}

function main() {
  console.log('SkillForge Smoke Gate');
  console.log(`Generated: ${new Date().toISOString()}`);
  console.log(`Entry: ${__filename}`);

  const steps = [
    runStep('status', statusScript),
    runStep('operate', operateScript),
  ];

  for (const step of steps) {
    printSection(step.name.toUpperCase());
    console.log(`script: ${step.scriptPath}`);
    console.log(`exit: ${step.status}${step.signal ? ` signal=${step.signal}` : ''}`);
    console.log(`result: ${step.ok ? 'PASS' : 'FAIL'}`);
    if (step.stdout.trim()) {
      console.log('\n-- stdout preview --');
      console.log(preview(step.stdout));
    }
    if (step.stderr.trim()) {
      console.log('\n-- stderr preview --');
      console.log(preview(step.stderr));
    }
  }

  const passed = steps.filter(s => s.ok).length;
  const failed = steps.length - passed;

  printSection('SUMMARY');
  console.log(`checked: ${steps.length}`);
  console.log(`passed: ${passed}`);
  console.log(`failed: ${failed}`);
  console.log(`entries: status + operate`);

  const allOk = failed === 0;
  console.log(`\nSMOKE GATE: ${allOk ? 'PASS' : 'FAIL'}`);
  process.exitCode = allOk ? 0 : 1;
}

main();
