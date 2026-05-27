/**
 * API 适配层 —— 前端唯一协议入口
 *
 * 职责：
 *   1. 统一解包后端 { ok, data, error } 响应信封
 *   2. 统一抛/返标准错误对象（status, code, retryable）
 *   3. 页面组件只消费此层输出的稳定 view model，不再解析原始字段
 */

const BASE = '/api';

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const asObject = (v) => (isObject(v) ? v : {});
const asArray = (v) => (Array.isArray(v) ? v : []);

function normalizeDecision(rawDecision, fallbackStatus = null) {
  const value = String(rawDecision || '').trim().toLowerCase();
  if (['approved', 'approve', 'allow', 'grant', 'granted'].includes(value)) return 'approved';
  if (['rejected', 'reject', 'deny', 'denied'].includes(value)) return 'rejected';

  const statusValue = String(fallbackStatus || '').trim().toLowerCase();
  if (['approved', 'granted'].includes(statusValue)) return 'approved';
  if (['rejected', 'denied'].includes(statusValue)) return 'rejected';
  return 'pending';
}

function adaptApprovalPayload(payload = {}) {
  const safePayload = asObject(payload);

  const approvalRaw = asObject(safePayload.approval);
  const approval = Object.keys(approvalRaw).length > 0
    ? { ...approvalRaw, decision: normalizeDecision(approvalRaw.decision, approvalRaw.status) }
    : null;

  const historyRaw = asObject(safePayload.history);
  const history = Object.keys(historyRaw).length > 0
    ? { ...historyRaw, decision: normalizeDecision(historyRaw.decision, historyRaw.approvalStatus || historyRaw.status) }
    : null;

  const items = asArray(safePayload.items)
    .filter((item) => isObject(item))
    .map((item) => ({
      ...item,
      decision: normalizeDecision(item.decision, item.approvalStatus || item.status),
    }));

  const events = asArray(safePayload.events)
    .filter((event) => isObject(event))
    .map((event) => (Object.prototype.hasOwnProperty.call(event, 'decision')
      ? { ...event, decision: normalizeDecision(event.decision, event.status) }
      : event));

  return {
    ...safePayload,
    decision: normalizeDecision(safePayload.decision, safePayload.status),
    approval,
    history,
    items,
    events,
  };
}

// ── 错误工厂 ──

/**
 * 从后端 API 响应构建标准化错误。
 * 优先使用后端结构化 error 对象，回退到 HTTP 状态。
 */
function createApiError(res, body) {
  const errInfo = body?.error || {};
  const message = errInfo.message || `HTTP ${res.status}`;
  const err = new Error(message);
  err.status = res.status;
  err.code = errInfo.code || null;
  err.retryable = errInfo.retryable ?? (res.status >= 500 || res.status === 409);
  err.details = errInfo.details || null;
  return err;
}

function networkError() {
  const err = new Error('网络异常，请检查连接后重试');
  err.status = 0;
  err.code = 'NETWORK_ERROR';
  err.retryable = true;
  return err;
}

// ── 响应解包 ──

/**
 * 解包后端统一响应信封 { ok, data, error }。
 * 成功 → 返回 data；失败 → 抛出标准化错误。
 */
function unwrap(res, body) {
  if (!res.ok || body?.ok === false) {
    throw createApiError(res, body);
  }
  return adaptApprovalPayload(asObject(body?.data));
}

// ── 基础请求 ──

async function request(path) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`);
  } catch {
    throw networkError();
  }
  const body = await res.json().catch(() => ({}));
  return unwrap(res, body);
}

async function post(path, payload) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw networkError();
  }
  const body = await res.json().catch(() => ({}));
  return unwrap(res, body);
}

// ── 对外 API ──

/** 审批队列列表 → { items: [...] } */
export async function fetchApprovalQueue() {
  return request('/approvals/queue');
}

/** 审批详情 → { fixtureId, risk, review, approval, events, conflict } */
export async function fetchApprovalDetail(fixtureId) {
  return request(`/approvals/${encodeURIComponent(fixtureId)}`);
}

/** 通过审批 → { requestId, status, decision, eventId } */
export async function grantApproval(fixtureId, { reason, expectedLastEventId } = {}) {
  return post('/approvals/grant', { fixtureId, reason, expectedLastEventId });
}

/** 拒绝审批 → { requestId, status, decision, eventId } */
export async function denyApproval(fixtureId, { reason, expectedLastEventId } = {}) {
  return post('/approvals/deny', { fixtureId, reason, expectedLastEventId });
}

/** 风险摘要 → { requestId, riskType, riskLevel, status } */
export async function fetchFixtureSummary(fixtureId) {
  return request(`/fixtures/${encodeURIComponent(fixtureId)}/summary`);
}

/** 历史列表 → { items: [...] } */
export async function fetchHistoryList(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.skill) params.set('skill', filters.skill);
  if (filters.since) params.set('since', filters.since);
  if (filters.until) params.set('until', filters.until);
  if (filters.sort) params.set('sort', filters.sort);
  const qs = params.toString();
  return request(`/history${qs ? `?${qs}` : ''}`);
}

/** 历史详情 → { fixtureId, risk, review, approval, events, history, conflict } */
export async function fetchHistoryDetail(fixtureId) {
  return request(`/history/${encodeURIComponent(fixtureId)}`);
}

/** 运行中心摘要（只读） */
export async function getRunCenterSummary() {
  return request('/run-center/summary');
}

/** 运行列表（只读） */
export async function getRunCenterRuns(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    qs.set(key, String(value));
  });
  return request(`/run-center/runs${qs.toString() ? `?${qs.toString()}` : ''}`);
}

/** 运行详情（只读） */
export async function getRunCenterRunDetail(runId) {
  return request(`/run-center/runs/${encodeURIComponent(runId)}`);
}

// 兼容旧调用（后续可清理）
export const fetchRunSummary = getRunCenterSummary;
export const fetchRunList = getRunCenterRuns;
export const fetchRunDetail = getRunCenterRunDetail;

/** 知识资产列表（只读） */
export async function getKnowledgeAssets(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    qs.set(key, String(value));
  });
  return request(`/knowledge-assets${qs.toString() ? `?${qs.toString()}` : ''}`);
}

/** 知识资产详情（只读） */
export async function getKnowledgeAssetDetail(assetId) {
  return request(`/knowledge-assets/${encodeURIComponent(assetId)}`);
}
