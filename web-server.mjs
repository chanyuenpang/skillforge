#!/usr/bin/env node
/**
 * SkillForge Web API Server — Task 7
 *
 * Wraps the existing skillforge domain stores (risk, review, approval, gating)
 * behind a minimal REST API for the React frontend.
 *
 * Run: node web-server.mjs
 * Default port: 4173 (env PORT overrides)
 */

import http from 'node:http';
import crypto from 'node:crypto';

// ── Domain imports ──
import { loadEventsByFixtureId } from './src/skillforge/risk-store.mjs';
import {
  loadReviewEvents,
  getReviewState,
} from './src/skillforge/review-store.mjs';
import { loadById as loadPrepById } from './src/skillforge/prep-store.mjs';
import { loadById as loadRegistryById } from './src/skillforge/registry-store.mjs';
import {
  loadApprovalEvents,
  getApprovalState,
  requestApproval,
  grantApproval,
  denyApproval,
  evaluateRunApprovalGate,
} from './src/skillforge/approval-store.mjs';
import { homedir } from 'node:os';
import { existsSync, readFileSync, createReadStream, statSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import {
  list as listExecLog,
  loadById as loadExecById,
  count as countExec,
  save as saveExecLog,
  buildExecutionLogEntry,
} from './src/skillforge/execution-log-store.mjs';
import { loadLatestExecution } from './src/skillforge/execution-record-store.mjs';
import { loadRawArtifactById } from './src/skillforge/raw-artifact-store.mjs';
import { buildBetterWorkflowRunCenterView } from './src/skillforge/betterworkflow-run-center-view.mjs';
import { buildBetterPromptRunCenterView } from './src/skillforge/betterprompt-run-center-view.mjs';
import { buildSkillBundleRunCenterView } from './src/skillforge/skill-bundle-run-center-view.mjs';
import {
  buildPlanLogEntry,
  save as savePlanLog,
  recent as listRecentPlans,
  loadById as loadPlanLogById,
} from './src/skillforge/plan-log-store.mjs';
import { list as listTranscripts, save as saveTranscript } from './src/skillforge/transcript-store.mjs';
import {
  initiateTaskRun,
  startTaskRun,
  recordOutput,
  failTaskRun,
  completeTaskRun,
  getLineage,
  listRuns,
  countRuns,
} from './src/skillforge/task-run-store.mjs';
import { executeTask4Runtime } from './src/skillforge/task4-runtime.mjs';
import { extname, resolve, dirname, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || '0.0.0.0';
const MAX_BODY_BYTES = 1024 * 1024; // 1MB
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_BATCH_ITEMS = 100;

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  console.error(`[boot] Invalid PORT: ${process.env.PORT}. Must be an integer in [1, 65535].`);
  process.exit(1);
}
if (!HOST || typeof HOST !== 'string') {
  console.error('[boot] Invalid HOST: must be a non-empty string.');
  process.exit(1);
}

// ── MIME types for static serving ──
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// ── Helpers ──
function getRequestId(req) {
  const incoming = req.headers['x-request-id'];
  if (typeof incoming === 'string' && incoming.trim()) return incoming.trim();
  if (Array.isArray(incoming) && incoming[0] && incoming[0].trim()) return incoming[0].trim();
  return crypto.randomUUID();
}

function json(res, data, status = 200, requestId = null) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8' };
  if (requestId) headers['X-Request-Id'] = requestId;
  const body = JSON.stringify(data);
  headers['Content-Length'] = Buffer.byteLength(body);
  res.writeHead(status, headers);
  if ((res.locals?.method || 'GET') === 'HEAD') return res.end();
  res.end(body);
}

function apiSuccess(data = {}) {
  return {
    ok: true,
    data,
    error: null,
  };
}

function apiError(code, message, details = null, retryable = false, requestId = null) {
  return {
    ok: false,
    data: null,
    error: {
      code,
      message,
      details,
      retryable,
      traceId: requestId,
    },
  };
}

function sendError(res, status, code, message, details = null, retryable = false) {
  return json(res, apiError(code, message, details, retryable, res.locals?.requestId || null), status, res.locals?.requestId || null);
}

function parseBody(req, res) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];

    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        const err = new Error('Request body too large');
        err.code = 'PAYLOAD_TOO_LARGE';
        req.destroy(err);
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        const parsed = raw ? JSON.parse(raw) : {};
        resolve(parsed);
      } catch {
        const err = new Error('Invalid JSON body');
        err.code = 'INVALID_JSON';
        reject(err);
      }
    });

    req.on('error', (err) => {
      if (err?.code === 'PAYLOAD_TOO_LARGE') {
        sendError(res, 413, 'PAYLOAD_TOO_LARGE', 'Request body exceeds 1MB limit', { maxBytes: MAX_BODY_BYTES }, false);
        return resolve(null);
      }
      reject(err);
    });
  });
}

function validateBatchItems(body) {
  if (body && Array.isArray(body.items) && body.items.length > MAX_BATCH_ITEMS) {
    const err = new Error(`items must not exceed ${MAX_BATCH_ITEMS}`);
    err.code = 'BATCH_LIMIT_EXCEEDED';
    err.status = 400;
    err.details = { limit: MAX_BATCH_ITEMS, actual: body.items.length };
    throw err;
  }
}


function adminApiEnvelope(data = null, meta = null) {
  return { ok: true, data, meta: meta || null, error: null };
}

function adminApiError(code, message, details = null, retryable = false) {
  return { ok: false, data: null, meta: null, error: { code, message, details, retryable } };
}

function normalizeLimit(value, fallback = 20, max = 100) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(n, max);
}

function loadTaskCatalog() {
  return {
    overview: {
      stage: 'I',
      status: 'implemented',
      note: 'Minimal read-only aggregation API base',
    },
    plans: [
      { planId: 'plan-001', title: 'Phase I read-only aggregation', status: 'done' },
    ],
    planDetails: {
      'plan-001': {
        planId: 'plan-001',
        title: 'Phase I read-only aggregation',
        scope: ['overview', 'plans', 'plan detail', 'executions', 'changes', 'updates'],
      },
    },
    executions: [
      { executionId: 'exec-001', status: 'done', summary: 'API base wired into web-server.mjs' },
    ],
    changes: [
      { changeId: 'chg-001', path: 'web-server.mjs', type: 'modified' },
    ],
    updates: [
      { updateId: 'upd-001', message: 'Read-only admin API added', at: new Date().toISOString() },
    ],
  };
}

function getAdminResource(pathname) {
  const catalog = loadTaskCatalog();
  if (pathname === '/api/admin/overview') return { resource: 'overview', payload: catalog.overview };
  if (pathname === '/api/admin/plans') return { resource: 'plans', payload: catalog.plans };
  const planMatch = pathname.match(/^\/api\/admin\/plans\/([^/]+)$/);
  if (planMatch) {
    const planId = decodeURIComponent(planMatch[1]);
    return { resource: 'planDetail', payload: catalog.planDetails[planId] || null, planId };
  }
  if (pathname === '/api/admin/executions') return { resource: 'executions', payload: catalog.executions };
  const execMatch = pathname.match(/^\/api\/admin\/executions\/([^/]+)$/);
  if (execMatch) return { resource: 'executionDetail', payload: catalog.executions.find((item) => item.executionId === decodeURIComponent(execMatch[1])) || null };
  if (pathname === '/api/admin/changes') return { resource: 'changes', payload: catalog.changes };
  if (pathname === '/api/admin/updates') return { resource: 'updates', payload: catalog.updates };
  return null;
}

function matchRoute(method, pathname) {
  if (method === 'GET' && pathname === '/api/admin/overview') return 'adminOverview';
  if (method === 'GET' && pathname === '/api/admin/plans') return 'adminPlans';
  const adminPlanDetailMatch = pathname.match(/^\/api\/admin\/plans\/([^/]+)$/);
  if (method === 'GET' && adminPlanDetailMatch) return { route: 'adminPlanDetail', planId: decodeURIComponent(adminPlanDetailMatch[1]) };
  if (method === 'GET' && pathname === '/api/admin/executions') return 'adminExecutions';
  const adminExecDetailMatch = pathname.match(/^\/api\/admin\/executions\/([^/]+)$/);
  if (method === 'GET' && adminExecDetailMatch) return { route: 'adminExecutionDetail', executionId: decodeURIComponent(adminExecDetailMatch[1]) };
  if (method === 'GET' && pathname === '/api/admin/changes') return 'adminChanges';
  if (method === 'GET' && pathname === '/api/admin/updates') return 'adminUpdates';
  if (method === 'GET' && pathname === '/api/knowledge-assets') return 'knowledgeAssetsList';

  const knowledgeAssetDetailMatch = pathname.match(/^\/api\/knowledge-assets\/([^/]+)$/);
  if (method === 'GET' && knowledgeAssetDetailMatch) return { route: 'knowledgeAssetDetail', assetId: decodeURIComponent(knowledgeAssetDetailMatch[1]) };

  // GET /api/approvals/queue
  if (method === 'GET' && pathname === '/api/approvals/queue') return 'approvalQueue';

  // GET /api/history
  if (method === 'GET' && pathname === '/api/history') return 'historyList';

  // GET /api/history/:fixtureId
  const historyDetailMatch = pathname.match(/^\/api\/history\/(.+)$/);
  if (method === 'GET' && historyDetailMatch) return { route: 'historyDetail', fixtureId: decodeURIComponent(historyDetailMatch[1]) };

  // GET /api/approvals/:fixtureId
  const approvalDetailMatch = pathname.match(/^\/api\/approvals\/(.+)$/);
  if (method === 'GET' && approvalDetailMatch) return { route: 'approvalDetail', fixtureId: decodeURIComponent(approvalDetailMatch[1]) };

  // POST /api/approvals/request
  if (method === 'POST' && pathname === '/api/approvals/request') return 'request';
  // POST /api/approvals/grant
  if (method === 'POST' && pathname === '/api/approvals/grant') return 'grant';
  // POST /api/approvals/deny
  if (method === 'POST' && pathname === '/api/approvals/deny') return 'deny';

  // GET /api/fixtures/:fixtureId/summary
  const fixtureSummaryMatch = pathname.match(/^\/api\/fixtures\/(.+)\/summary$/);
  if (method === 'GET' && fixtureSummaryMatch) return { route: 'fixtureSummary', fixtureId: decodeURIComponent(fixtureSummaryMatch[1]) };

  // GET /api/run-center/summary
  if (method === 'GET' && pathname === '/api/run-center/summary') return 'runCenterSummary';

  // POST /api/run-center/runs
  if (method === 'POST' && pathname === '/api/run-center/runs') return 'runCenterRunCreate';

  // GET /api/run-center/runs
  if (method === 'GET' && pathname === '/api/run-center/runs') return 'runCenterRuns';

  // GET /api/run-center/runs/:runId/artifacts
  const runArtifactsMatch = pathname.match(/^\/api\/run-center\/runs\/([^/]+)\/artifacts$/);
  if (method === 'GET' && runArtifactsMatch) return { route: 'runCenterArtifacts', runId: decodeURIComponent(runArtifactsMatch[1]) };

  // GET /api/run-center/runs/:runId
  const runDetailMatch = pathname.match(/^\/api\/run-center\/runs\/([^/]+)$/);
  if (method === 'GET' && runDetailMatch) return { route: 'runCenterDetail', runId: decodeURIComponent(runDetailMatch[1]) };

  // POST /api/plan-log
  if (method === 'POST' && pathname === '/api/plan-log') return 'planLogCreate';

  // POST /api/plans — create a plan record
  if (method === 'POST' && pathname === '/api/plans') return 'planCreate';

  // GET /api/plan-center/plans — list recent plans
  if (method === 'GET' && pathname === '/api/plan-center/plans') return 'planCenterList';

  // ── Task Run (M4 end-to-end loop) ──
  // POST /api/tasks/runs — initiate (idempotent)
  if (method === 'POST' && pathname === '/api/tasks/runs') return 'taskRunInitiate';
  // GET /api/tasks/runs — list runs
  if (method === 'GET' && pathname === '/api/tasks/runs') return 'taskRunList';
  // GET /api/tasks/runs/:taskRunId — full lineage
  const taskRunDetailMatch = pathname.match(/^\/api\/tasks\/runs\/([^/]+)$/);
  if (method === 'GET' && taskRunDetailMatch) return { route: 'taskRunDetail', taskRunId: decodeURIComponent(taskRunDetailMatch[1]) };
  // POST /api/tasks/runs/:taskRunId/start — start execution
  const taskRunStartMatch = pathname.match(/^\/api\/tasks\/runs\/([^/]+)\/start$/);
  if (method === 'POST' && taskRunStartMatch) return { route: 'taskRunStart', taskRunId: decodeURIComponent(taskRunStartMatch[1]) };
  // POST /api/tasks/runs/:taskRunId/complete — complete execution
  const taskRunCompleteMatch = pathname.match(/^\/api\/tasks\/runs\/([^/]+)\/complete$/);
  if (method === 'POST' && taskRunCompleteMatch) return { route: 'taskRunComplete', taskRunId: decodeURIComponent(taskRunCompleteMatch[1]) };
  // POST /api/tasks/runs/:taskRunId/fail — mark failure
  const taskRunFailMatch = pathname.match(/^\/api\/tasks\/runs\/([^/]+)\/fail$/);
  if (method === 'POST' && taskRunFailMatch) return { route: 'taskRunFail', taskRunId: decodeURIComponent(taskRunFailMatch[1]) };
  // POST /api/tasks/runs/:taskRunId/output — record output
  const taskRunOutputMatch = pathname.match(/^\/api\/tasks\/runs\/([^/]+)\/output$/);
  if (method === 'POST' && taskRunOutputMatch) return { route: 'taskRunOutput', taskRunId: decodeURIComponent(taskRunOutputMatch[1]) };

  return null;
}

// ── Business logic ──

function listAllFixtureIds() {
  const riskPath = `${homedir()}/.skillforge/risk-store.jsonl`;
  if (!existsSync(riskPath)) return [];
  const raw = readFileSync(riskPath, 'utf8').trim();
  if (!raw) return [];
  const ids = new Set();
  raw.split('\n').filter(Boolean).forEach((line) => {
    try {
      const o = JSON.parse(line);
      if (o.fixtureId) ids.add(o.fixtureId);
    } catch { /* skip */ }
  });
  return [...ids];
}

function getRiskLabel(riskType) {
  const map = {
    code_change: '代码变更',
    data_access: '数据访问',
    privilege_escalation: '权限提升',
    dependency_change: '依赖变更',
    destructive_operation: '破坏性操作',
  };
  if (!riskType) return null;
  return map[riskType] || riskType;
}

function formatFixtureReadableName(fixtureId) {
  if (!fixtureId || typeof fixtureId !== 'string') return '未知任务';
  const normalized = fixtureId
    .replace(/^fixtures\//, '')
    .replace(/^fixture[-_]/i, '')
    .replace(/^skill[-_]/i, '')
    .replace(/[_-]+/g, ' ')
    .trim();
  if (!normalized) return fixtureId;
  return normalized.replace(/\b\w/g, (s) => s.toUpperCase());
}

function resolveFixturePresentation(fixtureId) {
  const fallbackTitle = formatFixtureReadableName(fixtureId);
  const assets = listKnowledgeAssets();
  const fixtureAsset = assets.find((asset) => asset.type === 'skill-fixture' && asset.sourcePath === `fixtures/${fixtureId}`);

  if (fixtureAsset) {
    return {
      skillName: fixtureAsset.title || fallbackTitle,
      title: fixtureAsset.title || fallbackTitle,
      description: fixtureAsset.description || null,
      source: fixtureAsset.sourcePath || `fixtures/${fixtureId}`,
      output: fixtureAsset.readme ? `${fixtureAsset.name}/README.md` : fixtureAsset.name,
    };
  }

  return {
    skillName: fallbackTitle,
    title: fallbackTitle,
    description: null,
    source: `fixtures/${fixtureId}`,
    output: null,
  };
}

function readableTitleFromParts(...parts) {
  for (const part of parts) {
    if (typeof part === 'string' && part.trim()) return part.trim();
  }
  return null;
}

function normalizeRiskLevel(severity) {
  const level = String(severity || '').trim().toLowerCase();
  if (!level) return 'low';
  if (['high', 'medium', 'low'].includes(level)) return level;
  return 'low';
}

function inferApprovalObjectType(item) {
  const riskType = String(item?.riskType || '').toLowerCase();
  if (riskType.includes('privilege') || riskType.includes('data_access')) return '外部访问审批';
  if (riskType) return '运行审批';
  return '技能审批';
}

function inferRunObjectType(run) {
  const source = String(run?.source || '').toLowerCase();
  if (source.includes('skill')) return '技能运行';
  if (source.includes('verify') || source.includes('validation')) return '验证运行';
  return '工作流运行';
}

function describeApprovalStatus(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'approved') return '已审批通过，可继续执行后续流程';
  if (s === 'rejected' || s === 'denied') return '审批已拒绝，当前流程保持阻断';
  return '待审批，尚未做出人工决策';
}

function describeRunStatus(status) {
  const s = String(status || '').toLowerCase();
  if (['completed', 'succeeded', 'success'].includes(s)) return '已完成，执行过程无失败步骤';
  if (['failed', 'error'].includes(s)) return '运行失败，需要检查步骤日志与错误信息';
  if (s === 'running') return '运行中，正在执行步骤链路';
  return '运行状态未知，请查看详细日志';
}

function buildRiskExplanation(level, riskType, context = 'approval') {
  const riskLabel = getRiskLabel(riskType) || '该操作';
  if (level === 'high') return `高风险：${riskLabel}会影响审批状态并改变后续是否放行执行`;
  if (level === 'medium') {
    if (context === 'run') return '中风险：该运行会穿过真实执行链路，但不会直接修改生产数据';
    return `中风险：${riskLabel}会影响运行门禁与结果记录，需人工确认`;
  }
  return '低风险：该操作主要用于验证或只读观察，对关键业务影响有限';
}

function stringifyBrief(value) {
  if (value == null) return null;
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (!keys.length) return null;
    return `围绕${keys.slice(0, 3).join('、')}等关键字段执行，并产出对应结果`;
  }
  return String(value);
}

function buildApprovalResponsibleView(item) {
  const riskLevel = normalizeRiskLevel(item?.severity);
  const title = readableTitleFromParts(item?.title, item?.skillName, formatFixtureReadableName(item?.fixtureId));
  const objectType = inferApprovalObjectType(item);
  const purpose = readableTitleFromParts(item?.summary, item?.description, `处理${title}对应的审批决策`);
  const sourceRequirement = readableTitleFromParts(item?.source, `由${item?.fixtureId || '该任务'}触发的审批需求`);
  const inputSummary = readableTitleFromParts(
    stringifyBrief(item?.input),
    `输入为审批上下文与风险信息，目标是完成${objectType}判断`,
  );
  const impactScope = ['审批状态', '风险记录', '运行门禁'];
  const riskExplanation = buildRiskExplanation(riskLevel, item?.riskType, 'approval');
  const statusNarrative = describeApprovalStatus(item?.approvalStatus || item?.status);
  const outputSummary = readableTitleFromParts(item?.output, '生成审批决策并更新历史记录');
  const resultSummary = (() => {
    const status = String(item?.approvalStatus || item?.status || '').toLowerCase();
    if (status === 'approved') return '审批已通过，后续运行可放行';
    if (status === 'rejected' || status === 'denied') return '审批已拒绝，当前运行保持阻断';
    return '当前仍待审批，尚未产生最终决策';
  })();
  const traceHint = `可继续查看关联运行、风险事件与证据锚点（fixtureId: ${item?.fixtureId || 'unknown'}）`;

  return {
    title,
    objectType,
    purpose,
    sourceRequirement,
    inputSummary,
    impactScope,
    riskLevel,
    riskExplanation,
    statusNarrative,
    outputSummary,
    resultSummary,
    traceHint,
  };
}

function buildRunResponsibleView(run) {
  const riskLevel = normalizeRiskLevel(run?.severity || run?.riskLevel);
  const title = readableTitleFromParts(run?.title, run?.summary, run?.fixtureId ? `运行：${formatFixtureReadableName(run.fixtureId)}` : null, run?.runId ? `运行记录 ${run.runId}` : null);
  const objectType = inferRunObjectType(run);
  const purpose = readableTitleFromParts(run?.summary, `执行${title}并验证流程闭环`);
  const sourceRequirement = readableTitleFromParts(run?.source, run?.fixtureId ? `由 ${run.fixtureId} 触发运行` : '由运行中心触发执行');
  const inputSummary = readableTitleFromParts(stringifyBrief(run?.input), `输入为运行参数与步骤配置，目标是完成${objectType}`);
  const impactScope = ['运行状态', '审批链路', '结果记录'];
  const riskExplanation = buildRiskExplanation(riskLevel, run?.riskType, 'run');
  const statusNarrative = describeRunStatus(run?.status);
  const outputSummary = readableTitleFromParts(stringifyBrief(run?.output), '生成执行结果、步骤记录与证据锚点');
  const resultSummary = (() => {
    const status = String(run?.status || '').toLowerCase();
    if (['completed', 'succeeded', 'success'].includes(status)) return '运行成功，输出已写入结果记录';
    if (['failed', 'error'].includes(status)) return `运行失败${run?.errorMessage ? `：${run.errorMessage}` : ''}`;
    return '运行进行中或状态待确认，请查看详情';
  })();
  const traceHint = `可查看步骤详情、审批链路与结果证据（runId: ${run?.runId || 'unknown'}）`;

  return {
    title,
    objectType,
    purpose,
    sourceRequirement,
    inputSummary,
    impactScope,
    riskLevel,
    riskExplanation,
    statusNarrative,
    outputSummary,
    resultSummary,
    traceHint,
  };
}

function buildQueueItems() {
  const fixtureIds = listAllFixtureIds();
  const items = [];

  for (const fid of fixtureIds) {
    const riskEvents = loadEventsByFixtureId(fid);
    const lastRisk = riskEvents[riskEvents.length - 1] || null;
    const reviewState = getReviewState(fid);
    const approvalState = getApprovalState(fid);
    const presentation = resolveFixturePresentation(fid);

    const queueItem = {
      fixtureId: fid,
      skillName: presentation.skillName,
      title: presentation.title,
      description: presentation.description,
      source: presentation.source,
      output: presentation.output,
      riskType: lastRisk?.riskType || null,
      riskLabel: getRiskLabel(lastRisk?.riskType || null),
      severity: lastRisk?.severity || null,
      summary: lastRisk?.summary || null,
      reviewStatus: reviewState?.status || 'idle',
      approvalStatus: approvalState?.status || 'pending',
      eventCount: loadApprovalEvents(fid).length,
      updatedAt: approvalState?.updatedAt || approvalState?.recordedAt || lastRisk?.recordedAt || '',
      trace: {
        lastEventId: approvalState?.lastEventId || null,
      },
    };
    queueItem.responsibleView = buildApprovalResponsibleView(queueItem);
    items.push(queueItem);
  }

  // Sort: pending first, then by recency
  items.sort((a, b) => {
    const aPending = a.approvalStatus === 'pending' ? 0 : 1;
    const bPending = b.approvalStatus === 'pending' ? 0 : 1;
    if (aPending !== bPending) return aPending - bPending;
    return (b.updatedAt || '').localeCompare(a.updatedAt || '');
  });

  return items;
}

function normalizeDecision(rawDecision, fallbackStatus = null) {
  const value = String(rawDecision || '').trim().toLowerCase();
  if (['approved', 'approve', 'allow', 'grant', 'granted'].includes(value)) return 'approved';
  if (['rejected', 'reject', 'deny', 'denied'].includes(value)) return 'rejected';

  const statusValue = String(fallbackStatus || '').trim().toLowerCase();
  if (['approved', 'granted'].includes(statusValue)) return 'approved';
  if (['rejected', 'denied'].includes(statusValue)) return 'rejected';
  return 'pending';
}

function normalizeHistoryItem(fixtureId) {
  const riskEvents = loadEventsByFixtureId(fixtureId);
  const reviewState = getReviewState(fixtureId);
  const approvalState = getApprovalState(fixtureId);

  // Merge execution-log data
  let execution = null;
  try {
    const execLogs = loadExecById(fixtureId);
    const latestExecLog = execLogs.length > 0 ? execLogs[execLogs.length - 1] : null;
    if (latestExecLog) {
      execution = {
        runId: latestExecLog.executionId,
        status: latestExecLog.status,
        timestamp: latestExecLog.timestamp,
        source: latestExecLog.source || null,
        durationMs: latestExecLog.durationMs ?? null,
        caseId: latestExecLog.caseId || null,
        transcriptHandle: latestExecLog.transcriptHandle || null,
        evidenceRefs: latestExecLog.evidenceRefs || null,
        steps: latestExecLog.steps || null,
      };
    }
  } catch { /* non-critical */ }

  // Merge transcript data
  let transcript = null;
  try {
    const allTranscripts = listTranscripts();
    const relatedTranscripts = allTranscripts.filter((t) => t.fixtureId === fixtureId);
    if (relatedTranscripts.length > 0) {
      transcript = {
        count: relatedTranscripts.length,
        refs: relatedTranscripts.map((t) => ({
          transcriptId: t.transcriptId,
          executionId: t.executionId ?? null,
          caseId: t.caseId ?? null,
          provider: t.provider,
          model: t.model,
          timestamp: t.timestamp,
          status: t.status,
          executionTimeMs: t.executionTimeMs,
          sourceRefs: t.sourceRefs || null,
        })),
      };
    }
  } catch { /* non-critical */ }

  // Replay-report: currently not persisted to a store; placeholder for future integration
  const replayReport = null;

  const lastRisk = riskEvents[riskEvents.length - 1] || null;
  const status = approvalState?.status || reviewState?.status || 'unknown';
  const decision = normalizeDecision(approvalState?.decision, approvalState?.status);
  const updatedAt = approvalState?.updatedAt || approvalState?.recordedAt || lastRisk?.recordedAt || '';
  const tags = [
    lastRisk?.riskType,
    lastRisk?.severity,
    reviewState?.status,
  ].filter(Boolean);

  return {
    fixtureId,
    skillName: fixtureId,
    status,
    approvalStatus: approvalState?.status || 'pending',
    decision,
    updatedAt,
    riskType: lastRisk?.riskType || null,
    severity: lastRisk?.severity || null,
    summary: lastRisk?.summary || null,
    tags,
    execution,
    transcript,
    replayReport,
  };
}

function buildHistoryItems(filters = {}) {
  const fixtureIds = listAllFixtureIds();
  const items = fixtureIds.map((fid) => normalizeHistoryItem(fid));

  const statusFilter = (filters.status || '').trim();
  const skillFilter = (filters.skill || '').trim().toLowerCase();
  const sinceFilter = (filters.since || '').trim();
  const untilFilter = (filters.until || '').trim();
  const sortFilter = (filters.sort || 'time_desc').trim();

  const filtered = items.filter((item) => {
    if (statusFilter && item.approvalStatus !== statusFilter && item.status !== statusFilter) return false;
    if (skillFilter && !item.skillName.toLowerCase().includes(skillFilter)) return false;
    if (sinceFilter && item.updatedAt && item.updatedAt < sinceFilter) return false;
    if (untilFilter && item.updatedAt && item.updatedAt > untilFilter) return false;
    return true;
  });

  if (sortFilter === 'time_asc') {
    filtered.sort((a, b) => (a.updatedAt || '').localeCompare(b.updatedAt || ''));
  } else {
    filtered.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  }

  return filtered;
}

function buildRunsSummary() {
  const total = countExec();
  const logs = listExecLog();

  if (!total || !logs.length) {
    return {
      total: 0,
      succeeded: 0,
      failed: 0,
      avgDurationMs: 0,
      latestRunAt: null,
      bySource: {},
      byStatus: {},
    };
  }

  let succeeded = 0;
  let failed = 0;
  let durationSum = 0;
  let durationCount = 0;
  let latestRunAt = null;
  const bySource = {};
  const byStatus = {};

  for (const item of logs) {
    const status = item.status || 'unknown';
    byStatus[status] = (byStatus[status] || 0) + 1;
    if (status === 'completed' || status === 'succeeded' || status === 'success') succeeded += 1;
    if (status === 'failed' || status === 'error') failed += 1;

    const source = item.source || 'unknown';
    bySource[source] = (bySource[source] || 0) + 1;

    const duration = Number(item.durationMs);
    if (Number.isFinite(duration) && duration >= 0) {
      durationSum += duration;
      durationCount += 1;
    }

    const ts = item.timestamp || item.recordedAt || item.updatedAt || null;
    if (ts && (!latestRunAt || ts > latestRunAt)) latestRunAt = ts;
  }

  const summary = {
    total,
    succeeded,
    failed,
    avgDurationMs: durationCount ? Math.round(durationSum / durationCount) : 0,
    latestRunAt,
    bySource,
    byStatus,
  };
  summary.responsibleView = buildRunResponsibleView({
    runId: latestRunAt ? `summary@${latestRunAt}` : 'summary',
    status: failed > 0 ? 'failed' : (succeeded > 0 ? 'completed' : 'unknown'),
    source: 'run-center-summary',
    summary: `统计运行总览：共 ${total} 次，成功 ${succeeded} 次，失败 ${failed} 次`,
    output: `最新运行时间 ${latestRunAt || '暂无'}，平均耗时 ${summary.avgDurationMs}ms`,
    riskLevel: failed > 0 ? 'medium' : 'low',
  });
  return summary;
}

function mapRunItem(log) {
  const base = {
    ...log,
    runId: log.executionId,
    fixtureId: log.fixtureId,
    status: log.status,
    startedAt: log.timestamp,
    durationMs: log.durationMs ?? null,
    source: log.source,
    steps: log.steps ?? null,
    consumedPlanRef: log.consumedPlanRef ?? null,
    consumedPromptRef: log.consumedPromptRef ?? null,
    approvalRef: log.approvalRef ?? null,
    errorMessage: log.errorMessage ?? null,
    input: log.input ?? null,
    output: log.output ?? null,
  };

  // Minimal read-only adapter: if this is a betterWorkflow execution record,
  // expose a run-center-view payload for downstream UI/data consumers.
  if (base.source === 'betterworkflow-pipeline') {
    try {
      base.betterWorkflowRunCenterView = buildBetterWorkflowRunCenterView(log);
    } catch {
      base.betterWorkflowRunCenterView = null;
    }
  }

  if (base.source === 'betterprompt-pipeline') {
    try {
      base.betterPromptRunCenterView = buildBetterPromptRunCenterView(log);
    } catch {
      base.betterPromptRunCenterView = null;
    }
  }

  if (base.source === 'skill-bundle-soft-recommendation') {
    try {
      base.skillBundleRunCenterView = buildSkillBundleRunCenterView(log);
    } catch {
      base.skillBundleRunCenterView = null;
    }
  }

  base.observability =
    base.betterWorkflowRunCenterView?.observability ??
    base.betterPromptRunCenterView?.observability ??
    base.skillBundleRunCenterView?.observability ??
    {
      status: ['failed', 'error'].includes(String(base.status || '').toLowerCase()) ? 'error' : 'ok',
      duration_ms: Number.isFinite(Number(base.durationMs)) ? Number(base.durationMs) : 0,
      trace_refs: Array.isArray(base.traceRefs) ? base.traceRefs.filter((x) => typeof x === 'string' && x.trim()) : [],
      alert_level: ['failed', 'error'].includes(String(base.status || '').toLowerCase()) ? 'error' : 'info',
    };

  base.responsibleView = buildRunResponsibleView(base);
  return base;
}

function buildRunsList(filters = {}) {
  const limitRaw = Number.parseInt(String(filters.limit ?? '20'), 10);
  const offsetRaw = Number.parseInt(String(filters.offset ?? '0'), 10);
  const limit = Number.isFinite(limitRaw) ? Math.max(0, Math.min(limitRaw, 100)) : 20;
  const offset = Number.isFinite(offsetRaw) ? Math.max(0, offsetRaw) : 0;

  const allLogs = listExecLog();
  // newest first
  const sorted = [...allLogs].reverse();
  const page = sorted.slice(offset, offset + limit);

  return {
    items: page.map(mapRunItem),
    total: allLogs.length,
    offset,
    limit,
  };
}

function getRunLogByRunId(runId) {
  return listExecLog().find((r) => r.executionId === runId) || null;
}

function writeTaskRunEvidenceSnapshot(taskRunId, payload = {}) {
  const dir = `${homedir()}/.skillforge/evidence/task-runs`;
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const filePath = `${dir}/${taskRunId}.json`;
  const snapshot = {
    generatedAt: new Date().toISOString(),
    ...payload,
  };
  writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf8');
  return { path: filePath, snapshot };
}

function mapRunArtifactsPayload(item) {
  const base = mapRunItem(item);
  const artifacts = {
    transcript: {
      anchorType: null,
      anchorValue: null,
      count: 0,
      refs: [],
      anchorOnlyCount: 0,
    },
  };

  try {
    const executionId = item.executionId;
    const allTranscripts = listTranscripts();

    const linkedTranscripts = executionId
      ? allTranscripts.filter((t) => t.executionId === executionId)
      : [];

    const hasTranscriptContent = (t) => {
      const outputContent = t?.output?.content;
      return typeof outputContent === 'string' && outputContent.trim().length > 0;
    };

    const materializedTranscripts = linkedTranscripts.filter(hasTranscriptContent);
    const anchorOnlyCount = linkedTranscripts.length - materializedTranscripts.length;

    artifacts.transcript = {
      anchorType: 'executionId',
      anchorValue: executionId ?? null,
      count: materializedTranscripts.length,
      refs: materializedTranscripts.map((t) => ({
        transcriptId: t.transcriptId,
        executionId: t.executionId ?? null,
        fixtureId: t.fixtureId ?? null,
        caseId: t.caseId ?? null,
        provider: t.provider,
        model: t.model,
        timestamp: t.timestamp,
        status: t.status,
        executionTimeMs: t.executionTimeMs,
      })),
      anchorOnlyCount,
    };
  } catch { /* non-critical */ }

  return {
    ...base,
    artifacts,
  };
}

function firstNonEmptyText(...values) {
  for (const value of values) {
    if (typeof value === 'string') {
      const text = value.trim();
      if (text) return text;
    }
  }
  return null;
}

function buildInputSummary(detail) {
  const direct = firstNonEmptyText(
    detail?.input?.summary,
    detail?.input?.message,
    detail?.input?.description,
    detail?.summary,
    detail?.title,
  );
  if (direct) return `本次运行目标：${direct}`;

  const fixture = firstNonEmptyText(detail?.fixtureId);
  const op = firstNonEmptyText(detail?.input?.operation);
  if (fixture && op) return `本次尝试对 ${fixture} 执行 ${op.replace(/[-_]/g, ' ')}。`;
  if (fixture) return `本次尝试处理 ${fixture} 对应的运行任务。`;
  return '本次尝试执行一项运行任务。';
}

function buildOutputSummary(detail) {
  const status = String(detail?.status || '').toLowerCase();
  const transcriptText = firstNonEmptyText(detail?.output?.content, detail?.rawResponse?.summary);
  if (['completed', 'succeeded', 'success'].includes(status)) {
    if (transcriptText) return `运行已完成，产出结果：${transcriptText}`;
    const reviewDecision = firstNonEmptyText(detail?.output?.review?.decision, detail?.output?.review?.conclusion);
    if (reviewDecision) return `运行已完成，完成了 review/prep/registry 流程，结论为「${reviewDecision}」。`;
    return '运行已完成，结果已写入执行记录并可追溯。';
  }

  const failureHint = firstNonEmptyText(detail?.errorMessage, detail?.reason, detail?.failureReason);
  if (failureHint) return `运行中断，未形成成功产物；当前阻断信息：${failureHint}`;

  return '运行未成功完成，当前处于阻断状态，需查看详细日志。';
}

function buildFailureSummary(detail) {
  const status = String(detail?.status || '').toLowerCase();
  if (!['failed', 'error'].includes(status)) return null;

  const reason = firstNonEmptyText(
    detail?.failureSummary,
    detail?.errorMessage,
    detail?.reason,
    detail?.failureReason,
    detail?.output?.message,
    detail?.output?.description,
  );
  if (reason) return `失败原因：${reason}`;

  const reviewStatus = firstNonEmptyText(detail?.output?.review?.status);
  if (reviewStatus) return `失败原因：流程停在 ${reviewStatus} 阶段，未能继续完成。`;

  return '失败原因：执行过程中出现错误，任务未能完成。';
}

function buildHumanMessages(detail, item = null) {
  const inputMessage = firstNonEmptyText(
    detail?.inputMessage,
    detail?.input?.message,
    detail?.input?.content,
    detail?.input?.summary,
    detail?.input?.description,
    detail?.inputSummary,
  ) || buildInputSummary(detail);

  let transcriptOutput = null;
  if (Array.isArray(detail?.transcripts) && detail.transcripts.length > 0) {
    const latest = detail.transcripts
      .slice()
      .sort((a, b) => (b?.timestamp || '').localeCompare(a?.timestamp || ''))[0];
    if (latest?.transcriptId) {
      try {
        const full = listTranscripts().find((t) => t.transcriptId === latest.transcriptId);
        transcriptOutput = firstNonEmptyText(
          full?.output?.content,
          full?.output?.message,
          full?.output?.summary,
        );
      } catch { /* non-critical */ }
    }
  }

  const outputMessage = firstNonEmptyText(
    detail?.outputMessage,
    transcriptOutput,
    detail?.output?.content,
    detail?.output?.message,
    detail?.output?.summary,
    detail?.outputSummary,
  ) || buildOutputSummary(detail);

  const failureMessage = firstNonEmptyText(
    detail?.failureMessage,
    detail?.errorMessage,
    detail?.output?.errorMessage,
    detail?.output?.reason,
    detail?.reason,
    detail?.failureReason,
    detail?.failureSummary,
  ) || (['failed', 'error'].includes(String(detail?.status || '').toLowerCase()) ? buildFailureSummary(detail) : null);

  return {
    inputMessage,
    outputMessage,
    failureMessage,
  };
}

function buildRunDetail(runId) {
  const item = getRunLogByRunId(runId);
  if (!item) return null;

  const detail = mapRunItem(item);

  const directRawInput = firstNonEmptyText(
    item?.rawInput,
    item?.inputMessage,
    item?.input?.message,
    item?.input?.content,
    typeof item?.input === 'string' ? item.input : null,
  );
  const directRawOutput = firstNonEmptyText(
    item?.rawOutput,
    item?.outputMessage,
    item?.output?.message,
    item?.output?.content,
    typeof item?.output === 'string' ? item.output : null,
    item?.failureMessage,
    item?.errorMessage,
  );

  // derived endedAt
  if (typeof item.timestamp === 'string' && typeof item.durationMs === 'number') {
    const startMs = Date.parse(item.timestamp);
    if (!Number.isNaN(startMs)) {
      detail.endedAt = new Date(startMs + item.durationMs).toISOString();
    }
  }

  // optional risk enrichment
  try {
    const fixtureId = item.fixtureId;
    if (fixtureId) {
      const riskEvents = loadEventsByFixtureId(fixtureId);
      const lastRisk = riskEvents[riskEvents.length - 1] || null;
      if (lastRisk) {
        detail.riskType = lastRisk.riskType || null;
        detail.severity = lastRisk.severity || null;
      }
    }
  } catch { /* non-critical */ }

  // pipeline input/output enrichment
  try {
    const fixtureId = item.fixtureId;
    if (fixtureId) {
      const reviewEvents = loadReviewEvents(fixtureId);
      const reviewState = getReviewState(fixtureId);
      const prepEntry = loadPrepById(fixtureId);
      const registryEntry = loadRegistryById(fixtureId);

      detail.input = detail.input ?? {
        operation: 'operate-by-fixture',
        fixtureId,
      };

      const logOutput = detail.output ?? {};
      // Enrichment: only fill gaps; never overwrite log I/O
      const enrichment = {};
      if (!logOutput.review) {
        enrichment.review = {
          fixtureId,
          score: reviewState?.score ?? null,
          decision: reviewState?.decision ?? null,
          conclusion: reviewState?.conclusion ?? null,
          status: reviewState?.status ?? null,
          latestEventType: reviewEvents.length > 0 ? (reviewEvents[reviewEvents.length - 1]?.eventType ?? null) : null,
          eventCount: reviewEvents.length,
        };
      }
      if (!logOutput.prep && prepEntry) {
        enrichment.prep = {
          fixtureId,
          prepId: prepEntry.prepId ?? null,
          kind: prepEntry.kind ?? null,
          timestamp: prepEntry.timestamp ?? null,
          readiness: prepEntry.readiness ?? prepEntry.checks ?? null,
        };
      }
      if (!logOutput.registry && registryEntry) {
        enrichment.registry = {
          fixtureId,
          entryId: registryEntry.entryId ?? null,
          version: registryEntry.version ?? null,
          tags: registryEntry.tags ?? null,
          timestamp: registryEntry.timestamp ?? null,
          status: registryEntry.status ?? null,
        };
      }
      detail.output = { ...logOutput, ...enrichment };
    }
  } catch { /* non-critical */ }

  // transcript evidence anchors — executionId is the primary anchor
  try {
    const executionId = item.executionId;
    const allTranscripts = listTranscripts();

    const linkedTranscripts = executionId
      ? allTranscripts.filter((t) => t.executionId === executionId)
      : [];

    const hasTranscriptContent = (t) => {
      const outputContent = t?.output?.content;
      if (typeof outputContent === 'string' && outputContent.trim().length > 0) return true;
      return false;
    };

    const materializedTranscripts = linkedTranscripts.filter(hasTranscriptContent);
    const anchorOnlyCount = linkedTranscripts.length - materializedTranscripts.length;

    detail.evidence = {
      transcript: {
        anchorType: 'executionId',
        anchorValue: executionId ?? null,
        count: materializedTranscripts.length,
        refs: materializedTranscripts.map((t) => ({
          transcriptId: t.transcriptId,
          executionId: t.executionId ?? null,
          fixtureId: t.fixtureId ?? null,
          caseId: t.caseId ?? null,
          provider: t.provider,
          model: t.model,
          timestamp: t.timestamp,
          status: t.status,
          executionTimeMs: t.executionTimeMs,
        })),
        anchorOnlyCount,
      },
    };

    if (detail.transcriptCount === undefined) detail.transcriptCount = materializedTranscripts.length;
    if (!detail.output?.transcripts) {
      detail.output = {
        ...(detail.output ?? {}),
        transcripts: {
          anchorType: 'executionId',
          anchorValue: executionId ?? null,
          count: materializedTranscripts.length,
          refs: materializedTranscripts.map((t) => ({
            transcriptId: t.transcriptId,
            executionId: t.executionId ?? null,
            fixtureId: t.fixtureId ?? null,
            caseId: t.caseId ?? null,
            provider: t.provider,
            model: t.model,
            timestamp: t.timestamp,
            status: t.status,
            executionTimeMs: t.executionTimeMs,
          })),
          anchorOnlyCount,
        },
      };
    }
    if (materializedTranscripts.length > 0 && !detail.transcripts) {
      detail.transcripts = materializedTranscripts.map((t) => ({
        transcriptId: t.transcriptId,
        executionId: t.executionId ?? null,
        fixtureId: t.fixtureId ?? null,
        caseId: t.caseId ?? null,
        provider: t.provider,
        model: t.model,
        timestamp: t.timestamp,
        status: t.status,
        executionTimeMs: t.executionTimeMs,
      }));
    }
  } catch { /* non-critical */ }

  const planRef = firstNonEmptyText(item?.planRef, item?.evidenceRefs?.planId);
  if (planRef) {
    detail.planRef = planRef;
    try {
      const planLogs = loadPlanLogById(planRef);
      const latestPlan = Array.isArray(planLogs) && planLogs.length > 0
        ? planLogs[planLogs.length - 1]
        : null;
      if (latestPlan) {
        const planTitle = firstNonEmptyText(
          latestPlan?.output?.title,
          latestPlan?.output?.goal,
          latestPlan?.input?.title,
          latestPlan?.input?.goal,
        );
        const planGoal = firstNonEmptyText(
          latestPlan?.output?.goal,
          latestPlan?.input?.goal,
        );
        detail.planSummary = {
          title: planTitle,
          goal: planGoal,
          fixtureId: firstNonEmptyText(latestPlan?.fixtureId),
        };
      }
    } catch { /* non-critical */ }
  }

  detail.inputSummary = buildInputSummary(detail);
  detail.outputSummary = buildOutputSummary(detail);
  const failureSummary = buildFailureSummary(detail);
  if (failureSummary) detail.failureSummary = failureSummary;

  const humanMessages = buildHumanMessages(detail, item);
  detail.inputMessage = humanMessages.inputMessage;
  detail.outputMessage = humanMessages.outputMessage;
  detail.failureMessage = humanMessages.failureMessage;

  // raw text layer: try to extract raw content from detail
  let rawInput =
    detail?.rawInput ??
    detail?.input?.content ??
    detail?.input?.message ??
    detail?.input?.raw ??
    detail?.input?.text ??
    detail?.input?.prompt ??
    detail?.input?.description ??
    null;

  let rawOutput =
    detail?.rawOutput ??
    detail?.output?.content ??
    detail?.output?.message ??
    detail?.output?.raw ??
    detail?.output?.text ??
    detail?.output?.result ??
    detail?.output?.response ??
    null;

  if (!rawInput || !rawOutput) {
    try {
      const execution = loadLatestExecution({ runId: item?.executionId, executionId: item?.executionId }) || null;
      if (execution) {
        if (!rawInput && execution.rawInputArtifactId) {
          const rawInputArtifact = loadRawArtifactById(execution.rawInputArtifactId);
          const payload = rawInputArtifact?.payload;
          rawInput = typeof payload === 'string' ? payload : (payload == null ? null : JSON.stringify(payload));
        }
        if (!rawOutput && execution.rawOutputArtifactId) {
          const rawOutputArtifact = loadRawArtifactById(execution.rawOutputArtifactId);
          const payload = rawOutputArtifact?.payload;
          rawOutput = typeof payload === 'string' ? payload : (payload == null ? null : JSON.stringify(payload));
        }
      }
    } catch { /* non-critical */ }
  }

  detail.rawInput = rawInput;
  detail.rawOutput = rawOutput;

  detail.rawTextAvailability = {
    input: rawInput
      ? { available: true }
      : { available: false, reason: 'not_recorded', hint: '当前记录未保存输入原文' },
    output: rawOutput
      ? { available: true }
      : { available: false, reason: 'not_recorded', hint: '当前记录未保存输出原文' },
    hasAnyRawText: !!(rawInput || rawOutput),
    message: rawInput || rawOutput
      ? null
      : '当前记录未保存原文，仅展示摘要',
  };

  return detail;
}

function encodeAssetId(sourcePath) {
  return Buffer.from(sourcePath, 'utf8').toString('base64url');
}

function decodeAssetId(assetId) {
  try {
    const decoded = Buffer.from(assetId, 'base64url').toString('utf8');
    return decoded || null;
  } catch {
    return null;
  }
}

function isSafeRelativePath(p) {
  if (!p || typeof p !== 'string') return false;
  if (p.includes('\0')) return false;
  if (p.startsWith('/') || p.startsWith('\\')) return false;
  if (p.includes('..')) return false;
  return true;
}

function buildKnowledgeRoots() {
  const projectRoot = resolve(__dirname);
  return {
    projectRoot,
    docsRoot: resolve(projectRoot, 'docs'),
    fixturesRoot: resolve(projectRoot, 'fixtures'),
  };
}

function normalizeToProjectRelative(absPath, projectRoot) {
  const rel = relative(projectRoot, absPath).replace(/\\/g, '/');
  if (!isSafeRelativePath(rel)) return null;
  return rel;
}

function isWithinRoot(absPath, rootPath) {
  const rel = relative(rootPath, absPath);
  return rel && !rel.startsWith('..') && !rel.includes('..') && !resolve(rootPath, rel).includes('\0')
    ? true
    : rel === '';
}

function tryReadUtf8(filePath) {
  try {
    return readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

function scanDocsAssets(projectRoot, docsRoot) {
  if (!existsSync(docsRoot)) return [];

  const assets = [];
  const stack = [docsRoot];

  while (stack.length > 0) {
    const dir = stack.pop();
    let entries = [];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const absPath = resolve(dir, entry.name);
      if (!isWithinRoot(absPath, docsRoot)) continue;

      if (entry.isDirectory()) {
        stack.push(absPath);
        continue;
      }

      if (!entry.isFile()) continue;
      if (extname(entry.name).toLowerCase() !== '.md') continue;

      let stat;
      try {
        stat = statSync(absPath);
      } catch {
        continue;
      }

      const sourcePath = normalizeToProjectRelative(absPath, projectRoot);
      if (!sourcePath || !sourcePath.startsWith('docs/')) continue;

      const content = tryReadUtf8(absPath) || '';
      const firstLine = content.split('\n').find((line) => line.trim()) || basename(entry.name, '.md');
      const title = firstLine.replace(/^#\s*/, '').trim() || basename(entry.name, '.md');

      assets.push({
        id: encodeAssetId(sourcePath),
        name: basename(entry.name, '.md'),
        title,
        type: 'doc',
        sourcePath,
        format: 'markdown',
        size: stat.size,
        updatedAt: stat.mtime.toISOString(),
        content,
        description: null,
        version: null,
        domain: null,
        status: 'active',
      });
    }
  }

  return assets;
}

function parseSimpleYamlHeader(text) {
  const result = {};
  if (!text || typeof text !== 'string') return result;

  for (const line of text.split('\n')) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.+)$/);
    if (!m) continue;
    const key = m[1].trim();
    const value = m[2].trim().replace(/^['"]|['"]$/g, '');
    result[key] = value;
  }
  return result;
}

function scanFixtureAssets(projectRoot, fixturesRoot) {
  if (!existsSync(fixturesRoot)) return [];

  let entries = [];
  try {
    entries = readdirSync(fixturesRoot, { withFileTypes: true });
  } catch {
    return [];
  }

  const assets = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const fixtureDir = resolve(fixturesRoot, entry.name);
    if (!isWithinRoot(fixtureDir, fixturesRoot)) continue;

    const skillPath = resolve(fixtureDir, 'skill.yml');
    const readmePath = resolve(fixtureDir, 'README.md');
    const hasSkill = existsSync(skillPath);
    const hasReadme = existsSync(readmePath);

    if (!hasSkill && !hasReadme) continue;

    const sourcePath = normalizeToProjectRelative(fixtureDir, projectRoot);
    if (!sourcePath || !sourcePath.startsWith('fixtures/')) continue;

    let stat;
    try {
      stat = statSync(fixtureDir);
    } catch {
      continue;
    }

    const skillContent = hasSkill ? (tryReadUtf8(skillPath) || '') : '';
    const readme = hasReadme ? (tryReadUtf8(readmePath) || '') : '';
    const metadata = parseSimpleYamlHeader(skillContent);
    const title = metadata.name || entry.name;

    assets.push({
      id: encodeAssetId(sourcePath),
      name: entry.name,
      title,
      type: 'skill-fixture',
      sourcePath,
      format: 'directory',
      updatedAt: stat.mtime.toISOString(),
      description: metadata.description || null,
      version: metadata.version || null,
      domain: metadata.domain || null,
      status: metadata.status || 'active',
      skillContent,
      readme,
      metadata,
    });
  }

  return assets;
}

function listKnowledgeAssets() {
  const { projectRoot, docsRoot, fixturesRoot } = buildKnowledgeRoots();
  const docsAssets = scanDocsAssets(projectRoot, docsRoot);
  const fixtureAssets = scanFixtureAssets(projectRoot, fixturesRoot);

  return [...docsAssets, ...fixtureAssets]
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}

function buildKnowledgeAssetListResponse() {
  const items = listKnowledgeAssets().map((asset) => ({
    id: asset.id,
    name: asset.name,
    title: asset.title,
    type: asset.type,
    sourcePath: asset.sourcePath,
    format: asset.format,
    updatedAt: asset.updatedAt,
    size: asset.size,
    description: asset.description,
    version: asset.version,
    domain: asset.domain,
    status: asset.status,
  }));

  return { items };
}

function buildKnowledgeAssetDetail(assetId) {
  const decoded = decodeAssetId(assetId);
  if (!decoded || !isSafeRelativePath(decoded)) return null;

  const assets = listKnowledgeAssets();
  const asset = assets.find((item) => item.sourcePath === decoded);
  if (!asset) return null;

  if (asset.type === 'doc') {
    return {
      id: asset.id,
      name: asset.name,
      title: asset.title,
      type: asset.type,
      sourcePath: asset.sourcePath,
      format: asset.format,
      updatedAt: asset.updatedAt,
      size: asset.size,
      contentPreview: (asset.content || '').slice(0, 2000),
      content: asset.content || '',
    };
  }

  const fixtureAbsPath = resolve(__dirname, asset.sourcePath);
  let files = [];
  try {
    files = readdirSync(fixtureAbsPath, { withFileTypes: true })
      .filter((f) => f.isFile())
      .map((f) => f.name)
      .sort();
  } catch {
    files = [];
  }

  return {
    id: asset.id,
    name: asset.name,
    title: asset.title,
    type: asset.type,
    sourcePath: asset.sourcePath,
    format: asset.format,
    updatedAt: asset.updatedAt,
    description: asset.description,
    version: asset.version,
    domain: asset.domain,
    status: asset.status,
    skillContent: asset.skillContent || '',
    readme: asset.readme || '',
    files,
    metadata: asset.metadata || {},
  };
}

function resolveApprovalFixtureBridge(rawId) {
  const id = String(rawId || '').trim();
  if (!id) {
    return {
      ok: false,
      lookupId: id,
      resolutionType: 'invalid-id',
      reason: '审批详情 id 为空，无法进行桥接定位。',
      candidates: [],
    };
  }

  const riskEventsByFixture = loadEventsByFixtureId(id);
  const reviewEventsByFixture = loadReviewEvents(id);
  const approvalEventsByFixture = loadApprovalEvents(id);
  const hasFixtureDirectData = riskEventsByFixture.length > 0 || reviewEventsByFixture.length > 0 || approvalEventsByFixture.length > 0;

  if (hasFixtureDirectData) {
    return {
      ok: true,
      fixtureId: id,
      lookupId: id,
      resolutionType: 'fixture-id-direct',
      reason: '按 fixtureId 直接命中审批记录。',
      candidates: [],
    };
  }

  const runLog = getRunLogByRunId(id);
  const candidates = [];
  if (runLog?.fixtureId) candidates.push(runLog.fixtureId);

  try {
    const allLogs = listExecLog();
    for (const entry of allLogs) {
      const approvalRef = entry?.approvalRef;
      if (!approvalRef || typeof approvalRef !== 'object') continue;
      const refExecutionId = approvalRef.executionId || approvalRef.runId || null;
      if (refExecutionId === id && approvalRef.fixtureId) {
        candidates.push(approvalRef.fixtureId);
      }
    }
  } catch { /* non-critical */ }

  try {
    const lineage = getLineage(id);
    if (lineage?.init?.fixtureId) candidates.push(lineage.init.fixtureId);
  } catch { /* non-critical */ }

  const uniqCandidates = [...new Set(candidates.filter(Boolean))];
  for (const candidate of uniqCandidates) {
    const hasAny = loadEventsByFixtureId(candidate).length > 0
      || loadReviewEvents(candidate).length > 0
      || loadApprovalEvents(candidate).length > 0;
    if (hasAny) {
      return {
        ok: true,
        fixtureId: candidate,
        lookupId: id,
        resolutionType: 'execution-bridge',
        reason: `原始 id 被识别为运行/执行标识，已桥接到 fixtureId=${candidate}。`,
        candidates: uniqCandidates,
      };
    }
  }

  return {
    ok: false,
    lookupId: id,
    resolutionType: 'bridge-not-found',
    reason: '未能从 run-center / execution log / lineage 建立到审批 fixtureId 的桥接。',
    candidates: uniqCandidates,
  };
}

function buildApprovalDetail(fixtureIdOrRunId) {
  const bridge = resolveApprovalFixtureBridge(fixtureIdOrRunId);
  if (!bridge.ok) {
    return {
      fixtureId: null,
      lookupId: bridge.lookupId,
      bridge,
      risk: null,
      review: null,
      approval: null,
      trace: { lastEventId: null, eventCount: 0 },
      events: [],
      responsibleView: {
        intentSummary: `当前查看的是审批详情请求「${bridge.lookupId || 'unknown'}」，但尚未找到可关联的审批记录。`,
        statusNarrative: '审批记录未命中，暂时无法展示状态。',
        resultSummary: bridge.reason,
        impactScope: ['审批详情展示', '审批状态定位'],
      },
    };
  }

  const fixtureId = bridge.fixtureId;
  // Collect all events in one timeline
  const riskEvents = loadEventsByFixtureId(fixtureId);
  const reviewEvents = loadReviewEvents(fixtureId);
  const approvalEvents = loadApprovalEvents(fixtureId);

  const events = [
    ...riskEvents.map((e) => ({ ...e, kind: e.kind || 'risk-event' })),
    ...reviewEvents.map((e) => ({ ...e, kind: e.kind || 'review-event' })),
    ...approvalEvents.map((e) => ({ ...e, kind: e.kind || 'approval-event' })),
  ].sort((a, b) => (a.recordedAt || '').localeCompare(b.recordedAt || ''));

  const lastRisk = riskEvents[riskEvents.length - 1] || null;
  const reviewState = getReviewState(fixtureId);
  const approvalState = getApprovalState(fixtureId);
  const presentation = resolveFixturePresentation(fixtureId);

  const approvalPublic = {
    ...(approvalState || {}),
    decision: normalizeDecision(approvalState?.decision, approvalState?.status),
    eventCount: approvalEvents.length,
  };
  if (Object.prototype.hasOwnProperty.call(approvalPublic, 'lastEventId')) {
    delete approvalPublic.lastEventId;
  }

  const detail = {
    fixtureId,
    lookupId: bridge.lookupId,
    bridge,
    skillName: presentation.skillName,
    title: presentation.title,
    description: presentation.description,
    source: presentation.source,
    output: presentation.output,
    risk: lastRisk ? {
      riskType: lastRisk.riskType,
      riskLabel: getRiskLabel(lastRisk.riskType),
      severity: lastRisk.severity,
      summary: lastRisk.summary,
      observedAt: lastRisk.observedAt,
      evidenceRefs: lastRisk.evidenceRefs,
      sourceLinks: lastRisk.sourceLinks,
    } : null,
    review: reviewState,
    approval: approvalPublic,
    trace: {
      lastEventId: approvalState?.lastEventId || null,
      eventCount: approvalEvents.length,
    },
    events: events.map((e) => ({
      ...e,
      riskLabel: Object.prototype.hasOwnProperty.call(e, 'riskType') ? getRiskLabel(e.riskType) : null,
      decision: Object.prototype.hasOwnProperty.call(e, 'decision')
        ? normalizeDecision(e.decision, e.status)
        : e.decision,
    })),
  };
  detail.responsibleView = buildApprovalResponsibleView({
    fixtureId,
    title: presentation.title,
    skillName: presentation.skillName,
    description: presentation.description,
    source: presentation.source,
    output: presentation.output,
    riskType: lastRisk?.riskType || null,
    severity: lastRisk?.severity || null,
    summary: lastRisk?.summary || null,
    approvalStatus: approvalPublic.status || 'pending',
    status: approvalPublic.status || 'pending',
  });
  return detail;
}

// ── Static file server (for production build) ──
function serveStatic(req, res) {
  const parsed = new URL(req.url, `http://${req.headers.host}`);
  let pathname = parsed.pathname;
  const isHead = (res.locals?.method || 'GET') === 'HEAD';

  // Serve index.html for SPA routes
  const WEB_DIR = resolve(__dirname, 'web', 'dist');
  if (!existsSync(WEB_DIR)) {
    // Dev mode — just return 404, Vite handles it
    sendError(res, 404, 'STATIC_NOT_AVAILABLE', 'Static not available (run Vite dev server)');
    return;
  }

  if (pathname === '/') pathname = '/index.html';

  const filePath = resolve(WEB_DIR, `.${pathname}`);
  const ext = extname(filePath).toLowerCase();

  if (!existsSync(filePath)) {
    // SPA fallback
    const indexHtml = resolve(WEB_DIR, 'index.html');
    if (existsSync(indexHtml)) {
      const stat = statSync(indexHtml);
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Length': stat.size,
        'X-Request-Id': res.locals?.requestId || '',
      });
      if (isHead) return res.end();
      createReadStream(indexHtml).pipe(res);
      return;
    }
    sendError(res, 404, 'NOT_FOUND', 'Not found');
    return;
  }

  const mime = MIME[ext] || 'application/octet-stream';
  const stat = statSync(filePath);
  res.writeHead(200, {
    'Content-Type': mime,
    'Content-Length': stat.size,
    'X-Request-Id': res.locals?.requestId || '',
  });
  if (isHead) return res.end();
  createReadStream(filePath).pipe(res);
}

// ── Server ──
const server = http.createServer(async (req, res) => {
  const startedAt = Date.now();
  const requestId = getRequestId(req);
  res.locals = { requestId };
  let timeoutTriggered = false;

  const timeout = setTimeout(() => {
    timeoutTriggered = true;
    if (!res.writableEnded) {
      sendError(res, 408, 'REQUEST_TIMEOUT', `Request timed out after ${REQUEST_TIMEOUT_MS}ms`, { timeoutMs: REQUEST_TIMEOUT_MS }, true);
    }
  }, REQUEST_TIMEOUT_MS);

  res.on('finish', () => {
    clearTimeout(timeout);
    const durationMs = Date.now() - startedAt;
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      method: req.method,
      path: req.url,
      status: res.statusCode,
      durationMs,
      requestId,
    }));
  });

  const parsed = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsed.pathname;
  const method = (req.method || 'GET').toUpperCase();
  const routeMethod = method === 'HEAD' ? 'GET' : method;
  res.locals.method = method;

  if (!['GET', 'POST', 'HEAD'].includes(method)) {
    return sendError(res, 405, 'METHOD_NOT_ALLOWED', `Method ${method} is not allowed`, { allowed: ['GET', 'POST', 'HEAD'] }, false);
  }

  // API routes
  if (pathname.startsWith('/api/')) {
    const matched = matchRoute(routeMethod, pathname);

    try {
      // Admin API routes — read-only aggregation
      if (matched === 'adminOverview') {
        const result = getAdminResource('/api/admin/overview');
        return json(res, adminApiEnvelope(result.payload), 200, requestId);
      }
      if (matched === 'adminPlans') {
        const result = getAdminResource('/api/admin/plans');
        return json(res, adminApiEnvelope(result.payload), 200, requestId);
      }
      if (matched && matched.route === 'adminPlanDetail') {
        const result = getAdminResource('/api/admin/plans/' + matched.planId);
        if (!result || !result.payload) {
          return sendError(res, 404, 'NOT_FOUND', `Plan not found: ${matched.planId}`);
        }
        return json(res, adminApiEnvelope(result.payload), 200, requestId);
      }
      if (matched === 'adminExecutions') {
        const result = getAdminResource('/api/admin/executions');
        return json(res, adminApiEnvelope(result.payload), 200, requestId);
      }
      if (matched && matched.route === 'adminExecutionDetail') {
        const result = getAdminResource('/api/admin/executions/' + matched.executionId);
        if (!result || !result.payload) {
          return sendError(res, 404, 'NOT_FOUND', `Execution not found: ${matched.executionId}`);
        }
        return json(res, adminApiEnvelope(result.payload), 200, requestId);
      }
      if (matched === 'adminChanges') {
        const result = getAdminResource('/api/admin/changes');
        return json(res, adminApiEnvelope(result.payload), 200, requestId);
      }
      if (matched === 'adminUpdates') {
        const result = getAdminResource('/api/admin/updates');
        return json(res, adminApiEnvelope(result.payload), 200, requestId);
      }

      if (matched === 'knowledgeAssetsList') {
        const result = buildKnowledgeAssetListResponse();
        return json(res, apiSuccess(result), 200, requestId);
      }

      if (matched && matched.route === 'knowledgeAssetDetail') {
        const detail = buildKnowledgeAssetDetail(matched.assetId);
        if (!detail) {
          return sendError(res, 404, 'NOT_FOUND', `Knowledge asset not found: ${matched.assetId}`);
        }
        return json(res, apiSuccess(detail), 200, requestId);
      }

      if (matched === 'approvalQueue') {
        const items = buildQueueItems();
        return json(res, apiSuccess({ items }), 200, requestId);
      }

      if (matched === 'historyList') {
        const items = buildHistoryItems({
          status: parsed.searchParams.get('status') || '',
          skill: parsed.searchParams.get('skill') || '',
          since: parsed.searchParams.get('since') || '',
          until: parsed.searchParams.get('until') || '',
          sort: parsed.searchParams.get('sort') || 'time_desc',
        });
        return json(res, apiSuccess({ items }), 200, requestId);
      }

      if (matched && matched.route === 'historyDetail') {
        const detail = buildApprovalDetail(matched.fixtureId);
        if (!detail.risk && !detail.events.length) {
          return sendError(res, 404, 'NOT_FOUND', `No history data for fixtureId: ${matched.fixtureId}`);
        }
        return json(res, apiSuccess({
          ...detail,
          history: normalizeHistoryItem(matched.fixtureId),
          conflict: null,
        }), 200, requestId);
      }

      if (matched && matched.route === 'approvalDetail') {
        const detail = buildApprovalDetail(matched.fixtureId);
        if (!detail.risk && !detail.events.length) {
          return sendError(
            res,
            404,
            'APPROVAL_BRIDGE_NOT_FOUND',
            `未找到审批详情：id=${matched.fixtureId}；${detail?.bridge?.reason || '桥接失败'}`,
            {
              lookupId: matched.fixtureId,
              bridge: detail?.bridge || null,
            },
          );
        }
        return json(res, apiSuccess({
          ...detail,
          conflict: null,
        }), 200, requestId);
      }

      if (matched === 'request') {
        const body = await parseBody(req, res);
        if (timeoutTriggered || body === null) return;
        validateBatchItems(body);

        const fixtureId = body.fixtureId;
        if (!fixtureId) return sendError(res, 400, 'INVALID_INPUT', 'fixtureId is required');

        const result = requestApproval(fixtureId, {
          reason: body.reason,
          requestedBy: body.requestedBy,
          metadata: body.metadata,
        });

        return json(res, apiSuccess({
          fixtureId,
          status: result.status || 'pending',
          decision: normalizeDecision(result.decision, result.status),
          reason: body.reason || null,
          requestedBy: body.requestedBy || null,
          metadata: body.metadata ?? null,
          eventId: result.eventId || null,
          recordedAt: result.recordedAt || null,
          updatedAt: result.updatedAt || result.recordedAt || null,
        }), 200, requestId);
      }

      if (matched === 'grant') {
        const body = await parseBody(req, res);
        if (timeoutTriggered || body === null) return;
        validateBatchItems(body);

        const fixtureId = body.fixtureId;
        if (!fixtureId) return sendError(res, 400, 'INVALID_INPUT', 'fixtureId is required');

        const result = grantApproval(fixtureId, {
          reason: body.reason,
          expectedLastEventId: body.expectedLastEventId,
        });
        return json(res, apiSuccess({
          requestId: fixtureId,
          status: result.status || 'approved',
          riskLevel: null,
          applicant: null,
          reviewer: null,
          reason: body.reason || null,
          decision: 'approved',
          conflict: null,
          error: null,
          createdAt: null,
          updatedAt: result.updatedAt || null,
          decidedAt: result.recordedAt || result.updatedAt || null,
          eventId: result.eventId || null,
        }), 200, requestId);
      }

      if (matched === 'deny') {
        const body = await parseBody(req, res);
        if (timeoutTriggered || body === null) return;
        validateBatchItems(body);

        const fixtureId = body.fixtureId;
        if (!fixtureId) return sendError(res, 400, 'INVALID_INPUT', 'fixtureId is required');

        const result = denyApproval(fixtureId, {
          reason: body.reason,
          expectedLastEventId: body.expectedLastEventId,
        });
        return json(res, apiSuccess({
          requestId: fixtureId,
          status: result.status || 'rejected',
          riskLevel: null,
          applicant: null,
          reviewer: null,
          reason: body.reason || null,
          decision: 'rejected',
          conflict: null,
          error: null,
          createdAt: null,
          updatedAt: result.updatedAt || null,
          decidedAt: result.recordedAt || result.updatedAt || null,
          eventId: result.eventId || null,
        }), 200, requestId);
      }

      if (matched && matched.route === 'fixtureSummary') {
        const detail = buildApprovalDetail(matched.fixtureId);
        return json(res, apiSuccess({
          requestId: matched.fixtureId,
          riskType: detail.risk?.riskType || null,
          riskLevel: detail.risk?.severity || null,
          status: detail.approval?.status || 'pending',
          conflict: null,
          error: null,
        }), 200, requestId);
      }

      if (matched === 'planLogCreate') {
        const body = await parseBody(req, res);
        if (timeoutTriggered || body === null) return;

        const planId = typeof body.planId === 'string' ? body.planId.trim() : '';
        const fixtureId = typeof body.fixtureId === 'string' ? body.fixtureId.trim() : '';
        if (!planId) return sendError(res, 400, 'INVALID_INPUT', 'planId is required');
        if (!fixtureId) return sendError(res, 400, 'INVALID_INPUT', 'fixtureId is required');

        const entry = buildPlanLogEntry({
          planId,
          fixtureId,
          input: body.input ?? null,
          output: body.output ?? null,
        });
        const saved = savePlanLog(entry);

        return json(res, apiSuccess({
          ok: saved.ok,
          planId: saved.planId,
          path: saved.path,
        }), 201, requestId);
      }

      // POST /api/plans — create a plan record
      if (matched === 'planCreate') {
        const body = await parseBody(req, res);
        if (timeoutTriggered || body === null) return;

        const planId = typeof body.planId === 'string' ? body.planId.trim() : '';
        const fixtureId = typeof body.fixtureId === 'string' ? body.fixtureId.trim() : '';
        if (!planId) return sendError(res, 400, 'INVALID_INPUT', 'planId is required');
        if (!fixtureId) return sendError(res, 400, 'INVALID_INPUT', 'fixtureId is required');

        const entry = buildPlanLogEntry({
          planId,
          fixtureId,
          input: body.input ?? null,
          output: body.output ?? null,
        });
        const saved = savePlanLog(entry);

        return json(res, apiSuccess(saved), 201, requestId);
      }

      // GET /api/plan-center/plans — list recent plans
      if (matched === 'planCenterList') {
        const limit = normalizeLimit(parsed.searchParams.get('limit'), 20, 100);
        const plans = listRecentPlans(limit);
        return json(res, apiSuccess({ plans, total: plans.length }), 200, requestId);
      }

      // ── Task Run handlers (M4 end-to-end loop) ──────────────────────

      // POST /api/tasks/runs — initiate (idempotent)
      if (matched === 'taskRunInitiate') {
        const body = await parseBody(req, res);
        if (timeoutTriggered || body === null) return;

        if (!body.fixtureId) return sendError(res, 400, 'INVALID_INPUT', 'fixtureId is required');
        if (!body.idempotencyKey) return sendError(res, 400, 'INVALID_INPUT', 'idempotencyKey is required');

        const result = initiateTaskRun({
          fixtureId: body.fixtureId,
          idempotencyKey: body.idempotencyKey,
          parentPlanId: body.parentPlanId ?? null,
          params: body.params ?? null,
          metadata: body.metadata ?? null,
        });

        const runType = String(body.runType || body.mode || '').trim().toLowerCase();
        const shouldExecuteTask4 = runType === 'task4-runtime';

        if (!shouldExecuteTask4 || result.duplicate) {
          return json(res, apiSuccess(result), result.duplicate ? 200 : 201, requestId);
        }

        try {
          startTaskRun(result.taskRunId);

          const task4InputText =
            (typeof body.inputText === 'string' && body.inputText.trim())
            || (typeof body.params?.inputText === 'string' && body.params.inputText.trim())
            || (typeof body.params?.raw === 'string' && body.params.raw.trim())
            || '';

          const task4Language =
            (typeof body.language === 'string' && body.language.trim())
            || (typeof body.params?.language === 'string' && body.params.language.trim())
            || 'zh-CN';

          const runtime = await executeTask4Runtime({
            inputText: task4InputText,
            language: task4Language,
            metadata: {
              taskRunId: result.taskRunId,
              fixtureId: body.fixtureId,
              source: 'api/tasks/runs',
            },
          });

          recordOutput(result.taskRunId, {
            kind: 'result',
            content: JSON.stringify(runtime.output),
            payload: runtime.output,
          });

          const transcriptBody = {
            kind: 'transcript',
            content: JSON.stringify(runtime.transcript ?? {
              kind: runtime.kind,
              output: runtime.output,
              durationMs: runtime.durationMs,
            }),
            payload: runtime.transcript ?? {
              kind: runtime.kind,
              output: runtime.output,
              durationMs: runtime.durationMs,
            },
          };

          recordOutput(result.taskRunId, transcriptBody);

          completeTaskRun(result.taskRunId, {
            durationMs: runtime.durationMs,
            message: 'task4-runtime succeeded',
          });

          const response = {
            ...result,
            status: 'succeeded',
            runType: 'task4-runtime',
            task4: runtime.output,
            runtimeResult: {
              kind: runtime.kind,
              durationMs: runtime.durationMs,
              input: runtime.input,
              output: runtime.output,
              transcript: runtime.transcript ?? null,
              persistenceHint: runtime.persistenceHint ?? null,
            },
          };
          return json(res, apiSuccess(response), 201, requestId);
        } catch (e) {
          try {
            failTaskRun(result.taskRunId, {
              code: e?.code || 'TASK4_RUNTIME_FAILED',
              message: e?.message || 'task4-runtime failed',
              details: null,
            });
          } catch { /* ignore */ }

          // task4-runtime failures flow through task-run-store (failTaskRun above).
          // execution-log and transcript persistence stays with the unified main chain
          // (POST /api/tasks/runs/:taskRunId/complete|fail), not here.

          return sendError(
            res,
            500,
            e?.code || 'TASK4_RUNTIME_FAILED',
            e?.message || 'task4-runtime failed',
            {
              taskRunId: result.taskRunId,
              fixtureId: body.fixtureId,
              runType: 'task4-runtime',
            },
            true,
          );
        }
      }

      // GET /api/tasks/runs — list runs
      if (matched === 'taskRunList') {
        const result = listRuns({
          fixtureId: parsed.searchParams.get('fixtureId') || undefined,
          parentPlanId: parsed.searchParams.get('parentPlanId') || undefined,
          status: parsed.searchParams.get('status') || undefined,
          limit: parsed.searchParams.get('limit') || '20',
          offset: parsed.searchParams.get('offset') || '0',
        });
        return json(res, apiSuccess(result), 200, requestId);
      }

      // GET /api/tasks/runs/:taskRunId — full lineage (aggregated cross-store)
      if (matched && matched.route === 'taskRunDetail') {
        const lineage = getLineage(matched.taskRunId);
        if (!lineage) {
          return sendError(res, 404, 'NOT_FOUND', `Task run not found: ${matched.taskRunId}`);
        }

        // Cross-reference execution-log-store for ledger entries
        let execLogEntries = [];
        try {
          execLogEntries = listExecLog().filter((e) => {
            const refs = e.evidenceRefs;
            return refs && refs.taskRunId === matched.taskRunId;
          });
        } catch { /* non-critical */ }

        // Cross-reference transcript-store for evidence with unified contract
        let transcript = null;
        try {
          const fixtureId = lineage.init?.fixtureId || null;
          const executionIds = [
            ...new Set(
              execLogEntries
                .map((el) => (typeof el.executionId === 'string' ? el.executionId.trim() : ''))
                .filter(Boolean),
            ),
          ];

          const allTranscripts = listTranscripts();
          const selected = executionIds.length > 0
            ? allTranscripts.filter((t) => executionIds.includes(t.executionId))
            : [];

          const toLifecycleStatus = (entries = []) => {
            if (!entries.length) return null;
            const statuses = entries.map((e) => String(e?.status || '').toLowerCase());
            if (statuses.some((s) => s === 'error' || s === 'failed')) return 'failed';

            const terminalEvents = lineage.events.filter((e) => e.event === 'task-run-completed' || e.event === 'task-run-failed');
            const hasTerminal = terminalEvents.length > 0;
            const latestTerminalAt = hasTerminal
              ? terminalEvents.map((e) => e.recordedAt || '').sort().at(-1)
              : null;
            const latestTranscriptAt = entries.map((e) => e.timestamp || '').sort().at(-1);

            if (hasTerminal && latestTerminalAt && latestTranscriptAt && latestTranscriptAt <= latestTerminalAt) {
              return 'finalized';
            }
            return 'collecting';
          };

          {
            const lifecycleStatus = toLifecycleStatus(selected);
            transcript = {
              id: executionIds.length === 1 ? executionIds[0] : executionIds,
              source: 'executionId',
              status: lifecycleStatus,
              refs: selected.map((t) => ({
                transcriptId: t.transcriptId,
                provider: t.provider,
                model: t.model,
                timestamp: t.timestamp,
                status: t.status,
                executionTimeMs: t.executionTimeMs,
                executionId: t.executionId ?? null,
                caseId: t.caseId ?? null,
              })),
              count: selected.length,
              fixtureId,
              resolution: selected.length > 0 ? 'primary' : 'legacy-fallback',
            };
          }
        } catch { /* non-critical */ }

        return json(res, apiSuccess({
          ...lineage,
          executionLog: execLogEntries.length > 0 ? execLogEntries : null,
          transcript,
        }), 200, requestId);
      }

      // POST /api/tasks/runs/:taskRunId/start
      if (matched && matched.route === 'taskRunStart') {
        const body = await parseBody(req, res);
        if (timeoutTriggered || body === null) return;
        const result = startTaskRun(matched.taskRunId);
        return json(res, apiSuccess(result), 200, requestId);
      }

      // POST /api/tasks/runs/:taskRunId/complete
      if (matched && matched.route === 'taskRunComplete') {
        const body = await parseBody(req, res);
        if (timeoutTriggered || body === null) return;
        const result = completeTaskRun(matched.taskRunId, {
          durationMs: body.durationMs ?? undefined,
          message: body.message ?? undefined,
        });

        // Write to execution-log (primary ledger)
        if (result.ok) {
          try {
            const lineage = getLineage(matched.taskRunId);
            if (lineage?.init) {
              const rawInput = body.input || null;
              const rawOutput = body.output || body.message || null;
              const planId = lineage?.init?.parentPlanId ?? body.planId ?? null;
              const execEntry = buildExecutionLogEntry({
                fixtureId: lineage.init.fixtureId,
                status: 'completed',
                source: 'task-run',
                durationMs: result.durationMs,
                evidenceRefs: { taskRunId: matched.taskRunId, planId },
                rawInput: typeof rawInput === 'string' ? rawInput : null,
                rawOutput: typeof rawOutput === 'string' ? rawOutput : null,
              });
              // Attach planRef if provided via body
              const planRef = typeof body.planRef === 'string' && body.planRef.trim() ? body.planRef.trim() : null;
              if (planRef) execEntry.planRef = planRef;
              saveExecLog(execEntry);
            }
          } catch (e) {
            console.error('[task-run] execution-log write failed (non-fatal):', e.message);
          }

          // Write evidence snapshot
          try {
            const lineage2 = getLineage(matched.taskRunId);
            const executionId = lineage2?.init?.executionId ?? null;
            const fixtureId = lineage2?.init?.fixtureId ?? null;
            const timeline = Array.isArray(lineage2?.events)
              ? lineage2.events.map((e) => ({ event: e.event, recordedAt: e.recordedAt }))
              : [];
            const allTranscripts = listTranscripts();
            const transcriptRefs = executionId
              ? allTranscripts
                .filter((t) => t.executionId === executionId)
                .map((t) => ({
                  transcriptId: t.transcriptId,
                  executionId: t.executionId ?? null,
                  provider: t.provider,
                  model: t.model,
                  timestamp: t.timestamp,
                  status: t.status,
                }))
              : [];
            const artifactIds = Array.isArray(lineage2?.artifacts)
              ? lineage2.artifacts.map((a) => a.artifactId).filter(Boolean)
              : [];

            const requestSummary = {
              message: body.message ?? null,
              durationMs: body.durationMs ?? null,
              hasInput: body.input != null,
              hasOutput: body.output != null,
            };
            const responseSummary = {
              ok: result.ok,
              status: result.status,
              completedAt: result.completedAt ?? null,
              durationMs: result.durationMs ?? null,
            };

            writeTaskRunEvidenceSnapshot(matched.taskRunId, {
              taskRunId: matched.taskRunId,
              executionId,
              fixtureId,
              timeline,
              transcriptRefs,
              artifactIds,
              requestSummary,
              responseSummary,
            });
          } catch (e) {
            console.error('[task-run] evidence snapshot write failed (non-fatal):', e.message);
          }
        }

        return json(res, apiSuccess(result), 200, requestId);
      }

      // POST /api/tasks/runs/:taskRunId/fail
      if (matched && matched.route === 'taskRunFail') {
        const body = await parseBody(req, res);
        if (timeoutTriggered || body === null) return;
        const result = failTaskRun(matched.taskRunId, {
          code: body.code ?? 'UNKNOWN',
          message: body.message ?? 'Task run failed',
          details: body.details ?? null,
        });

        // Write to execution-log (primary ledger)
        if (result.ok) {
          try {
            const lineage = getLineage(matched.taskRunId);
            if (lineage?.init) {
              const rawInput = body.input || null;
              const rawOutput = body.output || body.message || null;
              const planId = lineage?.init?.parentPlanId ?? body.planId ?? null;
              const execEntry = buildExecutionLogEntry({
                fixtureId: lineage.init.fixtureId,
                status: 'failed',
                source: 'task-run',
                errorMessage: `${result.errorCode}: ${body.message ?? 'Task run failed'}`,
                evidenceRefs: { taskRunId: matched.taskRunId, planId },
                rawInput: typeof rawInput === 'string' ? rawInput : null,
                rawOutput: typeof rawOutput === 'string' ? rawOutput : null,
              });
              // Attach planRef if provided via body
              const planRef = typeof body.planRef === 'string' && body.planRef.trim() ? body.planRef.trim() : null;
              if (planRef) execEntry.planRef = planRef;
              saveExecLog(execEntry);
            }
          } catch (e) {
            console.error('[task-run] execution-log write failed (non-fatal):', e.message);
          }
        }

        return json(res, apiSuccess(result), 200, requestId);
      }

      // POST /api/tasks/runs/:taskRunId/output
      if (matched && matched.route === 'taskRunOutput') {
        const body = await parseBody(req, res);
        if (timeoutTriggered || body === null) return;
        const result = recordOutput(matched.taskRunId, {
          kind: body.kind ?? 'result',
          content: body.content ?? null,
          payload: body.payload ?? null,
        });

        // Bridge to transcript-store for evidence outputs
        if (result.ok && ['transcript', 'evidence'].includes(body.kind ?? '')) {
          try {
            const lineage = getLineage(matched.taskRunId);
            const realExecutionId = lineage?.init?.executionId;
            saveTranscript({
              transcriptId: `task-run:${matched.taskRunId}:${Date.now()}`,
              provider: 'task-run',
              model: 'system',
              caseId: matched.taskRunId,
              fixtureId: lineage?.init?.fixtureId ?? null,
              executionId: realExecutionId,
              timestamp: new Date().toISOString(),
              executionTimeMs: 0,
              status: 'completed',
              output: {
                role: 'system',
                content: body.content ?? '',
                finishReason: null,
              },
              sourceRefs: { taskRunId: matched.taskRunId, kind: body.kind },
            });
          } catch (e) {
            console.error('[task-run] transcript-store bridge failed (non-fatal):', e.message);
          }
        }

        return json(res, apiSuccess(result), 200, requestId);
      }

      if (matched === 'runCenterSummary') {
        return json(res, apiSuccess(buildRunsSummary()), 200, requestId);
      }

      if (matched === 'runCenterRunCreate') {
        const body = await parseBody(req, res);
        if (timeoutTriggered || body === null) return;

        const fixtureId = body.fixtureId;
        if (!fixtureId) return sendError(res, 400, 'INVALID_INPUT', 'fixtureId is required');

        const gate = evaluateRunApprovalGate(fixtureId);
        if (!gate.allowed) {
          return sendError(
            res,
            409,
            gate.code || 'APPROVAL_NOT_APPROVED',
            gate.message || 'Run blocked: approval is not approved',
            {
              fixtureId,
              approvalStatus: gate.status,
              lastEventId: gate.lastEventId,
            },
            false,
          );
        }

        const consumedPlanRef = {
          fixtureId,
          version: typeof body.stepPlanVersion === 'string' ? body.stepPlanVersion : null,
          eventId: typeof body.stepPlanEventId === 'string' ? body.stepPlanEventId : null,
          ref: typeof body.stepPlanRef === 'string' ? body.stepPlanRef : null,
        };

        const consumedPromptRef = {
          fixtureId,
          version: typeof body.promptDraftVersion === 'string' ? body.promptDraftVersion : null,
          eventId: typeof body.promptDraftEventId === 'string' ? body.promptDraftEventId : null,
          ref: typeof body.promptDraftRef === 'string' ? body.promptDraftRef : null,
        };

        const approvalRef = {
          fixtureId,
          status: gate.status,
          lastEventId: gate.lastEventId ?? null,
        };

        const runRecord = buildExecutionLogEntry({
          fixtureId,
          status: 'completed',
          source: 'run-center-api',
          steps: { review: true, prep: true, registry: true },
          durationMs: 0,
        });

        runRecord.consumedPlanRef = consumedPlanRef;
        runRecord.consumedPromptRef = consumedPromptRef;
        runRecord.approvalRef = approvalRef;

        saveExecLog(runRecord);

        return json(res, apiSuccess({
          accepted: true,
          runId: runRecord.executionId,
          fixtureId,
          approvalStatus: gate.status,
          gate: 'passed',
          consumedPlanRef,
          consumedPromptRef,
          approvalRef,
          message: 'Approval gate passed; run request persisted with version-bound refs.',
        }), 202, requestId);
      }

      if (matched === 'runCenterRuns') {
        const result = buildRunsList({
          limit: parsed.searchParams.get('limit') || '20',
          offset: parsed.searchParams.get('offset') || '0',
        });
        return json(res, apiSuccess(result), 200, requestId);
      }

      if (matched && matched.route === 'runCenterDetail') {
        const detail = buildRunDetail(matched.runId);
        if (!detail) {
          return sendError(res, 404, 'NOT_FOUND', `Run not found: ${matched.runId}`);
        }
        return json(res, apiSuccess(detail), 200, requestId);
      }

      if (matched && matched.route === 'runCenterArtifacts') {
        const item = getRunLogByRunId(matched.runId);
        if (!item) {
          return sendError(res, 404, 'NOT_FOUND', `Run not found: ${matched.runId}`);
        }
        const artifacts = mapRunArtifactsPayload(item);
        return json(res, apiSuccess(artifacts), 200, requestId);
      }

      return sendError(res, 404, 'NOT_FOUND', `Unknown API route: ${method} ${pathname}`);
    } catch (err) {
      if (res.writableEnded) return;
      const msg = err.message || '';
      // Detect state transition conflicts from task-run-store
      if (msg.includes('Cannot start') || msg.includes('Cannot fail') || msg.includes('Cannot complete') || msg.includes('current status')) {
        return sendError(res, 409, 'STATE_CONFLICT', msg, null, false);
      }
      // Detect not-found from task-run-store
      if (msg.includes('not found')) {
        return sendError(res, 404, 'NOT_FOUND', msg, null, false);
      }
      const status = err?.status || (err?.code === 'STATE_CONFLICT' ? 409 : err?.code === 'INVALID_JSON' ? 400 : 500);
      const code = err?.code === 'STATE_CONFLICT'
        ? 'STATE_CONFLICT'
        : err?.code === 'BATCH_LIMIT_EXCEEDED'
          ? 'BATCH_LIMIT_EXCEEDED'
          : err?.code === 'INVALID_JSON'
            ? 'INVALID_JSON'
            : 'INTERNAL_ERROR';
      const retryable = status >= 500 || status === 409 || status === 408;
      return sendError(res, status, code, msg || 'Internal error', err?.details || null, retryable);
    }
  }

  serveStatic(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(`[boot] SkillForge Web API Server listening on http://${HOST}:${PORT}`);
  console.log(`[boot] Config: HOST=${HOST}, PORT=${PORT}, BODY_LIMIT=${MAX_BODY_BYTES} bytes, REQUEST_TIMEOUT_MS=${REQUEST_TIMEOUT_MS}`);
  console.log(`   API base: http://localhost:${PORT}/api`);
  console.log(`   Approval queue: http://localhost:${PORT}/api/approvals/queue`);
  console.log();
  console.log('   To run with Vite dev server:');
  console.log('     1. cd web && npm install && npx vite');
  console.log('     2. The Vite dev server proxies /api to this server');
  console.log();
  console.log('   Or build and serve from here:');
  console.log('     1. cd web && npm install && npm run build');
  console.log(`     2. node web-server.mjs  (then open http://localhost:${PORT})`);
});