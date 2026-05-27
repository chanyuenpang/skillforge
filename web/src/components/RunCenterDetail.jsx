import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { fetchRunDetail } from '../api';

// ─── helpers (unchanged) ───

function toPairs(data = {}, keys = [], labelMap = {}) {
  return keys
    .map((key) => ({ label: labelMap[key] || key, value: data?.[key] }))
    .filter((item) => item.value !== undefined && item.value !== null && item.value !== '');
}

function formatTime(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

function formatDuration(ms) {
  const value = Number(ms);
  if (!Number.isFinite(value) || value < 0) return '-';
  if (value < 1000) return `${Math.round(value)}ms`;
  if (value < 60_000) return `${(value / 1000).toFixed(1)}s`;
  return `${(value / 60_000).toFixed(1)}min`;
}

const SENSITIVE_KEY_RE = /(token|secret|password|passwd|api[_-]?key|cookie|authorization|bearer|session|credential|private[_-]?key|internal|host|url|endpoint|prompt)/i;

function getByPath(source, path) {
  if (!source || !path) return undefined;
  const parts = String(path).split('.').filter(Boolean);
  let curr = source;
  for (const part of parts) {
    if (curr == null || typeof curr !== 'object') return undefined;
    curr = curr[part];
  }
  return curr;
}

function redactValue(value, keyHint = '') {
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    const compact = value.replace(/\s+/g, ' ').trim();
    if (!compact) return compact;
    if (SENSITIVE_KEY_RE.test(keyHint)) return '[REDACTED]';
    if (compact.length > 180) return `${compact.slice(0, 180)}… [TRUNCATED]`;
    return compact;
  }

  if (typeof value === 'number' || typeof value === 'boolean') return value;

  if (Array.isArray(value)) {
    return value.slice(0, 6).map((item) => redactValue(item, keyHint));
  }

  if (typeof value === 'object') {
    const out = {};
    Object.entries(value).slice(0, 10).forEach(([k, v]) => {
      out[k] = SENSITIVE_KEY_RE.test(k) ? '[REDACTED]' : redactValue(v, k);
    });
    return out;
  }

  return String(value);
}

function toSummaryText(value) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'string') return redactValue(value);
  try {
    return JSON.stringify(redactValue(value));
  } catch {
    return String(value);
  }
}

function pickFirst(source, paths = []) {
  for (const path of paths) {
    const value = getByPath(source, path);
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return null;
}

function getSkillForgeLayers(detail = {}) {
  const fromPlan = pickFirst(detail, [
    'skillForge.planReview',
    'skillforge.planReview',
    'consumedPlanRef',
    'planReview',
  ]);
  const fromPrompt = pickFirst(detail, [
    'skillForge.promptOptimize',
    'skillforge.promptOptimize',
    'consumedPromptRef',
    'promptOptimize',
  ]);
  const fromPrep = pickFirst(detail, [
    'skillForge.preSpawnMaterial',
    'skillforge.preSpawnMaterial',
    'preSpawnMaterial',
    'approvalRef',
  ]);
  const fromRuntime = pickFirst(detail, [
    'skillForge.runtimeRecord',
    'skillforge.runtimeRecord',
    'runtimeRecord',
    'steps',
    'events',
  ]);

  return [
    { key: 'plan-review', title: 'Plan Review', sourceLevel: 'plan review', payload: fromPlan },
    { key: 'prompt-optimize', title: 'Prompt Optimize', sourceLevel: 'prompt optimize', payload: fromPrompt },
    { key: 'pre-spawn-material', title: 'Spawn 前材料', sourceLevel: 'spawn 前材料', payload: fromPrep },
    { key: 'runtime-record', title: '运行记录', sourceLevel: '运行记录', payload: fromRuntime },
  ];
}

function collectByKeys(source, keys = []) {
  if (!source || typeof source !== 'object') return [];
  const out = [];
  keys.forEach((key) => {
    const value = source[key];
    if (value !== undefined && value !== null && value !== '') {
      out.push({ key, value });
    }
  });
  return out;
}

function toPreviewString(value) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'string') return redactValue(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(redactValue(value));
  } catch {
    return String(value);
  }
}

function buildObservability(detail = {}) {
  const inputCandidates = collectByKeys(detail, ['input', 'inputs', 'request', 'payload', 'params', 'args', 'context']);
  const outputCandidates = collectByKeys(detail, ['output', 'outputs', 'result', 'response', 'data', 'returnValue']);
  const errorCandidates = collectByKeys(detail, ['errorMessage', 'error', 'reason', 'failureReason', 'code']);
  const logCandidates = collectByKeys(detail, ['logs', 'log', 'stdout', 'stderr', 'events']);
  const evidenceCandidates = collectByKeys(detail, ['evidence', 'evidenceAnchors', 'anchors', 'transcripts', 'transcript', 'transcriptRef']);

  return {
    input: inputCandidates,
    output: outputCandidates,
    error: errorCandidates,
    log: logCandidates,
    evidence: evidenceCandidates,
  };
}

// ─── human-readable extraction helpers (new) ───

/**
 * Extract human-readable content from a transcript-like object.
 * Handles both flat {messages:[], output:...} and structured formats.
 */
function extractFromTranscript(tObj) {
  if (!tObj || typeof tObj !== 'object') return null;

  // direct content fields
  const directFields = ['content', 'message', 'text', 'body', 'query'];
  for (const f of directFields) {
    const v = tObj[f];
    if (v && typeof v === 'string' && v.trim()) return v.trim();
  }

  // messages array (chat format)
  if (Array.isArray(tObj.messages)) {
    for (const m of [...tObj.messages].reverse()) {
      if (m && typeof m === 'object' && m.content) {
        const c = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
        if (c.trim()) return c.trim();
      }
    }
  }

  return null;
}

/**
 * Extract human-readable INPUT from the detail object.
 * Priority:
 *   1. inputMessage / raw input content / 原始可读正文
 *   2. inputSummary
 *   3. structured fields in input object
 */
function extractHumanInput(detail = {}) {
  // P1: explicit raw input
  const rawInput = detail.rawInput;
  if (rawInput && typeof rawInput === 'string' && rawInput.trim()) {
    return { source: 'rawInput', content: rawInput.trim(), isRaw: true };
  }

  // backward compatible message field
  const explicitMsg = detail.inputMessage || detail.input_message;
  if (explicitMsg && typeof explicitMsg === 'string' && explicitMsg.trim()) {
    return { source: 'inputMessage', content: explicitMsg.trim(), isRaw: true };
  }

  // try input object
  const input = detail.input;
  if (input) {
    if (typeof input === 'string' && input.trim()) {
      return { source: 'input (raw string)', content: input.trim() };
    }
    if (typeof input === 'object') {
      // direct content fields
      const contentFields = ['content', 'message', 'text', 'prompt', 'body', 'query', 'userMessage'];
      for (const f of contentFields) {
        const v = input[f];
        if (v && typeof v === 'string' && v.trim()) {
          return { source: `input.${f}`, content: v.trim() };
        }
      }
      // messages array
      if (Array.isArray(input.messages)) {
        const userMsgs = input.messages.filter((m) => m && m.role === 'user');
        if (userMsgs.length > 0) {
          const last = userMsgs[userMsgs.length - 1];
          const c = typeof last.content === 'string' ? last.content : JSON.stringify(last.content);
          if (c.trim()) return { source: 'input.messages (user)', content: c.trim() };
        }
      }
    }
  }

  // try transcript
  const transcript = detail.transcript || detail.transcriptRef;
  if (transcript) {
    if (typeof transcript === 'string' && transcript.trim()) {
      return { source: 'transcript', content: transcript.trim() };
    }
    if (typeof transcript === 'object') {
      const fromT = extractFromTranscript(transcript);
      if (fromT) return { source: 'transcript', content: fromT };
      // check transcript.input specifically
      if (transcript.input && typeof transcript.input === 'string' && transcript.input.trim()) {
        return { source: 'transcript.input', content: transcript.input.trim() };
      }
    }
  }

  // P2: inputSummary
  const inputSummary = detail.inputSummary || detail.input_summary;
  if (inputSummary && typeof inputSummary === 'string' && inputSummary.trim()) {
    return { source: 'inputSummary', content: inputSummary.trim(), isSummary: true };
  }

  return null;
}

/**
 * Extract human-readable OUTPUT from the detail object.
 * Priority:
 *   1) failureMessage（失败态优先）
 *   2) outputMessage
 *   3) 其他 raw output 来源
 *   4) failureSummary / outputSummary
 */
function extractHumanOutput(detail = {}) {
  const normalizedStatus = String(detail.status || '').toLowerCase();
  const isFailedStatus = normalizedStatus === 'failed' || normalizedStatus === 'error';

  const failureMsg = detail.failureMessage || detail.failure_message;
  if (failureMsg && typeof failureMsg === 'string' && failureMsg.trim()) {
    return { source: 'failureMessage', category: 'failure', content: failureMsg.trim() };
  }

  const rawOutput = detail.rawOutput;
  if (rawOutput && typeof rawOutput === 'string' && rawOutput.trim()) {
    return {
      source: 'rawOutput',
      category: isFailedStatus ? 'failure' : 'success',
      content: rawOutput.trim(),
      isRaw: true,
    };
  }

  const outputMsg = detail.outputMessage || detail.output_message;
  if (outputMsg && typeof outputMsg === 'string' && outputMsg.trim()) {
    return {
      source: 'outputMessage',
      category: isFailedStatus ? 'failure' : 'success',
      content: outputMsg.trim(),
      isRaw: true,
    };
  }

  // raw output object
  const output = detail.output;
  if (output) {
    if (typeof output === 'string' && output.trim()) {
      return { source: 'output (raw string)', category: isFailedStatus ? 'failure' : 'success', content: output.trim() };
    }
    if (typeof output === 'object') {
      const contentFields = ['content', 'message', 'text', 'result', 'response', 'body', 'data'];
      for (const f of contentFields) {
        const v = output[f];
        if (v && typeof v === 'string' && v.trim()) {
          return { source: `output.${f}`, category: isFailedStatus ? 'failure' : 'success', content: v.trim() };
        }
      }
      if (Array.isArray(output.messages)) {
        const assistantMsgs = output.messages.filter((m) => m && m.role === 'assistant');
        if (assistantMsgs.length > 0) {
          const last = assistantMsgs[assistantMsgs.length - 1];
          const c = typeof last.content === 'string' ? last.content : JSON.stringify(last.content);
          if (c.trim()) {
            return {
              source: 'output.messages (assistant)',
              category: isFailedStatus ? 'failure' : 'success',
              content: c.trim(),
            };
          }
        }
      }
    }
  }

  // transcript/raw conversation output
  const transcript = detail.transcript || detail.transcriptRef;
  if (transcript && typeof transcript === 'object') {
    const fromT = extractFromTranscript(transcript);
    if (fromT) return { source: 'transcript', category: isFailedStatus ? 'failure' : 'success', content: fromT };
    if (transcript.output && typeof transcript.output === 'string' && transcript.output.trim()) {
      return { source: 'transcript.output', category: isFailedStatus ? 'failure' : 'success', content: transcript.output.trim() };
    }
  }

  // fallback failure/error text
  const errorMsg = detail.errorMessage;
  if (errorMsg && typeof errorMsg === 'string' && errorMsg.trim()) {
    return { source: 'errorMessage', category: 'failure', content: errorMsg.trim() };
  }

  const error = detail.error;
  if (error) {
    if (typeof error === 'string' && error.trim()) {
      return { source: 'error', category: 'failure', content: error.trim() };
    }
    if (typeof error === 'object') {
      const em = error.message || error.reason || error.description;
      if (em && typeof em === 'string' && em.trim()) {
        return { source: 'error.message', category: 'failure', content: em.trim() };
      }
    }
  }

  const failureSummary = detail.failureSummary || detail.failure_summary;
  if (failureSummary && typeof failureSummary === 'string' && failureSummary.trim()) {
    return { source: 'failureSummary', category: 'failure', content: failureSummary.trim(), isSummary: true };
  }

  const outputSummary = detail.outputSummary || detail.output_summary;
  if (outputSummary && typeof outputSummary === 'string' && outputSummary.trim()) {
    return { source: 'outputSummary', category: isFailedStatus ? 'failure' : 'success', content: outputSummary.trim(), isSummary: true };
  }

  return null;
}

// ─── UI blocks (unchanged) ───

function BackChain({ fromPath, onFallbackBack }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <button className="btn btn-ghost" onClick={onFallbackBack}>
        ← 返回
      </button>
      <Link className="btn btn-ghost" to={fromPath || '/run-center/runs'}>
        返回运行列表
      </Link>
      <Link className="btn btn-ghost" to="/run-center">
        返回总览
      </Link>
    </div>
  );
}

function NotFoundBlock({ runId, fromPath, onFallbackBack }) {
  return (
    <div className="empty-state" style={{ marginTop: 12 }} role="status">
      <div className="empty-icon">🧭</div>
      <p>未找到运行详情（404）</p>
      <p className="text-muted" style={{ marginTop: 4 }}>
        runId: <code>{runId}</code> 可能不存在，或已被清理。
      </p>
      <div style={{ marginTop: 10 }}>
        <BackChain fromPath={fromPath} onFallbackBack={onFallbackBack} />
      </div>
    </div>
  );
}

function ErrorBlock({ message, onRetry, fromPath, onFallbackBack }) {
  return (
    <div className="error-block" role="alert" style={{ marginTop: 12 }}>
      <div className="error-block-icon">⚠️</div>
      <p className="error-block-message">详情加载失败：{message}</p>
      <p className="error-block-hint">你可以重试，或先回到列表继续处理其它运行。</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
        <button className="btn btn-primary" onClick={onRetry}>🔄 重试</button>
        <BackChain fromPath={fromPath} onFallbackBack={onFallbackBack} />
      </div>
    </div>
  );
}

function AbnormalDataBlock({ runId, fromPath, onFallbackBack }) {
  return (
    <div className="error-block" role="alert" style={{ marginTop: 12 }}>
      <div className="error-block-icon">🧩</div>
      <p className="error-block-message">详情数据异常，无法完整展示</p>
      <p className="error-block-hint">
        runId: <code>{runId}</code> 返回内容不符合预期结构。建议先回到列表继续操作，稍后重试。
      </p>
      <div style={{ marginTop: 8 }}>
        <BackChain fromPath={fromPath} onFallbackBack={onFallbackBack} />
      </div>
    </div>
  );
}

// ─── summary display components (new) ───

const TRUNCATE_LEN = 600;

function HumanSummaryBlock({ icon, label, content, sourceHint, variant = 'default' }) {
  const [expanded, setExpanded] = useState(false);
  if (!content) return null;

  const needsTrunc = content.length > TRUNCATE_LEN;
  const display = needsTrunc && !expanded ? content.slice(0, TRUNCATE_LEN) + '…' : content;

  const variantStyle =
    variant === 'failure'
      ? { borderLeft: '3px solid var(--danger)', background: 'var(--danger-soft)' }
      : variant === 'success'
        ? { borderLeft: '3px solid var(--success, #16a34a)' }
        : {};

  return (
    <div style={{ marginBottom: 14 }}>
      <h4 style={{ margin: '0 0 6px', fontSize: '0.9rem', fontWeight: 600 }}>
        {icon} {label}
      </h4>
      <div
        style={{
          ...variantStyle,
          padding: '12px 14px',
          borderRadius: 8,
          fontSize: '0.89rem',
          lineHeight: 1.65,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          maxHeight: expanded ? 'none' : undefined,
          overflow: 'hidden',
          fontFamily: 'var(--font-sans)',
        }}
      >
        {display}
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 4, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
        {sourceHint && <span>来源: {sourceHint}</span>}
        {needsTrunc && (
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: '0.72rem', padding: '2px 6px' }}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? '▲ 收起' : '▼ 展开全部'}
          </button>
        )}
      </div>
    </div>
  );
}

function MetaBar({ runId, status, workflowName }) {
  const items = [];
  if (runId) items.push(<span key="id">运行编号: <code style={{ fontSize: '0.8rem' }}>{runId}</code></span>);
  if (status) {
    const color = status === 'failed' || status === 'error' ? 'var(--danger)' : status === 'running' ? '#2563eb' : 'var(--text-muted)';
    items.push(<span key="st" style={{ color }}>状态: {status}</span>);
  }
  if (workflowName) items.push(<span key="wf" style={{ color: 'var(--text-muted)' }}>{workflowName}</span>);
  if (items.length === 0) return null;

  return (
    <div style={{
      display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap',
      padding: '8px 0', borderTop: '1px solid var(--border, #e2e8f0)',
      marginTop: 12, fontSize: '0.78rem', color: 'var(--text-muted)',
    }}>
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span style={{ color: 'var(--border)' }}>·</span>}
          {item}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── main component ───

export default function RunCenterDetail() {
  const { runId = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedLayers, setExpandedLayers] = useState({});
  const [notFound, setNotFound] = useState(false);

  const fromPath =
    typeof location.state?.from === 'string' && location.state.from.startsWith('/run-center')
      ? location.state.from
      : '/run-center/runs';

  const handleFallbackBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(fromPath, { replace: true });
  };

  const load = async (cancelledRef) => {
    if (!runId) {
      setError('缺少运行编号');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    setNotFound(false);

    try {
      const data = await fetchRunDetail(runId);
      if (cancelledRef.current) return;

      if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
        setNotFound(true);
        setDetail(null);
        return;
      }

      setDetail(data);
    } catch (err) {
      if (cancelledRef.current) return;
      const message = err?.message || '加载失败';
      const status = err?.status || err?.response?.status;
      const code = err?.code;
      const msgLower = String(message).toLowerCase();
      const is404 = status === 404 || code === 404 || msgLower.includes('404') || msgLower.includes('not found');
      if (is404) {
        setNotFound(true);
        setDetail(null);
      } else {
        setError(message);
      }
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    const cancelledRef = { current: false };
    load(cancelledRef);
    return () => {
      cancelledRef.current = true;
    };
  }, [runId]);

  const toggleLayer = (key) => {
    setExpandedLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ─── derived data ───

  const humanInput = useMemo(() => (detail ? extractHumanInput(detail) : null), [detail]);
  const humanOutput = useMemo(() => (detail ? extractHumanOutput(detail) : null), [detail]);
  const rawAvailability = detail?.rawTextAvailability || {};
  const rawAvailabilityMessage = rawAvailability?.message || null;
  const inputRawUnavailable = rawAvailability?.input?.available === false;
  const outputRawUnavailable = rawAvailability?.output?.available === false;
  const inputRawHint = rawAvailability?.inputHint || rawAvailability?.input?.hint || null;
  const outputRawHint = rawAvailability?.outputHint || rawAvailability?.output?.hint || null;
  const isFailure = humanOutput?.category === 'failure' || detail?.status === 'failed' || detail?.status === 'error';

  const metaRows = useMemo(() => {
    if (!detail) return [];
    const core = toPairs(detail, [
      'runId',
      'status',
      'workflowName',
      'source',
      'requestId',
      'fixtureId',
      'owner',
      'triggeredBy',
    ], {
      runId: '运行编号',
      status: '状态',
      workflowName: '流程名称',
      source: '来源',
      requestId: '请求编号',
      fixtureId: '样例编号',
      owner: '负责人',
      triggeredBy: '触发方式',
    });
    const duration = detail.durationMs ?? detail.costMs ?? detail.elapsedMs;
    if (duration !== undefined) {
      core.push({ label: '耗时', value: formatDuration(duration) });
    }
    return core;
  }, [detail]);

  const timelineRaw = detail?.timeline ?? detail?.events ?? [];
  const stepsRaw = detail?.steps ?? detail?.executionSteps ?? [];
  const evidenceRaw = detail?.evidenceAnchors ?? detail?.anchors ?? detail?.evidence ?? [];
  const timeline = Array.isArray(timelineRaw) ? timelineRaw : [];
  const steps = Array.isArray(stepsRaw) ? stepsRaw : [];
  const evidence = Array.isArray(evidenceRaw) ? evidenceRaw : [];
  const transcript = detail?.transcript || detail?.transcriptRef || detail?.conversation || null;
  const skillForgeLayers = useMemo(() => getSkillForgeLayers(detail || {}), [detail]);

  const hasRenderableDetail = !!detail && typeof detail === 'object';
  const abnormalData = !loading && !error && !notFound && !hasRenderableDetail;

  // ─── render ───

  return (
    <div className="run-page run-page--detail">
      {/* ================================================================ */}
      {/*  HERO CARD — 人类可读摘要 (第一屏)                                */}
      {/* ================================================================ */}
      <section className="card hero-card">
        <div className="card-header">
          <h2>运行详情</h2>
          <span className="card-header-meta">当前位置：运行中心 / 运行列表 / 运行详情</span>
        </div>
        <div className="card-body">
          {loading && <p className="subtle" style={{ marginBottom: 'var(--space-md)' }}>加载中…</p>}
          {!loading && notFound && <NotFoundBlock runId={runId} fromPath={fromPath} onFallbackBack={handleFallbackBack} />}
          {!loading && !notFound && !!error && (
            <ErrorBlock
              message={error}
              onRetry={() => load({ current: false })}
              fromPath={fromPath}
              onFallbackBack={handleFallbackBack}
            />
          )}
          {abnormalData && <AbnormalDataBlock runId={runId} fromPath={fromPath} onFallbackBack={handleFallbackBack} />}

          {!loading && !error && !notFound && hasRenderableDetail && (
            <>
              {/* 输入 — 这次运行在做什么 */}
              {!rawAvailability?.hasAnyRawText ? (
                <>
                  <HumanSummaryBlock
                    icon="📥"
                    label="这次运行在做什么"
                    content={[`当前记录未保存原文，仅展示摘要`, inputRawHint].filter(Boolean).join('\n')}
                    sourceHint={rawAvailability?.message || 'rawTextAvailability'}
                    variant="default"
                  />
                  {humanInput?.content ? (
                    <HumanSummaryBlock
                      icon="📝"
                      label="输入摘要（辅助说明）"
                      content={humanInput.content}
                      sourceHint={humanInput?.source || null}
                      variant="default"
                    />
                  ) : null}

                  <HumanSummaryBlock
                    icon={isFailure ? '❌' : '📤'}
                    label={isFailure ? '为什么失败' : '这次运行产出了什么'}
                    content={[`当前记录未保存原文，仅展示摘要`, outputRawHint].filter(Boolean).join('\n')}
                    sourceHint={rawAvailability?.message || 'rawTextAvailability'}
                    variant={isFailure ? 'failure' : 'default'}
                  />
                  {humanOutput?.content ? (
                    <HumanSummaryBlock
                      icon="📝"
                      label={isFailure ? '失败摘要（辅助说明）' : '输出摘要（辅助说明）'}
                      content={humanOutput.content}
                      sourceHint={humanOutput?.source || null}
                      variant={isFailure ? 'failure' : 'success'}
                    />
                  ) : null}
                </>
              ) : (
                <>
                  <HumanSummaryBlock
                    icon="📥"
                    label="这次运行在做什么"
                    content={detail?.rawInput || humanInput?.content || null}
                    sourceHint={detail?.rawInput ? 'rawInput' : humanInput?.source || null}
                  />

                  {/* 输出 — 这次运行产出了什么 */}
                  <HumanSummaryBlock
                    icon={isFailure ? '❌' : '📤'}
                    label={isFailure ? '为什么失败' : '这次运行产出了什么'}
                    content={detail?.rawOutput || humanOutput?.content || null}
                    sourceHint={detail?.rawOutput ? 'rawOutput' : humanOutput?.source || null}
                    variant={isFailure ? 'failure' : humanOutput ? 'success' : 'default'}
                  />
                </>
              )}

              {/* 次级元数据栏（runId 退到 footer） */}
              <BackChain fromPath={fromPath} onFallbackBack={handleFallbackBack} />
              <MetaBar
                runId={runId}
                status={detail?.status}
                workflowName={detail?.workflowName}
              />
            </>
          )}
        </div>
      </section>

      {/* ================================================================ */}
      {/*  DETAIL SECTIONS                                                 */}
      {/* ================================================================ */}
      {!loading && !error && !notFound && hasRenderableDetail && (
        <>
          {/* 元数据 — 机器 ID 等退到次级区域 */}
          <section className="detail-section">
            <h3>📋 运行信息（技术定位）</h3>
            {metaRows.length === 0 ? (
              <p className="subtle">暂无技术定位信息</p>
            ) : (
              <dl className="run-meta-grid">
                {metaRows.map((row) => (
                  <React.Fragment key={row.label}>
                    <dt>{row.label}</dt>
                    <dd>{String(row.value)}</dd>
                  </React.Fragment>
                ))}
              </dl>
            )}

            {/* 扩展关键字段 */}
            {(() => {
              const extra = toPairs(detail, ['endedAt', 'riskType', 'severity', 'transcriptCount', 'attempt', 'retryCount', 'version'], {
                endedAt: '结束时间',
                riskType: '风险类型',
                severity: '风险级别',
                transcriptCount: '记录条数',
                attempt: '尝试次数',
                retryCount: '重试次数',
                version: '版本',
              });
              if (extra.length === 0) return null;
              return (
                <>
                  <h4 style={{ marginTop: 14, marginBottom: 8, fontSize: '0.88rem', color: 'var(--muted)' }}>▸ 关键字段</h4>
                  <dl className="run-meta-grid">
                    {extra.map((row) => (
                      <React.Fragment key={row.label}>
                        <dt>{row.label}</dt>
                        <dd>{formatTime(row.value) !== '-' ? formatTime(row.value) : String(row.value)}</dd>
                      </React.Fragment>
                    ))}
                  </dl>
                </>
              );
            })()}
          </section>

          <section className="detail-section">
            <h3>📅 时间线（深入技术区）</h3>
            {timeline.length === 0 ? (
              <p className="subtle">暂无时间线</p>
            ) : (
              <ol style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 8 }}>
                {timeline.map((event, idx) => (
                  <li key={event?.id || `${event?.type || 'event'}-${idx}`}>
                    <div style={{ fontWeight: 600 }}>{event?.title || event?.type || `事件 ${idx + 1}`}</div>
                    <div className="subtle">
                      {formatTime(event?.at || event?.time || event?.timestamp)}
                      {event?.status ? ` · ${event.status}` : ''}
                    </div>
                    {event?.message && <div>{event.message}</div>}
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="detail-section">
            <h3>⚡ 执行步骤</h3>
            {steps.length === 0 ? (
              <p className="subtle">暂无步骤数据</p>
            ) : (
              <ol style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 8 }}>
                {steps.map((step, idx) => (
                  <li key={step?.id || `${step?.name || 'step'}-${idx}`}>
                    <div style={{ fontWeight: 600 }}>{step?.name || step?.title || `步骤 ${idx + 1}`}</div>
                    <div className="subtle">
                      {step?.status || 'unknown'}
                      {step?.durationMs !== undefined ? ` · ${formatDuration(step.durationMs)}` : ''}
                    </div>
                    {step?.description && <div>{step.description}</div>}
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="detail-section">
            <h3>🔍 SkillForge 输入/输出可观测</h3>
            {skillForgeLayers.every((layer) => !layer.payload) ? (
              <p className="subtle">暂无 SkillForge 观测数据</p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {skillForgeLayers.map((layer) => {
                  if (!layer.payload) return null;
                  const isExpanded = !!expandedLayers[layer.key];
                  const payloadObj = typeof layer.payload === 'object' ? layer.payload : null;

                  const summaryCandidates = [
                    payloadObj?.summary,
                    payloadObj?.message,
                    payloadObj?.description,
                    payloadObj?.errorMessage,
                    payloadObj?.error,
                    payloadObj?.reason,
                    payloadObj?.output,
                    payloadObj?.result,
                    payloadObj?.response,
                    payloadObj?.input,
                    payloadObj?.payload,
                  ];
                  const summary = payloadObj
                    ? (summaryCandidates.find((v) => v !== undefined && v !== null && v !== '') ?? '⊘ 摘要不可用')
                    : toSummaryText(layer.payload);
                  const statusVal = payloadObj?.status || payloadObj?.state || payloadObj?.result || '-';
                  const timeVal = payloadObj?.timestamp || payloadObj?.at || payloadObj?.time || payloadObj?.updatedAt || '-';
                  const taskName = payloadObj?.taskName || payloadObj?.name || payloadObj?.title || detail?.workflowName || detail?.fixtureId || '-';
                  const failureReason = payloadObj?.failureReason || payloadObj?.errorMessage || payloadObj?.error || payloadObj?.reason || null;
                  const retryInfo = payloadObj?.retryCount !== undefined ? `${payloadObj.retryCount} 次` : null;

                  return (
                    <div key={layer.key} className="layer-card">
                      <button
                        type="button"
                        className="layer-card-header"
                        onClick={() => toggleLayer(layer.key)}
                      >
                        <span>
                          {layer.title}
                          <span className="subtle" style={{ marginLeft: 8, fontSize: '0.72rem' }}>
                            [{layer.sourceLevel}]
                          </span>
                        </span>
                        <span style={{ fontSize: '0.8rem' }}>{isExpanded ? '▲' : '▼'}</span>
                      </button>

                      <div className="layer-card-summary">
                        <span className="field-label">运行编号</span>
                        <span style={{ wordBreak: 'break-all' }}>{runId}</span>
                        <span className="field-label">任务</span>
                        <span>{toSummaryText(taskName)}</span>
                        <span className="field-label">状态</span>
                        <span>{toSummaryText(statusVal)}</span>
                        <span className="field-label">时间</span>
                        <span>{formatTime(timeVal)}</span>
                        <span className="field-label">来源层级</span>
                        <span>{layer.sourceLevel}</span>
                        <span className="field-label">摘要</span>
                        <span>{toSummaryText(summary)}</span>
                        {failureReason && (
                          <>
                            <span className="field-label">失败/重试</span>
                            <span style={{ color: 'var(--danger)' }}>
                              {toSummaryText(failureReason)}
                              {retryInfo ? ` · ${retryInfo}` : ''}
                            </span>
                          </>
                        )}
                      </div>

                      {isExpanded && payloadObj && (
                        <div className="layer-card-detail">
                          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: '0.85rem' }}>
                            🔒 脱敏详情（敏感字段已移除）
                          </div>
                          <pre>
                            {JSON.stringify(redactValue(payloadObj), null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 输入/输出/错误/日志/证据 可观测分区 */}
          {(() => {
            const obs = buildObservability(detail || {});
            const allEmpty = [obs.input, obs.output, obs.error, obs.log, obs.evidence].every((a) => a.length === 0);
            if (allEmpty) return null;
            const obsSections = [
              {
                icon: '📥',
                label: '输入 (Input)',
                items: obs.input,
                human: humanInput,
                humanLabel: '输入摘要（人话）',
              },
              {
                icon: '📤',
                label: '输出 (Output)',
                items: obs.output,
                human: humanOutput,
                humanLabel: isFailure ? '失败摘要（人话）' : '输出摘要（人话）',
                humanVariant: isFailure ? 'failure' : humanOutput ? 'success' : 'default',
              },
              { icon: '❌', label: '错误 (Error)', items: obs.error },
              { icon: '📜', label: '日志 (Log)', items: obs.log },
              { icon: '🧾', label: '证据 (Evidence)', items: obs.evidence },
            ];
            return obsSections.map((section) => {
              if (section.items.length === 0) return null;
              const isInputOutputSection = section.label === '输入 (Input)' || section.label === '输出 (Output)';
              return (
                <section key={section.label} className="detail-section">
                  <h3>{section.icon} {section.label}</h3>
                  <p className="subtle" style={{ marginTop: -6, marginBottom: 10 }}>
                    {isInputOutputSection ? '主层先展示可读信息；展开后可查看技术 JSON。' : '以下为技术信息，用于排查与定位。'}
                  </p>

                  {isInputOutputSection && rawAvailabilityMessage ? (
                    <div
                      style={{
                        marginBottom: 10,
                        padding: '10px 12px',
                        borderRadius: 8,
                        borderLeft: '3px solid #f59e0b',
                        background: 'rgba(245, 158, 11, 0.12)',
                        fontSize: '0.85rem',
                        lineHeight: 1.6,
                      }}
                    >
                      ⚠️ {rawAvailabilityMessage}
                    </div>
                  ) : null}

                  {isInputOutputSection && section.label === '输入 (Input)' && inputRawUnavailable ? (
                    <div
                      style={{
                        marginBottom: 10,
                        padding: '10px 12px',
                        borderRadius: 8,
                        borderLeft: '3px solid #f59e0b',
                        background: 'rgba(245, 158, 11, 0.12)',
                        fontSize: '0.85rem',
                        lineHeight: 1.6,
                      }}
                    >
                      {inputRawHint || '当前记录未保存输入原文'}
                    </div>
                  ) : isInputOutputSection && section.label === '输出 (Output)' && outputRawUnavailable ? (
                    <div
                      style={{
                        marginBottom: 10,
                        padding: '10px 12px',
                        borderRadius: 8,
                        borderLeft: '3px solid #f59e0b',
                        background: 'rgba(245, 158, 11, 0.12)',
                        fontSize: '0.85rem',
                        lineHeight: 1.6,
                      }}
                    >
                      {outputRawHint || '当前记录未保存输出原文'}
                    </div>
                  ) : isInputOutputSection && section.human?.content ? (
                    <HumanSummaryBlock
                      icon={section.icon}
                      label={section.humanLabel}
                      content={section.human.content}
                      sourceHint={section.human.source || null}
                      variant={section.humanVariant || 'default'}
                    />
                  ) : null}

                  {section.items.map((item) => {
                    const value = item.value;
                    const isObj = typeof value === 'object' && value !== null;
                    const isArray = Array.isArray(value);
                    const preview = isObj
                      ? (isArray ? `[Array · ${value.length} 项]` : `{Object · ${Object.keys(value).length} 键}`)
                      : toPreviewString(value);
                    return (
                      <details key={item.key} style={{ marginBottom: 8 }}>
                        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
                          {item.key}
                          {preview && <span className="subtle" style={{ marginLeft: 10, fontWeight: 400 }}>{preview}</span>}
                        </summary>
                        <pre style={{
                          marginTop: 6,
                          maxHeight: 360,
                          fontSize: '0.78rem',
                          background: 'var(--bg-muted)',
                          padding: 10,
                          borderRadius: 6,
                          overflow: 'auto',
                        }}>
                          {isObj ? JSON.stringify(redactValue(value), null, 2) : toPreviewString(value)}
                        </pre>
                      </details>
                    );
                  })}
                </section>
              );
            });
          })()}

          <section className="detail-section">
            <h3>📎 证据锚点</h3>
            {evidence.length === 0 ? (
              <p className="subtle">暂无证据锚点</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
                {evidence.map((item, idx) => (
                  <li key={item?.id || `${item?.type || 'evidence'}-${idx}`}>
                    <span style={{ fontWeight: 600 }}>{item?.label || item?.type || `锚点 ${idx + 1}`}</span>
                    {item?.ref ? <span className="subtle"> · {item.ref}</span> : null}
                    {item?.url ? (
                      <div>
                        <a href={item.url} target="_blank" rel="noreferrer">
                          {item.url}
                        </a>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="detail-section">
            <h3>对话记录关联（技术信息）</h3>
            {!transcript ? (
              <p className="subtle">暂无对话记录信息</p>
            ) : (
              <dl style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 8, margin: 0 }}>
                {Object.entries(
                  typeof transcript === 'string'
                    ? { reference: transcript }
                    : transcript && typeof transcript === 'object'
                      ? transcript
                      : { value: transcript }
                ).map(([k, v]) => (
                  <React.Fragment key={k}>
                    <dt className="subtle">{k}</dt>
                    <dd style={{ margin: 0, wordBreak: 'break-all' }}>{String(v)}</dd>
                  </React.Fragment>
                ))}
              </dl>
            )}
          </section>
        </>
      )}
    </div>
  );
}
