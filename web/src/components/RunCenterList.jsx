import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { fetchRunList } from '../api';

// ── 常量 ──

const STATUS_OPTIONS = [
  { label: '全部状态', value: 'all' },
  { label: '成功', value: 'success' },
  { label: '失败', value: 'failed' },
  { label: '运行中', value: 'running' },
  { label: '等待中', value: 'pending' },
];

const SKELETON_ROWS = 5;

// ── 工具函数 ──

function statusText(status) {
  const value = String(status || '').toLowerCase();
  if (!value) return 'unknown';
  if (['success', 'succeeded', 'done', 'completed'].includes(value)) return 'success';
  if (['failed', 'error', 'failure'].includes(value)) return 'failed';
  if (['running', 'processing'].includes(value)) return 'running';
  if (['pending', 'queued', 'created'].includes(value)) return 'pending';
  return value;
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

function formatDateTime(value) {
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

function getPrimarySummary(item) {
  return item?.inputSummary || item?.outputSummary || item?.failureSummary || '';
}

function getSecondarySummary(item) {
  return item?.outputSummary || item?.failureSummary || item?.inputSummary || '';
}

function getHumanTitle(item, status, source) {
  const primary = getPrimarySummary(item);
  const secondary = getSecondarySummary(item);
  if (status === 'failed') return primary || `尝试执行来自 ${source} 的任务，但运行失败`;
  if (status === 'success') return primary || secondary || `来自 ${source} 的任务已成功完成`;
  if (status === 'running') return primary || `正在执行来自 ${source} 的任务`;
  if (status === 'pending') return primary || `等待执行来自 ${source} 的任务`;
  return primary || secondary || `来自 ${source} 的运行记录`;
}

function getHumanSubtitle(item, status, source) {
  const secondary = getSecondarySummary(item);
  if (status === 'failed') return secondary || item?.errorMessage || item?.error || `失败原因暂未提供，来源：${source}`;
  if (status === 'success') return secondary || `执行成功，来源：${source}`;
  if (status === 'running') return secondary || `执行中，来源：${source}`;
  return secondary || `来源：${source}`;
}

// ── 子组件 ──

/** 骨架屏：模拟表格加载态 */
function SkeletonTable() {
  return (
    <div style={{ overflowX: 'auto' }} aria-busy="true" aria-label="正在加载运行列表">
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th align="left">运行标识</th>
            <th align="left">状态</th>
            <th align="left">来源</th>
            <th align="left">开始时间</th>
            <th align="left">耗时</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
            <tr key={i}>
              {Array.from({ length: 5 }).map((_, j) => (
                <td key={j} style={{ padding: '8px 0' }}>
                  <span
                    className="skeleton-line"
                    style={{ width: j === 0 ? '60%' : '60%', display: 'inline-block', height: 14, borderRadius: 4 }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** 错误态：醒目提示 + 重试按钮 */
function ErrorBlock({ message, onRetry }) {
  return (
    <div className="error-block" role="alert">
      <div className="error-block-icon">⚠️</div>
      <p className="error-block-message">{message}</p>
      <p className="error-block-hint">
        可能是网络波动或后端服务暂不可用，请稍后重试。
      </p>
      <button className="btn btn-primary" onClick={onRetry}>
        🔄 重新加载
      </button>
    </div>
  );
}

/** 空态引导 */
function EmptyBlock({ hasRawData, onClearFilter }) {
  if (hasRawData) {
    return (
      <div className="empty-state" style={{ marginTop: 12 }}>
        <div className="empty-icon">🔍</div>
        <p>当前筛选条件下没有匹配的运行记录</p>
        <p className="text-muted" style={{ marginTop: 4 }}>
          尝试调整筛选条件或搜索关键词
        </p>
        <button className="btn btn-ghost" onClick={onClearFilter} style={{ marginTop: 8 }}>
          清除筛选
        </button>
      </div>
    );
  }

  return (
    <div className="empty-state" style={{ marginTop: 12 }}>
      <div className="empty-icon">📋</div>
      <p>暂无运行记录</p>
      <p className="text-muted" style={{ marginTop: 4, maxWidth: 320, margin: '4px auto 0' }}>
        还没有任何运行记录。触发一次工作流调用后，运行历史将自动出现在这里。
      </p>
    </div>
  );
}

// ── 主组件 ──

export default function RunCenterList() {
  const location = useLocation();
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [statusFilter, setStatusFilter] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [sortBy, setSortBy] = useState('startedAt_desc');

  const cancelledRef = useRef(false);

  const load = useCallback(async () => {
    cancelledRef.current = false;
    setLoading(true);
    setError('');
    try {
      const data = await fetchRunList();
      if (!cancelledRef.current) setPayload(data || {});
    } catch (err) {
      if (!cancelledRef.current) setError(err?.message || '加载失败');
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    return () => {
      cancelledRef.current = true;
    };
  }, [load]);

  /** 清除所有筛选回到默认 */
  const clearFilters = useCallback(() => {
    setStatusFilter('all');
    setKeyword('');
    setSortBy('startedAt_desc');
  }, []);

  const rawItems = payload?.items || payload?.list || [];
  const hasRawData = rawItems.length > 0;

  const items = useMemo(() => {
    const normalized = rawItems.map((item) => {
      const normalizedStatus = statusText(item?.status || item?.result || item?.state);
      const source = getSource(item);
      return {
        ...item,
        _runId: getRunId(item),
        _status: normalizedStatus,
        _source: source,
        _startedAt: getTimeValue(item),
        _duration: Number(item?.durationMs ?? item?.costMs ?? item?.elapsedMs ?? -1),
        _humanTitle: getHumanTitle(item, normalizedStatus, source),
        _humanSubtitle: getHumanSubtitle(item, normalizedStatus, source),
      };
    });

    const filtered = normalized.filter((item) => {
      const matchStatus = statusFilter === 'all' ? true : item._status === statusFilter;
      const q = keyword.trim().toLowerCase();
      const haystack = [item._runId, item._source, item._status, item?.title, item?.workflowName, item._humanTitle, item._humanSubtitle]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const matchKeyword = !q || haystack.includes(q);
      return matchStatus && matchKeyword;
    });

    const [field, order] = sortBy.split('_');
    filtered.sort((a, b) => {
      let result = 0;
      if (field === 'duration') {
        result = (a._duration || 0) - (b._duration || 0);
      } else if (field === 'status') {
        result = String(a._status).localeCompare(String(b._status));
      } else {
        result = new Date(a._startedAt || 0).getTime() - new Date(b._startedAt || 0).getTime();
      }
      return order === 'asc' ? result : -result;
    });

    return filtered;
  }, [rawItems, keyword, sortBy, statusFilter]);

  return (
    <section className="card">
      <div className="card-header" style={{ borderBottom: '1px solid var(--border)', padding: 'var(--space-md) var(--space-lg)' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>运行列表</h2>
        <span className="card-header-meta">当前位置：运行中心 / 运行列表</span>
      </div>

      {/* ── 加载态：骨架屏 ── */}
      {loading && (
        <div style={{ padding: 'var(--space-lg)' }}>
          <SkeletonTable />
        </div>
      )}

      {/* ── 错误态：醒目 + 重试 ── */}
      {!loading && error && (
        <div style={{ padding: 'var(--space-lg)' }}>
          <ErrorBlock message={error} onRetry={load} />
        </div>
      )}

      {/* ── 正常内容 ── */}
      {!loading && !error && (
        <div style={{ padding: 'var(--space-lg)', display: 'grid', gap: 'var(--space-md)' }}>
          <section className="card" style={{ margin: 0 }}>
            <div className="card-header" style={{ padding: 'var(--space-sm) var(--space-md)' }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem' }}>筛选与排序</h3>
            </div>
            <div className="card-body" style={{ padding: 'var(--space-md)' }}>
              <div className="filter-bar">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              {STATUS_OPTIONS.map((it) => (
                <option key={it.value} value={it.value}>
                  {it.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索名称 / 来源 / 状态"
              style={{ minWidth: 220 }}
            />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="startedAt_desc">开始时间 ↓</option>
              <option value="startedAt_asc">开始时间 ↑</option>
              <option value="duration_desc">耗时 ↓</option>
              <option value="duration_asc">耗时 ↑</option>
              <option value="status_asc">状态 A→Z</option>
              <option value="status_desc">状态 Z→A</option>
            </select>

                <button
                  className="btn btn-ghost"
                  onClick={load}
                  disabled={loading}
                  title="刷新列表"
                  style={{ marginLeft: 'auto' }}
                >
                  🔄 刷新
                </button>
              </div>
            </div>
          </section>

          <section className="card" style={{ margin: 0 }}>
            <div className="card-header" style={{ padding: 'var(--space-sm) var(--space-md)' }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem' }}>结果区</h3>
              <span className="card-header-meta">共 {items.length} 条（原始数据 {rawItems.length} 条）</span>
            </div>
            <div className="card-body" style={{ padding: 'var(--space-md)' }}>
              {items.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table className="queue-table">
                <thead>
                  <tr>
                    <th>运行内容</th>
                    <th>状态</th>
                    <th>次要信息</th>
                    <th>开始时间</th>
                    <th>耗时</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item._runId || `${item._source}-${item._startedAt}`}>
                      <td>
                        <div style={{ display: 'grid', gap: 2 }}>
                          <div style={{ fontWeight: 600, lineHeight: 1.4 }}>
                            {item._runId ? (
                              <Link
                                to={`/run-center/runs/${encodeURIComponent(item._runId)}`}
                                state={{ from: location.pathname + location.search }}
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
                          className={`badge ${
                            item._status === 'success' ? 'badge-approved'
                              : item._status === 'failed' ? 'badge-rejected'
                              : item._status === 'running' ? 'badge-ready'
                              : 'badge-idle'
                          }`}
                        >
                          {item._status}
                        </span>
                      </td>
                      <td className="subtle" style={{ lineHeight: 1.4 }}>
                        <div>来源：{item._source}</div>
                        <div className="td-mono" style={{ fontSize: '0.72rem' }}>运行编号: {item._runId || '未知'}</div>
                      </td>
                      <td className="td-time">{formatDateTime(item._startedAt)}</td>
                      <td>{formatDuration(item._duration)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
              ) : (
                <EmptyBlock hasRawData={hasRawData} onClearFilter={clearFilters} />
              )}
            </div>
          </section>

          <div className="subtle" style={{ fontSize: '0.78rem', padding: '0 var(--space-xs)' }}>
            提示：点击“运行内容”进入详情页；详情页支持稳定返回到本列表位置。
          </div>
        </div>
      )}
    </section>
  );
}
