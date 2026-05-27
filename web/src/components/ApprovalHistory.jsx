import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchHistoryList, fetchHistoryDetail } from '../api';
import { StatusBadge, SeverityBadge } from './StatusBadge';
import Timeline from './Timeline';

export default function ApprovalHistory() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    status: searchParams.get('status') || '',
    skill: searchParams.get('skill') || '',
    since: searchParams.get('since') || '',
    until: searchParams.get('until') || '',
    sort: searchParams.get('sort') || 'time_desc',
  });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  async function loadList(nextFilters = filters) {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchHistoryList(nextFilters);
      const nextItems = data.items || [];
      setItems(nextItems);
      if (!selectedId && nextItems.length > 0) {
        setSelectedId(nextItems[0].fixtureId);
      }
      if (selectedId && !nextItems.find((x) => x.fixtureId === selectedId)) {
        setSelectedId(nextItems[0]?.fixtureId || '');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(fixtureId) {
    if (!fixtureId) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    setDetailError(null);
    try {
      const data = await fetchHistoryDetail(fixtureId);
      setDetail(data);
    } catch (err) {
      setDetailError(err.message);
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadDetail(selectedId);
  }, [selectedId]);

  const selected = useMemo(() => items.find((x) => x.fixtureId === selectedId), [items, selectedId]);

  return (
    <>
      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="card-header">
          <h2>历史与审计</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{items.length} 条记录</span>
        </div>
        <div className="card-body">
          <div className="detail-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <div className="detail-field">
              <span className="field-label">状态</span>
              <select
                value={filters.status}
                onChange={(e) => setFilters((s) => ({ ...s, status: e.target.value }))}
              >
                <option value="">全部</option>
                <option value="pending">pending</option>
                <option value="granted">granted</option>
                <option value="denied">denied</option>
              </select>
            </div>
            <div className="detail-field">
              <span className="field-label">技能/记录</span>
              <input
                type="text"
                value={filters.skill}
                onChange={(e) => setFilters((s) => ({ ...s, skill: e.target.value }))}
                placeholder="输入关键字"
              />
            </div>
            <div className="detail-field">
              <span className="field-label">起始时间</span>
              <input
                type="datetime-local"
                value={filters.since}
                onChange={(e) => setFilters((s) => ({ ...s, since: e.target.value }))}
              />
            </div>
            <div className="detail-field">
              <span className="field-label">结束时间</span>
              <input
                type="datetime-local"
                value={filters.until}
                onChange={(e) => setFilters((s) => ({ ...s, until: e.target.value }))}
              />
            </div>
            <div className="detail-field">
              <span className="field-label">排序</span>
              <select
                value={filters.sort}
                onChange={(e) => {
                  const nextSort = e.target.value;
                  const nextFilters = { ...filters, sort: nextSort };
                  setFilters(nextFilters);
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev);
                    next.set('sort', nextSort);
                    return next;
                  });
                  loadList(nextFilters);
                }}
              >
                <option value="time_desc">时间：最新在前</option>
                <option value="time_asc">时间：最早在前</option>
              </select>
            </div>
          </div>
          <div className="action-bar" style={{ marginTop: 'var(--space-md)' }}>
            <button className="btn" onClick={() => {
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                if (filters.status) next.set('status', filters.status); else next.delete('status');
                if (filters.skill) next.set('skill', filters.skill); else next.delete('skill');
                if (filters.since) next.set('since', filters.since); else next.delete('since');
                if (filters.until) next.set('until', filters.until); else next.delete('until');
                if (filters.sort) next.set('sort', filters.sort); else next.delete('sort');
                return next;
              });
              loadList(filters);
            }} disabled={loading}>{loading ? '加载中…' : '应用筛选'}</button>
            <button className="btn" onClick={() => {
              const reset = { status: '', skill: '', since: '', until: '', sort: 'time_desc' };
              setFilters(reset);
              setSearchParams(new URLSearchParams({ sort: 'time_desc' }));
              loadList(reset);
            }}>重置</button>
          </div>
          {error && <div className="action-feedback feedback-error" style={{ marginTop: 'var(--space-md)' }}>加载历史失败: {error}</div>}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="card-header"><h2>历史列表</h2></div>
        <div className="card-body" style={{ padding: 0 }}>
          {items.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-lg)' }}>暂无符合条件的历史记录</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="queue-table">
                <thead>
                  <tr>
                    <th>记录ID</th>
                    <th>技能名</th>
                    <th>时间</th>
                    <th>最终状态</th>
                    <th>审批结果</th>
                    <th>风险/标签摘要</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.fixtureId}
                      onClick={() => setSelectedId(item.fixtureId)}
                      style={{
                        cursor: 'pointer',
                        background: selectedId === item.fixtureId ? 'rgba(37,99,235,0.08)' : undefined,
                      }}
                    >
                      <td className="td-mono">{item.fixtureId}</td>
                      <td style={{ fontWeight: 500 }}>{item.skillName}</td>
                      <td className="td-time">{item.updatedAt ? new Date(item.updatedAt).toLocaleString('zh-CN') : '-'}</td>
                      <td><StatusBadge status={item.status || 'pending'} /></td>
                      <td>{item.decision ? (item.decision === 'grant' ? '✅ grant' : '❌ deny') : '-'}</td>
                      <td>
                        {item.riskType && <span>🏷 {item.riskType} </span>}
                        {item.severity && <SeverityBadge severity={item.severity} />}
                        {item.tags?.length > 0 && <div className="text-muted" style={{ marginTop: 2 }}>{item.tags.join(' / ')}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="card-header">
          <h2>历史详情</h2>
          {selected && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{selected.fixtureId}</span>}
        </div>
        <div className="card-body">
          {detailLoading && <div className="loading">⏳ 加载详情中…</div>}
          {detailError && <div className="action-feedback feedback-error">详情加载失败: {detailError}</div>}
          {!detailLoading && !detail && !detailError && <div className="empty-state">请选择一条历史记录</div>}
          {detail && (
            <>
              <div className="meta-row" style={{ marginBottom: 'var(--space-md)' }}>
                <span>记录ID: <code>{detail.fixtureId}</code></span>
                <span>审批状态: <StatusBadge status={detail.approval?.status || 'pending'} /></span>
                {detail.approval?.decision && <span>审批结果: {detail.approval.decision === 'grant' ? '✅ grant' : '❌ deny'}</span>}
              </div>
              <div className="detail-grid">
                <div className="detail-field">
                  <span className="field-label">风险类型</span>
                  <span className="field-value">{detail.risk?.riskType || '-'}</span>
                </div>
                <div className="detail-field">
                  <span className="field-label">风险等级</span>
                  <span className="field-value">{detail.risk?.severity ? <SeverityBadge severity={detail.risk.severity} /> : '-'}</span>
                </div>
                <div className="detail-field">
                  <span className="field-label">拒绝/失败原因</span>
                  <span className="field-value">{detail.approval?.reason || detail.review?.reason || '-'}</span>
                </div>
                <div className="detail-field">
                  <span className="field-label">风险摘要</span>
                  <span className="field-value">{detail.risk?.summary || '-'}</span>
                </div>
              </div>

              <div style={{ marginTop: 'var(--space-lg)' }}>
                <div className="section-title">审计时间线</div>
                <Timeline events={detail.events || []} />
              </div>

              <div className="action-bar" style={{ marginTop: 'var(--space-md)' }}>
                <Link className="btn" to={`/approval/${encodeURIComponent(detail.fixtureId)}`}>跳转审批详情</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
