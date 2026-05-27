import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { fetchApprovalQueue, grantApproval, denyApproval } from '../api';
import { StatusBadge, SeverityBadge } from './StatusBadge';

const MAX_BATCH = 20;

export default function ApprovalQueue() {
  const location = useLocation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [batchReason, setBatchReason] = useState('');
  const [batchActing, setBatchActing] = useState(false);
  const [batchFeedback, setBatchFeedback] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApprovalQueue();
      setItems(data.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const restoreY = Number(sessionStorage.getItem('approvalQueueScrollY') || 0);
    if (restoreY > 0) {
      window.requestAnimationFrame(() => window.scrollTo(0, restoreY));
    }
  }, []);

  const pendingItems = useMemo(
    () => items.filter((item) => (item.approvalStatus || 'pending') === 'pending'),
    [items],
  );

  const selectedPendingItems = useMemo(
    () => pendingItems.filter((item) => selectedIds.includes(item.fixtureId)),
    [pendingItems, selectedIds],
  );

  const allPendingSelected = pendingItems.length > 0 && selectedPendingItems.length === pendingItems.length;

  const toggleSelect = (fixtureId, checked) => {
    setSelectedIds((prev) => {
      if (checked) return [...new Set([...prev, fixtureId])];
      return prev.filter((id) => id !== fixtureId);
    });
  };

  const toggleSelectAllPending = (checked) => {
    if (checked) {
      setSelectedIds(pendingItems.map((item) => item.fixtureId));
    } else {
      setSelectedIds([]);
    }
  };

  const runBatchAction = async (action) => {
    const targetCount = selectedPendingItems.length;
    if (targetCount === 0) {
      setBatchFeedback({ type: 'error', msg: '请先勾选待审批项目' });
      return;
    }
    if (targetCount > MAX_BATCH) {
      setBatchFeedback({ type: 'error', msg: `单次最多处理 ${MAX_BATCH} 项，当前已选 ${targetCount} 项` });
      return;
    }
    if (action === 'deny' && !batchReason.trim()) {
      setBatchFeedback({ type: 'error', msg: '批量驳回必须填写原因' });
      return;
    }

    const actionText = action === 'grant' ? '同意' : '驳回';
    const confirmed = window.confirm(`确认批量${actionText} ${targetCount} 项吗？`);
    if (!confirmed) return;

    setBatchActing(true);
    setBatchFeedback(null);

    const summary = { success: 0, failed: 0, skipped: 0, failedItems: [] };
    for (const item of selectedPendingItems) {
      if ((item.approvalStatus || 'pending') !== 'pending') {
        summary.skipped += 1;
        continue;
      }
      try {
        const payload = { reason: batchReason || undefined, expectedLastEventId: item.lastEventId };
        if (action === 'grant') {
          await grantApproval(item.fixtureId, payload);
        } else {
          await denyApproval(item.fixtureId, payload);
        }
        summary.success += 1;
      } catch (err) {
        summary.failed += 1;
        summary.failedItems.push(`${item.fixtureId}: ${err.message}`);
      }
    }

    const detail = summary.failedItems.length > 0 ? `；失败详情：${summary.failedItems.slice(0, 3).join(' | ')}` : '';
    setBatchFeedback({
      type: summary.failed > 0 ? 'error' : 'success',
      msg: `批量${actionText}完成：成功 ${summary.success}，失败 ${summary.failed}，跳过 ${summary.skipped}${detail}`,
    });

    setSelectedIds([]);
    if (action === 'deny') setBatchReason('');
    await load();
    setBatchActing(false);
  };

  if (loading) return <div className="loading">⏳ 加载审批队列中…</div>;
  if (error) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="action-feedback feedback-error">⚠ 加载失败: {error}</div>
          <button className="btn" onClick={load}>🔄 重试</button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="empty-state">
            <div className="empty-icon">✅</div>
            <p>暂无待审批项目</p>
            <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>
              所有技能审批均已处理完毕
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2>待我审批（{pendingItems.length}）</h2>
        <button className="btn btn-ghost" onClick={load} title="刷新">🔄 刷新</button>
      </div>

      <div className="card-body" style={{ borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
          规则提示：✅ 批量同意备注可选；❌ 批量驳回必须填写原因；单次最多 {MAX_BATCH} 项
        </div>
        <textarea
          className="reason-input"
          rows={2}
          placeholder="批量备注（同意可选，驳回必填）"
          value={batchReason}
          onChange={(e) => setBatchReason(e.target.value)}
          disabled={batchActing}
        />
        <div className="action-bar" style={{ marginTop: '8px' }}>
          <button className="btn btn-danger" disabled={batchActing} onClick={() => runBatchAction('deny')}>
            {batchActing ? '处理中…' : `❌ 批量驳回（${selectedPendingItems.length}）`}
          </button>
          <button className="btn btn-success" disabled={batchActing} onClick={() => runBatchAction('grant')}>
            {batchActing ? '处理中…' : `✅ 批量同意（${selectedPendingItems.length}）`}
          </button>
        </div>
        {batchFeedback && (
          <div className={`action-feedback feedback-${batchFeedback.type}`} style={{ marginTop: '8px' }}>
            {batchFeedback.msg}
          </div>
        )}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="queue-table">
          <thead>
            <tr>
              <th>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={allPendingSelected}
                    onChange={(e) => toggleSelectAllPending(e.target.checked)}
                  />
                  全选
                </label>
              </th>
              <th>技能</th>
              <th>风险类型</th>
              <th>严重程度</th>
              <th>审核状态</th>
              <th>审批状态</th>
              <th>最近更新</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.fixtureId}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item.fixtureId)}
                    disabled={(item.approvalStatus || 'pending') !== 'pending' || batchActing}
                    onChange={(e) => toggleSelect(item.fixtureId, e.target.checked)}
                  />
                </td>
                <td>
                  <Link
                    to={`/approval/${encodeURIComponent(item.fixtureId)}`}
                    state={{ from: location.pathname + location.search, scrollY: window.scrollY }}
                    className="queue-row-link"
                    onClick={() => sessionStorage.setItem('approvalQueueScrollY', String(window.scrollY))}
                  >
                    {item.skillName || item.title || item.fixtureId}
                  </Link>
                </td>
                <td>{item.riskLabel || item.riskType || '—'}</td>
                <td>
                  {item.severity ? <SeverityBadge severity={item.severity} /> : '—'}
                </td>
                <td>
                  {item.reviewStatus ? <StatusBadge status={item.reviewStatus} /> : '—'}
                </td>
                <td>
                  <StatusBadge status={item.approvalStatus || 'pending'} />
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  {item.updatedAt ? new Date(item.updatedAt).toLocaleString('zh-CN') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
