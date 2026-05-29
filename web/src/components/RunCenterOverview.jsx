import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchRunSummary, fetchRunList } from '../api';

const STATUS_COLORS = {
  success: '#16a34a',
  failed: '#dc2626',
  running: '#2563eb',
  pending: '#6b7280',
};

function pick(obj, keys, fallback = 0) {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null) return obj[key];
  }
  return fallback;
}

function formatDuration(ms) {
  const value = Number(ms);
  if (!Number.isFinite(value) || value < 0) return '-';
  if (value < 1000) return `${Math.round(value)}ms`;
  if (value < 60_000) return `${(value / 1000).toFixed(1)}s`;
  return `${(value / 60_000).toFixed(1)}min`;
}

function formatDateTime(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('zh-CN');
}

function normalizeSourceStats(summary) {
  const source = summary?.sourceDistribution || summary?.sources || summary?.bySource || {};
  if (Array.isArray(source)) {
    return source.map((item) => ({
      name: item?.source || item?.name || 'unknown',
      count: Number(item?.count ?? item?.value ?? 0) || 0,
    }));
  }
  return Object.entries(source).map(([name, count]) => ({
    name,
    count: Number(count) || 0,
  }));
}

function statusText(status) {
  const value = String(status || '').toLowerCase();
  if (!value) return 'unknown';
  if (['success', 'succeeded', 'done', 'completed'].includes(value)) return 'success';
  if (['failed', 'error', 'failure', 'blocked'].includes(value)) return 'failed';
  if (['running', 'processing'].includes(value)) return 'running';
  if (['pending', 'queued', 'created'].includes(value)) return 'pending';
  return value;
}

function hasNoRawPrimaryEvidence(item) {
  const rawAvailability = item?.rawTextAvailability;
  if (rawAvailability?.hasAnyRawText === false) return true;

  const inputUnavailable = rawAvailability?.input?.available === false;
  const outputUnavailable = rawAvailability?.output?.available === false;
  if (inputUnavailable && outputUnavailable) return true;

  return false;
}

function getRunId(item) {
  return item?.runId || item?.id || item?.requestId || '';
}

function getSource(item) {
  return item?.source || item?.origin || item?.from || '-';
}

function getTimeValue(item) {
  return item?.startedAt || item?.createdAt || item?.updatedAt || '';
}

function getPrimarySummary(item) {
  return item?.inputSummary || item?.outputSummary || item?.failureSummary || '';
}

function getSecondarySummary(item) {
  return item?.outputSummary || item?.failureSummary || item?.inputSummary || '';
}

function getHumanTitle(item) {
  const status = statusText(item?.status || item?.result || item?.state);
  const primary = getPrimarySummary(item);
  const secondary = getSecondarySummary(item);
  const source = getSource(item);

  if (hasNoRawPrimaryEvidence(item)) {
    return primary || `运行被阻断：缺 raw 主证据（来源：${source}）`;
  }

  if (status === 'failed') {
    return primary || `尝试执行来自 ${source} 的任务，但运行失败`;
  }
  if (status === 'success') {
    return primary || secondary || `来自 ${source} 的任务已成功完成`;
  }
  if (status === 'running') {
    return primary || `正在执行来自 ${source} 的任务`;
  }
  if (status === 'pending') {
    return primary || `等待执行来自 ${source} 的任务`;
  }

  return primary || secondary || `来自 ${source} 的运行记录`;
}

function getHumanSubtitle(item) {
  const status = statusText(item?.status || item?.result || item?.state);
  const secondary = getSecondarySummary(item);
  const source = getSource(item);

  if (hasNoRawPrimaryEvidence(item)) {
    return item?.rawTextAvailability?.message || '验收不合格：缺少可审计的输入/输出 raw 主证据';
  }

  if (status === 'failed') {
    return secondary || item?.errorMessage || item?.error || `失败原因暂未提供，来源：${source}`;
  }
  if (status === 'success') {
    return secondary || `执行成功，来源：${source}`;
  }
  if (status === 'running') {
    return secondary || `执行中，来源：${source}`;
  }

  return secondary || `来源：${source}`;
}

/* ── StatCard ── */
function StatCard({ label, value, variant = 'default', icon }) {
  const cls =
    variant === 'success' ? 'stat-card stat-card--success'
      : variant === 'danger' ? 'stat-card stat-card--warning'
      : 'stat-card';
  return (
    <div className={cls}>
      <div className="stat-card-icon">{icon}</div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
    </div>
  );
}

/* ── QuickActionItem ── */
function QuickActionItem({ to, icon, title, desc, meta }) {
  return (
    <Link to={to} className="quick-action-item">
      <span className="quick-action-icon">{icon}</span>
      <div>
        <div className="quick-action-title">
          {title}
          {meta ? <span className="card-header-meta" style={{ marginLeft: 8 }}>{meta}</span> : null}
        </div>
        <div className="quick-action-desc">{desc}</div>
      </div>
      <span className="quick-action-arrow">→</span>
    </Link>
  );
}

export default function RunCenterOverview() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [recentRuns, setRecentRuns] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      setLoading(true);
      setError('');
      try {
        const data = await fetchRunSummary();
        if (!cancelled) setSummary(data || {});
      } catch (err) {
        if (!cancelled) setError(err?.message || '加载失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    async function loadRecent() {
      setLoadingRecent(true);
      try {
        const data = await fetchRunList();
        const raw = data?.items || data?.list || [];
        if (!cancelled) {
          const normalized = raw.slice(0, 5).map((item) => {
            const blockedByNoRawEvidence = hasNoRawPrimaryEvidence(item);
            return {
            ...item,
            _runId: getRunId(item),
            _status: blockedByNoRawEvidence ? 'failed' : statusText(item?.status || item?.result || item?.state),
            _blockedByNoRawEvidence: blockedByNoRawEvidence,
            _source: getSource(item),
            _startedAt: getTimeValue(item),
            _duration: Number(item?.durationMs ?? item?.costMs ?? item?.elapsedMs ?? -1),
            _humanTitle: getHumanTitle(item),
            _humanSubtitle: getHumanSubtitle(item),
          };
          });
          setRecentRuns(normalized);
        }
      } catch {
        if (!cancelled) setRecentRuns([]);
      } finally {
        if (!cancelled) setLoadingRecent(false);
      }
    }

    loadSummary();
    loadRecent();
    return () => {
      cancelled = true;
    };
  }, []);

  const cards = useMemo(() => {
    const total = Number(pick(summary, ['total', 'totalRuns', 'count'], 0)) || 0;
    const success = Number(pick(summary, ['success', 'successCount', 'succeeded'], 0)) || 0;
    const failed = Number(pick(summary, ['failed', 'failure', 'failedCount'], 0)) || 0;
    const avgDuration = pick(summary, ['avgDurationMs', 'averageDurationMs', 'avgCostMs'], null);

    return [
      { label: '总运行数', value: loading ? '…' : total, variant: 'default', icon: '📊' },
      { label: '成功', value: loading ? '…' : success, variant: 'success', icon: '✅' },
      { label: '失败', value: loading ? '…' : failed, variant: 'danger', icon: '❌' },
      { label: '平均耗时', value: loading ? '…' : formatDuration(avgDuration), variant: 'default', icon: '⏱️' },
    ];
  }, [summary, loading]);

  const sourceStats = useMemo(() => normalizeSourceStats(summary), [summary]);
  const maxSourceCount = Math.max(...sourceStats.map((x) => x.count), 1);

  const hasError = !loading && error;
  const isEmpty = !loading && !error && cards.every((c) => c.value === 0 || c.value === '…' || c.value === '-');

  return (
    <div className="dashboard">
      {/* ── Status-first hero ── */}
      <section className="card">
        <div className="card-header">
          <h2>🏃 运行中心 · 状态概况</h2>
          <span className="card-header-meta">先看状态，再看最近，再去操作</span>
        </div>
        <div className="card-body">
          <p className="welcome-subtitle" style={{ marginBottom: 'var(--space-xs)' }}>
            这一页只负责回答两个问题：<strong>当前运行健康度如何</strong>、<strong>最近发生了什么</strong>。
          </p>
          <p className="welcome-hint" style={{ marginTop: 0 }}>
            💡 需要筛选请去
            <Link to="/run-center/runs" style={{ margin: '0 4px' }}>运行列表</Link>
            ，需要完整上下文请进入运行详情。
          </p>
        </div>
      </section>

      {/* ── Status Stats ── */}
      <section className="dashboard-stats">
        {cards.map((card) => (
          <StatCard
            key={card.label}
            icon={card.icon}
            label={card.label}
            value={card.value}
            variant={card.variant}
          />
        ))}
      </section>

      {/* ── Error ── */}
      {hasError && (
        <section className="card">
          <div className="card-body">
            <div className="empty-state">
              <div className="empty-icon">⚠️</div>
              <p>加载运行中心数据失败：{error}</p>
            </div>
          </div>
        </section>
      )}

      {/* ── Middle row: recent runs + CTAs ── */}
      {!hasError && (
        <div className="dashboard-row" style={{ display: 'grid', gap: 'var(--space-lg)', gridTemplateColumns: 'minmax(0, 2.3fr) minmax(260px, 1fr)', alignItems: 'start' }}>
          {/* Recent Runs */}
          <section className="card dashboard-card">
            <div className="card-header">
              <h2>📌 最近运行</h2>
              {!loadingRecent && recentRuns.length > 0 && (
                <span className="card-header-meta">最近 {recentRuns.length} 条</span>
              )}
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {loadingRecent && <div className="loading">加载中…</div>}
              {!loadingRecent && recentRuns.length === 0 && (
                <div className="empty-state">
                  <div className="empty-icon">📭</div>
                  <p>暂无运行记录</p>
                </div>
              )}
              {!loadingRecent && recentRuns.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                  <table className="queue-table" style={{ minWidth: 940 }}>
                    <thead>
                      <tr>
                        <th style={{ width: '44px' }}>#</th>
                        <th style={{ minWidth: '360px' }}>运行内容</th>
                        <th style={{ minWidth: '120px' }}>状态</th>
                        <th style={{ minWidth: '200px' }}>次要信息</th>
                        <th style={{ minWidth: '200px' }}>时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentRuns.map((item, idx) => (
                        <tr key={item._runId || idx}>
                          <td className="td-mono">{idx + 1}</td>
                          <td>
                            <div style={{ display: 'grid', gap: 2 }}>
                              <div style={{ fontWeight: 600, lineHeight: 1.4 }}>
                                {item._runId ? (
                                  <Link
                                    to={`/run-center/runs/${encodeURIComponent(item._runId)}`}
                                    className="queue-row-link"
                                    title={item._humanTitle}
                                  >
                                    {item._humanTitle}
                                  </Link>
                                ) : item._humanTitle}
                              </div>
                              <div className="subtle" style={{ fontSize: '0.8rem', lineHeight: 1.4 }}>
                                {item._humanSubtitle}
                              </div>
                            </div>
                          </td>
                          <td>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 10px',
                                borderRadius: 999,
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.03em',
                                background:
                                  item._status === 'success' ? 'var(--success-soft)'
                                    : item._status === 'failed' ? 'var(--danger-soft)'
                                    : item._status === 'running' ? 'var(--info-soft)'
                                    : 'var(--surface-muted)',
                                color:
                                  item._status === 'success' ? 'var(--success)'
                                    : item._status === 'failed' ? 'var(--danger)'
                                    : item._status === 'running' ? 'var(--info)'
                                    : 'var(--text-muted)',
                              }}
                            >
                              {item._blockedByNoRawEvidence ? 'failed/blocked' : item._status}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                            <div>来源：{item._source}</div>
                            <div className="td-mono" style={{ fontSize: '0.72rem' }}>运行编号: {item._runId || '未知'}</div>
                          </td>
                          <td className="td-time">{formatDateTime(item._startedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ padding: 'var(--space-sm) var(--space-md)', textAlign: 'right', borderTop: '1px solid var(--border)' }}>
                    <Link to="/run-center/runs" className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '6px 10px' }}>
                      查看全部运行 →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Quick Actions / CTAs */}
          <section className="card dashboard-card" style={{ borderStyle: 'dashed' }}>
            <div className="card-header" style={{ paddingBottom: 'var(--space-sm)' }}>
              <h2 style={{ fontSize: '1rem' }}>⚡ 下一步入口</h2>
            </div>
            <div className="card-body" style={{ paddingTop: 0 }}>
              <div className="quick-actions" style={{ gap: 'var(--space-xs)' }}>
                <QuickActionItem
                  to="/run-center/runs"
                  icon="📋"
                  title="查看全部运行"
                  desc="筛选与搜索运行记录"
                />
                <QuickActionItem
                  to="/risk/queue"
                  icon="🛡️"
                  title="风险审批"
                  desc="处理待审批项"
                />
                <QuickActionItem
                  to="/knowledge-assets"
                  icon="📚"
                  title="知识资产"
                  desc="浏览沉淀内容"
                />
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ── Source Distribution ── */}
      {!hasError && !isEmpty && sourceStats.length > 0 && (
        <section className="card">
          <div className="card-header">
            <h2>📈 来源分布</h2>
          </div>
          <div className="card-body">
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
              {sourceStats.map((item) => {
                const width = `${Math.max(8, Math.round((item.count / maxSourceCount) * 100))}%`;
                return (
                  <li key={item.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>{item.name}</span>
                      <span className="text-muted">{item.count}</span>
                    </div>
                    <div className="source-bar-bg">
                      <div
                        className="source-bar-fill"
                        style={{
                          width,
                          background: STATUS_COLORS[item.name] || '#3b82f6',
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {/* ── Empty state ── */}
      {!hasError && isEmpty && (
        <section className="card">
          <div className="card-body">
            <div className="empty-state">
              <div className="empty-icon">🔌</div>
              <p>暂无运行数据</p>
              <p style={{ fontSize: '0.8rem', marginTop: 4 }}>当你触发第一次技能运行后，这里就会出现统计信息。</p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
