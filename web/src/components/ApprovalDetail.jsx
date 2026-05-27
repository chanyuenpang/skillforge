import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { fetchApprovalDetail, grantApproval, denyApproval } from '../api';
import { StatusBadge, SeverityBadge } from './StatusBadge';
import Timeline from './Timeline';

export default function ApprovalDetail() {
  const { fixtureId } = useParams();
  const location = useLocation();
  const returnTo = location.state?.from || '/';
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApprovalDetail(fixtureId);
      setDetail(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [fixtureId]);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (action) => {
    setActing(true);
    setFeedback(null);

    // Pre-flight: deny must have reason
    if (action === 'deny' && !reason.trim()) {
      setFeedback({ type: 'error', msg: '⚠ 驳回必须填写原因/备注' });
      setActing(false);
      return;
    }

    try {
      const expectedLastEventId = detail?.approval?.lastEventId;
      if (action === 'grant') {
        const result = await grantApproval(fixtureId, { reason, expectedLastEventId });
        setFeedback({ type: 'success', msg: `✅ 审批已通过 (${result.eventId})` });
      } else {
        const result = await denyApproval(fixtureId, { reason, expectedLastEventId });
        setFeedback({ type: 'success', msg: `❌ 审批已拒绝 (${result.eventId})` });
      }
      setReason('');
      await load();
    } catch (err) {
      if (Number(err?.status) === 409 || err?.code === 'STATE_CONFLICT') {
        setFeedback({ type: 'error', msg: '⚠ 状态已变化，请以最新状态为准（正在自动刷新）' });
        await load();
      } else {
        setFeedback({ type: 'error', msg: `操作失败: ${err.message}` });
      }
    } finally {
      setActing(false);
    }
  };

  if (loading) return <div className="loading">⏳ 加载审批详情中…</div>;
  if (error) {
    const isNotFound = Number(error?.status) === 404;
    return (
      <div className="card">
        <div className="card-body">
          {isNotFound ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <p>404：审批对象不存在</p>
              <div style={{ width: '100%', maxWidth: '680px', textAlign: 'left', marginTop: 'var(--space-sm)' }}>
                <p style={{ margin: '0 0 8px 0' }}>
                  你打开的 ID：<strong>{fixtureId}</strong>
                </p>
                <p style={{ margin: '0 0 8px 0', lineHeight: 1.7 }}>
                  系统查询类型：
                  <strong>{error?.details?.bridge?.lookupType || 'approval-fixture'}</strong>
                  {error?.details?.lookupId ? (
                    <>（lookupId: <code>{error.details.lookupId}</code>）</>
                  ) : null}
                </p>
                {error?.code === 'APPROVAL_BRIDGE_NOT_FOUND' ? (
                  <>
                    <p style={{ margin: '0 0 8px 0', lineHeight: 1.7 }}>
                      当前打开的是运行/执行记录 ID，不是审批样例编号，因此无法直接找到审批详情。
                    </p>
                    <p style={{ margin: '0 0 8px 0', lineHeight: 1.7 }}>
                      系统尝试回查审批对象，但没有在审批事件链里找到对应记录。
                      {error?.details?.bridge?.reason ? (
                        <>（桥接原因：<code>{error.details.bridge.reason}</code>）</>
                      ) : null}
                    </p>
                    {error?.details?.bridge?.fixtureId ? (
                      <p style={{ margin: 0, lineHeight: 1.7 }}>
                        候选样例编号：<strong>{error.details.bridge.fixtureId}</strong>，但它目前没有对应审批数据。
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p style={{ margin: '0 0 8px 0', lineHeight: 1.7 }}>
                    未找到该审批对象，请确认 ID 是否正确，或返回列表后重新进入。
                  </p>
                )}
              </div>
              <div className="action-bar" style={{ justifyContent: 'center', marginTop: 'var(--space-md)' }}>
                <button className="btn" onClick={load}>🔄 刷新</button>
                <Link to="/" className="btn btn-ghost">← 返回列表</Link>
              </div>
            </div>
          ) : (
            <>
              <div className="action-feedback feedback-error">⚠ 加载失败: {error.message || String(error)}</div>
              <div className="action-bar" style={{ marginTop: 'var(--space-md)' }}>
                <button className="btn" onClick={load}>🔄 重试</button>
                <Link to="/" className="btn btn-ghost">← 返回列表</Link>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }
  if (!detail) {
    return (
      <div className="card">
        <div className="card-body empty-state">
          <p>未找到审批记录: {fixtureId}</p>
        </div>
      </div>
    );
  }

  const { fixtureId: fid, risk, review, approval, events } = detail;
  const isPending = approval?.status === 'pending';
  const isTerminal = approval?.status === 'granted' || approval?.status === 'denied';

  return (
    <>
      <Link to={returnTo} className="back-link">← 返回审批队列</Link>

      {feedback && (
        <div className={`action-feedback feedback-${feedback.type}`}>
          {feedback.msg}
        </div>
      )}

      {/* ── Summary Card ── */}
      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="card-header">
          <h2>{detail.skillName || detail.title || detail.workflowName || fid}</h2>
          {detail.description && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>{detail.description}</p>}
          <StatusBadge status={approval?.status || 'pending'} />
        </div>
        <div className="card-body">
          {/* ── Human-readable summary (first screen) ── */}
            {(() => {
              const desc = risk?.summary || detail?.description;
              if (desc) {
                return (
                  <div style={{
                    marginBottom: 'var(--space-md)',
                    padding: '12px 14px',
                    borderRadius: 8,
                    borderLeft: '4px solid var(--primary, #3b82f6)',
                    background: 'rgba(59,130,246,0.05)',
                    fontSize: '0.9rem',
                    lineHeight: 1.7,
                  }}>
                    {desc}
                  </div>
                );
              }
              const skillName = detail?.skillName || detail?.title || detail?.workflowName || fid;
              const riskLabel = risk?.riskType || '风险';
              const statusLabel = approval?.status === 'pending' ? '正在等待审批' : approval?.status === 'granted' ? '已通过' : approval?.status === 'denied' ? '已拒绝' : '审批中';
              return (
                <div style={{
                  marginBottom: 'var(--space-md)',
                  padding: '12px 14px',
                  borderRadius: 8,
                  borderLeft: '4px solid var(--primary, #3b82f6)',
                  background: 'rgba(59,130,246,0.05)',
                  fontSize: '0.9rem',
                  lineHeight: 1.7,
                }}>
                  审批对象「<strong>{skillName}</strong>」的{riskLabel}类风险{statusLabel}
                </div>
              );
            })()}
            <div className="meta-row">
            {risk?.riskType && <span>🏷 {risk.riskLabel || risk.riskType}</span>}
            {risk?.severity && (
              <span>
                <span className={`severity-dot ${risk.severity}`}></span>
                严重程度: <SeverityBadge severity={risk.severity} />
              </span>
            )}
            {review?.status && <span>审核: <StatusBadge status={review.status} /></span>}
            {review?.round > 1 && <span>审核轮次: 第 {review.round} 轮</span>}
          </div>

          {risk?.summary && (
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <div className="field-label" style={{ marginBottom: '4px' }}>风险摘要</div>
              <div style={{ fontSize: '0.9rem', lineHeight: 1.7 }}>{risk.summary}</div>
            </div>
          )}

          <div className="detail-grid">
                        <div className="detail-field">
              <span className="field-label">审批状态</span>
              <span className="field-value"><StatusBadge status={approval?.status || 'pending'} /></span>
            </div>
            {detail.source && (
              <div className="detail-field">
                <span className="field-label">触发来源</span>
                <span className="field-value">{detail.source}</span>
              </div>
            )}
            {detail.output && (
              <div className="detail-field">
                <span className="field-label">结果产物</span>
                <span className="field-value" style={{ fontSize: '0.9rem', wordBreak: 'break-word' }}>
                  {typeof detail.output === 'object' ? JSON.stringify(detail.output) : String(detail.output)}
                </span>
              </div>
            )}
            {approval?.decision && (
              <div className="detail-field">
                <span className="field-label">审批决策</span>
                <span className="field-value">{approval.decision === 'grant' ? '✅ 通过' : '❌ 拒绝'}</span>
              </div>
            )}
            {risk?.observedAt && (
              <div className="detail-field">
                <span className="field-label">发现时间</span>
                <span className="field-value">{new Date(risk.observedAt).toLocaleString('zh-CN')}</span>
              </div>
            )}
            {risk?.evidenceRefs?.length > 0 && (
              <div className="detail-field">
                <span className="field-label">证据引用</span>
                <span className="field-value">{risk.evidenceRefs.join(', ')}</span>
              </div>
            )}
          </div>

          {/* ── Approve / Reject Action ── */}
          {isPending && (
            <div style={{ marginTop: 'var(--space-lg)', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--border)' }}>
              <div className="section-title">审批操作</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 'var(--space-sm)' }}>
                ⚠️ 规则：<strong>驳回必须填写原因</strong>；同意时备注可选
              </p>
              <textarea
                className="reason-input"
                placeholder="驳回必填原因，同意可选备注…"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <div className="action-bar">
                <button
                  className="btn btn-danger"
                  disabled={acting}
                  onClick={() => handleAction('deny')}
                >
                  {acting ? '处理中…' : '❌ 拒绝 (deny)'}
                </button>
                <button
                  className="btn btn-success"
                  disabled={acting}
                  onClick={() => handleAction('grant')}
                >
                  {acting ? '处理中…' : '✅ 通过 (grant)'}
                </button>
              </div>
            </div>
          )}

          {isTerminal && (
            <div style={{ marginTop: 'var(--space-lg)', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--border)' }}>
              <div className={`action-feedback feedback-${approval.status === 'granted' ? 'success' : 'error'}`}>
                {approval.status === 'granted'
                  ? '✅ 此审批已通过，无需再次操作'
                  : '❌ 此审批已被拒绝'}
              </div>
            </div>
          )}
        
            {/* ── MetaBar: secondary IDs ── */}
            <div style={{display:'flex', gap:16, alignItems:'center', flexWrap:'wrap', padding:'8px 0', borderTop:'1px solid var(--border)', marginTop:12, fontSize:'0.78rem', color:'var(--text-muted)'}}>
              <span>审批编号: <code style={{fontSize:'0.78rem'}}>{fid}</code></span>
              <span>·</span>
              <span>状态: <StatusBadge status={approval?.status || 'pending'} /></span>
              {detail?.source ? (<><span>·</span><span>来源: {detail.source}</span></>) : null}
            </div>
          </div>
      </div>

      {/* ── Timeline ── */}
      <div className="card">
        <div className="card-header">
          <h2>事件时间线</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {events?.length || 0} 个事件
          </span>
        </div>
        <div className="card-body">
          <Timeline events={events || []} />
        </div>
      </div>
    </>
  );
}
