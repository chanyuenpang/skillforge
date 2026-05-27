import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { fetchApprovalQueue, fetchHistoryList } from '../api';

/* ── helpers ── */
const severityLabel = { low: '低', medium: '中', high: '高', critical: '严重' };
const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
const approvalLabel = { pending: '待审批', granted: '已通过', denied: '已拒绝' };
const approvalVariant = {
  pending: 'badge-pending',
  granted: 'badge-success',
  denied: 'badge-danger',
};

/* ── StatCard ── */
function StatCard({ label, value, variant = 'default', icon }) {
  const cls = variant === 'pending' ? 'stat-card stat-card--pending'
    : variant === 'success' ? 'stat-card stat-card--success'
    : variant === 'warning' ? 'stat-card stat-card--warning'
    : 'stat-card';
  return (
    <div className={cls}>
      <div className="stat-card-icon">{icon}</div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
    </div>
  );
}

/* ── SeverityBar ── */
function SeverityBar({ distribution, total }) {
  if (total === 0) return <span className="text-muted">暂无风险数据</span>;
  const entries = Object.entries(distribution)
    .sort(([a], [b]) => severityOrder[a] - severityOrder[b]);
  return (
    <div className="severity-bar">
      {entries.map(([sev, count]) => {
        const pct = Math.round((count / total) * 100);
        if (pct === 0) return null;
        return (
          <div
            key={sev}
            className={`severity-bar-segment severity-bar-segment--${sev}`}
            style={{ width: `${pct}%` }}
            title={`${severityLabel[sev] || sev}: ${count} 项 (${pct}%)`}
          />
        );
      })}
      <div className="severity-bar-legend">
        {entries.map(([sev, count]) => (
          <span key={sev} className={`severity-legend-item severity-legend-item--${sev}`}>
            <span className={`severity-dot ${sev}`} /> {severityLabel[sev] || sev}: {count}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── RecentItemRow ── */
function RecentItemRow({ item, idx }) {
  return (
    <tr>
      <td className="td-mono">{idx + 1}</td>
      <td>
        <Link
          to={`/risk/approval/${encodeURIComponent(item.fixtureId)}`}
          className="queue-row-link"
        >
          {item.fixtureId}
        </Link>
      </td>
      <td>
        <span className={`badge badge-${item.severity || 'low'}`}>
          {severityLabel[item.severity] || item.severity || '—'}
        </span>
      </td>
      <td>
        <span className={`badge ${approvalVariant[item.approvalStatus] || 'badge-idle'}`}>
          {approvalLabel[item.approvalStatus] || item.approvalStatus || '—'}
        </span>
      </td>
      <td className="td-time">
        {item.updatedAt ? new Date(item.updatedAt).toLocaleString('zh-CN') : '—'}
      </td>
    </tr>
  );
}

/* ── Dashboard ── */
export default function Dashboard() {
  const [queue, setQueue] = useState({ items: [], loading: true, error: null });
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const loadQueue = useCallback(async () => {
    setQueue((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fetchApprovalQueue();
      setQueue({ items: data.items || [], loading: false, error: null });
    } catch (err) {
      setQueue({ items: [], loading: false, error: err.message });
    }
  }, []);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const data = await fetchHistoryList({ sort: 'time_desc' });
      const items = data.items || [];
      const pending = items.filter((x) => x.approvalStatus === 'pending').length;
      const granted = items.filter((x) => x.approvalStatus === 'granted').length;
      const denied = items.filter((x) => x.approvalStatus === 'denied').length;
      const severityDist = {};
      items.forEach((x) => {
        const s = x.severity || 'low';
        severityDist[s] = (severityDist[s] || 0) + 1;
      });
      const latest = items.reduce((max, x) => {
        return !max || (x.updatedAt && x.updatedAt > max) ? (x.updatedAt || max) : max;
      }, null);
      setStats({ total: items.length, pending, granted, denied, severityDist, latest, items });
    } catch {
      setStats(null);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => { loadQueue(); loadStats(); }, [loadQueue, loadStats]);

  /* derived */
  const pendingTotal = useMemo(() => queue.items.filter((x) => (x.approvalStatus || 'pending') === 'pending').length, [queue.items]);

  /* error / empty states */
  const queueError = queue.loading ? null : queue.error;
  const isEmpty = !queue.loading && !queueError && queue.items.length === 0;

  return (
    <div className="dashboard">
      {/* ── Welcome ── */}
      <section className="card dashboard-welcome">
        <div className="card-body">
          <h2>🛡️ SkillForge · 技能锻造工作台</h2>
          <p className="welcome-subtitle">
            SkillForge 是为 AI 技能全生命周期打造的风险管理与审批平台。
            覆盖技能从 <strong>编排 → 风险审查 → 审批 → 发布</strong> 的全流程，
            确保每一次技能上线都经过标准化校验与审批门控。
          </p>
          <p className="welcome-hint">
            💡 当前版本聚焦<strong>风险审批</strong>核心链路。运行中心、知识库等功能将在后续逐步开放。
          </p>
        </div>
      </section>

      {/* ── Stats Row ── */}
      <section className="dashboard-stats">
        <StatCard
          icon="⏳"
          label="待审批"
          value={queue.loading ? '…' : pendingTotal}
          variant="pending"
        />
        <StatCard
          icon="📋"
          label="总计记录"
          value={loadingStats ? '…' : stats?.total ?? '—'}
          variant="default"
        />
        <StatCard
          icon="✅"
          label="已通过"
          value={loadingStats ? '…' : stats?.granted ?? '—'}
          variant="success"
        />
        <StatCard
          icon="❌"
          label="已拒绝"
          value={loadingStats ? '…' : stats?.denied ?? '—'}
          variant="warning"
        />
      </section>

      {/* ── Middle row: severity + quick actions ── */}
      <div className="dashboard-row">
        {/* Severity Distribution */}
        <section className="card dashboard-card">
          <div className="card-header">
            <h2>📊 风险分布</h2>
            {stats && <span className="card-header-meta">共 {stats.total} 项</span>}
          </div>
          <div className="card-body">
            {loadingStats && <div className="loading">加载中…</div>}
            {!loadingStats && !stats && <div className="empty-state"><p>暂无统计信息</p></div>}
            {stats && (
              <SeverityBar distribution={stats.severityDist} total={stats.total} />
            )}
            {stats && stats.latest && (
              <div className="dashboard-meta" style={{ marginTop: 'var(--space-md)' }}>
                📅 最近更新：{new Date(stats.latest).toLocaleString('zh-CN')}
              </div>
            )}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="card dashboard-card">
          <div className="card-header">
            <h2>⚡ 快捷入口</h2>
          </div>
          <div className="card-body">
            <div className="quick-actions">
              <Link to="/risk/queue" className="quick-action-item">
                <span className="quick-action-icon">📥</span>
                <div>
                  <div className="quick-action-title">审批队列</div>
                  <div className="quick-action-desc">
                    查看并处理待审批项{pendingTotal > 0 ? ` (${pendingTotal})` : ''}
                  </div>
                </div>
                <span className="quick-action-arrow">→</span>
              </Link>
              <Link to="/risk/history" className="quick-action-item">
                <span className="quick-action-icon">📜</span>
                <div>
                  <div className="quick-action-title">历史审计</div>
                  <div className="quick-action-desc">回溯所有审批记录与时间线</div>
                </div>
                <span className="quick-action-arrow">→</span>
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* ── Recent Items ── */}
      <section className="card">
        <div className="card-header">
          <h2>📌 最近记录</h2>
          <span className="card-header-meta">
            {queue.loading ? '' : `共 ${queue.items.length} 项`}
          </span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {queue.loading && <div className="loading" style={{ padding: 'var(--space-lg)' }}>⏳ 加载中…</div>}
          {queueError && (
            <div className="empty-state" style={{ padding: 'var(--space-lg)' }}>
              <div className="empty-icon">⚠️</div>
              <p>加载失败: {queueError}</p>
              <button className="btn" onClick={loadQueue} style={{ marginTop: 'var(--space-md)' }}>🔄 重试</button>
            </div>
          )}
          {isEmpty && (
            <div className="empty-state" style={{ padding: 'var(--space-lg)' }}>
              <div className="empty-icon">🎉</div>
              <p>暂无任何风险记录</p>
              <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                一切平静。当有新的技能编排产生风险时，这里就会出现待办。
              </p>
            </div>
          )}
          {!queue.loading && !queueError && queue.items.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table className="queue-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>#</th>
                    <th>技能</th>
                    <th>严重度</th>
                    <th>状态</th>
                    <th>更新</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.items.slice(0, 10).map((item, idx) => (
                    <RecentItemRow key={item.fixtureId} item={item} idx={idx} />
                  ))}
                </tbody>
              </table>
              {queue.items.length > 10 && (
                <div style={{ padding: 'var(--space-md)', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
                  <Link to="/risk/queue" className="btn btn-ghost">
                    查看全部 {queue.items.length} 项 →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
